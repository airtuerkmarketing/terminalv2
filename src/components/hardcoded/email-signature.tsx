"use client";

import { useMemo, useState } from "react";
import "@/styles/email-signature.css";
import { copyRichText, escapeHtml, imageUrl } from "@/lib/email-tools";

/**
 * Your Signature generator (hardcoded route, component_key='email-signature').
 * Ported from the Webflow embed (spec/embeds/service-page-support.js, the sg-*
 * IIFE) to a controlled React component — real useState/useMemo, no DOM scraping.
 *
 * IMAGE SOURCES (the Webflow embed hot-linked cdn.prod.website-files.com, which
 * dies at cutover — none of those URLs survive here):
 *   • Logo   → Supabase Storage (brand-logos/airtuerk-service/airtuerk-Logo.svg).
 *   • IG/LI  → inlined SVG glyphs below (generic marks, nothing to host).
 *   • Banner → Supabase Storage (misc/Kununu-Banner-26.jpg + -26-1.jpg).
 * CAVEAT surfaced in the UI: the logo is an SVG and the social icons are inline
 * SVG; desktop Outlook does not render either, so a raster logo/icons should be
 * uploaded before this is the canonical company signature.
 */

const LOGO = imageUrl("brand-logos/airtuerk-service/airtuerk-Logo.svg");
const BANNER: Record<1 | 2, string> = {
  1: imageUrl("misc/Kununu-Banner-26.jpg"),
  2: imageUrl("misc/Kununu-Banner-26-1.jpg"),
};
const BANNER_W = 530;
const BANNER_H = 158;
const SWYX_PREFIX = "069 264 86 78 - ";
const LINKS = {
  logo: "https://www.airtuerk.de/",
  ig: "https://www.instagram.com/airtuerk_official/",
  li: "https://www.linkedin.com/company/airtuerk-service-gmbh",
};

// Instagram + LinkedIn marks inlined as SVG — generic brand glyphs, so no hosting
// and no dead Webflow hot-link. Filled paths (not strokes) render in more clients.
const IG_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#000" style="display:block;"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.51.01-4.74.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.23-.07 1.59-.07 4.15s.01 2.92.07 4.15c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.23.06 1.59.07 4.74.07s3.51-.01 4.74-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.23.07-1.59.07-4.15s-.01-2.92-.07-4.15c-.04-.9-.19-1.39-.32-1.71-.17-.43-.37-.74-.69-1.06-.32-.32-.63-.52-1.06-.69-.32-.13-.81-.28-1.71-.32C15.51 4.01 15.15 4 12 4zm0 3.06A4.94 4.94 0 1 0 12 16.94 4.94 4.94 0 0 0 12 7.06zm0 1.8a3.14 3.14 0 1 1 0 6.28 3.14 3.14 0 0 1 0-6.28zm5.14-2.96a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z"/></svg>';
const LI_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#000" style="display:block;"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>';

type PhoneLabel = "tel" | "mobil" | null;

interface SigFields {
  name: string;
  position: string;
  email: string;
  phone: string;
  phone2: string | null; // null = field hidden
  swyxExt: string | null; // null = field hidden; "" = shown but empty
  banner: 1 | 2 | null; // null = hidden
  label1: PhoneLabel;
  label2: PhoneLabel;
}

function phonePrefix(label: PhoneLabel): string {
  if (label === "tel") return "Tel. ";
  if (label === "mobil") return "Mobil: ";
  return "";
}

function swyxFull(ext: string | null): string {
  const v = (ext ?? "").trim();
  return v ? SWYX_PREFIX + v : "";
}

function phone2Value(p: string | null): string {
  return (p ?? "").trim();
}

function bannerBlock(variant: 1 | 2 | null): string {
  if (variant == null) return "";
  const url = BANNER[variant];
  return (
    '<table cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 0 0;border-collapse:collapse;border-spacing:0;"><tr><td style="padding:0;">' +
    '<img src="' +
    url +
    '" alt="kununu Top Company 2026 - airtuerk Service GmbH" width="' +
    BANNER_W +
    '" height="' +
    BANNER_H +
    '" style="display:block;width:' +
    BANNER_W +
    "px;height:" +
    BANNER_H +
    'px;border:0;outline:none;"></td></tr></table>'
  );
}

