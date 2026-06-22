"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import "@/styles/out-of-office.css";
import { copyRichText, escapeHtml } from "@/lib/email-tools";

/**
 * Out-of-Office message generator (Task 5c). Ported from the Webflow embed
 * (spec/embeds/service-page-support.js, the oo-* IIFE lines 277-439) to a
 * controlled React component. Rendered as a section BELOW the signature
 * generator inside the same email-signature page component — it is brand-
 * agnostic (pure text, no logo), so it is identical on all 4 signature routes.
 *
 * The DE/EN/TR × Formal/Casual templates and the reason labels are ported
 * VERBATIM (exact corporate wording). Two deliberate, documented changes vs the
 * source:
 *   • User input is HTML-escaped before going into the live preview's
 *     dangerouslySetInnerHTML — the original interpolated raw values into
 *     innerHTML (an XSS hole). Subject is rendered as a React text node.
 *   • "Open in Outlook" (mailto) uses the message body only; the source reused
 *     buildPlainText() there, which duplicated the subject line inside the body.
 *
 * The holiday quick-select DATES are NOT in the preserved embed fragment (only
 * the .oo-pill handler reading data-from/data-to survived) — supplied here as
 * sensible 2026/27 German (Hesse/Frankfurt) holiday ranges; the date inputs stay
 * editable.
 */

type Lang = "de" | "en" | "tr";
type Tone = "formal" | "locker";
type Grund = "urlaub" | "dienstreise" | "messe" | "schulung" | "krank";

interface Template {
  subject: (name: string) => string;
  gruss: string;
  intro: (von: string, bis: string, grund: string) => string;
  rueck: (bis: string) => string;
  vtext: (vname: string, vemail: string, vphone: string) => string;
  gruss2: string;
}

