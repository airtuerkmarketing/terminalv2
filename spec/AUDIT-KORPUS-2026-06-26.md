# RAG-Korpus-Audit — 2026-06-26

**Welle C2** — read-only audit (no DB / code / edge-function changes).
**HEAD:** `7644287` · **Supabase:** `zkydrymygjrscjbhusxp` · **Vorgeschichte:** C1 (SWEEP-002, revidiert).
**Method:** SELECT-only against live prod + edge-function code reads. Every claim carries a query/file reference. **Secret values are REDACTED in this report** — see AUDIT-001.

> ⚠️ **Dieser Bericht benennt betroffene Chunk-/Page-IDs, aber NICHT die echten Geheimnisse** (Kartennummern, CVCs, Passwörter). Bitte diese Datei NICHT öffentlich teilen, bis AUDIT-001 behoben ist.

---

## Executive Summary

| Sev | # | Finding |
|---|---|---|
| 🔴 **Critical** | AUDIT-001 | **Live Zahlungs-/Zugangsdaten im RAG-Korpus** — 4 Chunks (4 Pages) mit Klartext-Passwörtern, vollen Kreditkarten (PAN+CVC+Ablauf), IBANs. Von der KI für jeden eingeloggten User abrufbar. **Demo-blockend + echtes Security-Leak.** |
| 🟠 High | AUDIT-002 | **„Lernende KI" nie ausgeführt** — 6 Gold-Set-Korrekturen + 1 ai_correction, **0** im Korpus angewendet (`source_type='correction'` = 0). Demo-Narrativ unbelegt. |
| 🟠 High | AUDIT-003 | **Mind. 1 Korrektur deckt fehlerhafte Confluence-Quelle auf** (Hara Filo: Quelle sagt „selber Preis", korrekt = +20 %). Re-Embed fixt das nicht → Source-Edit nötig. |
| 🟡 Med | AUDIT-004 | **Pegasus-Check-in Generierungsfehler** — Korpus hat korrekt „72 Std", KI antwortete „7 Std" (nicht im Korpus). Retrieval/Gen-Miss, keine Korpus-Lücke. |
| 🟡 Med | AUDIT-005 | **sthoss-Stragglers** (2 Chunks, Vtours Genius) — aus C1 übernommen, post-demo deferred. |
| 🟢 Low | AUDIT-006 | **Korpus = eingefrorener Single-Run 2026-06-23.** Kein Re-Embed/Cron seither → Confluence-Edits nach dem 23.06 driften unbemerkt. |
| 🟢 Info | AUDIT-007 | Coverage gesund: 86/86 Confluence-Pages embedded; 12/15 Brands mit Chunks (apix/ibe-suite/presentation-hub = 0, by-design). |

**Top-3 Demo-Risiken:** (1) KI gibt auf eine harmlose Frage Kartennummern/Passwörter aus [AUDIT-001]. (2) KI wiederholt die 6 bekannten Falsch-Antworten, weil keine Korrektur eingearbeitet wurde [AUDIT-002/003]. (3) Eine Quelle ist sachlich falsch (Hara Filo) [AUDIT-003].

**Empfohlene Reihenfolge:** AUDIT-001 **sofort/Notfall** (vor jeder weiteren Demo-Probe) → AUDIT-002/003 in Welle D (vor 01.08) → AUDIT-004/006 Demo-Prep → AUDIT-005 post-demo.

---

## Phase 0 — Korpus-Architektur (Code-verifiziert)

**Ingestion → Korpus → Retrieval:**
- **Sync:** `confluence-snapshot` + `confluence-extend` (`supabase/functions/`) ziehen Confluence-Pages → `confluence_raw`. `confluence-extend` ([index.ts:35-39](supabase/functions/confluence-extend/index.ts#L35)) zieht gezielt 3 Extra-Pages (FAQ 444009709 → bereich=faq, Support 1015316537 → support, Airline Kontakte 16165417 → aerconso) und scannt **nicht** den AERCONSO-Space.
- **Embed:** `embed-knowledge` ([index.ts:17](supabase/functions/embed-knowledge/index.ts#L17), Modell **`voyage-4-large`**) mit 6 Handlern: `confluence`, `attachments`, `brands`, `context`, `corrections`, `knowledge_base`. Confluence-Handler ([:214](supabase/functions/embed-knowledge/index.ts#L214)) embedded **jede** `confluence_raw`-Zeile mit `is_deleted=false` + `body_text NOT NULL` — **kein** Inhalts-/Sensitivitäts-Filter. Handler 5 (`corrections`) macht approved `ai_corrections` → `confluence_chunks` (`source_type='correction'`).
- **Retrieval (`rag-query`):** Voyage-Embed (5s timeout) → `rag_hybrid_search` (vector-K 20 + trgm-K 10, Quellen `context`/`confluence`/`brand`) → identity-reserved Rerank (2 Persona-Slots + 6 via `rerank-2.5`, final **8** Chunks) → `claude-opus-4-8` streaming, Persona „airtuerk Intelligence", strikte Telefon-Politik. **Es gibt keinen Filter, der sensible Chunks von der Retrieval ausschließt.**

**Counts (live 2026-06-26):**

| Tabelle | Count | Detail |
|---|---|---|
| confluence_chunks | 367 | page 134 · pdf 159 · office 60 · knowledge_base 14 · **correction 0** |
| confluence_raw (live) | 86 | WikiOperativ 85 + AERCONSO 1; 0 deleted |
| brand_chunks | 43 | 12/15 Brands (s. AUDIT-007) |
| company_context | 36 | Priority-Identity-Layer |
| ai_corrections | 1 | **pending** (Test) |
| gold_set_answers | 84 | 78 richtig / 6 falsch (92.9 %) |

**bereich-Verteilung (page-Chunks):** operative_kanaele 130 (82 pages) · aerconso 2 · faq 1 · support 1. Attachments (pdf/office) + knowledge_base haben `bereich=null`.

**Embed-Recency:** alle 367 Chunks am **2026-06-23** erzeugt — ein einziger Run, kein Re-Embed seither (→ AUDIT-006).

---

## Phase 1 — Gold-Set-Korrekturen (Kernfrage: sind sie im Korpus?)

**Befund: NEIN — keine der 6 Korrekturen ist im Korpus angekommen.**
- `gold_set_answers.korrektur` ist ein reines **Eval-Feld** — es gibt **keinen** Code-Pfad von `gold_set_answers` in den Korpus (embed-knowledge liest es nicht).
- Der echte Korrektur-Pfad ist `ai_corrections` (submit → approve → embed als `source_type='correction'`). Dort: **1 Zeile, `status=pending`** („Buhara test", Frage „wo storniere ich pegasus"), nie reviewed/applied.
- `confluence_chunks` mit `source_type='correction'` = **0** → der Lern-Loop ist gebaut, aber **nie ausgeführt**.

**Die 6 Korrekturen × Korpus-Status:**

| # | id | Set/Q | Frage | KI-Antwort (falsch) | Korrektur | Korpus-Status |
|---|---|---|---|---|---|---|
| 1 | 61 | t1/Q4 | Pegasus PNR-Format | „Format Axxx" | „6-stlg Buchstaben+Zahlen" | ⚠️ PARTIAL — Pegasus-PNR in 6 Chunks, Format-Notation prüfen (Source nutzt „Xxx"-Schema) |
| 2 | 64 | t1/Q7 | ETI Konti E-Mail | „flug@eti.de" | „airtuerk Flugdispo" | ✅ FOUND — `flugdispo` 17×, `flug@eti` 2× im Korpus; Wording-Korrektur |
| 3 | 68 | t1/Q11 | Pegasus Check-in-Fenster | „7 Std" | „72 Std" | 🟡 GEN-ERROR — Korpus hat „72 Std" (1×), „7 Std" **0×** → KI-Halluzination, Korpus korrekt |
| 4 | 100 | t2/Q15 | Hara Filo Verlängerung | „selber Preis" | „+20 % Servicegebühr" | 🟠 SOURCE-FALSCH — Quelle (TR) sagt „ayni fiyat üzerinden" (selber Preis) → Source-Edit nötig |
| 5 | 105 | t2/Q20 | Y360 Preisübermittlung | „in TL, +20 %" | „in Euro, TL umrechnen +20 %" | ⚠️ PARTIAL — Y360 1 Chunk, Wert verifizieren |
| 6 | 135 | t3/Q22 | Mavi Gök DE/TR | „eigene Seiten DE/TR" | „DE=DE/AYT-Routen, TR=Rest" | ⚠️ PARTIAL — Mavi Gök 6 Chunks (Airline-Refs), Routing-Split-Detail dünn |

**Schlüssel-Erkenntnis:** Mind. eine Korrektur (Hara Filo) ist ein **Quellenfehler**, nicht nur ein Embed-Thema; mind. eine (Pegasus Check-in) ist ein **Generierungsfehler** bei korrekter Quelle. → Jede der 6 braucht **Einzel-Triage** (Source-Edit vs. Re-Embed vs. Retrieval-Tuning), kein pauschaler Fix.

---

## Phase 2 — Stale-Patterns (alle 3 Korpus-Tabellen)

| Pattern | confluence_chunks | brand_chunks | company_context |
|---|---|---|---|
| sthoss | **2** (deferred, C1) | 0 | 0 |
| Thoß (ß) / selin.thoss / @gmx.de / airtuerk.online | 0 | 0 | 0 |
| source_type='correction' | 0 | — | — |

→ Außer den 2 bekannten sthoss-Chunks (Vtours Genius, C1-deferred) ist der Korpus frei von bekannten Personen-/Domain-Drifts. brand_chunks + company_context **sauber** (keine Personen-Stammdaten — gut, da Brand-Pages in der Demo gezeigt werden).

---

## Phase 3 — FAQ-Page-Maskierung → 🔴 AUDIT-001

**Page 444009709 „Operativ FAQ"** (bereich=faq) ist **unmaskiert** als Chunk `228` embedded und enthält:
- **3 Klartext-Account-Passwörter** (Ryanair / Wizz Air / Paypal Service-Accounts) — `[REDACTED]`
- **Mehrere volle Kreditkarten** (PAN + Ablauf + CVC) — `[REDACTED]`
- **2 IBANs**, ein „SMS-Code an Selin Köroglu"-Hinweis, ein externer Qatar-Kontakt mit Mobilnummer.

**Blast-Radius (gesamtes confluence_chunks):** 4 Chunks / 4 Pages mit Karten-/CVC-/Passwort-Mustern:

| Chunk | Page | Titel | Inhalt (redigiert) |
|---|---|---|---|
| 228 | 444009709 | Operativ FAQ | Passwörter + Karten + CVC + IBAN |
| 317 | 768213063 | **Konti 2026 CC** | Karten + CVC (dedizierte Kreditkarten-Seite) |
| 261 | 444007659 | Involatus Genius | Kartennummer |
| 336 | 444007669 | Involatus Konti | Kartennummer |

**Risiko:** Diese Chunks sind reguläre `source_type='page'`-Chunks → im `rag_hybrid_search`-Confluence-Arm → die KI kann sie bei passender Frage („Wie lautet der Wizz-Account?", „Kreditkarte für AYT?") **wörtlich ausgeben**. Die strikte Telefon-Politik im System-Prompt deckt **Karten/Passwörter nicht** ab. Demo am 01.08 vor Stakeholdern = inakzeptabel; unabhängig davon ein Daten-/PCI-Leck.

**Empfehlung (Buhara entscheidet — eigene Notfall-Welle, NICHT in C2 ausgeführt):**
1. **Sofort:** die 4 Chunks aus `confluence_chunks` entfernen (DELETE) **und** die 4 Quell-Pages vom Embed ausschließen (sonst kehren sie beim nächsten Run zurück) — z. B. `embed-knowledge` um einen Sensitivitäts-/Allowlist-Filter erweitern, oder die Secrets in Confluence an einen restriktierten Ort verschieben/maskieren.
2. **Quelle:** Passwörter/Karten gehören nicht in eine RAG-indizierte Wiki-Page — Confluence-Source bereinigen (Murat/Selin) + ggf. Karten/Passwörter rotieren (sie standen im Klartext im Snapshot).
3. **Defense-in-depth:** Generierungs-Regel „niemals Kartennummern/CVC/Passwörter ausgeben" + Pre-Embed-Redaction-Filter (Karten-/Secret-Regex) im Pipeline.

---

## Phase 4 — Korpus-Lücken & Coverage

- **Top-Pages (page-Chunks):** Mayfairjets Genius 14 · ICC Konti 9 · ITT Genius 7 · Vtours Genius 6 · Involatus Genius 4 · SLR SPO 4 · Atlas 4 · … Pegasus Konti nur **2** (für eine demo-relevante Airline evtl. dünn).
- **Embed-Coverage:** Raw-Pages ohne Chunk = **0** → alle 86 Confluence-Pages embedded. Keine Embed-Fehler/Lücken.
- **Spaces:** WikiOperativ 85 Pages (1.17 M Zeichen) + AERCONSO 1 (695 Z.). Scope wie erwartet.
- **Brand-Coverage:** airtuerk-service 9 · atbeds 6 · service-center-antalya 6 · airtuerk-holidays 5 · internal-branding 3 · airlounge/cockpit/multicheck/mybooking/mystats/mytransfer/rentalcar je 2 · **airtuerk-apix 0, ibe-product-suite 0, presentation-hub 0** (keine Content-Blocks — by-design, s. AUDIT-007). 12/15 mit Inhalt.
- **Recency:** alle Chunks 2026-06-23 → AUDIT-006 (kein Re-Embed/Cron; Drift-Risiko bei Confluence-Edits nach dem 23.06).

---

## Phase 5 — Retrieval-Simulation (abgekürzt)

Live-Vector-Retrieval würde einen Voyage-Call brauchen → per Briefing **nicht ausgeführt** (kein API-Call in Read-only-Welle). Architektur-Schluss reicht für die Demo-Risiken: die sensiblen Chunks (AUDIT-001) sind reguläre embedded page-Chunks → über `rag_hybrid_search` abrufbar; die 6 Falsch-Antworten (AUDIT-002) bleiben reproduzierbar, da keine Korrektur eingearbeitet ist. Eine gezielte Vektor-Probe der Demo-Queries gehört in eine eigene (schreibende) Verifikations-Welle nach den Fixes.

---

## Findings-Liste (Aktions-Empfehlungen — Buhara priorisiert)

| ID | Sev | Demo-Impact | Fix-Typ | Aufwand | Reihenfolge |
|---|---|---|---|---|---|
| **AUDIT-001** Secrets im Korpus | 🔴 Critical | high | DB-DELETE + Pipeline-Filter + Confluence-Source + Secret-Rotation | M | **Notfall, sofort** |
| **AUDIT-002** Lern-Loop nie ausgeführt | 🟠 High | high | ai_corrections-Flow für die 6 (approve→embed) bzw. Source-Edits | M–L | Welle D |
| **AUDIT-003** Hara-Filo Quelle falsch | 🟠 High | med | Confluence-Source-Edit → Re-Embed | S | Welle D |
| **AUDIT-004** Pegasus Check-in Gen-Error | 🟡 Med | med | Retrieval/Prompt-Tuning + Re-Test | S | Demo-Prep |
| **AUDIT-005** sthoss-Stragglers | 🟡 Med | low | Confluence-Source-Edit (post-demo, C1) | S | Post-Demo |
| **AUDIT-006** Frozen 2026-06-23 Korpus | 🟢 Low | low | Re-Embed-Routine/Cron + Sync-Recency-Check | M | Post-Demo |
| **AUDIT-007** Brand/Confluence-Coverage | 🟢 Info | — | keine Aktion (Pegasus Konti evtl. anreichern) | — | — |

**Abhängigkeiten:** AUDIT-001-Pipeline-Filter und AUDIT-002-Re-Embed sollten zusammen geplant werden (beide ändern `embed-knowledge` + lösen einen Re-Embed-Run aus). Jeder Re-Embed braucht Voyage-ZDR-Opt-Out-Bestätigung (wie in C1 vermerkt).

---

## Anhang — Reproduzier-Queries
Alle Queries read-only gegen `zkydrymygjrscjbhusxp`. Kern-Beispiele:
- Secrets-Scan: `SELECT id,page_id,source_type FROM confluence_chunks WHERE content ILIKE '%cvc%' OR content ~ '\m\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\M' OR content ~* 'passwor[dt]';`
- Korrektur-Status: `SELECT count(*) FROM confluence_chunks WHERE source_type='correction';` → 0
- Gold-Set: `SELECT bewertung,count(*) FROM gold_set_answers GROUP BY bewertung;`
- Coverage: `confluence_raw LEFT JOIN confluence_chunks` (raw ohne Chunk) → 0
