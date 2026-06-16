-- 0011_document_library_seed.sql
-- Phase 4 Task 5d — Document Library data prep (DATA SEED ONLY).
--
-- Prepares the `documents` table so the Document Library page (Task 5e) can
-- render coarse department filter chips and pair the PDF + Office versions of
-- the same document. No rows are added or deleted; no `category` value changes;
-- `preview_asset_id` is left NULL (the page falls back to a sample cover).

-- (a) Coarse department filter chip — intentionally SEPARATE from `category`
--     (which stays as the fine section-grouping). Must be CMS-editable later, so
--     it is a real nullable column, not hardcoded in app code.
alter table public.documents
  add column if not exists department text;

-- (b) Populate `department` from `category`:
--       agenturverwaltung    ← bank-info, sepa-mandate
--       hr                   ← hr-form
--       business-development ← framework-agreement, partner-agreement, api-doc, nda
--       sales                ← (none yet — KIM contracts come later)
--       NULL                 ← master-deck, logo-package, reference, misc, magazine
--     The NULL categories are intentionally excluded from the Document Library;
--     they surface elsewhere (master-deck → Presentation Hub, logos → brand
--     pages, misc → Asset Library).
update public.documents
set department = case
  when category in ('bank-info', 'sepa-mandate')                                  then 'agenturverwaltung'
  when category = 'hr-form'                                                        then 'hr'
  when category in ('framework-agreement', 'partner-agreement', 'api-doc', 'nda') then 'business-development'
  else null
end;

-- (c) Pair PDF + Office versions of the SAME document. Rule: rows that share an
--     IDENTICAL `title` are one pair (e.g. "OTA Framework Agreement DE" exists as
--     .docx + .pdf). DE and EN are DIFFERENT titles → DIFFERENT pairs (correct —
--     separate cards). `pair_id` is a self-FK → documents(id), so each title-group
--     shares the id of an anchor row (the deterministic min(id) of the group);
--     every row in the group — including the anchor itself — points at that id.
--     Singletons (unique title) get their own id as pair_id. Grouping is by title.
with title_groups as (
  -- min() has no uuid overload; compare as text and cast back (deterministic).
  select title, (min(id::text))::uuid as anchor_id
  from public.documents
  group by title
)
update public.documents d
set pair_id = g.anchor_id
from title_groups g
where d.title = g.title;
