# Confluence Sync Integrity Audit — 2026-06-30

**Typ:** Read-only Diagnose (SELECT-only, keine DB-/Code-/Migrations-Änderung).
**Supabase:** `zkydrymygjrscjbhusxp` (prod) · **HEAD:** `3dee708` · **Branch:** `claude/confluence-audit-worktree-t65xbd`.
**Anlass:** Board-Demo 2026-08-01, BS1-Szenario hängt an Confluence-RAG (proprietärer Content).
**Method:** Jede Zahl ist mit einer reproduzierbaren Query gegen live prod belegt; abgeglichen gegen `spec/AUDIT-KORPUS-2026-06-26.md` (Welle C2) und `spec/RAG_EVAL_BASELINE_2026-06-28.md` (D-099/D-104).

> ⚠️ **Schema-Drift-Warnung:** Die im Audit-Briefing vorgegebenen Queries (Q1–Q6) zielen auf eine
> generische `chunks`-Tabelle mit `source='confluence'`, `source_doc_id` und einer pro-Retrieval
> `chunk_retrieval_stats(chunk_id, similarity_score, message_id, retrieved_at)`. **Dieses Schema
> existiert hier nicht.** Real: dedizierte `confluence_chunks`-Tabelle und ein **aggregiertes**
> `chunk_retrieval_stats(source, source_id, retrieved_count, last_retrieved_at)`-Rollup. Alle
> Diagnose-Queries wurden auf das echte Schema adaptiert (siehe Anhang). Konsequenz: **`avg_sim`
> ist nicht berechenbar** — Similarity-Scores werden nirgends persistiert. Als Qualitätssignal
> dient stattdessen die RAG-Eval-Harness (D-104).

---

## 1. Health-Status

### 🟡 GELB (WARNING) — demo-tauglich nur nach gezieltem Sync + AERCONSO-Klärung

Der Korpus ist **vollständig embedded und das Retrieval läuft live und frisch**, aber drei Punkte
müssen vor dem 01.08 angefasst werden. Nichts ist 🔴-kritisch im Sinne von „Pipeline kaputt".

| Dimension | Erwartung (Briefing) | Befund | Bewertung |
|---|---|---|---|
| **Source-Sync-Frische** | < 7 Tage | letzter `confluence_raw`-Snapshot **2026-06-19 (11 Tage)**, **kein Sync-Cron** | 🟡 7–30 d |
| **Embed-Frische** | < 7 Tage | Bulk-Embed 2026-06-23 (7 d) + 2 Korrekturen 2026-06-26 (4 d), **kein Embed-Cron** | 🟡 grenzwertig |
| **Spaces vorhanden** | alle erwarteten | WikiOperativ + AERCONSO present; `team`/`news` nie gesynct (by-design?) | 🟡 siehe Q5 |
| **Retrieval-Coverage 30 d** | > 50 % der Chunks | **148/365 = 40,5 %** je retrieved (130/365 = 35,6 % in 7 d) | 🟡 knapp drunter |
| **avg_sim** | > 0,5 | **nicht persistiert** → nicht messbar; Ersatz: RAG-Eval **86,9 % genuine** (D-104) | 🟢 via Proxy |
| **Embedding-Integrität** | — | **0** NULL-Embeddings, **0** leere Chunks, 365/365 vektorisiert | 🟢 |
| **Retrieval-Pipeline live** | — | `warmup-rag-query` alle 4 min (zuletzt 2026-06-30 20:04 ✓), Rollup-Cron 03:15 ✓ | 🟢 |
| **Security (AUDIT-001)** | — | 4 Secret-Chunks **gelöscht**, 2 Secret-Pages auf 0 Chunks | 🟢 behoben |

**Governing-Signal für „Frische":** der **Source-Snapshot (06-19, 11 Tage)**, nicht das Embed-Datum.
Edits in Confluence nach dem 19.06 sind im Korpus **unsichtbar** (kein Sync-Cron — AUDIT-006 weiter offen).

