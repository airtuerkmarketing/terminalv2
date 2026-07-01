import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBreadcrumb,
  getChildFoldersWithPreview,
  getFilesInFolder,
  getFolderByPath,
  getFolderTreeForPath,
  getIdentity,
  getRootFoldersWithPreview,
  getTrashedFiles,
  TRASH_RETENTION_DAYS,
} from "@/lib/documents";
import { canWriteFolder, type FolderViewer } from "@/lib/documents-constants";
import { listFolderGrantees } from "@/app/(public)/documents-library/actions";
import { DocumentLibraryRoot } from "@/components/documents/document-library-root";
import { FolderPage } from "@/components/documents/folder-page";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";
import { TrashView } from "@/components/documents/trash-view";

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
  const isAdmin = identity?.isAdmin ?? false;
  // Owner-based write authority (D-111): any writer role can create top-level
  // folders; per-folder edit/manage is owner-or-super (see canWriteFolder).
  const isWriter = isSuperAdmin || (identity?.isDeptAdmin ?? false) || (identity?.isAiAdmin ?? false);
  const viewer: FolderViewer = { userId: identity?.userId ?? null, isSuperAdmin, isWriter };

  // Reserved Trash view (admin-only) — a special segment that shadows folder
  // resolution, so a folder can't be named "trash" and steal it (D-076).
  if (segs.length === 1 && segs[0] === "trash") {
    if (!isAdmin) notFound();
    const [trashed, tree] = await Promise.all([getTrashedFiles(), getFolderTreeForPath(null)]);
    return (
      <div className="dl-page">
        <div className="dl-shell">
          <DocumentsSidebar tree={tree} activePath={null} activeView="trash" isAdmin={isAdmin} isWriter={isWriter} />
          <div className="dl-shell-main">
            <TrashView files={trashed} retentionDays={TRASH_RETENTION_DAYS} />
          </div>
        </div>
      </div>
    );
  }

  if (segs.length === 0) {
    // Root: grid folders + the sidebar tree (top level, nothing expanded yet).
    const [folders, tree] = await Promise.all([
      getRootFoldersWithPreview(),
      getFolderTreeForPath(null),
    ]);
    return (
      <div className="dl-fullbleed">
        <div className="dl-shell">
          <DocumentsSidebar tree={tree} activePath={null} isAdmin={isAdmin} isWriter={isWriter} />
          <div className="dl-shell-main">
            <DocumentLibraryRoot folders={folders} viewer={viewer} />
          </div>
        </div>
      </div>
    );
  }

  const current = await getFolderByPath(segs.join("/"));
  if (!current) notFound();

  // The secondary sidebar shows the WHOLE open path as an expanded tree (siblings
  // at every level), plus the open folder's direct files. getFolderTreeForPath
  // builds that from the materialized path (D-074).
  const [trail, childFolders, page, tree] = await Promise.all([
    getBreadcrumb(current.path),
    getChildFoldersWithPreview(current.id),
    getFilesInFolder(current.id, { limit: 60, sort: "name" }),
    getFolderTreeForPath(current.path),
  ]);
  const openFolderFiles = page.files.map((f) => ({ id: f.id, title: f.title, extension: f.extension }));
  // Who currently has per-user access (D-080) — feeds the header avatar group.
  // Owner-or-super only (the action is gated; others can't read grants). D-111.
  const canWriteCurrent = canWriteFolder(current.createdBy, viewer);
  const grantees = canWriteCurrent ? await listFolderGrantees(current.id) : [];

  return (
    <div className="dl-page">
      <div className="dl-shell">
        <DocumentsSidebar
          tree={tree}
          activePath={current.path}
          openFolderFiles={openFolderFiles}
          isAdmin={isAdmin}
          isWriter={isWriter}
        />
        <div className="dl-shell-main">
          <FolderPage
            key={current.id}
            folder={current}
            trail={trail}
            childFolders={childFolders}
            initialFiles={page.files}
            initialHasMore={page.hasMore}
            viewer={viewer}
            grantees={grantees}
          />
        </div>
      </div>
    </div>
  );
}
