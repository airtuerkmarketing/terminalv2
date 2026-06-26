import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth";
import type {
  ChunkEditLogEntry,
  ChunkLayer,
  ChunkTags,
  CorrectionRow,
  CorrectionStatus,
  CorrectionType,
  KnowledgeChunk,
  KnowledgeFilters,
  KnowledgeStats,
  QualityStats,
  TagSuggestion,
  VocabTerm,
} from "./types";

const PREVIEW_LEN = 700;

/** Reads run via the service-role client behind a super_admin gate (defense in
 *  depth: every entrypoint calls requireSuperAdmin first). This sidesteps the
 *  per-table RLS read model and matches the repo's draft-aware admin reads. */
async function gate() {
  await requireSuperAdmin();
  return createAdminClient();
}

function truncate(s: string): { text: string; truncated: boolean } {
  if (s.length <= PREVIEW_LEN) return { text: s, truncated: false };
  return { text: s.slice(0, PREVIEW_LEN), truncated: true };
}

/** Resolve auth uids → display name via profiles (admin client, no auth.users). */
async function resolveNames(
  db: ReturnType<typeof createAdminClient>,
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await db.from("profiles").select("id, full_name, email").in("id", unique);
  for (const p of (data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    map.set(p.id, p.full_name || p.email || "Unbekannt");
  }
  return map;
}

// ───────────────────────── Hero KPIs (live, never hardcoded) ─────────────────
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const db = await gate();
  const [company, confluence, brand, pending, approved, gold, srcTypes, lastChunk, vocab] =
    await Promise.all([
      db.from("company_context").select("*", { count: "exact", head: true }).eq("is_active", true),
      db.from("confluence_chunks").select("*", { count: "exact", head: true }),
      db.from("brand_chunks").select("*", { count: "exact", head: true }),
      db.from("ai_corrections").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db
        .from("ai_corrections")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "edited_approved"]),
      db.from("gold_set_answers").select("bewertung"),
      db.from("confluence_chunks").select("source_type"),
      db.from("confluence_chunks").select("created_at").order("created_at", { ascending: false }).limit(1),
      db.from("tag_vocabulary").select("axis"),
    ]);

  const goldRows = (gold.data ?? []) as Array<{ bewertung: string | null }>;
  const goldTotal = goldRows.length;
  const goldCorrect = goldRows.filter((r) => r.bewertung === "richtig").length;

  const sourceTypeCounts: Record<string, number> = {};
  for (const r of (srcTypes.data ?? []) as Array<{ source_type: string }>) {
    sourceTypeCounts[r.source_type] = (sourceTypeCounts[r.source_type] ?? 0) + 1;
  }

  const vocabRows = (vocab.data ?? []) as Array<{ axis: string }>;

  const c = company.count ?? 0;
  const cf = confluence.count ?? 0;
  const b = brand.count ?? 0;

  return {
    totalChunks: c + cf + b,
    byLayer: { company: c, confluence: cf, brand: b },
    sourceTypeCounts,
    pendingReviews: pending.count ?? 0,
    approvedCorrections: approved.count ?? 0,
    lastEmbeddingRun:
      (lastChunk.data?.[0] as { created_at: string } | undefined)?.created_at ?? null,
    goldSetPct: goldTotal ? Math.round((goldCorrect / goldTotal) * 1000) / 10 : 0,
    topicCount: vocabRows.filter((v) => v.axis === "topic").length,
    entityCount: vocabRows.filter((v) => v.axis === "airline").length,
  };
}

// ───────────────────────── Reviews (Tab 2) ──────────────────────────────────
type CorrRow = {
  id: string;
  status: CorrectionStatus;
  correction_type: CorrectionType;
  original_question: string;
  original_answer: string;
  proposed_correction: string;
  final_content: string | null;
  user_reference: string | null;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  applied_to_chunk_id: number | null;
};