---

## 2. Schema (was gefunden wurde)

**Confluence-relevante Tabellen** (`information_schema`):

| Tabelle | Rolle | Schlüsselspalten |
|---|---|---|
| `confluence_raw` | Source of Truth (Snapshot der Wiki-Pages) | `page_id` (text), `space_key`, `bereich`, `page_type`, `title`, `body_text`, `char_count`, `is_deleted`, `last_modified`, `snapshot_at`, `source_url` |
| `confluence_chunks` | Embedded Korpus (RAG-Retrieval-Quelle) | `id` (**bigint**), `page_id` (text, FK→raw), `attachment_id`, `chunk_index`, `content`, `token_count`, `embedding` (vector), `metadata` (jsonb), `source_type`, `content_hash`, `created_at` |
| `chunk_retrieval_stats` | D-107 Observability-**Rollup** | `source`, `source_id` (text), `retrieved_count`, `last_retrieved_at`, `updated_at` — **PK (source, source_id)**, kein pro-Retrieval-Row |
| `confluence_attachments` | PDF/Office-Anhänge | `attachment_id`, `page_id`, `media_type`, `extracted_text`, `storage_path` |
| `confluence_comments` | Kommentare (nicht embedded) | `comment_id`, `page_id`, `body_text` |
| `brand_chunks`, `chunk_edit_log` | Nicht-Confluence / Audit-Log | — |

**Wichtige Schema-Fakten für dieses Audit:**

- **Es gibt keine `source`-Spalte in `confluence_chunks`** — die ganze Tabelle *ist* der Confluence-Korpus
  (plus Anhänge, Knowledge-Base, Korrekturen). Quelle wird über `source_type` unterschieden, nicht `source`.
- **„Space" lebt in `confluence_raw.space_key`** (join via `page_id`), nicht im Chunk-Metadata.
  `confluence_chunks.metadata` enthält `{kanal, title, bereich, page_id, source_url, segment_count}`.
- **`chunk_retrieval_stats.source_id` = `confluence_chunks.id::text`** (verifiziert) für `source='confluence'`.
  Der Rollup wird täglich 03:15 via `refresh_chunk_retrieval_stats()` aus
  `ai_chat_messages.retrieved_chunks` voll-refreshed (SECURITY DEFINER, anon/auth revoked).
- **Retrieval-Funktion:** `rag_hybrid_search(vector(1024), text, ...)` — Vector + pg_trgm über
  `company_context` / `confluence_chunks` / `brand_chunks`, deduped via `DISTINCT ON`, SECURITY INVOKER.

---

## 3. Korpus-Inventar (Q1 adaptiert)

```
chunks: 365 · pages_with_chunks: 84 · attachments_with_chunks: 116
chunks_missing_embedding: 0 · empty_content: 0
oldest_chunk: 2026-06-23 07:56 · newest_chunk: 2026-06-26 08:47
total_tokens: 167.917 · avg_tokens/chunk: 460
```

**Nach `source_type`:**

| source_type | chunks | pages | attachments |
|---|---:|---:|---:|
| pdf | 159 | – | 86 |
| page | 130 | 84 | – |
| office | 60 | – | 30 |
| knowledge_base | 14 | – | – |
| correction | 2 | – | – |
| **Σ** | **365** | **84** | **116** |

> 235 der 365 Chunks haben `page_id = NULL` (pdf/office/knowledge_base/correction) — sie hängen an
> Anhängen/KB, nicht an Wiki-Pages. Das erklärt, warum die Per-Space-Joins (über `page_id`) nur 130
> Page-Chunks abdecken.

### Abgleich gegen die Vor-Audit-Zahl (2026-06-26: 367 Chunks) — **vollständig erklärt**

