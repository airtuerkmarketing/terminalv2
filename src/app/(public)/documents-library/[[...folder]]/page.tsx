import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllFolders,
  getBreadcrumb,
  getChildFolders,
  getFilesInFolder,
  getFolderByPath,
  getIdentity,
  getRootFolders,
} from "@/lib/documents";
import { DocumentLibraryRoot } from "@/components/documents/document-library-root";
import { FolderPage } from "@/components/documents/folder-page";

/**
 * Document Library (File System v2). Optional catch-all under /documents-library/
 * — being a more specific segment, it shadows the global [...slug] route for this
 * subtree (D-008). Empty segments → root index; else resolve the slug path to a
 * folder (404 if missing or not visible to the viewer per RLS).
 */
type Params = { params: Promise<{ folder?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { folder } = await params;
  const segs = folder ?? [];
  if (segs.length === 0) return { title: "Documents Library" };
  const f = await getFolderByPath(segs.join("/"));
  return { title: f ? `${f.name} — Documents Library` : "Documents Library" };
}

export default async function DocumentLibraryPage({ params }: Params) {
  const { folder } = await params;
  const segs = folder ?? [];

  const identity = await getIdentity();
  const isAdmin = identity?.isAdmin ?? false;
  const isSuperAdmin = identity?.isSuperAdmin ?? false;

  if (segs.length === 0) {
    const folders = await getRootFolders();
    return <DocumentLibraryRoot folders={folders} isAdmin={isAdmin} />;
  }

  const current = await getFolderByPath(segs.join("/"));
  if (!current) notFound();

  const [trail, childFolders, page, allFolders] = await Promise.all([
    getBreadcrumb(current.path),
    getChildFolders(current.id),
    getFilesInFolder(current.id, { limit: 60 }),
    isAdmin ? getAllFolders() : Promise.resolve([]),
  ]);

  return (
    <FolderPage
      folder={current}
      trail={trail}
      childFolders={childFolders}
      initialFiles={page.files}
      initialHasMore={page.hasMore}
      allFolders={allFolders}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