export async function listCorrections(): Promise<{ pending: CorrectionRow[]; history: CorrectionRow[] }> {
  const db = await gate();
  const { data, error } = await db
    .from("ai_corrections")
    .select(
      "id,status,correction_type,original_question,original_answer,proposed_correction,final_content,user_reference,submitted_by,submitted_at,reviewed_by,reviewed_at,reviewer_notes,applied_to_chunk_id",
    )
    .order("submitted_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as CorrRow[];
  const names = await resolveNames(db, rows.flatMap((r) => [r.submitted_by, r.reviewed_by]));

  const map = (r: CorrRow): CorrectionRow => ({
    id: r.id,
    status: r.status,
    correctionType: r.correction_type,
    originalQuestion: r.original_question,
    originalAnswer: r.original_answer,
    proposedCorrection: r.proposed_correction,
    finalContent: r.final_content,
    userReference: r.user_reference,
    submittedById: r.submitted_by,
    submittedByName: r.submitted_by ? names.get(r.submitted_by) ?? null : null,
    submittedAt: r.submitted_at,
    reviewedByName: r.reviewed_by ? names.get(r.reviewed_by) ?? null : null,
    reviewedAt: r.reviewed_at,
    reviewerNotes: r.reviewer_notes,
    appliedToChunkId: r.applied_to_chunk_id,
  });

  return {
    pending: rows.filter((r) => r.status === "pending").map(map),
    history: rows.filter((r) => r.status !== "pending").map(map),
  };
}

// ───────────────────────── Corpus list (Tab 1) ──────────────────────────────
function metaTitle(meta: Record<string, unknown> | null, fallback: string): string {
  if (!meta) return fallback;
  return (
    (meta.title as string) ||
    (meta.section_title as string) ||
    (meta.brand_name as string) ||
    (meta.page_title as string) ||
    fallback
  );
}

export async function listChunks(
  filters: KnowledgeFilters,
): Promise<{ chunks: KnowledgeChunk[]; total: number }> {
  const db = await gate();
  const layers: ChunkLayer[] = filters.layers.length
    ? filters.layers
    : ["company", "confluence", "brand"];
  const search = filters.search.trim();

  const companyQ = layers.includes("company")
    ? db
        .from("company_context")
        .select("id, topic, content, category, priority, embedding, tags, created_at")
        .eq("is_active", true)
    : null;
  if (companyQ && search) companyQ.ilike("content", `%${search}%`);

  const confluenceQ = layers.includes("confluence")
    ? db
        .from("confluence_chunks")
        .select("id, content, source_type, metadata, token_count, embedding, created_at")
    : null;
  if (confluenceQ && search) confluenceQ.ilike("content", `%${search}%`);

  const brandQ = layers.includes("brand")
    ? db.from("brand_chunks").select("id, content, metadata, token_count, embedding, created_at")
    : null;
  if (brandQ && search) brandQ.ilike("content", `%${search}%`);

  const [companyRes, confluenceRes, brandRes, statsRes] = await Promise.all([
    companyQ,
    confluenceQ,
    brandQ,
    db.from("chunk_retrieval_stats").select("source, source_id, retrieved_count"),
  ]);

  const stats = new Map<string, number>();
  for (const s of (statsRes.data ?? []) as Array<{
    source: string;
    source_id: string;
    retrieved_count: number;
  }>) {
    stats.set(`${s.source}:${s.source_id}`, s.retrieved_count);
  }

  let all: KnowledgeChunk[] = [];

  for (const r of (companyRes?.data ?? []) as Array<{
    id: string;
    topic: string;
    content: string;
    category: string;
    priority: number | null;
    embedding: unknown;
    tags: ChunkTags | null;
    created_at: string;
  }>) {
    // company_context is the editable layer (only 37 rows) — send full content so
    // the edit modal has it without a second fetch.
    all.push({
      uid: `company:${r.id}`,
      layer: "company",
      source: "context",
      id: r.id,
      sourceType: r.category,
      title: r.topic,
      content: r.content,
      truncated: false,
      tags: r.tags ?? {},
      tokenCount: null,
      hasEmbedding: r.embedding != null,
      priority: r.priority,
      createdAt: r.created_at,
      retrievedCount: stats.get(`context:${r.id}`) ?? 0,
      editable: true,
    });
  }

  for (const r of (confluenceRes?.data ?? []) as Array<{
    id: number;
    content: string;
    source_type: string;
    metadata: Record<string, unknown> | null;
    token_count: number | null;
    embedding: unknown;
    created_at: string;
  }>) {
    const { text, truncated } = truncate(r.content);
    all.push({
      uid: `confluence:${r.id}`,
      layer: "confluence",
      source: "confluence",
      id: String(r.id),
      sourceType: r.source_type,
      title: metaTitle(r.metadata, r.source_type === "correction" ? "Korrektur" : "Confluence"),
      content: text,
      truncated,
      tags: {},
      tokenCount: r.token_count,
      hasEmbedding: r.embedding != null,
      priority: null,
      createdAt: r.created_at,
      retrievedCount: stats.get(`confluence:${r.id}`) ?? 0,
      editable: false,
    });
  }

  for (const r of (brandRes?.data ?? []) as Array<{
    id: number;
    content: string;
    metadata: Record<string, unknown> | null;
    token_count: number | null;
    embedding: unknown;
    created_at: string;
  }>) {
    const { text, truncated } = truncate(r.content);
    all.push({
      uid: `brand:${r.id}`,
      layer: "brand",
      source: "brand",
      id: String(r.id),
      sourceType: "brand",
      title: metaTitle(r.metadata, "Brand"),
      content: text,
      truncated,
      tags: {},
      tokenCount: r.token_count,
      hasEmbedding: r.embedding != null,
      priority: null,
      createdAt: r.created_at,
      retrievedCount: stats.get(`brand:${r.id}`) ?? 0,
      editable: false,
    });
  }

  // Tag filters (AND across axes, OR within) — only company rows carry tags, so a
  // tag filter intentionally narrows to tagged company chunks (V1 reality).
  const axisFilter = (have: string[] | undefined, want: string[]) =>
    want.length === 0 || (have ?? []).some((v) => want.includes(v));

  all = all.filter(
    (c) =>
      axisFilter(c.tags.topics, filters.topics) &&
      axisFilter(c.tags.airlines, filters.airlines) &&
      axisFilter(c.tags.departments, filters.departments) &&
      axisFilter(c.tags.providers, filters.providers) &&
      axisFilter(c.tags.brands, filters.brands) &&
      (filters.sourceTypes.length === 0 || filters.sourceTypes.includes(c.sourceType)),
  );

  all.sort((a, b) => {
    if (filters.sort === "most-retrieved") return b.retrievedCount - a.retrievedCount;
    const cmp = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    return filters.sort === "oldest" ? cmp : -cmp;
  });

  return { chunks: all, total: all.length };
}

/** Full content of a single company_context row (the editable layer). */
export async function getCompanyContextChunk(
  id: string,
): Promise<{ id: string; topic: string; content: string; tags: ChunkTags } | null> {
  const db = await gate();
  const { data } = await db
    .from("company_context")
    .select("id, topic, content, tags")
    .eq("id", id)
    .single();
  if (!data) return null;
  const row = data as { id: string; topic: string; content: string; tags: ChunkTags | null };
  return { id: row.id, topic: row.topic, content: row.content, tags: row.tags ?? {} };
}

// ───────────────────────── Quality (Tab 3) ──────────────────────────────────
export async function getQualityStats(): Promise<QualityStats> {
  const db = await gate();
  const { data } = await db
    .from("gold_set_answers")
    .select("frage_nr, frage_text, bewertung, test_set");
  const rows = (data ?? []) as Array<{
    frage_nr: number | null;
    frage_text: string;
    bewertung: string | null;
    test_set: string | null;
  }>;

  const total = rows.length;
  const correct = rows.filter((r) => r.bewertung === "richtig").length;
  const sets = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const key = r.test_set ?? "unbekannt";
    const e = sets.get(key) ?? { total: 0, correct: 0 };
    e.total += 1;
    if (r.bewertung === "richtig") e.correct += 1;
    sets.set(key, e);
  }

  return {
    overallPct: total ? Math.round((correct / total) * 1000) / 10 : 0,
    total,
    correct,
    bySet: [...sets.entries()]
      .map(([testSet, v]) => ({
        testSet,
        total: v.total,
        correct: v.correct,
        pct: v.total ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.testSet.localeCompare(b.testSet)),
    failures: rows
      .filter((r) => r.bewertung === "falsch")
      .map((r) => ({ frageNr: r.frage_nr, frage: r.frage_text, testSet: r.test_set ?? "unbekannt" })),
  };
}

// ───────────────────────── Taxonomy (Tab 4) ─────────────────────────────────
export async function listVocabulary(): Promise<VocabTerm[]> {
  const db = await gate();
  const { data } = await db
    .from("tag_vocabulary")
    .select("id, axis, value, label_de, label_en, aliases, description, cited_count, approved_at, parent_id")
    .order("axis", { ascending: true })
    .order("value", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    axis: r.axis as VocabTerm["axis"],
    value: r.value as string,
    labelDe: r.label_de as string,
    labelEn: (r.label_en as string) ?? null,
    aliases: (r.aliases as string[]) ?? [],
    description: (r.description as string) ?? null,
    citedCount: (r.cited_count as number) ?? 0,
    approvedAt: (r.approved_at as string) ?? null,
    parentId: (r.parent_id as string) ?? null,
  }));
}

