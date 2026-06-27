"use client";

import "@/styles/account-profile.css";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { OwnProfile } from "@/lib/users";
import { loadOwnProfileAction } from "./actions";
import ProfileForm from "./profile-form";
import ActivateProfile from "./activate-profile";

/**
 * Profile modal — the user-menu "Profile" entry opens this instead of navigating
 * to the /account/profile page. Same presentation contract as the Settings modal
 * (UserSettingsModal): portaled to <body> so the sidebar's overflow:hidden /
 * drawer transform can't clip it, a dark overlay behind it, and Escape / backdrop
 * / X to close. The acp-card itself is the panel; the profile data is fetched
 * lazily on open so the sidebar render stays light. The page route still works as
 * a deep link.
 */
export function ProfileModal({
  open,
  onClose,
  name,
}: {
  open: boolean;
  onClose: () => void;
  /** Fallback display name for the activation card (unlinked accounts). */
  name: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnProfile | null>(null);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await loadOwnProfileAction();
    if (res.ok) setProfile(res.profile);
    else setError(res.error);
    setLoading(false);
  }, []);

  // Lock body scroll + Escape while open (mirrors UserSettingsModal).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // (Re)fetch the profile each time the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadOwnProfileAction().then((res) => {
      if (cancelled) return;
      if (res.ok) setProfile(res.profile);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="acp-overlay" role="presentation" onClick={onClose}>
      <div
        className="acp-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="acp-modal-close"
          onClick={onClose}
          aria-label="Close profile"
        >
          <CloseIcon />
        </button>

        {loading ? (
          <div className="acp-card acp-activate">
            <p className="acp-muted">Loading profile…</p>
          </div>
        ) : error ? (
          <div className="acp-card acp-activate">
            <h1 className="acp-title">Profile unavailable</h1>
            <p className="acp-muted">{error}</p>
          </div>
        ) : profile ? (
          <ProfileForm profile={profile} />
        ) : (
          <ActivateProfile name={name} onActivated={load} />
        )}
      </div>
    </div>,
    document.body
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
