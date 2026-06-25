import { UserPlus, Download, X } from "lucide-react";

/**
 * Sticky bottom action bar for multi-select bulk actions (AP 3 Phase 5).
 *
 * Presentational only: the panel owns the selection state, decides visibility
 * (it mounts this solely while selectedCount > 0) and supplies the handlers. This
 * keeps the separation the checkpoint asks for — no selection logic leaks in here.
 * Visual idiom mirrors the Gmail/Linear floating toolbar in the platform's iOS-18
 * Liquid-Glass + Quantum-Blue language (see .uap-bulk-bar in user-admin.css).
 *
 * B3 wires the layout + handlers; the real invite (B4) and CSV/audit (B5) logic
 * replaces the panel's stub handlers without touching this component's shape
 * (props may still grow in B4/B5 as noted).
 */
export function BulkActionBar({
  selectedCount,
  invitableCount,
  invitePending,
  onInvite,
  onExportCsv,
  onClear,
}: {
  selectedCount: number;
  /** Subset of the selection that can actually be invited (corp email + not_invited). */
  invitableCount: number;
  /** True while a bulk-invite run is in flight — disables the invite button (E4).
   *  CSV-export stays enabled (independent action, E8). */
  invitePending: boolean;
  onInvite: () => void;
  onExportCsv: () => void;
  onClear: () => void;
}) {
  return (
    <div className="uap-bulk-bar uap-bulk-bar--visible" role="region" aria-label="Massenaktionen">
      <div className="uap-bulk-bar__counter">
        <span className="uap-bulk-bar__count">{selectedCount} ausgewählt</span>
        <span className="uap-bulk-bar__hint">· {invitableCount} einladbar</span>
      </div>
      <div className="uap-bulk-bar__actions">
        <button
          type="button"
          className="uap-bulk-bar__btn uap-bulk-bar__btn--primary"
          onClick={onInvite}
          disabled={invitePending}
          aria-busy={invitePending}
        >
          <UserPlus size={15} aria-hidden="true" />
          Einladen
        </button>
        <button type="button" className="uap-bulk-bar__btn" onClick={onExportCsv}>
          <Download size={15} aria-hidden="true" />
          CSV-Export
        </button>
      </div>
      <button
        type="button"
        className="uap-bulk-bar__clear"
        onClick={onClear}
        aria-label="Auswahl aufheben"
      >
        <X size={15} aria-hidden="true" />
        Aufheben
      </button>
    </div>
  );
}
