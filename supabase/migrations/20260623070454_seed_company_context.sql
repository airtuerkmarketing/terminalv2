-- ====================================================================
-- Seed company_context — airtuerk-KI identity layer (Layer 1)
-- Plan: terminal/01-FOUNDATION Atomic Prompt 1.8
-- Decision: D-058 (RAG Foundation)
--
-- Source-of-truth: live DB (brands, team_members, confluence_raw.kanal/bereich)
-- pulled 2026-06-23, NOT plan templates. Entries marked "needs_review": true
-- in metadata are best-guess / operational specifics that Buhara must confirm
-- (their content begins with "⚠️ BUHARA-INPUT").
--
-- Process/operational SPECIFICS (PNR formats, cancellation steps, check-in
-- windows) are deliberately NOT asserted as priority-1 identity — those live in
-- Layer 2 (confluence_chunks) as the authoritative source. Putting an unverified
-- value here (always-injected) would poison every answer. Process entries here
-- are pointers + ownership, priority=2.
-- ====================================================================

INSERT INTO public.company_context (category, topic, content, priority, language, metadata)
VALUES

-- ============ MISSION (priority 1) ============
('mission', 'Unternehmens-Identität',
 'airtuerk Service GmbH ist ein in Frankfurt am Main ansässiges Unternehmen der airtuerk-Gruppe. Kerngeschäft ist die Flugkonsolidierung sowie Türkei- und Reise-Dienstleistungen für den deutschsprachigen Raum (DACH), sowohl B2B als auch B2C — von Flügen über Pauschalreisen und Hotels bis zu Mietwagen und Transfers.',
 1, 'de', '{"display_name": "Wer wir sind"}'::jsonb),

('mission', 'Positionierung',
 'airtuerk ist die zentrale Anlaufstelle für Türkei- und Flugreisen in der DACH-Region. Die Markenfamilie deckt jedes Segment ab: vom reinen Flug (Konsolidierung, Low-Cost, NDC) über Pauschalreisen und Hotelinventar bis zu technischen B2B-Plattformen und APIs.',
 1, 'de', '{}'::jsonb),

('mission', 'Marktsegmente',
 'Abgedeckte Segmente: Flugkonsolidierung (Konti), Low-Cost-Carrier, Pauschal- und Leisure-Reisen, Hotel- und Beds-Inventar (B2B), Mietwagen und Transfers sowie B2B-Technologie/API für Reisepartner.',
 1, 'de', '{}'::jsonb),

-- ============ TEAM / ORGANISATION (priority 1) ============
('team_structure', 'Geschäftsführung',
 'Geschäftsführer (CEO): Ümit Tenekeci. Kaufmännischer Leiter (CFO): Ahmet Özbek. Sie bilden die Geschäftsführung der airtuerk Service GmbH.',
 1, 'de', '{}'::jsonb),

('team_structure', 'Service & Operations',
 'Head of Operations: Murat Sinim — verantwortlich für das Service-Center und alle operativen Abläufe (Buchungen, Stornierungen, Umbuchungen, Spezialwünsche). Operative Managerin im Service: Selin Ülker. Mentor im Service-Team (fachliche Anleitung Service Agents): Ufuk Köroglu. Das Service-Team umfasst zahlreiche Service Agents.',
 1, 'de', '{}'::jsonb),

('team_structure', 'IT & Software',
 'Software Technical Lead: Veli Kürsad Kilincer. IT-Systemadministration und B2B-Support: Efkan Barin. Das IT-Team entwickelt unter anderem die IBE-Produktsuite und interne Tools.',
 1, 'de', '{}'::jsonb),

('team_structure', 'Finance & Verwaltung',
 'Kaufmännische Leitung / Finance: Ahmet Özbek. Das Finance-Team verantwortet Controlling, Reporting, Zahlungsabwicklung und Debitorenmanagement. Office Management / Verwaltung: Ayten Koc.',
 1, 'de', '{}'::jsonb),

('team_structure', 'Marketing',
 'Marketing-Leitung (Marketing Manager): Buhara Demir. UX-/UI-Design: Emirkan Erkara.',
 1, 'de', '{}'::jsonb),

('team_structure', 'Weitere Abteilungen',
 'Vertrieb / Sales-Leitung: Emre Karakas. Flugdisposition / Flight Charter: Tim Sahin (Head of Flight Charter). HR / Personal: Beritan Kurt und Ufuk Yildirim. Business Development: Hakan Sezen.',
 1, 'de', '{}'::jsonb),

-- ============ BRANDS / SERVICE OFFERING (priority 1) ============
('service_offering', 'Brand-Hierarchie Übersicht',
 'airtuerk umfasst 15 Marken: 8 Top-Level-Marken plus 7 Produkte der IBE-Produktsuite. Top-Level: airtuerk Service, airtuerk Holidays, atBeds, Service Center Antalya, IBE Product Suite, airtuerk APIX, Internal Branding sowie der Presentation Hub (interne Ressource).',
 1, 'de', '{}'::jsonb),

('service_offering', 'Marke: airtuerk Service',
 'airtuerk Service GmbH ist die Kernmarke des Flugkonsolidierungs-Geschäfts — inklusive Markenauftritt, Briefbögen, Präsentationsvorlagen und E-Mail-Signaturen.',
 1, 'de', '{}'::jsonb),

('service_offering', 'Marke: airtuerk Holidays',
 'airtuerk Holidays ist die Marke für Leisure- und Pauschalreisen (Claim: "Vacations beyond expectations").',
 1, 'de', '{}'::jsonb),

('service_offering', 'Marke: atBeds',
 'atBeds ist die Marke für Unterkünfte und B2B-Hotelinventar (Claim: "Smart rooms, simple stays").',
 1, 'de', '{}'::jsonb),

