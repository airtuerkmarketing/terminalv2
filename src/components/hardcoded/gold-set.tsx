"use client";

import { useRef, useState } from "react";
import "@/styles/gold-set.css";
import { createClient } from "@/lib/supabase/client";

/**
 * Gold-Set validation quiz — REVIEW MODE (hardcoded route
 * /presentation-hub/gold-set, component_key='gold-set').
 *
 * Each question shows a SUGGESTED answer; the Service-Center team rates it
 * richtig/falsch, supplies a correction when falsch, and flags its own
 * confidence (sicher/unsicher). One submit writes 28 rows to
 * public.gold_set_answers sharing a client-generated session_id — per row:
 * frage_nr, frage_text, vorgeschlagene_antwort, bewertung, korrektur (or NULL),
 * sicherheit, bearbeiter. The legacy `antwort` column is left untouched.
 *
 * Purpose: validate the RAG gold-set (NOT training). Q27/Q28 are deliberate
 * traps — there is no source info, so "richtig" confirms "keine Info" is correct.
 *
 * State is plain useState (no localStorage). Insert uses the anon publishable
 * key; the table's RLS grants anon INSERT but not SELECT, so we never chain
 * .select() after the insert. Submit is gated client-side: every question needs
 * a verdict, and every "falsch" needs a correction.
 */

interface Question {
  nr: number;
  frage: string;
  vorschlag: string;
  /** Deliberate trap: no source info exists; "richtig" = confirms there is none. */
  falle?: boolean;
}

const QUESTIONS: Question[] = [
  { nr: 1, frage: "ETI Konti — Stornierung läuft über?", vorschlag: "Über das Refund Portal." },
  { nr: 2, frage: "ETI Konti — No-Show ab wann fix?", vorschlag: "FIX ab 14 Tage vor Abflug." },
  { nr: 3, frage: "ETI — OPS-Notfall-E-Mail?", vorschlag: "ops@eti.de (OPS-Telefon 00491603651657)." },
  { nr: 4, frage: "Pegasus Konti — PNR-Format + ab wann Airline-PNR sichtbar?", vorschlag: "PNR-Format Axxx; Airline-PNR ab 14 Tage vor Abflug (One Log In PNR Liste / Mybooking)." },
  { nr: 5, frage: "Pegasus Konti — Medical/WCH-Eintrag wie?", vorschlag: "WCH-Ergänzung läuft über Genius, nicht mehr an Pegasus schreiben — Anfrage an Kontingent leiten." },
  { nr: 6, frage: "ETI Konti — Freigepäckmengen?", vorschlag: "20 kg Freigepäck, 10 kg Infant + Kinderwagen, 5 kg Handgepäck." },
  { nr: 7, frage: "ETI Konti — E-Mail innerhalb Öffnungszeiten?", vorschlag: "flug@eti.de (an airtuerk Flugdispo)." },
  { nr: 8, frage: "Pegasus B2B — Notfallnummer?", vorschlag: "+905337161308 (Notfall-E-Mail pnl@flypgs.com / guestcontrol@flypgs.com)." },
  { nr: 9, frage: "Pegasus B2B — Namenskorrektur bis wie viele Buchstaben kostenfrei?", vorschlag: "Bis 3 Buchstaben kostenfrei über B2B; andere Änderungen nur per Storno/Neu." },
  { nr: 10, frage: "Turkish Airlines B2B — Kontakt-E-Mail?", vorschlag: "agent.fra@thy.com." },
  { nr: 11, frage: "Pegasus — Online-Check-in-Zeitfenster?", vorschlag: "Ab 7 Stunden bis 60 Minuten vor Abflug." },
  { nr: 12, frage: "EasyJet — Umbuchung ab 60 Tage vor Abflug?", vorschlag: "53 € pro Passagier und Flug (bis 60 Tage: 36 €)." },
  { nr: 13, frage: "EasyJet — Namensänderung Kosten / kostenfrei?", vorschlag: "73 € pro Passagier/Flug; Anrede-Änderung oder bis 3 Buchstaben kostenfrei." },
  { nr: 14, frage: "EasyJet — Tagesstorno-Gebühr?", vorschlag: "59 € (intern)." },
  { nr: 15, frage: "EasyJet — Check-in-Fenster?", vorschlag: "Ab 30 Tage bis 2 Tage vor Abflug." },
  { nr: 16, frage: "B2 Car — Stornogebühren kurz vor Anmietung?", vorschlag: "Bis 48 Std. vorher 10 %, bis 24 Std. vorher 15 % Abzug." },
  { nr: 17, frage: "B2 Car — Namensänderung möglich?", vorschlag: "Ja, per E-Mail möglich." },
  { nr: 18, frage: "CIZGI Rent a Car — Verlängerung preislich?", vorschlag: "Anfrage per Mail; auf den Euro-Nettopreis (nach Abzug 17 % Kommission) kommen 20 % Servicegebühr." },
  { nr: 19, frage: "CIZGI Rent a Car — Storno-Regel?", vorschlag: "Bis 48 Std. 10 %, bis 24 Std. 15 % Abzug." },
  { nr: 20, frage: "B2 Car — Kontakt-E-Mail?", vorschlag: "rez@b2car.com." },
  { nr: 21, frage: "Coral Touristik — Notkontakt?", vorschlag: "+49 211 68771 151 (Mo–Fr 9–18 Uhr), ops@coraltravel.de." },
  { nr: 22, frage: "ANEX TOUR — E-Mail + Notkontakt-Zeiten?", vorschlag: "datamix@anextour.de; Notkontakt 0151 21474141, Mo–Fr 09:00–18:00." },
  { nr: 23, frage: "Multicheck-Support — Adresse?", vorschlag: "mcdestek@airtuerk.de." },
  { nr: 24, frage: "airtuerk IT-Abteilung — Kontakt?", vorschlag: "systems@airtuerk.de." },
  { nr: 25, frage: "WEGO TRAVEL — Storno von Direktkunden bearbeiten?", vorschlag: "Nein — nur seitens WEGO; Direktkunden-Anfragen nicht bearbeiten." },
  { nr: 26, frage: "Portal — Widerrufsrecht am Buchungstag?", vorschlag: "Kein Widerrufsrecht am Buchungstag; Kulanz-Storno nur bei kostenlos/gering stornierbaren Buchungen." },
  { nr: 27, frage: "Emirates — Stornogebühr?", vorschlag: "Dazu liegt keine Information vor.", falle: true },
  { nr: 28, frage: "Crew-Hotel — Tagespauschale?", vorschlag: "Dazu liegt keine Information vor.", falle: true },
];