/** Full HTML signature (logo + name + contact + optional banner + legal). */
function buildMain(f: SigFields): string {
  const n = escapeHtml(f.name.trim() || "Your Name");
  const positionRaw = f.position.trim();
  const p = escapeHtml(positionRaw);
  const e = escapeHtml(f.email.trim() || "name@airtuerk.de");
  // Default deviates from the original embed, which double-escaped "&#43;49 ..."
  // (rendering a literal "&#43;"). A clean "+49 000 000 0000" is the intent.
  const t = phonePrefix(f.label1) + escapeHtml(f.phone.trim() || "+49 000 000 0000");
  const t2raw = phone2Value(f.phone2);
  const swyxraw = swyxFull(f.swyxExt);
  const t2Block = t2raw
    ? '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;">' +
      phonePrefix(f.label2) +
      escapeHtml(t2raw) +
      "</p>"
    : "";
  const swyxBlock = swyxraw
    ? '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;">Office: ' +
      escapeHtml(swyxraw) +
      "</p>"
    : "";
  const positionBlock = positionRaw
    ? '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333;line-height:1.2;">' +
      p +
      "</p>"
    : "";
  return (
    '<div style="font-family:Arial,sans-serif;color:#333;">' +
    '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-spacing:0;">' +
    "<tr>" +
    '<td style="vertical-align:top;padding:0 14px 0 0;"><a href="' +
    LINKS.logo +
    '" style="text-decoration:none;" target="_blank"><img src="' +
    LOGO +
    '" alt="airtuerk" width="86" height="19" style="display:block;width:86px;height:19px;border:0;outline:none;"></a></td>' +
    '<td style="vertical-align:top;padding:0;"><p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;font-weight:bold;color:#333;line-height:1.2;">' +
    n +
    "</p>" +
    positionBlock +
    "</td>" +
    "</tr>" +
    '<tr><td colspan="2" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>' +
    "<tr>" +
    '<td style="vertical-align:top;padding:0 14px 0 0;"><table cellspacing="0" cellpadding="0" border="0"><tr>' +
    '<td style="padding:0 6px 0 0;"><a href="' +
    LINKS.ig +
    '" style="text-decoration:none;" target="_blank">' +
    IG_SVG +
    "</a></td>" +
    '<td style="padding:0;"><a href="' +
    LINKS.li +
    '" style="text-decoration:none;" target="_blank">' +
    LI_SVG +
    "</a></td>" +
    "</tr></table></td>" +
    '<td style="vertical-align:top;padding:0;">' +
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;"><a href="mailto:' +
    e +
    '" style="color:#000;text-decoration:none;">' +
    e +
    "</a></p>" +
    '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;">' +
    t +
    "</p>" +
    t2Block +
    swyxBlock +
    "</td>" +
    "</tr>" +
    "</table>" +
    bannerBlock(f.banner) +
    '<p style="margin:14px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Speicherstra&#223;e 1, 60327 Frankfurt am Main</p>' +
    '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Gesch&#228;ftsf&#252;hrer: &#220;mit Tenekeci | USt-ID: DE254890797 | Amtsgericht Frankfurt a.M. HRB-Nr.: 80 417</p>' +
    '<p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Diese E-Mail enth&#228;lt vertrauliche und/oder rechtlich gesch&#252;tzte Informationen. Wenn Sie nicht der richtige Adressat sind oder diese E-Mail irrt&#252;mlich erhalten haben, informieren Sie bitte sofort den Absender und vernichten Sie diese E-Mail.</p>' +
    "</div>"
  );
}

/** Compact, text-only signature for replies/forwards (no logo, no banner). */
function buildReply(f: SigFields): string {
  const n = escapeHtml(f.name.trim() || "Your Name");
  const positionRaw = f.position.trim();
  const p = escapeHtml(positionRaw);
  const e = escapeHtml(f.email.trim() || "name@airtuerk.de");
  const t = phonePrefix(f.label1) + escapeHtml(f.phone.trim() || "+49 000 000 0000");
  const t2raw = phone2Value(f.phone2);
  const swyxraw = swyxFull(f.swyxExt);
  const t2Block = t2raw
    ? '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;">' +
      phonePrefix(f.label2) +
      escapeHtml(t2raw) +
      "</p>"
    : "";
  const swyxBlock = swyxraw
    ? '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;">Office: ' +
      escapeHtml(swyxraw) +
      "</p>"
    : "";
  const positionBlock = positionRaw
    ? '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333;line-height:1.3;">' +
      p +
      "</p>"
    : "";
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#333;">' +
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;font-weight:bold;color:#333;line-height:1.3;">' +
    n +
    "</p>" +
    positionBlock +
    '<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;"><a href="mailto:' +
    e +
    '" style="color:#333;text-decoration:none;">' +
    e +
    "</a></p>" +
    '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;">' +
    t +
    "</p>" +
    t2Block +
    swyxBlock +
    '<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.2;">' +
    '<a href="' +
    LINKS.logo +
    '" style="color:#333;text-decoration:none;" target="_blank">airtuerk.de</a>' +
    ' <span style="color:#CCC;">|</span> <a href="' +
    LINKS.li +
    '" style="color:#333;text-decoration:none;" target="_blank">LinkedIn</a>' +
    ' <span style="color:#CCC;">|</span> <a href="' +
    LINKS.ig +
    '" style="color:#333;text-decoration:none;" target="_blank">Instagram</a>' +
    "</p>" +
    '<p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#CCC;line-height:1;letter-spacing:-0.5px;">_________________________________________</p>' +
    '<p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Speicherstra&#223;e 1, 60327 Frankfurt am Main</p>' +
    '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Gesch&#228;ftsf&#252;hrer: &#220;mit Tenekeci | USt-ID: DE254890797 | Amtsgericht Frankfurt a.M. HRB-Nr.: 80 417</p>' +
    "</div>"
  );
}

