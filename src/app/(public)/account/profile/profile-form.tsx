"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { OwnProfile } from "@/lib/users";
import { updateOwnAvatarAction, updateOwnProfileAction } from "./actions";

// Editable text fields rendered in the two-column grid (status/about/dob handled
// separately below). Order matches the profile mockup.
const TEXT_FIELDS = [
  { key: "location", label: "Location", placeholder: "Frankfurt, Germany", type: "text" },
  { key: "company", label: "Company / Team", placeholder: "airtuerk Service GmbH", type: "text" },
  { key: "website", label: "Portfolio / Website", placeholder: "https://…", type: "url" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/…", type: "url" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…", type: "url" },
  { key: "instagram", label: "Instagram", placeholder: "@username", type: "text" },
  { key: "phone", label: "Phone (work)", placeholder: "+49 …", type: "tel" },
  { key: "privatePhone", label: "Phone (private)", placeholder: "+49 …", type: "tel" },
] as const;

type EditableKey =
  | (typeof TEXT_FIELDS)[number]["key"]
  | "statusLine"
  | "about"
  | "dateOfBirth";

type FormState = Record<EditableKey, string> & { showBirthday: boolean };

function initFrom(p: OwnProfile): FormState {
  return {
    statusLine: p.statusLine ?? "",
    about: p.about ?? "",
    location: p.location ?? "",
    company: p.company ?? "",
    website: p.website ?? "",
    github: p.github ?? "",
    linkedin: p.linkedin ?? "",
    instagram: p.instagram ?? "",
    phone: p.phone ?? "",
    privatePhone: p.privatePhone ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
    showBirthday: p.showBirthday,
  };
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super-Admin",
  admin: "Admin",
  user: "User",
};

export default function ProfileForm({ profile }: { profile: OwnProfile }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => initFrom(profile));
  const [initial] = useState<FormState>(() => initFrom(profile));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    startUpload(async () => {
      const res = await updateOwnAvatarAction(fd);
      if (res.ok) {
        // cache-bust the public URL so the new image shows immediately
        setAvatarUrl(`${res.url}?t=${Date.now()}`);
        toast({ variant: "success", title: "Profile picture updated" });
      } else {
        toast({ variant: "error", title: res.error });
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleSave() {
    startSave(async () => {
      const res = await updateOwnProfileAction({
        statusLine: form.statusLine,
        about: form.about,
        location: form.location,
        company: form.company,
        website: form.website,
        github: form.github,
        linkedin: form.linkedin,
        instagram: form.instagram,
        phone: form.phone,
        privatePhone: form.privatePhone,
        dateOfBirth: form.dateOfBirth || null,
        showBirthday: form.showBirthday,
      });
      if (res.ok) {
        toast({ variant: "success", title: "Profile saved" });
        router.refresh();
      } else {
        toast({ variant: "error", title: res.error });
      }
    });
  }

  const initials =
    (profile.fullName ?? profile.email ?? "U")
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="acp-card">
      {/* Header: avatar + identity */}
      <header className="acp-header">
        <div className="acp-avatar-wrap">
          <div className="acp-avatar" aria-hidden={avatarUrl ? undefined : true}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="acp-avatar-img" />
            ) : (
              <span className="acp-avatar-initials">{initials}</span>
            )}
          </div>
          <button
            type="button"
            className="acp-avatar-edit"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile picture"
            title="Change profile picture"
          >
            {uploading ? <Spinner /> : <CameraIcon />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="acp-file-input"
            onChange={handleAvatarPick}
          />
        </div>

        <div className="acp-identity">
          <h1 className="acp-name">{profile.fullName ?? "—"}</h1>
          <div className="acp-identity-meta">
            <span className="acp-role-pill">{ROLE_LABEL[profile.role] ?? profile.role}</span>
            {profile.position && <span className="acp-meta-dot">·</span>}
            {profile.position && <span>{profile.position}</span>}
            {profile.department && <span className="acp-meta-dot">·</span>}
            {profile.department && <span>{profile.department}</span>}
          </div>
        </div>
      </header>

      {/* Read-only identity row */}
      <section className="acp-section">
        <div className="acp-field acp-field--full">
          <label className="acp-label">Login email</label>
          <input className="acp-input" value={profile.email ?? ""} disabled readOnly />
          <span className="acp-hint">Not editable — the address your invitation was sent to.</span>
        </div>
      </section>

      {/* Status line */}
      <section className="acp-section">
        <div className="acp-field acp-field--full">
          <label htmlFor="acp-status" className="acp-label">
            Status <span className="acp-label-sub">— one sentence about you</span>
          </label>
          <input
            id="acp-status"
            className="acp-input"
            value={form.statusLine}
            maxLength={50}
            placeholder="Happy to work 🙂"
            onChange={(e) => set("statusLine", e.target.value)}
          />
          <span className="acp-counter">{form.statusLine.length}/50</span>
        </div>
      </section>

      {/* Editable grid */}
      <section className="acp-grid">
        {TEXT_FIELDS.map((f) => (
          <div className="acp-field" key={f.key}>
            <label htmlFor={`acp-${f.key}`} className="acp-label">
              {f.label}
            </label>
            <input
              id={`acp-${f.key}`}
              className="acp-input"
              type={f.type}
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}

        {/* Date of birth + visibility */}
        <div className="acp-field">
          <label htmlFor="acp-dob" className="acp-label">Date of birth</label>
          <input
            id="acp-dob"
            className="acp-input"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
          />
        </div>
        <div className="acp-field acp-field--center">
          <label className="acp-check">
            <input
              type="checkbox"
              checked={form.showBirthday}
              onChange={(e) => set("showBirthday", e.target.checked)}
            />
            <span>Show birthday in team</span>
          </label>
        </div>
      </section>

      {/* About */}
      <section className="acp-section">
        <div className="acp-field acp-field--full">
          <label htmlFor="acp-about" className="acp-label">About me</label>
          <textarea
            id="acp-about"
            className="acp-input acp-textarea"
            rows={4}
            value={form.about}
            placeholder="Tell us a bit about yourself, your role or what you're working on."
            onChange={(e) => set("about", e.target.value)}
          />
        </div>
      </section>

      {/* Save bar */}
      <footer className="acp-actions">
        <button
          type="button"
          className="acp-btn"
          disabled={!dirty || saving}
          onClick={() => setForm(initial)}
        >
          Discard
        </button>
        <button
          type="button"
          className="acp-btn acp-btn--primary"
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </footer>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="acp-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}
