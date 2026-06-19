"use client";

import { useState } from "react";
import "@/styles/gold-set.css";
import { createClient } from "@/lib/supabase/client";

/**
 * Gold-Set validation quiz (hardcoded route /presentation-hub/gold-set,
 * component_key='gold-set', dispatched in renderPage like the other hardcoded
 * resources). The Service-Center team answers 28 free-text questions; one submit
 * writes 28 rows into public.gold_set_answers sharing a client-generated
 * session_id. Purpose: validate the RAG gold-set (NOT training) — the chat side
 * later reads the table via the service role and compares against expected
 * answers. Q27/Q28 are deliberately not in the source data: a "weiß ich nicht"
 * there is the honest, expected answer, not a mistake.
 *
 * State is plain useState (no localStorage — not available in this runtime).
 * Insert goes through the anon publishable key: the table's RLS grants anon
 * INSERT but not SELECT, so we never chain .select() after the insert.
 */

interface Question {
  nr: number;
  text: string;
}

const QUESTIONS: Question[] = [
  { nr: 1, text: "Über welches Portal läuft die Stornierung bei ETI Konti?" },
  { nr: 2, text: "Ab wann gilt No-Show bei ETI Konti als fix?" },
  { nr: 3, text: "Wie lautet die OPS-Notfall-E-Mail von ETI?" },
  { nr: 4, text: "Welches PNR-Format hat Pegasus Konti und ab wann ist die Airline-PNR sichtbar?" },
  { nr: 5, text: "Wie wird bei Pegasus Konti ein Medical/WCH-Eintrag gemacht?" },
  { nr: 6, text: "Welche Freigepäckmengen gelten bei ETI Konti?" },
  { nr: 7, text: "An welche E-Mail richtet man Konti-Anfragen bei ETI innerhalb der Öffnungszeiten?" },
  { nr: 8, text: "Wie lautet die Notfallnummer von Pegasus im B2B-Kanal?" },
  { nr: 9, text: "Bis wie viele Buchstaben ist eine Namenskorrektur bei Pegasus B2B kostenfrei?" },
  { nr: 10, text: "Welche Kontakt-E-Mail nutzt man für Turkish Airlines im B2B?" },
  { nr: 11, text: "Online-Check-in bei Pegasus — welches Zeitfenster?" },
  { nr: 12, text: "Was kostet eine Umbuchung bei EasyJet ab 60 Tage vor Abflug?" },
  { nr: 13, text: "Was kostet eine Namensänderung bei EasyJet, und was ist kostenfrei?" },
  { nr: 14, text: "Wie hoch ist die EasyJet-Tagesstorno-Gebühr?" },
  { nr: 15, text: "Welches Check-in-Fenster gilt bei EasyJet?" },
  { nr: 16, text: "Welche Stornogebühren gelten bei B2 Car kurz vor Anmietung?" },
  { nr: 17, text: "Ist eine Namensänderung bei B2 Car möglich?" },
  { nr: 18, text: "Wie läuft die Verlängerung bei CIZGI Rent a Car preislich?" },
  { nr: 19, text: "Wie ist die Storno-Regel bei CIZGI Rent a Car?" },
  { nr: 20, text: "Welche Kontakt-E-Mail hat B2 Car?" },
  { nr: 21, text: "Wie erreiche ich den Notkontakt von Coral Touristik?" },
  { nr: 22, text: "Welche E-Mail nutzt ANEX TOUR und wann ist der Notkontakt erreichbar?" },
  { nr: 23, text: "An welche Adresse wende ich mich beim Multicheck-Support?" },
  { nr: 24, text: "Wie erreiche ich die IT-Abteilung von airtuerk?" },
  { nr: 25, text: "Dürfen WEGO-TRAVEL-Stornierungsanfragen von Direktkunden bearbeitet werden?" },
  { nr: 26, text: "Gibt es am Buchungstag ein Widerrufsrecht für Endkunden im Portal?" },
  { nr: 27, text: "Welche Stornogebühr gilt bei Emirates? (Falls unbekannt: „weiß ich nicht“ eintragen)" },
  { nr: 28, text: "Wie hoch ist die Tagespauschale für Hotelübernachtungen der Crew? (Falls unbekannt: „weiß ich nicht“)" },
];

type Status = "idle" | "saving" | "done" | "error";

export function GoldSet({ title }: { title: string }) {
  const [bearbeiter, setBearbeiter] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  function setAnswer(nr: number, value: string) {
    setAnswers((prev) => ({ ...prev, [nr]: value }));
  }

  async function handleSubmit() {
    setStatus("saving");
    setErrorMsg("");

    // One UUID per submission; every row of this submit shares it.
    const sessionId = crypto.randomUUID();
    const rows = QUESTIONS.map((q) => ({
      frage_nr: q.nr,
      frage_text: q.text,
      antwort: (answers[q.nr] ?? "").trim() || null,
      bearbeiter: bearbeiter.trim() || null,
      session_id: sessionId,
    }));

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
    setAnswers({});
    setSavedCount(0);
    setStatus("idle");
    setErrorMsg("");
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
            {savedCount} Antworten wurden gespeichert. Du kannst das Formular gern noch einmal
            ausfüllen — z.&nbsp;B. für eine andere Person.
          </p>
          <button type="button" className="gs-submit" onClick={reset}>
            Weitere Antworten abgeben
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
        Bitte aus dem Kopf beantworten — so, wie ihr es einem Kunden sagen würdet. Wenn ihr etwas
        nicht wisst, schreibt <strong>„weiß ich nicht“</strong>; das ist auch eine gültige Antwort.
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

      <ol className="gs-list">
        {QUESTIONS.map((q) => (
          <li key={q.nr} className="gs-item">
            <label className="gs-q" htmlFor={`gs-q${q.nr}`}>
              <span className="gs-num">{q.nr}</span>
              <span className="gs-text">{q.text}</span>
            </label>
            <textarea
              id={`gs-q${q.nr}`}
              className="gs-textarea"
              rows={3}
              placeholder="Deine Antwort …"
              value={answers[q.nr] ?? ""}
              onChange={(e) => setAnswer(q.nr, e.target.value)}
            />
          </li>
        ))}
      </ol>

      {status === "error" && (
        <p className="gs-error" role="alert">
          Speichern fehlgeschlagen: {errorMsg}. Bitte versuch es noch einmal.
        </p>
      )}

      <div className="gs-actions">
        <button type="button" className="gs-submit" onClick={handleSubmit} disabled={saving}>
          {saving ? "Wird gespeichert …" : "Alle Antworten absenden"}
        </button>
        <span className="gs-hint">{QUESTIONS.length} Fragen · ein Klick speichert alle</span>
      </div>
    </article>
  );
}