const TEXTS: Record<Lang, Record<Tone, Template>> = {
  de: {
    formal: {
      subject: (name) => "Abwesenheitsnotiz: " + name,
      gruss: "Sehr geehrte Damen und Herren,",
      intro: (von, bis, grund) =>
        "vielen Dank für Ihre Nachricht." +
        (grund ? " Ich befinde mich" + grund + "." : "") +
        "\nIch bin vom <strong>" + von + "</strong> bis einschließlich <strong>" + bis + "</strong> nicht erreichbar.",
      rueck: (bis) =>
        "Ab dem <strong>" + bis + "</strong> stehe ich Ihnen wieder zur Verfügung und werde mich umgehend bei Ihnen melden.",
      vtext: (vname, vemail, vphone) =>
        "In dringenden Fällen wenden Sie sich bitte an meine Vertretung:\n<strong>" + vname + "</strong>" +
        (vemail ? "\n✉ " + vemail : "") + (vphone ? "\n☎ " + vphone : ""),
      gruss2: "Mit freundlichen Grüßen,",
    },
    locker: {
      subject: (name) => "Bin grad weg — " + name,
      gruss: "Hallo,",
      intro: (von, bis, grund) =>
        "danke für deine Nachricht!" +
        (grund ? " Ich bin" + grund + "." : "") +
        "\nIch bin vom <strong>" + von + "</strong> bis <strong>" + bis + "</strong> nicht erreichbar.",
      rueck: (bis) => "Ab <strong>" + bis + "</strong> bin ich wieder da und melde mich dann bei dir!",
      vtext: (vname, vemail, vphone) =>
        "Bei dringenden Sachen wende dich gerne an:\n<strong>" + vname + "</strong>" +
        (vemail ? "\n✉ " + vemail : "") + (vphone ? "\n☎ " + vphone : ""),
      gruss2: "Viele Grüße,",
    },
  },
  en: {
    formal: {
      subject: (name) => "Out of Office: " + name,
      gruss: "Dear Sir or Madam,",
      intro: (von, bis, grund) =>
        "Thank you for your message." +
        (grund ? " I am currently" + grund + "." : "") +
        "\nI will be out of the office from <strong>" + von + "</strong> to <strong>" + bis + "</strong> (inclusive).",
      rueck: (bis) => "I will return on <strong>" + bis + "</strong> and will respond to your message as soon as possible.",
      vtext: (vname, vemail, vphone) =>
        "For urgent matters, please contact my colleague:\n<strong>" + vname + "</strong>" +
        (vemail ? "\n✉ " + vemail : "") + (vphone ? "\n☎ " + vphone : ""),
      gruss2: "Kind regards,",
    },
    locker: {
      subject: (name) => "OOO — " + name,
      gruss: "Hi there,",
      intro: (von, bis, grund) =>
        "Thanks for your message!" +
        (grund ? " I'm currently" + grund + "." : "") +
        "\nI'm out of office from <strong>" + von + "</strong> to <strong>" + bis + "</strong>.",
      rueck: (bis) => "I'll be back on <strong>" + bis + "</strong> and will get back to you then!",
      vtext: (vname, vemail, vphone) =>
        "For anything urgent, reach out to:\n<strong>" + vname + "</strong>" +
        (vemail ? "\n✉ " + vemail : "") + (vphone ? "\n☎ " + vphone : ""),
      gruss2: "Best,",
    },
  },
  tr: {
    formal: {
      subject: (name) => "Ofis Dışında: " + name,
      gruss: "Sayın ilgili,",
      intro: (von, bis, grund) =>
        "Mesajınız için teşekkür ederim." +
        (grund ? " Şu anda" + grund + "." : "") +
        "\n<strong>" + von + "</strong> – <strong>" + bis + "</strong> tarihleri arasında ofiste olmayacağım.",
      rueck: (bis) =>
        "<strong>" + bis + "</strong> tarihinden itibaren tekrar erişilebilir olacak ve en kısa sürede dönüş yapacağım.",
      vtext: (vname, vemail, vphone) =>
        "Acil durumlarda lütfen şu kişiyle iletişime geçin:\n<strong>" + vname + "</strong>" +
        (vemail ? "\n✉ " + vemail : "") + (vphone ? "\n☎ " + vphone : ""),
      gruss2: "Saygılarımla,",
    },
    locker: {
      subject: (name) => "Şu an ofiste değilim — " + name,
      gruss: "Merhaba,",
      intro: (von, bis, grund) =>
        "Mesajın için teşekkürler!" +
        (grund ? " " + grund + "." : "") +
        "\n<strong>" + von + "</strong> – <strong>" + bis + "</strong> tarihleri arasında ofiste olmayacağım.",
      rueck: (bis) => "<strong>" + bis + "</strong> tarihinde döneceğim ve sana o zaman yazacağım!",
      vtext: (vname, vemail, vphone) =>
        "Acil bir şey varsa şu kişiye ulaşabilirsin:\n<strong>" + vname + "</strong>" +
        (vemail ? "\n✉ " + vemail : "") + (vphone ? "\n☎ " + vphone : ""),
      gruss2: "İyi günler,",
    },
  },
};

const GRUND_LABELS: Record<Lang, Record<Grund, string>> = {
  de: { urlaub: " im Urlaub", dienstreise: " auf Dienstreise", messe: " auf einer Messe", schulung: " auf einer Schulung", krank: " erkrankt" },
  en: { urlaub: " on annual leave", dienstreise: " on a business trip", messe: " at a trade fair", schulung: " at a training", krank: " on sick leave" },
  tr: { urlaub: " yıllık izindeyim", dienstreise: " iş seyahatindeyim", messe: " bir fuardayım", schulung: " eğitimdeyim", krank: " rahatsızım" },
};

// Reason chips → GRUND_LABELS keys. English UI labels.
const REASONS: { key: Grund; label: string }[] = [
  { key: "urlaub", label: "Vacation" },
  { key: "dienstreise", label: "Business trip" },
  { key: "messe", label: "Trade fair" },
  { key: "schulung", label: "Training" },
  { key: "krank", label: "Sick leave" },
];

