import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import "@/styles/document-library.css";
import { getIdentity } from "@/lib/documents";
import {
  getChildPresentationFoldersWithPreview,
  getPresentationBreadcrumb,
  getPresentationFiles,
  getPresentationFolderByPath,
  getPresentationFolderTreeForPath,
  getRootPresentationFoldersWithPreview,
  getTrashedPresentationFiles,
  PRESENTATION_TRASH_RETENTION_DAYS,
} from "@/lib/presentations";
import { PresentationHubRoot } from "@/components/presentations/presentation-hub-root";
import { PresentationFolderPage } from "@/components/presentations/presentation-folder-page";
import { PresentationsSidebar } from "@/components/presentations/presentations-sidebar";
import { PresentationTrashView } from "@/components/presentations/presentation-trash-view";

/**
 * Presentation Hub (V1). Optional catch-all under /presentation-hub/. Login-only.
 * 1:1 with the Document Library shell (D-077): a folder TREE secondary sidebar +
 * the content column. Reserved `/presentation-hub/trash` admin view.
 */
type Params = { params: Promise<{ folder?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { folder } = await params;
  const segs = folder ?? [];
  if (segs.length === 0) return { title: "Presentation Hub" };
  if (segs.length === 1 && segs[0] === "trash") return { title: "Trash — Presentation Hub" };
  const f = await getPresentationFolderByPath(segs.join("/"));
  return { title: f ? `${f.name} — Presentation Hub` : "Presentation Hub" };
}

export default async function PresentationHubPage({ params }: Params) {
  const { folder } = await params;
  const segs = folder ?? [];

  const identity = await getIdentity();
  if (!identity) {
    const next = segs.length > 0 ? `/presentation-hub/${segs.join("/")}` : "/presentation-hub";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const isSuperAdmin = identity.isSuperAdmin;
  const isAdmin = identity.isAdmin;

  // Reserved Trash view (admin-only) — shadows folder resolution (D-078).
  if (segs.length === 1 && segs[0] === "trash") {
    if (!isAdmin) notFound();
    const [trashed, tree] = await Promise.all([
      getTrashedPresentationFiles(),
      getPresentationFolderTreeForPath(null),
    ]);
    return (
      <div className="dl-page">
        <div className="dl-shell">
          <PresentationsSidebar tree={tree} activePath={null} activeView="trash" isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          <div className="dl-shell-main">
            <PresentationTrashView files={trashed} retentionDays={PRESENTATION_TRASH_RETENTION_DAYS} />
          </div>
        </div>
      </div>
    );
  }

  if (segs.length === 0) {
    const [folders, tree] = await Promise.all([
      getRootPresentationFoldersWithPreview(),
      getPresentationFolderTreeForPath(null),
    ]);
    return (
      <div className="dl-fullbleed">
        <div className="dl-shell">
          <PresentationsSidebar tree={tree} activePath={null} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          <div className="dl-shell-main">
            <PresentationHubRoot folders={folders} isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      </div>
    );
  }

  const current = await getPresentationFolderByPath(segs.join("/"));
  if (!current) notFound();

  const [trail, childFolders, page, tree] = await Promise.all([
    getPresentationBreadcrumb(current.path),
    getChildPresentationFoldersWithPreview(current.id),
    getPresentationFiles(current.id, { limit: 60, sort: "name" }),
    getPresentationFolderTreeForPath(current.path),
  ]);
  const openFolderFiles = page.files.map((f) => ({ id: f.id, title: f.title, fileType: f.fileType }));

  return (
    <div className="dl-page">
      <div className="dl-shell">
        <PresentationsSidebar
          tree={tree}
          activePath={current.path}
          openFolderFiles={openFolderFiles}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
        />
        <div className="dl-shell-main">
          <PresentationFolderPage
            key={current.id}
            folder={current}
            trail={trail}
            childFolders={childFolders}
            initialFiles={page.files}
            initialHasMore={page.hasMore}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>
    </div>
  );
}
