"use client";

import { useRef, useState } from "react";
import "@/styles/gold-set.css";
import { createClient } from "@/lib/supabase/client";
import type { Question } from "@/components/hardcoded/ai-test-data";

/**
 * Generalized Gold-Set REVIEW component (was gold-set.tsx). Drives the three
 * AI TEST pages under Presentation Hub — same concept, different question sets.
 *
 * Each question shows a SUGGESTED answer; the Service-Center team rates it
 * richtig/falsch, supplies a correction when falsch, and flags its own
 * confidence (sicher/unsicher). One submit writes one row per question to
 * public.gold_set_answers sharing a client-generated session_id — per row:
 * frage_nr, frage_text, vorgeschlagene_antwort, bewertung, korrektur (or NULL),
 * sicherheit, bearbeiter, test_set. The legacy `antwort` column is untouched.
 *
 * `testSet` is written verbatim to gold_set_answers.test_set so each AI TEST
 * page's runs can be evaluated separately (ai_test_1 | ai_test_2 | ai_test_3).
 *
 * Purpose: validate the RAG gold-set (NOT training). Q27/Q28 (falle) are
 * deliberate traps — no source info exists, so "richtig" confirms "keine Info".
 *
 * State is plain useState (no localStorage). Insert uses the anon publishable
 * key; the table's RLS grants anon INSERT but not SELECT, so we never chain
 * .select() after the insert. Submit is gated client-side: every question needs
 * a verdict, and every "falsch" needs a correction.
 */

type Verdict = "richtig" | "falsch";
type Sicherheit = "sicher" | "unsicher";
type Status = "idle" | "saving" | "done" | "error";

export function ReviewQuiz({
  title,
  questions,
  testSet,
}: {
  title: string;
  questions: Question[];
  testSet: string;
}) {
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
    for (const q of questions) {
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
      const noVerdict = questions.filter((q) => !verdicts[q.nr]).length;
      const noKorrektur = bad.size - noVerdict;
      const parts: string[] = [];
      if (noVerdict > 0) parts.push(`${noVerdict}× ohne Bewertung`);
      if (noKorrektur > 0) parts.push(`${noKorrektur}× „Falsch“ ohne Korrektur`);
      setHint(`Bitte noch vervollständigen: ${parts.join(" · ")}. Die markierten Karten brauchen noch eine Eingabe.`);
      // Jump to the first incomplete card.
      const firstNr = questions.find((q) => bad.has(q.nr))?.nr;
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
    const rows = questions.map((q) => {
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
        test_set: testSet,
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
        {questions.map((q) => {
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
        <span className="gs-hint">{questions.length} Fragen · ein Klick speichert alle</span>
      </div>
    </article>
  );
}