/** Plain-text fallback (the text/plain half of the clipboard payload). */
function buildPlain(f: SigFields, tab: "main" | "reply"): string {
  const lines: string[] = [f.name.trim()];
  const positionTrimmed = f.position.trim();
  if (positionTrimmed) lines.push(positionTrimmed);
  lines.push("", f.email.trim(), phonePrefix(f.label1) + f.phone.trim());
  const t2 = phone2Value(f.phone2);
  if (t2) lines.push(phonePrefix(f.label2) + t2);
  const swyx = swyxFull(f.swyxExt);
  if (swyx) lines.push("Office: " + swyx);
  if (tab === "main") {
    lines.push(
      "",
      "Speicherstraße 1, 60327 Frankfurt am Main",
      "Geschäftsführer: Ümit Tenekeci | USt-ID: DE254890797 | Amtsgericht Frankfurt a.M. HRB-Nr.: 80 417"
    );
  } else {
    lines.push("", "airtuerk.de | LinkedIn | Instagram");
  }
  return lines.join("\n");
}

const NONE = { main: false, reply: false } as const;

export function EmailSignature({ title }: { title: string }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState<string | null>(null);
  const [swyxExt, setSwyxExt] = useState<string | null>(null);
  const [banner, setBanner] = useState<1 | 2 | null>(null);
  const [label1, setLabel1] = useState<PhoneLabel>(null);
  const [label2, setLabel2] = useState<PhoneLabel>(null);

  const [activeCard, setActiveCard] = useState<"main" | "reply">("main");
  const [copied, setCopied] = useState<{ main: boolean; reply: boolean }>({ ...NONE });
  const [flash, setFlash] = useState<{ main: boolean; reply: boolean }>({ ...NONE });
  const [infoOpen, setInfoOpen] = useState(false);

  const fields: SigFields = useMemo(
    () => ({ name, position, email, phone, phone2, swyxExt, banner, label1, label2 }),
    [name, position, email, phone, phone2, swyxExt, banner, label1, label2]
  );

  const built = useMemo(
    () => ({
      mainHtml: buildMain(fields),
      replyHtml: buildReply(fields),
      mainPlain: buildPlain(fields, "main"),
      replyPlain: buildPlain(fields, "reply"),
    }),
    [fields]
  );

  // Any content edit invalidates the "copied" confirmation (matches the embed).
  const resetCopied = () => setCopied({ ...NONE });

  async function handleCopy(tab: "main" | "reply") {
    setActiveCard(tab);
    const html = tab === "main" ? built.mainHtml : built.replyHtml;
    const plain = tab === "main" ? built.mainPlain : built.replyPlain;
    const ok = await copyRichText(html, plain);
    if (!ok) return;
    setCopied((c) => ({ ...c, [tab]: true }));
    setFlash((c) => ({ ...c, [tab]: true }));
    window.setTimeout(() => setFlash((c) => ({ ...c, [tab]: false })), 1800);
  }

  // Tel/Mobil badges are mutually exclusive across the two phones.
  function toggleLabel(phoneNum: 1 | 2, label: "tel" | "mobil") {
    if (phoneNum === 1) setLabel1((cur) => (cur === label ? null : label));
    else setLabel2((cur) => (cur === label ? null : label));
    resetCopied();
  }

  function badgesFor(phoneNum: 1 | 2) {
    const mine = phoneNum === 1 ? label1 : label2;
    const other = phoneNum === 1 ? label2 : label1;
    return (["tel", "mobil"] as const)
      .filter((label) => other !== label) // hide the option the other phone claimed
      .map((label) => {
        const active = mine === label;
        const text = label === "tel" ? "Tel" : "Mobil";
        return (
          <button
            key={label}
            type="button"
            className={`sig-badge${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => toggleLabel(phoneNum, label)}
          >
            {active ? "✓ " : "+ "}
            {text}
          </button>
        );
      });
  }

  return (
    <article className="email-signature">
      <header className="page-hero">
        <div className="eyebrow">Brand Tools</div>
        <h1>{title}</h1>
        <p className="lead">
          Build a consistent airtuerk email signature in seconds — fill in your
          details, then copy the Main version for new mails and the Reply version
          for responses.
        </p>
      </header>

      <div className="sig-wrap">
        {/* ── Form ── */}
        <div className="sig-form">
          <h2 className="sig-form-title">Your details</h2>
          <p className="sig-form-sub">The preview updates live as you type.</p>

          <div className="sig-field">
            <label htmlFor="sig-name">Full name</label>
            <input
              id="sig-name"
              className="sig-input"
              type="text"
              value={name}
              placeholder="Max Mustermann"
              onChange={(e) => {
                setName(e.target.value);
                resetCopied();
              }}
            />
          </div>

          <div className="sig-field">
            <label htmlFor="sig-position">Position</label>
            <input
              id="sig-position"
              className="sig-input"
              type="text"
              value={position}
              placeholder="Geschäftsführer"
              onChange={(e) => {
                setPosition(e.target.value);
                resetCopied();
              }}
            />
          </div>

          <div className="sig-field">
            <label htmlFor="sig-email">E-mail</label>
            <input
              id="sig-email"
              className="sig-input"
              type="email"
              value={email}
              placeholder="max.mustermann@airtuerk.de"
              onChange={(e) => {
                setEmail(e.target.value);
                resetCopied();
              }}
            />
          </div>

          <div className="sig-field">
            <div className="sig-field-head">
              <label htmlFor="sig-phone">Phone</label>
              <div className="sig-field-actions">{badgesFor(1)}</div>
            </div>
            <input
              id="sig-phone"
              className="sig-input"
              type="tel"
              value={phone}
              placeholder="+49 69 1234567"
              onChange={(e) => {
                setPhone(e.target.value);
                resetCopied();
              }}
            />
          </div>

          {/* Optional: second phone */}
          {phone2 !== null && (
            <div className="sig-field sig-field-optional">
              <div className="sig-field-head">
                <label htmlFor="sig-phone2">
                  Second phone <span className="sig-field-hint">optional</span>
                </label>
                <div className="sig-field-actions">
                  {badgesFor(2)}
                  <button
                    type="button"
                    className="sig-field-remove"
                    aria-label="Remove second phone"
                    onClick={() => {
                      setPhone2(null);
                      setLabel2(null);
                      resetCopied();
                    }}
                  >
                    <XSvg />
                  </button>
                </div>
              </div>
              <input
                id="sig-phone2"
                className="sig-input"
                type="tel"
                value={phone2}
                placeholder="+49 151 12345678"
                autoFocus
                onChange={(e) => {
                  setPhone2(e.target.value);
                  resetCopied();
                }}
              />
            </div>
          )}

          {/* Optional: Swyx extension */}
          {swyxExt !== null && (
            <div className="sig-field sig-field-optional">
              <div className="sig-field-head">
                <label htmlFor="sig-swyx">
                  Swyx office line <span className="sig-field-hint">extension</span>
                </label>
                <div className="sig-field-actions">
                  <button
                    type="button"
                    className="sig-field-remove"
                    aria-label="Remove Swyx line"
                    onClick={() => {
                      setSwyxExt(null);
                      resetCopied();
                    }}
                  >
                    <XSvg />
                  </button>
                </div>
              </div>
              <div className="sig-prefix-input">
                <span className="sig-prefix">{SWYX_PREFIX}</span>
                <input
                  id="sig-swyx"
                  type="text"
                  value={swyxExt}
                  placeholder="123"
                  autoFocus
                  onChange={(e) => {
                    setSwyxExt(e.target.value);
                    resetCopied();
                  }}
                />
              </div>
            </div>
          )}

          {/* Optional: kununu banner */}
          {banner !== null && (
            <div className="sig-field sig-field-optional">
              <div className="sig-field-head">
                <label id="sig-banner-label">
                  kununu banner <span className="sig-field-hint">Main only</span>
                </label>
                <div className="sig-field-actions">
                  <button
                    type="button"
                    className="sig-field-remove"
                    aria-label="Remove kununu banner"
                    onClick={() => {
                      setBanner(null);
                      resetCopied();
                    }}
                  >
                    <XSvg />
                  </button>
                </div>
              </div>
              <div className="sig-banner-variants" role="group" aria-labelledby="sig-banner-label">
                {([1, 2] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`sig-banner-variant${banner === v ? " is-active" : ""}`}
                    aria-pressed={banner === v}
                    aria-label={`kununu banner variant ${v}`}
                    onClick={() => {
                      setBanner(v);
                      resetCopied();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage banner */}
                    <img src={BANNER[v]} alt={`kununu banner variant ${v}`} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-field row */}
          <div className="sig-add-row">
            {phone2 === null && (
              <button
                type="button"
                className="sig-add-btn"
                onClick={() => {
                  setPhone2("");
                  resetCopied();
                }}
              >
                <PlusSvg /> Second phone
              </button>
            )}
            {swyxExt === null && (
              <button
                type="button"
                className="sig-add-btn"
                onClick={() => {
                  setSwyxExt("");
                  resetCopied();
                }}
              >
                <PlusSvg /> Swyx line
              </button>
            )}
            {banner === null && (
              <button
                type="button"
                className="sig-add-btn"
                onClick={() => {
                  setBanner(1);
                  resetCopied();
                }}
              >
                <PlusSvg /> kununu banner
              </button>
            )}
          </div>

          <p className="sig-note">
            <InfoSvg />
            <span>
              The logo and social icons use SVG; they render in webmail (Gmail,
              Apple Mail) but desktop Outlook may hide them. Upload a raster (PNG)
              logo &amp; icons before rolling this out company-wide.
            </span>
          </p>
        </div>

        {/* ── Previews ── */}
        <div className="sig-preview-wrap">
          {(["main", "reply"] as const).map((tab) => {
            const isMain = tab === "main";
            const html = isMain ? built.mainHtml : built.replyHtml;
            const isActive = activeCard === tab;
            const isFlash = flash[tab];
            const isCopied = copied[tab];
            return (
              <div
                key={tab}
                className={`sig-card${isActive ? " is-active" : ""}`}
                onClick={() => setActiveCard(tab)}
              >
                <div className="sig-card-head">
                  <div className="sig-card-info">
                    <div className="sig-card-title">{isMain ? "Main signature" : "Reply signature"}</div>
                    <div className="sig-card-sub">
                      {isMain ? "Full version — for new emails" : "Compact — for replies & forwards"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`sig-copy-btn${isFlash ? " is-copied" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCopy(tab);
                    }}
                  >
                    {isFlash ? <CheckSvg /> : <CopySvg />}
                    {isFlash
                      ? "Copied!"
                      : isCopied
                        ? `Copy ${isMain ? "Main" : "Reply"} again`
                        : `Copy ${isMain ? "Main" : "Reply"}`}
                  </button>
                </div>
                <div className="sig-card-body">
                  {/* Live preview of the exact HTML that gets copied to the clipboard. */}
                  <div className="sig-paper" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              </div>
            );
          })}

          {/* How to install */}
          <div className={`sig-info-card${infoOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="sig-info-toggle"
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((o) => !o)}
            >
              <span className="sig-info-title">
                <InfoSvg /> How to install your signature
              </span>
              <ChevronSvg />
            </button>
            <div className="sig-info-collapse">
              <div className="sig-info-collapse-inner">
                <div className="sig-info-rows">
                  <div className="sig-info-row">
                    <span className="sig-info-step">1</span>
                    <span className="sig-info-text">
                      Fill in your details above, then click <strong>Copy Main</strong>.
                    </span>
                  </div>
                  <div className="sig-info-row">
                    <span className="sig-info-step">2</span>
                    <span className="sig-info-text">
                      <strong>Outlook:</strong> File → Options → Mail → Signatures → New, then
                      paste with <strong>Ctrl+V</strong>.
                    </span>
                  </div>
                  <div className="sig-info-row">
                    <span className="sig-info-step">3</span>
                    <span className="sig-info-text">
                      <strong>Apple Mail / Gmail:</strong> open Signature settings and paste.
                      In Apple Mail, untick “Match my default message font”.
                    </span>
                  </div>
                  <div className="sig-info-row">
                    <span className="sig-info-step">4</span>
                    <span className="sig-info-text">
                      Use <strong>Copy Reply</strong> for the shorter version on replies and
                      forwards.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── Inline UI icons (chrome — distinct from the email-content SVGs above) ── */
function CopySvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function PlusSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function XSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ChevronSvg() {
  return (
    <svg className="sig-info-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function InfoSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
