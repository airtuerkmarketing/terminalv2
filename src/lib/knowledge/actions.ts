"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin, type Identity } from "@/lib/auth";
import { getChunkEditLog } from "./queries";
import type { ChunkEditLogEntry, ChunkTags, TagAxis } from "./types";

export type ActionResult =
  | { ok: true; embedded?: boolean }
  | { ok: false; error: string };

function mapErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "NOT_AUTHENTICATED") return "Not signed in";
  if (msg === "NOT_AUTHORIZED") return "No permission";
  return msg;
}

/** Best-effort submitter notification — invoked fire-and-forget so the review
 *  loop never blocks on email. The edge function may not be deployed yet; any
 *  failure is swallowed. */
async function notifyCorrectionEvent(payload: {
  type: "approved" | "edited_approved" | "rejected";
  correctionId: string;
  reason?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.functions.invoke("notify-correction-event", { body: payload });
  } catch {
    /* email is non-critical; in-app feedback already happened */
  }
}

async function logActivity(
  identity: Identity,
  action: string,
  resourceId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("user_activity_log").insert({
      user_id: identity.userId,
      action,
      resource_type: "ai_knowledge",
      resource_id: resourceId,
      metadata,
    });
  } catch {
    /* audit is best-effort, never blocks the mutation */
  }
}

// ───────────────────────── Reviews: approve / reject ────────────────────────

/**
 * Approve (or edit & approve) a pending correction. Sets status + reviewer fields,
 * then materialises the durable chunk via embed-knowledge('corrections') — never a
 * manual insert (K-6); the edge function writes applied_to_chunk_id itself.
 */
