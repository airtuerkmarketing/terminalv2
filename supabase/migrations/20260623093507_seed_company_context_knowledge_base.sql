-- ====================================================================
-- Seed company_context — 6 priority-1 entries from the curated Intelligence
-- Knowledge Base v1.2 (closes demo-critical content gaps: B2B scale/PAX,
-- airline-partner reach, product suite, ATBeds, airtuerk International, onboarding).
-- Decision: D-061. Embedded via embed-knowledge {source:'context'}.
-- ====================================================================

INSERT INTO public.company_context (category, topic, content, priority, language, metadata)
VALUES
('mission', 'B2B Positioning & Scale',
 'airtuerk Service GmbH ist seit 2006 ein B2B-Flugkonsolidator und Travel-Tech-Anbieter mit Hauptsitz in Frankfurt am Main. Strikt B2B — keine Endkunden, Vertrieb erfolgt ausschließlich über Partner-Kanäle (Reisebüros, Tour-Operator, OTAs, Airlines). ~2,5 Millionen PAX pro Jahr, ~1.200 aktive Agenturen in DACH+Benelux. Teil der Berlin-basierten AERTiCKET Group.',
 1, 'de', '{"source": "knowledge_base_v1.2"}'::jsonb),

('service_offering', 'Airline-Partner & Fare-Reichweite',
 'airtuerk bietet exklusive B2B-Netto- und Sondertarife von ~170 Airline-Partnern, mit Spezialtarifen über 80.000+ globale Origin&Destination-Paare. Starke saisonale Verfügbarkeit für Türkei (AYT), Ägypten (HRG) und Griechenland (HER).',
 1, 'de', '{"source": "knowledge_base_v1.2"}'::jsonb),

('service_offering', 'Core Product Suite (B2B)',
 'Kern-Produkte für B2B-Partner: Cockpit (Flagship Multi-Product IBE), multicheck (Price-Comparison Portal mit SSR/PNR Management), airtuerk Holidays (Package & Dynamic Packaging), airtuerkPRO (Mobile App), ATBeds (Bedbank/Hotel-IBE in Istanbul), myBooking (Booking Management & Online Check-in).',
 1, 'de', '{"source": "knowledge_base_v1.2"}'::jsonb),

('team_structure', 'ATBeds-Leitung',
 'ATBeds ist airtuerks neue standalone Bedbank-/Hotel-IBE-Company, Sitz Istanbul (Akasya Tower). Leitung: Tarık Öztürk (Hotel Business Development Manager). Launch durch 2026.',
 1, 'de', '{"source": "knowledge_base_v1.2"}'::jsonb),

('team_structure', 'airtuerk International',
 'airtuerk International ist das Team für globale Marktexpansion und Partner-Akquise, mit Netzwerk in 80+ Ländern. Leitung: Burak Akpinar (Head of International Partnerships).',
 1, 'de', '{"source": "knowledge_base_v1.2"}'::jsonb),

('process', 'Onboarding-Konditionen',
 'airtuerk berechnet keine Setup- oder Registrierungs-Gebühren — Finanzierung erfolgt über Ticketing-Fees / Service-Charges. Aktivierung typischerweise 24-48h nach Dokumenten-Einreichung. Security-Deposit grundsätzlich erforderlich. Partner können eigene Aufschläge auf Netto-Tarife und Kontingente flexibel definieren.',
 1, 'de', '{"source": "knowledge_base_v1.2"}'::jsonb);