| Δ | Vorher (06-26) | Jetzt (06-30) | Ursache |
|---|---:|---:|---|
| page | 134 | 130 (−4) | **AUDIT-001-Remediation**: 4 Secret-Chunks (228, 261, 317, 336) gelöscht |
| correction | 0 | 2 (+2) | Lern-Loop ausgeführt (Chunks 610/611, „wer ist Buhara") |
| **Σ** | **367** | **365 (−2)** | konsistent, kein unerklärter Verlust |

---

## 4. Per-Space / Per-Bereich Breakdown (Q2 adaptiert)

**Source of Truth `confluence_raw` (live pages):**

| space_key | bereich | pages | embeds | letzter Snapshot | letzte Page-Änderung |
|---|---|---:|---:|---|---|
| WikiOperativ | operative_kanaele | 82 | 0 | 2026-06-19 08:06 | 2026-06-12 |
| WikiOperativ | support | 1 | 0 | 2026-06-19 08:58 | 2026-03-09 |
| WikiOperativ | faq | 1 | 0 | 2026-06-19 08:58 | 2026-05-11 |
| WikiOperativ | aerconso (embed) | 1 | 1 | 2026-06-19 08:58 | 2025-06-02 |
| AERCONSO | aerconso | 1 | 0 | 2026-06-19 08:58 | 2025-12-23 |
| **Σ** | | **86** | 1 | | |

**Page-Coverage (raw vs. embedded, Q5/Q6):**

| space_key | raw_pages | pages_with_chunks | live_pages_OHNE_chunks |
|---|---:|---:|---:|
| WikiOperativ | 85 | 83 | **2** |
| AERCONSO | 1 | 1 | 0 |

**Die 2 unembeddeten WikiOperativ-Pages sind kein Sync-Fehler — sie sind absichtlich gepurgt:**

| page_id | title | bereich | Grund |
|---|---|---|---|
| `444009709` | Operativ FAQ | faq | **Secret-Page** (Passwörter/Karten/IBAN) — D1-Security-Purge / `SECRET_PAGE_DENYLIST` |
| `768213063` | Konti 2026 CC | operative_kanaele | **Secret-Page** (dedizierte Kreditkarten-Seite) — gepurgt |

→ **Coverage der nicht-sensiblen Pages = 100 %.** Die einzigen „Lücken" sind gewollte Security-Exclusions.

---

## 5. Retrieval-Aktivität (Q3 adaptiert — ohne avg_sim, s. Schema-Warnung)

**Gesamt-Rollup (`chunk_retrieval_stats`):**

| source | stat-rows | Σ retrievals | letzte Retrieval |
|---|---:|---:|---|
| context | 39 | 1.325 | 2026-06-29 22:32 |
| confluence | 148 | 562 | 2026-06-29 22:32 |
| brand | 24 | 57 | 2026-06-29 21:54 |

**Confluence-Retrieval nach Space** (join stats→chunks→raw):

| space_key | distinct chunks retrieved | Σ retrievals | in 30 d | in 7 d | letzte |
|---|---:|---:|---:|---:|---|
| WikiOperativ | 86 | 212 | 86 | 78 | 2026-06-29 22:30 |
| (unmatched: Anhänge/KB/Korrektur, page_id=NULL) | 51 | 318 | 51 | 49 | 2026-06-29 22:32 |
| AERCONSO | 1 | 17 | 1 | 1 | 2026-06-29 20:22 |

**Coverage-Ratio:** 365 Chunks total → **148 je retrieved (40,5 %)**, davon **130 in 7 d (35,6 %)**.
Liegt unter der „healthy > 50 %"-Schwelle, ist aber durch die Korpus-Zusammensetzung erklärbar: die
235 Anhang/KB-Chunks sind teils nischig; die aktiv genutzten Page- und Anhang-Chunks sind frisch
(letzte Retrieval **gestern**). **Kein Space mit Zero-Retrieval** (Q5: alle drei haben Aktivität).

**Daten-Hygiene-Notiz:** Von den 148 Confluence-Rollup-Rows mappen nur **138 auf einen lebenden Chunk**;
**10 sind verwaist** (15 Retrievals) — `source_id`s, die auf gelöschte/neu-embeddete Chunks zeigen.
Da `confluence_chunks.id` ein bigint-Serial ist, **verschieben sich alle IDs bei einem Full-Re-Embed**
→ die komplette Retrieval-Historie wird danach verwaist (Rollup baut aus Message-Historie neu auf).
Relevanz für die Demo: Retrieval-Stats sind **kein** verlässlicher „seit-immer"-Zähler über Re-Embeds hinweg.

---

## 6. Demo-kritischer Befund — AERCONSO proprietärer Content ist faktisch leer

BS1 hängt laut Briefing an „proprietärem Confluence-Content". Der AERCONSO-Footprint:

| page_id | title | page_type | char_count | **body_text_len** | chunk | token_count | retrievals |
|---|---|---|---:|---:|---:|---:|---:|
| `16165417` | Airline Kontakte | page | 695 | **47** | 230 | 12 | 17 |
| `446989123` | [EMBED] Cockpit / GDS Kanal | embed | 0 | **96** | 231 | 25 | 4 |

→ Die gesamte „proprietäre" AERCONSO-Substanz im Korpus = **~143 Zeichen / 2 Mini-Chunks**. „Airline
Kontakte" hat 695 Zeichen Roh-Body, aber nur **47 Zeichen extrahierten `body_text`** (≈ Überschrift +
eine Zeile). Der RAG findet die Page (17× retrieved), aber es gibt **kaum Inhalt zum Ausgeben.**
Hintergrund (C2-Audit): `confluence-extend` zieht **gezielt 3 Extra-Pages** und scannt den
AERCONSO-Space **nicht** vollständig.