('service_offering', 'Marke: Service Center Antalya',
 'Das Service Center Antalya ist der Operations- und Kundenservice-Hub in Antalya mit Support am Boden und in der Luft.',
 1, 'de', '{}'::jsonb),

('service_offering', 'Marke: airtuerk APIX',
 'airtuerk APIX ist die API-Plattform für airtuerk-Partner — NDC, Linienflug (scheduled), Charter, Payment sowie B2B/B2C-Tooling (Claim: "One API for global flight content").',
 1, 'de', '{}'::jsonb),

('service_offering', 'Marke: IBE Product Suite',
 'Die IBE Product Suite ist die interne Booking-Engine-Produktfamilie. Produkte: multicheck (Multi-Airline-Fare-Vergleich), cockpit (Agent-Workspace), myBooking (Direktbuchung), rentalCar (Mietwagen-Aggregator), myTransfer (Transfers), myStats (Buchungs-Analytics) und airLounge (Lounge-Zugang, Legacy).',
 1, 'de', '{}'::jsonb),

('service_offering', 'Operative Kanäle',
 'Das operative Wissen (Bereich operative_kanaele, 82 Seiten) ist nach Kanälen gegliedert: Konti (Konsolidierungspartner), Low-Cost-Carrier, Mietwagen, B2B, XML und Veranstalter. Detailfragen zu einzelnen Kanälen werden über die Operations-Wissensbasis beantwortet.',
 1, 'de', '{}'::jsonb),

-- ============ BRAND VOICE (priority 1) ============
('brand_voice', 'Antwort-Tonalität',
 'Antworten sind professionell-sachlich und präzise, ohne Marketing-Sprache. Konkrete Werte (Preise, Formate, Fristen, Mailadressen) werden exakt aus den Quellen zitiert. Bei Unsicherheit ehrlich sagen: "Das geht aus unseren Quellen nicht eindeutig hervor." Niemals halluzinieren.',
 1, 'de', '{}'::jsonb),

('brand_voice', 'Sprachen',
 'Standardsprache ist Deutsch. Türkische und englische Fachbegriffe (z.B. Konti, PNR, Refund, NDC) werden in der Originalsprache verwendet und nicht übersetzt.',
 1, 'de', '{}'::jsonb),

-- ============ PROCESS (priority 2 — pointers, not unverified specifics) ============
('process', 'Stornierungen',
 'Stornierungen laufen kanalspezifisch (je nach Konti/Veranstalter unterschiedliche Refund-Prozesse). Die konkreten Schritte stehen in den Operations-Pages des jeweiligen Kanals; zentraler Ansprechpartner: Murat Sinim (Head of Operations).',
 2, 'de', '{"needs_review": true}'::jsonb),

('process', 'PNR-Formate',
 'PNR-Formate sind kanal- und anbieterspezifisch und in den jeweiligen Konti-Operations-Pages dokumentiert. Konkrete Formatangaben werden aus den Operations-Quellen bezogen.',
 2, 'de', '{"needs_review": true}'::jsonb),

('process', 'Check-in & Fristen',
 'Check-in-Fenster und Buchungsfristen sind anbieterspezifisch und in den Operations-Pages dokumentiert. Pauschale Werte existieren nicht — die exakten Fristen werden pro Anbieter in der Operations-Wissensbasis nachgeschlagen.',
 2, 'de', '{"needs_review": true}'::jsonb),

('process', 'Eskalationspfade',
 'Service-/Operations-Eskalationen: Murat Sinim (Head of Operations); operative Koordination: Selin Ülker (Operative Managerin); fachliches Mentoring im Service: Ufuk Köroglu. IT-/Technik-Themen: Veli Kürsad Kilincer (Software Technical Lead) bzw. Efkan Barin (B2B-Support).',
 2, 'de', '{}'::jsonb),

-- ============ GLOSSARY (priority 2) ============
('glossary', 'Konti',
 'Konti bezeichnet im airtuerk-Kontext die Kontingent-/Konsolidierungspartner bzw. -kanäle für Flüge. Konti ist mit 32 Operations-Seiten der größte Wissensbereich der Operations-Wissensbasis.',
 2, 'de', '{"needs_review": true}'::jsonb),

('glossary', 'PNR',
 'PNR (Passenger Name Record) ist der Buchungscode bzw. Reservierungsdatensatz einer Flugbuchung bei einem Anbieter oder GDS.',
 2, 'de', '{}'::jsonb),

('glossary', 'Branchenbegriffe',
 'IBE = Internet Booking Engine (airtuerks interne Buchungsplattform-Familie). NDC = New Distribution Capability (IATA-Standard für den Flugvertrieb). BSP = Billing and Settlement Plan (IATA-Abrechnungssystem). XML = XML-basierte Anbindung externer Anbieter.',
 2, 'de', '{}'::jsonb),

('glossary', 'Filo / Mietwagen',
 '"Filo" (türkisch für "Flotte") bezieht sich im airtuerk-Kontext auf Mietwagen-/Fahrzeugflotten-Partner; "Hara Filo" ist ein solcher Partner. Mietwagen ist ein eigener operativer Kanal mit 17 dokumentierten Seiten.',
 2, 'de', '{"needs_review": true}'::jsonb),

-- ============ #28 — Standort & Rechtsform (priority 1) ============
('mission', 'Standort & Rechtsform',
 'airtuerk Service GmbH ist eine GmbH mit Sitz in Frankfurt am Main, Deutschland. Die Gesellschaft ist im DACH-Raum aktiv mit operativer Präsenz auch in Antalya (Service Center Antalya).',
 1, 'de', '{}'::jsonb);
