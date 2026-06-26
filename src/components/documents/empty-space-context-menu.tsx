"use client";

import { useState } from "react";
import { ContextMenu, type CtxItem } from "./file-card";

/**
 * Windows/Finder-style context menu for the empty content area. Right-clicking
 * anywhere inside (that ISN'T a file/folder — those stopPropagation their own
 * menu) opens this menu at the cursor with New folder / Upload / Refresh. Reuses
 * the shared ContextMenu popover (outside-click / Esc / scroll close). Used on
 * both the root index and a folder page (the items differ per context).
 */
export function EmptySpaceContextMenu({
  items,
  className,
  children,
}: {
  items: CtxItem[];
  className?: string;
  children: React.ReactNode;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className={className}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {children}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </div>
  );
}
