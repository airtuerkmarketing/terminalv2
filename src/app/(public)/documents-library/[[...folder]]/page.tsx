import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBreadcrumb,
  getChildFolders,
  getFilesInFolder,
  getFolderByPath,
  getIdentity,
  getRootFoldersWithPreview,
} from "@/lib/documents";
import { DocumentLibraryRoot } from "@/components/documents/document-library-root";
import { FolderPage } from "@/components/documents/folder-page";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";

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
  const isSuperAdmin = identity?.isSuperAdmin ?? false;

  if (segs.length === 0) {
    const folders = await getRootFoldersWithPreview();
    const sidebarFolders = folders.map((f) => ({ id: f.id, name: f.name, path: f.path, fileCount: f.fileCount, isPublic: f.isPublic }));
    return (
      <div className="dl-page">
        <div className="dl-shell">
          <DocumentsSidebar folders={sidebarFolders} activePath={null} isSuperAdmin={isSuperAdmin} />
          <div className="dl-shell-main">
            <DocumentLibraryRoot folders={folders} isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      </div>
    );
  }

  const current = await getFolderByPath(segs.join("/"));
  if (!current) notFound();

  // The secondary sidebar needs the top-level folder list in folder views too.
  // getRootFoldersWithPreview is an existing fn (a handful of folders) — one
  // extra read here so the sidebar can show counts + the open folder's files.
  const [trail, childFolders, page, rootFolders] = await Promise.all([
    getBreadcrumb(current.path),
    getChildFolders(current.id),
    getFilesInFolder(current.id, { limit: 60, sort: "name" }),
    getRootFoldersWithPreview(),
  ]);
  const sidebarFolders = rootFolders.map((f) => ({ id: f.id, name: f.name, path: f.path, fileCount: f.fileCount, isPublic: f.isPublic }));
  const subFolders = childFolders.map((f) => ({ id: f.id, name: f.name, path: f.path, isPublic: f.isPublic }));
  const openFolderFiles = page.files.map((f) => ({ id: f.id, title: f.title, extension: f.extension }));

  return (
    <div className="dl-page">
      <div className="dl-shell">
        <DocumentsSidebar
          folders={sidebarFolders}
          activePath={current.path}
          subFolders={subFolders}
          openFolderFiles={openFolderFiles}
          isSuperAdmin={isSuperAdmin}
        />
        <div className="dl-shell-main">
          <FolderPage
            key={current.id}
            folder={current}
            trail={trail}
            initialFiles={page.files}
            initialHasMore={page.hasMore}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>
    </div>
  );
}
