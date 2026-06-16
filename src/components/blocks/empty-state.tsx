/** Shown when a block-driven page has no blocks yet (content authored in Phase 5). */
export function BlockEmptyState() {
  return (
    <div className="block-empty">
      <p>No content yet</p>
      <span>Content for this page will be added in the CMS.</span>
    </div>
  );
}