**Wenn BS1 substantiellen AERCONSO/Airline-Kontakt-Content erwartet, schlägt das Szenario fehl —
nicht wegen Retrieval, sondern wegen fehlender Quelle.** Höchste Demo-Priorität zum Verifizieren.

---

## 7. Recommendations (vor 01.08, priorisiert)

| # | Empfehlung | Adressiert | Aufwand | Wann |
|---|---|---|---|---|
| **R1** | **BS1-Quelldaten verifizieren:** Welche konkreten Pages/Fakten fragt BS1 ab? AERCONSO „Airline Kontakte" hat nur 47 Zeichen Body → ggf. Confluence-Source füllen + `confluence-extend` um die echten AERCONSO-Pages erweitern, dann re-snapshot + re-embed. | §6 (demo-blockend) | M | **sofort** |
| **R2** | **Ein frischer Sync + Re-Embed kurz vor der Demo:** `confluence-snapshot`/`confluence-extend` → `embed-knowledge`, damit der Korpus Edits seit 06-19 (11 d) reflektiert. Voyage-ZDR-Opt-Out bestätigen (wie C1). | Frische / AUDIT-006 | M | Demo-Prep-Woche |
| **R3** | **Sync-Recency-Cron** (oder mindestens ein manueller Pre-Demo-Run-Check): aktuell **kein** Cron für snapshot/embed → stille Drift. Mind. ein Recency-Alarm „Snapshot älter als N Tage". | AUDIT-006 | M | vor Demo / post |
| **R4** | **Die 6 operativen Gold-Set-Korrekturen** (AUDIT-002/003) triagieren — die 2 vorhandenen Korrektur-Chunks sind Identity („wer ist Buhara"), **nicht** die operativen Fixes (Hara Filo Source-Fehler, Pegasus PNR etc.). Siehe D-104-Backlog. | AUDIT-002/003 | M–L | Welle D |
| **R5** | **Retrieval-Stats-Hygiene:** nach jedem Re-Embed verwaisen alle `chunk_retrieval_stats`-Rows (ID-Shift). Vor der Demo bewusst einplanen (Stats werden „resettet"), oder Rollup gegen `content_hash` statt `id` stabilisieren (post-demo). | §5 | S–M | post-demo |

**Gut, nichts zu tun:** Embedding-Integrität (0 NULL/0 leer), Retrieval-Pipeline (warmup + Rollup grün),
Security-Remediation (AUDIT-001 verifiziert behoben), RAG-Antwortqualität (86,9 % genuine, D-104).

---

## 8. Open Questions für Owner

1. **BS1-Scope:** Welche genauen Confluence-Pages/Fakten demonstriert BS1? → entscheidet, ob der
   47-Zeichen-AERCONSO-Stub (§6) ein Show-Stopper ist oder irrelevant.
2. **AERCONSO-Space:** Soll der volle AERCONSO-Space gesynct werden, oder reichen die 3 gezielten
   Extra-Pages? Aktuell ist „AERCONSO" praktisch nur „Airline Kontakte" (1 Page, fast leer).
3. **`team`/`news`-Bereiche:** Die Migration `extend_confluence_raw_schema` nennt sie als
   Coverage-Ziel (FAQ/Team/News/Support), aber nur `faq` (1) und `support` (1) existieren —
   `team`/`news` wurden nie gesynct. Bewusst weggelassen oder offene Lücke?
4. **Pre-Demo-Re-Embed:** Freigabe für genau **einen** Snapshot+Embed-Run vor dem 01.08 (Voyage-ZDR
   bestätigt)? Das schließt R2 + bringt etwaige Confluence-Edits seit 06-19 rein.
5. **Retrieval-Coverage 40,5 %:** Akzeptabel (viele nischige Anhang-Chunks), oder soll vor der Demo
   geprüft werden, ob ungenutzte Anhang-Chunks (PDF/Office) Lärm im Retrieval erzeugen?

---

## Anhang — Reproduzier-Queries (alle read-only gegen `zkydrymygjrscjbhusxp`)

```sql
-- Korpus-Inventar
SELECT count(*) chunks, count(DISTINCT page_id) pages_with_chunks,
       count(*) FILTER (WHERE embedding IS NULL) missing_emb,
       min(created_at) oldest, max(created_at) newest
FROM confluence_chunks;

-- Per-Space (Source of Truth)
SELECT space_key, bereich, count(*) pages, max(snapshot_at) latest_snapshot
FROM confluence_raw GROUP BY space_key, bereich ORDER BY pages DESC;

-- Page-Coverage (raw ohne Chunk = absichtliche Secret-Purges)
SELECT r.page_id, r.title, r.bereich FROM confluence_raw r
LEFT JOIN (SELECT DISTINCT page_id FROM confluence_chunks) c ON c.page_id=r.page_id
WHERE c.page_id IS NULL AND NOT r.is_deleted;

-- Retrieval nach Space (source_id = confluence_chunks.id)
SELECT COALESCE(r.space_key,'(unmatched)') space, count(*) chunks,
       sum(s.retrieved_count) retr, max(s.last_retrieved_at) last
FROM chunk_retrieval_stats s
JOIN confluence_chunks c ON c.id = s.source_id::bigint
LEFT JOIN confluence_raw r ON r.page_id=c.page_id
WHERE s.source='confluence' GROUP BY r.space_key ORDER BY retr DESC;

-- Orphan-Check (Rollup-Rows ohne lebenden Chunk)
SELECT count(*) FILTER (WHERE c.id IS NULL) orphaned
FROM chunk_retrieval_stats s LEFT JOIN confluence_chunks c ON c.id=s.source_id::bigint
WHERE s.source='confluence';

-- AERCONSO Substanz (demo-kritisch)
SELECT page_id, title, char_count, length(body_text) body_text_len
FROM confluence_raw WHERE page_id IN ('16165417','446989123');

-- Cron-Status (kein Sync/Embed-Cron vorhanden)
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

*Hinweis: Dieser Bericht enthält keine echten Geheimnisse. Die in §3/§4 genannten Secret-Page-IDs
sind bereits gepurgt (AUDIT-001); es werden keine Klartext-Werte zitiert.*