// Holiday quick-select. NOTE: the original embed's data-from/data-to values were
// not preserved — these are sensible German (Hesse/Frankfurt) holiday ranges for
// 2026/27. "return to work" is always to+1 (computed in the template).
const HOLIDAYS: { key: string; label: string; from: string; to: string }[] = [
  { key: "easter", label: "Easter '26", from: "2026-04-03", to: "2026-04-06" },
  { key: "ascension", label: "Ascension '26", from: "2026-05-14", to: "2026-05-17" },
  { key: "whitsun", label: "Whitsun '26", from: "2026-05-23", to: "2026-05-25" },
  { key: "unity", label: "Unity Day", from: "2026-10-02", to: "2026-10-04" },
  { key: "christmas", label: "Christmas", from: "2026-12-24", to: "2026-12-27" },
  { key: "newyear", label: "New Year's", from: "2026-12-31", to: "2027-01-03" },
];

const LANGS: { key: Lang; label: string }[] = [
  { key: "de", label: "DE" },
  { key: "en", label: "EN" },
  { key: "tr", label: "TR" },
];

/** "YYYY-MM-DD" → "DD.MM.YYYY"; empty → "?". */
function formatDate(val: string): string {
  if (!val) return "?";
  const p = val.split("-");
  return p[2] + "." + p[1] + "." + p[0];
}

/** Add one calendar day to a "YYYY-MM-DD" string (UTC math, timezone-safe). */
function addOneDay(val: string): string {
  if (!val) return val;
  const [y, m, d] = val.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}

// useSyncExternalStore needs a subscribe fn; the default date never changes after
// mount, so this is a no-op (returns a no-op unsubscribe).
const noopSubscribe = () => () => {};

