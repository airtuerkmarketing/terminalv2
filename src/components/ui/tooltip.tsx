"use client";

import { type ReactNode } from "react";
import "./tooltip.css";

/**
 * Lightweight tooltip: a hover/focus card for explanations that are longer than a
 * native `title=` attribute reads well (e.g. WHY an invite is blocked). Pure-CSS
 * show/hide via :hover / :focus-within on the wrapper — no JS state, no portal.
 *
 * Wrap a focusable trigger (button/link) so keyboard users get it too. For a
 * non-interactive trigger, give it tabIndex={0} where appropriate.
 */
export function TooltipShell({
  content,
  placement = "top",
  dark = false,
  children,
}: {
  content: ReactNode;
  placement?: "top" | "bottom";
  /** Dark card (e.g. compact icon-button tooltips). Default keeps the light card. */
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="ui-tooltip">
      {children}
      <span
        className={`ui-tooltip-card ui-tooltip-card--${placement}${dark ? " ui-tooltip-card--dark" : ""}`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