export async function approveCorrection(
  correctionId: string,
  opts: { editedContent?: string; reviewerNotes?: string } = {},
): Promise<ActionResult> {
  let identity: Identity;
  try {
    identity = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }

  const edited = opts.editedContent?.trim();
  const db = await createClient(); // authenticated; ai_corrections UPDATE allows super_admin
  const { data, error } = await db
    .from("ai_corrections")
    .update({
      status: edited ? "edited_approved" : "approved",
      final_content: edited ?? null,
      reviewer_notes: opts.reviewerNotes?.trim() || null,
      reviewed_by: identity.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("status", "pending") // optimistic guard — only act on still-pending rows
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Correction not found or already processed" };
  }

  // Materialise the chunk through the existing pipeline (idempotent: it only
  // processes approved corrections whose applied_to_chunk_id IS NULL).
  let embedded = true;
  const admin = createAdminClient();
  const { error: embedErr } = await admin.functions.invoke("embed-knowledge", {
    body: { source: "corrections", force: false },
  });
  if (embedErr) embedded = false;

  await logActivity(identity, "approve_correction", correctionId, {
    edited: !!edited,
    embed_error: embedErr?.message ?? null,
  });
  notifyCorrectionEvent({ type: edited ? "edited_approved" : "approved", correctionId });

  revalidatePath("/admin/knowledge");
  return { ok: true, embedded };
}

export async function rejectCorrection(correctionId: string, reason: string): Promise<ActionResult> {
  let identity: Identity;
  try {
    identity = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "A reason is required" };

  const db = await createClient();
  const { data, error } = await db
    .from("ai_corrections")
    .update({
      status: "rejected",
      reviewer_notes: trimmed,
      reviewed_by: identity.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Correction not found or already processed" };
  }

  await logActivity(identity, "reject_correction", correctionId, { reason: trimmed });
  notifyCorrectionEvent({ type: "rejected", correctionId, reason: trimmed });

  revalidatePath("/admin/knowledge");
  return { ok: true };
}

// ───────────────────────── company_context edit (the only editable layer) ────

export async function updateCompanyContextChunk(
  id: string,
  patch: { content?: string; tags?: ChunkTags },
  reason: string,
): Promise<ActionResult> {
  let identity: Identity;
  try {
    identity = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  if (!reason.trim()) return { ok: false, error: "A reason for the change is required" };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("company_context")
    .select("content, tags")
    .eq("id", id)
    .single();
  if (!before) return { ok: false, error: "Entry not found" };
  const prev = before as { content: string; tags: ChunkTags | null };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const contentChanged = patch.content !== undefined && patch.content !== prev.content;
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.tags !== undefined) update.tags = patch.tags;

  const db = await createClient(); // authenticated; company_context UPDATE allows super_admin
  const { error } = await db.from("company_context").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await admin.from("chunk_edit_log").insert({
    chunk_table: "company_context",
    chunk_id: id,
    edited_by: identity.userId,
    edit_reason: reason.trim(),
    diff_before: patch.content !== undefined ? prev.content : null,
    diff_after: patch.content ?? null,
    tags_before: prev.tags ?? {},
    tags_after: patch.tags ?? prev.tags ?? {},
  });
  await logActivity(identity, "edit_chunk", id, { table: "company_context", content_changed: contentChanged });

  // Re-embed in place only when the text changed (tag-only edits don't need it).
  let embedded = true;
  if (contentChanged) {
    const { error: embedErr } = await admin.functions.invoke("embed-knowledge", {
      body: { source: "context", force: true },
    });
    if (embedErr) embedded = false;
  }

  revalidatePath("/admin/knowledge");
  return { ok: true, embedded };
}

/**
 * Create a new company_context entry — the only durable, directly-creatable layer
 * (the row IS the source). Confluence/brand/kb chunks come from their pipelines.
 */
export async function createCompanyContextChunk(
  input: { topic: string; category: string; content: string },
  reason: string,
): Promise<ActionResult> {
  let identity: Identity;
  try {
    identity = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  if (!input.topic.trim() || !input.category.trim() || !input.content.trim()) {
    return { ok: false, error: "Title, category, and content are required" };
  }
  if (!reason.trim()) return { ok: false, error: "A reason is required" };

  const db = await createClient(); // authenticated; company_context INSERT allows super_admin
  const { data, error } = await db
    .from("company_context")
    .insert({
      topic: input.topic.trim(),
      category: input.category.trim(),
      content: input.content.trim(),
      priority: 2,
      created_by: identity.userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    const msg = error?.message ?? "";
    return { ok: false, error: msg.includes("duplicate") ? "An entry with identical content already exists" : msg || "Creation failed" };
  }
  const id = (data as { id: string }).id;

  const admin = createAdminClient();
  await admin.from("chunk_edit_log").insert({
    chunk_table: "company_context",
    chunk_id: id,
    edited_by: identity.userId,
    edit_reason: reason.trim(),
    diff_before: null,
    diff_after: input.content.trim(),
    tags_before: {},
    tags_after: {},
  });
  await logActivity(identity, "create_chunk", id, { table: "company_context" });

  // New row has no embedding → force:false embeds exactly the unembedded rows.
  let embedded = true;
  const { error: embedErr } = await admin.functions.invoke("embed-knowledge", {
    body: { source: "context", force: false },
  });
  if (embedErr) embedded = false;

  revalidatePath("/admin/knowledge");
  return { ok: true, embedded };
}

// ───────────────────────── Taxonomy CRUD (Tab 4) ────────────────────────────

export async function createVocabTerm(input: {
  axis: TagAxis;
  value: string;
  labelDe: string;
  labelEn?: string;
  description?: string;
  aliases?: string[];
}): Promise<ActionResult> {
  let identity: Identity;
  try {
    identity = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  if (!input.value.trim() || !input.labelDe.trim()) return { ok: false, error: "Value and label are required" };

  const db = await createClient();
  const { error } = await db.from("tag_vocabulary").insert({
    axis: input.axis,
    value: input.value.trim(),
    label_de: input.labelDe.trim(),
    label_en: input.labelEn?.trim() || null,
    description: input.description?.trim() || null,
    aliases: input.aliases ?? [],
    approved_at: new Date().toISOString(),
    approved_by: identity.userId,
    created_by: identity.userId,
  });
  if (error) return { ok: false, error: error.message.includes("duplicate") ? "This value already exists" : error.message };
  revalidatePath("/admin/knowledge");
  return { ok: true };
}

export async function updateVocabTerm(
  id: string,
  patch: { labelDe?: string; labelEn?: string; description?: string; aliases?: string[] },
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  const update: Record<string, unknown> = {};
  if (patch.labelDe !== undefined) update.label_de = patch.labelDe.trim();
  if (patch.labelEn !== undefined) update.label_en = patch.labelEn.trim() || null;
  if (patch.description !== undefined) update.description = patch.description.trim() || null;
  if (patch.aliases !== undefined) update.aliases = patch.aliases;

  const db = await createClient();
  const { error } = await db.from("tag_vocabulary").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/knowledge");
  return { ok: true };
}

export async function deleteVocabTerm(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  const db = await createClient();
  const { error } = await db.from("tag_vocabulary").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/knowledge");
  return { ok: true };
}

export async function reviewSuggestion(
  id: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  let identity: Identity;
  try {
    identity = await requireSuperAdmin();
  } catch (e) {
    return { ok: false, error: mapErr(e) };
  }
  const db = await createClient();
  const { error } = await db
    .from("tag_suggestions")
    .update({ status: decision, reviewed_by: identity.userId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/knowledge");
  return { ok: true };
}

// ───────────────────────── Audit drawer (client-callable read) ──────────────
export async function loadChunkAudit(
  chunkTable: string,
  chunkId: string,
): Promise<ChunkEditLogEntry[]> {
  try {
    await requireSuperAdmin();
  } catch {
    return [];
  }
  return getChunkEditLog(chunkTable, chunkId);
}