export async function listSuggestions(): Promise<TagSuggestion[]> {
  const db = await gate();
  const { data } = await db
    .from("tag_suggestions")
    .select("id, axis, suggested_value, source_chunk_id, source_chunk_table, context_excerpt, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    axis: r.axis as TagSuggestion["axis"],
    suggestedValue: r.suggested_value as string,
    sourceChunkId: (r.source_chunk_id as string) ?? null,
    sourceChunkTable: (r.source_chunk_table as string) ?? null,
    contextExcerpt: (r.context_excerpt as string) ?? null,
    status: r.status as TagSuggestion["status"],
    createdAt: r.created_at as string,
  }));
}

// ───────────────────────── Audit drawer ─────────────────────────────────────
export async function getChunkEditLog(
  chunkTable: string,
  chunkId: string,
): Promise<ChunkEditLogEntry[]> {
  const db = await gate();
  const { data } = await db
    .from("chunk_edit_log")
    .select("id, chunk_table, chunk_id, edited_by, edit_reason, diff_before, diff_after, tags_before, tags_after, source_correction_id, created_at")
    .eq("chunk_table", chunkTable)
    .eq("chunk_id", chunkId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const names = await resolveNames(db, rows.map((r) => r.edited_by as string | null));
  return rows.map((r) => ({
    id: r.id as string,
    chunkTable: r.chunk_table as string,
    chunkId: r.chunk_id as string,
    editedByName: r.edited_by ? names.get(r.edited_by as string) ?? null : null,
    editReason: r.edit_reason as string,
    diffBefore: (r.diff_before as string) ?? null,
    diffAfter: (r.diff_after as string) ?? null,
    tagsBefore: (r.tags_before as ChunkTags) ?? null,
    tagsAfter: (r.tags_after as ChunkTags) ?? null,
    sourceCorrectionId: (r.source_correction_id as string) ?? null,
    createdAt: r.created_at as string,
  }));
}
