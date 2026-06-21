import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getIdentity } from "@/lib/documents";
import {
  getChildPresentationFolders,
  getPresentationBreadcrumb,
  getPresentationFiles,
  getPresentationFolderByPath,
  getRootPresentationFoldersWithPreview,
} from "@/lib/presentations";
import { PresentationHubRoot } from "@/components/presentations/presentation-hub-root";
import { PresentationFolderPage } from "@/components/presentations/presentation-folder-page";

/**
 * Presentation Hub (V1). Optional catch-all under /presentation-hub/ — being a
 * more specific segment, it shadows the global [...slug] route for this subtree.
 * Login-only: anon → redirect to /login. Empty segments → root index; else
 * resolve the slug path to a folder (404 if missing or not visible per RLS).
 */
type Params = { params: Promise<{ folder?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { folder } = await params;
  const segs = folder ?? [];
  if (segs.length === 0) return { title: "Presentation Hub" };
  const f = await getPresentationFolderByPath(segs.join("/"));
  return { title: f ? `${f.name} — Presentation Hub` : "Presentation Hub" };
}

export default async function PresentationHubPage({ params }: Params) {
  const { folder } = await params;
  const segs = folder ?? [];

  // Login-only hub: send anonymous visitors to sign in, then back here.
  const identity = await getIdentity();
  if (!identity) {
    const next = segs.length > 0 ? `/presentation-hub/${segs.join("/")}` : "/presentation-hub";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const isAdmin = identity.isAdmin;
  const isSuperAdmin = identity.isSuperAdmin;

  if (segs.length === 0) {
    const folders = await getRootPresentationFoldersWithPreview();
    return <PresentationHubRoot folders={folders} isAdmin={isAdmin} />;
  }

  const current = await getPresentationFolderByPath(segs.join("/"));
  if (!current) notFound();

  const [trail, childFolders, page] = await Promise.all([
    getPresentationBreadcrumb(current.path),
    getChildPresentationFolders(current.id),
    getPresentationFiles(current.id, { limit: 60, sort: "name" }),
  ]);

  return (
    <PresentationFolderPage
      key={current.id}
      folder={current}
      trail={trail}
      childFolders={childFolders}
      initialFiles={page.files}
      initialHasMore={page.hasMore}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