type Verdict = "richtig" | "falsch";
type Sicherheit = "sicher" | "unsicher";
type Status = "idle" | "saving" | "done" | "error";

export function GoldSet({ title }: { title: string }) {
  const [bearbeiter, setBearbeiter] = useState("");
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [sicherheit, setSicherheit] = useState<Record<number, Sicherheit>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [hint, setHint] = useState("");
  const [invalid, setInvalid] = useState<Set<number>>(new Set());
  const [savedCount, setSavedCount] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  function setVerdict(nr: number, v: Verdict) {
    setVerdicts((prev) => ({ ...prev, [nr]: v }));
    if (invalid.has(nr)) {
      setInvalid((prev) => {
        const next = new Set(prev);
        next.delete(nr);
        return next;
      });
    }
  }
  function setCorrection(nr: number, value: string) {
    setCorrections((prev) => ({ ...prev, [nr]: value }));
  }
  function setSich(nr: number, s: Sicherheit) {
    setSicherheit((prev) => ({ ...prev, [nr]: s }));
  }

  function validate(): Set<number> {
    const bad = new Set<number>();
    for (const q of QUESTIONS) {
      const v = verdicts[q.nr];
      if (!v) bad.add(q.nr);
      else if (v === "falsch" && !(corrections[q.nr] ?? "").trim()) bad.add(q.nr);
    }
    return bad;
  }

  async function handleSubmit() {
    const bad = validate();
    if (bad.size > 0) {
      setInvalid(bad);
      const noVerdict = QUESTIONS.filter((q) => !verdicts[q.nr]).length;
      const noKorrektur = bad.size - noVerdict;
      const parts: string[] = [];
      if (noVerdict > 0) parts.push(`${noVerdict}× ohne Bewertung`);
      if (noKorrektur > 0) parts.push(`${noKorrektur}× „Falsch“ ohne Korrektur`);
      setHint(`Bitte noch vervollständigen: ${parts.join(" · ")}. Die markierten Karten brauchen noch eine Eingabe.`);
      // Jump to the first incomplete card.
      const firstNr = QUESTIONS.find((q) => bad.has(q.nr))?.nr;
      if (firstNr != null) {
        document
          .getElementById(`gs-item-${firstNr}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setStatus("saving");
    setHint("");
    setErrorMsg("");

    const sessionId = crypto.randomUUID();
    const rows = QUESTIONS.map((q) => {
      const v = verdicts[q.nr] as Verdict;
      return {
        frage_nr: q.nr,
        frage_text: q.frage,
        vorgeschlagene_antwort: q.vorschlag,
        bewertung: v,
        korrektur: v === "falsch" ? (corrections[q.nr] ?? "").trim() : null,
        sicherheit: sicherheit[q.nr] ?? "sicher",
        bearbeiter: bearbeiter.trim() || null,
        session_id: sessionId,
      };
    });

    const supabase = createClient();
    // No .select() — anon may INSERT but not SELECT (see migration 0027 RLS).
    const { error } = await supabase.from("gold_set_answers").insert(rows);
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setSavedCount(rows.length);
    setStatus("done");
  }

  function reset() {
    setBearbeiter("");
    setVerdicts({});
    setCorrections({});
    setSicherheit({});
    setInvalid(new Set());
    setHint("");
    setErrorMsg("");
    setSavedCount(0);
    setStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status === "done") {
    return (
      <article className="gs-wrap">
        <header className="page-hero">
          <div className="eyebrow">Presentation Hub</div>
          <h1>{title}</h1>
        </header>
        <div className="gs-thanks" role="status">
          <h2>Danke!</h2>
          <p>
            {savedCount} Bewertungen wurden gespeichert. Du kannst die Prüfung gern noch einmal
            für eine andere Person durchgehen.
          </p>
          <button type="button" className="gs-submit" onClick={reset}>
            Weitere Person abgeben
          </button>
        </div>
      </article>
    );
  }

  const saving = status === "saving";

  return (
    <article className="gs-wrap">
      <header className="page-hero">
        <div className="eyebrow">Presentation Hub</div>
        <h1>{title}</h1>
      </header>

      <p className="gs-intro">
        Bitte prüfe die vorgeschlagene Antwort. Stimmt sie, klick <strong>Richtig</strong>. Stimmt
        sie nicht, klick <strong>Falsch</strong> und gib die korrekte Antwort ein. Mit{" "}
        <strong>unsicher</strong> markierst du, wenn du dir nicht sicher bist.
      </p>

      <div className="gs-field gs-name">
        <label htmlFor="gs-bearbeiter">
          Name / Kürzel <span>(optional)</span>
        </label>
        <input
          id="gs-bearbeiter"
          className="gs-input"
          type="text"
          autoComplete="off"
          placeholder="z. B. AB"
          value={bearbeiter}
          onChange={(e) => setBearbeiter(e.target.value)}
        />
      </div>

      <ol className="gs-list" ref={listRef}>
        {QUESTIONS.map((q) => {
          const v = verdicts[q.nr];
          const s = sicherheit[q.nr] ?? "sicher";
          const isInvalid = invalid.has(q.nr);
          return (
            <li
              key={q.nr}
              id={`gs-item-${q.nr}`}
              className={`gs-item${isInvalid ? " gs-item-invalid" : ""}`}
            >
              <div className="gs-q">
                <span className="gs-num">{q.nr}</span>
                <span className="gs-text">{q.frage}</span>
              </div>

              <div className="gs-suggest">
                <span className="gs-suggest-label">Vorgeschlagene Antwort</span>
                <p className="gs-suggest-text">{q.vorschlag}</p>
                {q.falle && (
                  <p className="gs-falle-hint">
                    Absichtlich ohne hinterlegte Info — „Richtig“ bestätigt, dass es dazu keine
                    Information gibt.
                  </p>
                )}
              </div>

              <div className="gs-controls">
                <div className="gs-rate" role="group" aria-label="Bewertung">
                  <button
                    type="button"
                    className={`gs-rate-btn gs-rate-richtig${v === "richtig" ? " is-active" : ""}`}
                    aria-pressed={v === "richtig"}
                    onClick={() => setVerdict(q.nr, "richtig")}
                  >
                    <span aria-hidden="true">✓</span> Richtig
                  </button>
                  <button
                    type="button"
                    className={`gs-rate-btn gs-rate-falsch${v === "falsch" ? " is-active" : ""}`}
                    aria-pressed={v === "falsch"}
                    onClick={() => setVerdict(q.nr, "falsch")}
                  >
                    <span aria-hidden="true">✗</span> Falsch
                  </button>
                </div>

                <div className="gs-sicher" role="group" aria-label="Sicherheit">
                  <button
                    type="button"
                    className={`gs-sicher-btn${s === "sicher" ? " is-active" : ""}`}
                    aria-pressed={s === "sicher"}
                    onClick={() => setSich(q.nr, "sicher")}
                  >
                    sicher
                  </button>
                  <button
                    type="button"
                    className={`gs-sicher-btn${s === "unsicher" ? " is-active" : ""}`}
                    aria-pressed={s === "unsicher"}
                    onClick={() => setSich(q.nr, "unsicher")}
                  >
                    unsicher
                  </button>
                </div>
              </div>

              {v === "falsch" && (
                <div className="gs-correction">
                  <label htmlFor={`gs-korrektur-${q.nr}`}>Korrekte Antwort</label>
                  <textarea
                    id={`gs-korrektur-${q.nr}`}
                    className="gs-textarea"
                    rows={2}
                    placeholder="Wie lautet die richtige Antwort?"
                    value={corrections[q.nr] ?? ""}
                    onChange={(e) => setCorrection(q.nr, e.target.value)}
                  />
                </div>
              )}

              {isInvalid && (
                <p className="gs-item-error" role="alert">
                  {!v ? "Bitte Richtig oder Falsch wählen." : "Bitte die korrekte Antwort eintragen."}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {hint && (
        <p className="gs-error" role="alert">
          {hint}
        </p>
      )}
      {status === "error" && (
        <p className="gs-error" role="alert">
          Speichern fehlgeschlagen: {errorMsg}. Bitte versuch es noch einmal.
        </p>
      )}

      <div className="gs-actions">
        <button type="button" className="gs-submit" onClick={handleSubmit} disabled={saving}>
          {saving ? "Wird gespeichert …" : "Bewertung absenden"}
        </button>
        <span className="gs-hint">{QUESTIONS.length} Fragen · ein Klick speichert alle</span>
      </div>
    </article>
  );
}
