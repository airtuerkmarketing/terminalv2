"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Recursive tree row with a hover tooltip — modelled on the ruixenui
 * "tree-node-tooltip" component (same node shape: id / name / tooltip / type /
 * children). Extended with an optional `href` so a node can navigate (used by
 * the Document Library subfolder nav). Folders with children expand/collapse;
 * leaves render flat. Pure presentation — no data fetching.
 */
export type TreeNode = {
  id: string;
  name: string;
  tooltip?: string;
  type: "folder" | "file";
  href?: string;
  children?: TreeNode[];
};

function NodeIcon({ type }: { type: "folder" | "file" }) {
  if (type === "file") {
    return (
      <svg className="tnt-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path d="M14 3v5h5" />
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      </svg>
    );
  }
  return (
    <svg className="tnt-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const hasChildren = !!node.children && node.children.length > 0;
  const [open, setOpen] = useState(true);

  const inner = (
    <span className="tnt-label">
      <NodeIcon type={node.type} />
      <span className="tnt-name">{node.name}</span>
    </span>
  );

  return (
    <li className="tnt-node">
      <div className="tnt-row" style={{ paddingLeft: 6 + depth * 14 }}>
        {hasChildren ? (
          <button
            type="button"
            className={`tnt-toggle${open ? " open" : ""}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span className="tnt-toggle-spacer" aria-hidden="true" />
        )}

        <span className="tnt-tipwrap">
          {node.href ? (
            <Link href={node.href} className="tnt-link" title={node.tooltip ?? node.name}>
              {inner}
            </Link>
          ) : (
            <span className="tnt-static" title={node.tooltip ?? node.name}>
              {inner}
            </span>
          )}
          {node.tooltip && (
            <span className="tnt-tip" role="tooltip">
              {node.tooltip}
            </span>
          )}
        </span>
      </div>

      {hasChildren && open && (
        <ul className="tnt-children">
          {node.children!.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TreeNodeTooltip({ node }: { node: TreeNode }) {
  return (
    <ul className="tnt-root">
      <TreeRow node={node} depth={0} />
    </ul>
  );
}