/** Local today (+offset days) as "YYYY-MM-DD" (local components, no UTC drift). */
function todayISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function OutOfOffice() {
  const [lang, setLang] = useState<Lang>("de");
  const [ton, setTon] = useState<Tone>("formal");
  const [grund, setGrund] = useState<Grund | null>(null);
  const [activePill, setActivePill] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  // Default range = today .. today+7. useSyncExternalStore returns "" during SSR
  // and the initial hydration render (matching the server HTML, so the preview's
  // dangerouslySetInnerHTML has no hydration mismatch), then the client date once
  // mounted. `from`/`to` fall back to that default until the user or a holiday chip
  // overrides them — `??` keeps an explicitly-cleared empty string as a valid value.
  const defFrom = useSyncExternalStore(noopSubscribe, () => todayISO(0), () => "");
  const defTo = useSyncExternalStore(noopSubscribe, () => todayISO(7), () => "");
  const [fromOverride, setFromOverride] = useState<string | null>(null);
  const [toOverride, setToOverride] = useState<string | null>(null);
  const from = fromOverride ?? defFrom;
  const to = toOverride ?? defTo;
  const [vname, setVname] = useState("");
  const [vemail, setVemail] = useState("");
  const [vphone, setVphone] = useState("");
  const [copied, setCopied] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const reset = () => setCopied(false);

  const out = useMemo(() => {
    const t = TEXTS[lang][ton];
    const nameRaw = name.trim() || "Your Name";
    const posRaw = position.trim();
    const von = formatDate(from);
    const bis = formatDate(to);
    const bisPlus = formatDate(addOneDay(to));
    const grundStr = grund ? GRUND_LABELS[lang][grund] || "" : "";
    const vnRaw = vname.trim();
    const veRaw = vemail.trim();
    const vpRaw = vphone.trim();

    // Build the body twice: escaped for HTML (preview/clipboard), raw for plain text.
    const buildBody = (esc: boolean): string => {
      const nm = esc ? escapeHtml(nameRaw) : nameRaw;
      const ps = esc ? escapeHtml(posRaw) : posRaw;
      const vn = esc ? escapeHtml(vnRaw) : vnRaw;
      const ve = esc ? escapeHtml(veRaw) : veRaw;
      const vp = esc ? escapeHtml(vpRaw) : vpRaw;
      const parts = [t.gruss, "", t.intro(von, bis, grundStr), "", t.rueck(bisPlus)];
      if (vnRaw) parts.push("", t.vtext(vn, ve, vp));
      parts.push("", t.gruss2, nm + (posRaw ? "\n" + ps : ""));
      return parts.join("\n");
    };

    const bodyHtml = buildBody(true).replace(/\n/g, "<br>");
    const bodyPlain = buildBody(false).replace(/<strong>/g, "").replace(/<\/strong>/g, "");
    const subject = t.subject(nameRaw);
    return {
      subject,
      bodyHtml,
      copyHtml: "<p>" + bodyHtml + "</p>",
      copyPlain: subject + "\n\n" + bodyPlain,
      mailtoBody: bodyPlain,
    };
  }, [lang, ton, grund, name, position, from, to, vname, vemail, vphone]);

  async function handleCopy() {
    const ok = await copyRichText(out.copyHtml, out.copyPlain);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleOutlook() {
    const url =
      "mailto:?subject=" + encodeURIComponent(out.subject) + "&body=" + encodeURIComponent(out.mailtoBody);
    window.location.href = url;
  }

  function selectPill(h: (typeof HOLIDAYS)[number]) {
    setFromOverride(h.from);
    setToOverride(h.to);
    setActivePill((cur) => (cur === h.key ? null : h.key));
    reset();
  }

  return (
    <section className="oo">
      <div className="tool-section-head">
        <h2>Out-of-Office</h2>
        <p className="tool-lead">
          Generate an automatic out-of-office reply in German, English or Turkish — pick your
          dates and tone, then copy it straight into Outlook.
        </p>
      </div>

      <div className="oo-wrap">
        {/* ── Form ── */}
        <div className="oo-form">
          <div className="oo-style-bar">
            <div className="oo-toggle-group">
              <span className="oo-toggle-label">Language</span>
              <div className="oo-toggle" role="group" aria-label="Language">
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    className={`oo-toggle-btn${lang === l.key ? " oo-toggle-active" : ""}`}
                    aria-pressed={lang === l.key}
                    onClick={() => {
                      setLang(l.key);
                      reset();
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="oo-toggle-group">
              <span className="oo-toggle-label">Tone</span>
              <div className="oo-toggle" role="group" aria-label="Tone">
                {([
                  { key: "formal", label: "Formal" },
                  { key: "locker", label: "Casual" },
                ] as const).map((tn) => (
                  <button
                    key={tn.key}
                    type="button"
                    className={`oo-toggle-btn${ton === tn.key ? " oo-toggle-active" : ""}`}
                    aria-pressed={ton === tn.key}
                    onClick={() => {
                      setTon(tn.key);
                      reset();
                    }}
                  >
                    {tn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="oo-field">
            <label htmlFor="oo-name">Your name</label>
            <input
              id="oo-name"
              type="text"
              value={name}
              placeholder="Max Mustermann"
              onChange={(e) => {
                setName(e.target.value);
                reset();
              }}
            />
          </div>

          <div className="oo-field">
            <label htmlFor="oo-position">
              Position <span className="oo-optional">optional</span>
            </label>
            <input
              id="oo-position"
              type="text"
              value={position}
              placeholder="Geschäftsführer"
              onChange={(e) => {
                setPosition(e.target.value);
                reset();
              }}
            />
          </div>

          <div className="oo-date-row">
            <div className="oo-field">
              <label htmlFor="oo-from">From</label>
              <input
                id="oo-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFromOverride(e.target.value);
                  reset();
                }}
              />
            </div>
            <div className="oo-field">
              <label htmlFor="oo-to">To</label>
              <input
                id="oo-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setToOverride(e.target.value);
                  reset();
                }}
              />
            </div>
          </div>

          <div className="oo-shortcuts">
            <span className="oo-shortcuts-label">Quick select</span>
            <div className="oo-shortcut-pills">
              {HOLIDAYS.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  className={`oo-pill${activePill === h.key ? " oo-pill-active" : ""}`}
                  aria-pressed={activePill === h.key}
                  onClick={() => selectPill(h)}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div className="oo-shortcuts">
            <span className="oo-shortcuts-label">
              Reason <span className="oo-optional">optional</span>
            </span>
            <div className="oo-badge-row">
              {REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={`oo-badge${grund === r.key ? " oo-badge-active" : ""}`}
                  aria-pressed={grund === r.key}
                  onClick={() => {
                    setGrund((cur) => (cur === r.key ? null : r.key));
                    reset();
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="oo-field">
            <label htmlFor="oo-vname">
              Deputy <span className="oo-optional">optional</span>
            </label>
            <input
              id="oo-vname"
              type="text"
              value={vname}
              placeholder="Erika Mustermann"
              onChange={(e) => {
                setVname(e.target.value);
                reset();
              }}
            />
          </div>
          <div className="oo-deputy-row">
            <div className="oo-field">
              <label htmlFor="oo-vemail">Deputy e-mail</label>
              <input
                id="oo-vemail"
                type="email"
                value={vemail}
                placeholder="erika@airtuerk.de"
                onChange={(e) => {
                  setVemail(e.target.value);
                  reset();
                }}
              />
            </div>
            <div className="oo-field">
              <label htmlFor="oo-vphone">Deputy phone</label>
              <input
                id="oo-vphone"
                type="tel"
                value={vphone}
                placeholder="+49 69 1234567"
                onChange={(e) => {
                  setVphone(e.target.value);
                  reset();
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="oo-preview-wrap">
          <div className="oo-card">
            <div className="oo-card-head">
              <div className="oo-card-info">
                <div className="oo-card-title">Auto-reply message</div>
                <div className="oo-card-sub">Copy into Outlook → Automatic Replies</div>
              </div>
              <div className="oo-card-btns">
                <button type="button" className="oo-outlook-btn" onClick={handleOutlook}>
                  <MailSvg /> Outlook
                </button>
                <button
                  type="button"
                  className={`oo-copy-btn${copied ? " oo-just-copied" : ""}`}
                  onClick={handleCopy}
                >
                  {copied ? <CheckSvg /> : <CopySvg />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="oo-card-body">
              <div className="oo-card-subject-row">
                <span className="oo-subject-label">Subject</span>
                <span className="oo-subject-text">{out.subject}</span>
              </div>
              <div className="oo-divider" />
              {/* User input is escaped in buildBody(true); only template <strong>/<br> are live HTML. */}
              <div className="oo-text-preview" dangerouslySetInnerHTML={{ __html: out.bodyHtml }} />
            </div>
          </div>

          <div className={`oo-info-card${infoOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="oo-info-toggle"
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((o) => !o)}
            >
              <span className="oo-info-title">
                <InfoSvg /> How to set up in Outlook
              </span>
              <ChevronSvg />
            </button>
            <div className="oo-info-collapse">
              <div className="oo-info-collapse-inner">
                <div className="oo-info-rows">
                  <div className="oo-info-row">
                    <span className="oo-info-step">1</span>
                    <span className="oo-info-text">
                      Pick your language, tone and dates above, then click <strong>Copy</strong>.
                    </span>
                  </div>
                  <div className="oo-info-row">
                    <span className="oo-info-step">2</span>
                    <span className="oo-info-text">
                      <strong>Outlook (desktop):</strong> File → Automatic Replies (Out of Office) →
                      turn it on, set the date range, and paste into both the “Inside My
                      Organization” and “Outside My Organization” boxes.
                    </span>
                  </div>
                  <div className="oo-info-row">
                    <span className="oo-info-step">3</span>
                    <span className="oo-info-text">
                      <strong>Outlook on the web:</strong> Settings → Mail → Automatic replies →
                      toggle on and paste.
                    </span>
                  </div>
                  <div className="oo-info-row">
                    <span className="oo-info-step">4</span>
                    <span className="oo-info-text">
                      Or use <strong>Outlook</strong> above to open a prefilled draft you can copy
                      from.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Inline UI icons ── */
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
function MailSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}
function ChevronSvg() {
  return (
    <svg className="oo-info-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
