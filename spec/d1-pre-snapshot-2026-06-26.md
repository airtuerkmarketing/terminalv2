# D1 Pre-Run-Snapshot — 2026-06-26

**Zweck:** Audit-Trail für Secret-Cleanup **AUDIT-001** (siehe `spec/AUDIT-KORPUS-2026-06-26.md`).
**Methodik:** Read von `confluence_chunks` für die betroffenen Chunks **vor** dem DELETE.
**Content REDIGIERT** — kein Secret-Klartext (Kartennummern/CVC/Passwörter/IBANs) in dieser Datei. Nur Metadaten + redigierte Beschreibung als Beweis, dass der Delete legitim und scoped war.

**Authority:** Buhara Demir (CMO), abgestimmt mit Ahmet Özbek (CFO). Karten-Rotation laut Ahmet **nicht** nötig (Firmen-Shared-Cards). Confluence-Source-Bereinigung = separater Track (Buhara/Murat/Selin).

**Migration:** `20260625180604_secret_cleanup_audit_001.sql` (Ledger-Version `20260625180604`, applied + verified 0-remaining).
**Pipeline-Guard:** `embed-knowledge` `SECRET_PAGE_DENYLIST` (PERMANENT + TEMPORARY), gleicher Commit.

---

## Scope: 4 Chunks / 4 Pages

| chunk id | page_id | title | chunk_index | source_type | token_count | content_hash | created_at | bereich | Aktion |
|---|---|---|---|---|---|---|---|---|---|
| 228 | 444009709 | Operativ FAQ | 0 | page | 424 | `ffc57b9c101889523ab1304fcf348874` | 2026-06-23 07:56:12+00 | faq | **DELETE (ganze Page)** + PERMANENT denylist |
| 317 | 768213063 | Konti 2026 CC | 0 | page | 16 | `122d8e070ce86c3d408d1a2badffa9df` | 2026-06-23 07:56:32+00 | operative_kanaele | **DELETE (ganze Page)** + PERMANENT denylist |
| 261 | 444007659 | Involatus Genius | 0 | page | 678 | `404c164d4d8a0515ee26746fbb2b390b` | 2026-06-23 07:56:18+00 | operative_kanaele | **DELETE (nur Karten-Chunk)** + TEMPORARY denylist |
| 336 | 444007669 | Involatus Konti | 1 | page | 725 | `ca143b05605507c867d7fea5b9170a10` | 2026-06-23 07:56:35+00 | operative_kanaele | **DELETE (nur Karten-Chunk)** + TEMPORARY denylist |

## Redigierte Inhalts-Beschreibung (kein Klartext)
- **228** — `[REDIGIERT: IBANs + Account-Passwörter (Ryanair/Wizz/Paypal) + Kreditkarten + CVC]`. Ganze FAQ-Page = Credentials.
- **317** — `[REDIGIERT: Kreditkarte (PAN/EXP/CVC)]`. Ganze Page = Karten-Liste.
- **261** — `[REDIGIERT: Involatus-Genius-Ops-Chunk (IATA-Code-Tabelle) mit EINER eingebetteten Kartennummer]`. Clean-Chunks 262/263/264 bleiben.
- **336** — `[REDIGIERT: Involatus-Konti-Ops-Chunk (Storno/Umbuchung-Regeln) mit EINER eingebetteten Kartennummer]`. Clean-Chunk 335 bleibt.

## Erwartete Counts
- `confluence_chunks`: 367 → **363** (Δ −4)
- Ziel-Predikat (`page_id IN ('444009709','768213063') OR id IN (261,336)`): 4 → **0**
- `confluence_raw`: **86/86 unverändert** (Sources bleiben vollständig; nur Embed-Stufe gefiltert)

## Rollback-Hinweis
Diese 4 Chunks tragen Secrets und sollen **nicht** wiederhergestellt werden. Ein „Rollback" wäre allenfalls ein Re-Embed der Involatus-Pages **nach** Confluence-Source-Bereinigung (TEMPORARY-Gruppe aus dem Denylist entfernen → manueller `embed-knowledge {source:'confluence'}`-Run → Verify card-frei). FAQ + Konti-CC bleiben PERMANENT ausgeschlossen.
