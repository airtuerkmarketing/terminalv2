"use client";

import "@/styles/user-menu.css";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import {
  ChevronIcon,
  LogoutIcon,
  MoonIcon,
  ProfileIcon,
  SettingsIcon,
  SunIcon,
  UserCogIcon,
} from "./icons";
import { UserSettingsModal } from "./user-settings-modal";
import { ReviewNotifier } from "@/components/knowledge/review-notifier";

const THEME_KEY = "terminalv2-theme";

// ── data-attribute mirrors (same useSyncExternalStore pattern as the rest of
// the shell): the <html> attribute is the source of truth, plain DOM writes set
// it, and these hooks keep the menu's checked/label state in sync. ──
function makeMirror(attr: string) {
  return (callback: () => void) => {
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [attr],
    });
    return () => observer.disconnect();
  };
}
const subscribeTheme = makeMirror("data-theme");
const getDark = () => document.documentElement.dataset.theme === "ios18-dark";

interface MenuPos {
  left: number;
  bottom: number;
  minWidth: number;
}

/**
 * User dropdown menu. The user block (avatar + name) is the trigger; the popup
 * carries an identity header (name + e-mail) and the action rows that used to
 * live in the old inline .sidebar-actions row (ambient orbs, theme, settings),
 * plus a Profile stub and a destructive Logout.
 *
 * The popup is portaled to <body> and positioned with fixed coordinates from the
 * trigger's bounding rect — same reasoning as UserSettingsModal: it must escape
 * the sidebar's `overflow:hidden` and the mobile drawer's translateX transform.
 * It opens upward (the trigger sits at the bottom of the sidebar). Closes on
 * outside-click, Escape, or selecting Settings/Profile/Logout. The orbs and
 * theme rows toggle in place and keep the menu open so several can be flipped in
 * one go.
 */
export function UserMenu({
  name,
  email,
  role,
  initials,
  isSuperAdmin,
}: {
  name: string;
  email: string;
  role: string;
  initials: string;
  isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const dark = useSyncExternalStore(subscribeTheme, getDark, () => false);

  // The roving set excludes the disabled Profile row (aria-disabled) so keyboard
  // users never land on an inert item.
  const getItems = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          "[role^='menuitem']:not([aria-disabled='true'])"
        ) ?? []
      ),
    []
  );

  // Measure the trigger and derive the popup's fixed coordinates. It opens
  // upward (the trigger sits at the bottom of the sidebar). The left edge is
  // clamped so a menu launched from the narrow collapsed rail can't overflow the
  // right edge of the viewport.
  const computePos = useCallback((): MenuPos | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const r = trigger.getBoundingClientRect();
    const GAP = 8;
    const minWidth = Math.max(r.width, 248);
    const left = Math.min(r.left, window.innerWidth - minWidth - GAP);
    return {
      left: Math.max(GAP, left),
      bottom: window.innerHeight - r.top + GAP,
      minWidth,
    };
  }, []);

  // Keep the popup glued to the trigger while open. The initial position is set
  // synchronously on open below (so `pos` and `open` commit together and the
  // portal mounts in one pass); these listeners then track later changes:
  // scroll/resize, and — via ResizeObserver — the trigger growing taller when it
  // reveals the role line on open (the menu opens upward, so its anchor moves).
  useEffect(() => {
    if (!open) return;
    const track = () => setPos(computePos());
    window.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);
    const ro = new ResizeObserver(track);
    if (triggerRef.current) ro.observe(triggerRef.current);
    return () => {
      window.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
      ro.disconnect();
    };
  }, [open, computePos]);

  // Move focus into the menu on open (first actionable row); restore it to the
  // trigger on close.
  useEffect(() => {
    if (!open) return;
    getItems()[0]?.focus();
  }, [open, getItems]);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  // Outside-click + Escape (capture pointerdown so it beats the items' onClick).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Roving focus across the rows with Arrow/Home/End.
  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = getItems();
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  }

  function toggleTheme() {
    const next = dark ? "ios18-light" : "ios18-dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
  }

  function openSettings() {
    close();
    setSettingsOpen(true);
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
    } else {
      setPos(computePos());
      setOpen(true);
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="user-block"
        data-open={open}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggleOpen}
      >
        <span className="avatar">{initials}</span>
        <span className="meta">
          <span className="name">{name}</span>
          {isSuperAdmin && <ReviewNotifier />}
        </span>
        <span className="um-caret" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="um-menu"
              role="menu"
              aria-label={`${name} menu`}
              onKeyDown={onMenuKeyDown}
              style={{
                left: pos.left,
                bottom: pos.bottom,
                minWidth: pos.minWidth,
              }}
            >
              {/* Identity header (name + e-mail), role shown as a small pill. */}
              <div className="um-header">
                <div className="um-header-top">
                  <span className="um-header-name">{name}</span>
                  <span className="um-header-role">{role}</span>
                </div>
                <span className="um-header-email">{email}</span>
              </div>

              <div className="um-sep" role="separator" />

              {/* Profile: no route yet — rendered inert (aria-disabled) with a
                  "coming soon" tooltip rather than removed, to keep the shape. */}
              <button
                type="button"
                role="menuitem"
                className="um-item"
                aria-disabled="true"
                title="Bald verfügbar"
              >
                <span className="um-item-icon">
                  <ProfileIcon />
                </span>
                <span className="um-item-label">Profil</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="um-item"
                aria-haspopup="dialog"
                onClick={openSettings}
              >
                <span className="um-item-icon">
                  <SettingsIcon />
                </span>
                <span className="um-item-label">Einstellungen</span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={dark}
                className="um-item"
                onClick={toggleTheme}
              >
                <span className="um-item-icon">{dark ? <MoonIcon /> : <SunIcon />}</span>
                <span className="um-item-label">Erscheinungsbild</span>
                <span className="um-item-state">{dark ? "Dunkel" : "Hell"}</span>
              </button>

              {/* super_admin-only: User-Management lives in the account menu,
                  not the main sidebar (only 4 of 63 users are super_admins).
                  Navigates via <Link>; closes the menu on select. The route has
                  its own notFound() super_admin gate (defense-in-depth). */}
              {isSuperAdmin && (
                <>
                  <div className="um-sep" role="separator" />
                  <Link
                    href="/admin/users"
                    role="menuitem"
                    className="um-item"
                    onClick={() => close()}
                  >
                    <span className="um-item-icon">
                      <UserCogIcon />
                    </span>
                    <span className="um-item-label">User-Management</span>
                  </Link>
                  <Link
                    href="/admin/knowledge"
                    role="menuitem"
                    className="um-item"
                    onClick={() => close()}
                  >
                    <span className="um-item-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </span>
                    <span className="um-item-label">Wissensbasis</span>
                  </Link>
                </>
              )}

              <div className="um-sep" role="separator" />

              {/* Logout reuses the existing server action (signOut → /login).
                  A form action handles the redirect cleanly, mirroring the admin
                  header's sign-out. */}
              <form action={logoutAction} className="um-logout-form">
                <button type="submit" role="menuitem" className="um-item um-item--danger">
                  <span className="um-item-icon">
                    <LogoutIcon />
                  </span>
                  <span className="um-item-label">Abmelden</span>
                </button>
              </form>
            </div>,
            document.body
          )
        : null}

      <UserSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
