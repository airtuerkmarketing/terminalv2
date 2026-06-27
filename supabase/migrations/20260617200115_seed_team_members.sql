-- 0019_seed_team_members.sql
-- Phase 4 — seed the 63-person airtuerk team directory from the Webflow source
-- (team.html EMPLOYEES array). Three steps, all idempotent:
--   1. 6 profile-photo asset records (the 6 people with real photos; the photos
--      were uploaded to the `images` bucket under team/ in this same run).
--      Idempotent via the existing UNIQUE(bucket, storage_path).
--   2. 63 team_members. Idempotent via a UNIQUE(email) index created here.
--      avatar_asset_id is resolved by subquery for the 6 photo people, NULL for
--      the other 57 (component renders an initials avatar). sort_order is set in
--      a follow-up UPDATE (alphabetical by last_name, 10er steps).
--   3. 63 team_member_brands links, all is_primary=true: the 2 "airtuerk
--      Holidays" people → airtuerk-holidays brand, the other 61 → airtuerk-service.
--      Idempotent via the PK (team_member_id, brand_id).
-- Brand UUIDs are looked up by slug (no hardcoded generated IDs).

-- ── 1. Profile-photo assets ────────────────────────────────────────────────
INSERT INTO public.assets (bucket, storage_path, public_url, filename, mime_type, size_bytes, alt_text, tags)
VALUES
  ('images','team/uemit-tenekeci.png','https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/team/uemit-tenekeci.png','uemit-tenekeci.png','image/png',644927,'Ümit Tenekeci',ARRAY['team']),
  ('images','team/ahmet-oezbek.png','https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/team/ahmet-oezbek.png','ahmet-oezbek.png','image/png',983635,'Ahmet Oezbek',ARRAY['team']),
  ('images','team/emre-karakas.png','https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/team/emre-karakas.png','emre-karakas.png','image/png',1548966,'Emre Karakas',ARRAY['team']),
  ('images','team/hakan-sezen.png','https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/team/hakan-sezen.png','hakan-sezen.png','image/png',1631485,'Hakan Sezen',ARRAY['team']),
  ('images','team/oruc-demir.png','https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/team/oruc-demir.png','oruc-demir.png','image/png',1661448,'Oruc Demir',ARRAY['team']),
  ('images','team/buhara-demir.png','https://zkydrymygjrscjbhusxp.supabase.co/storage/v1/object/public/images/team/buhara-demir.png','buhara-demir.png','image/png',857287,'Buhara Demir',ARRAY['team'])
ON CONFLICT (bucket, storage_path) DO NOTHING;

-- ── 2. team_members ────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS team_members_email_key ON public.team_members (email);

INSERT INTO public.team_members
  (first_name, last_name, position, department, initials, email, is_lead, joined_year, tools, tasks, sort_order, avatar_asset_id)
VALUES
  ('Ümit','Tenekeci','Geschäftsführer','Management','ÜT','utenekeci@airtuerk.de',true,2006,ARRAY['Notion','Slack','LinkedIn'],'Strategische Gesamtleitung des Unternehmens, Repräsentation nach außen und finale Entscheidungen in allen zentralen Geschäftsfeldern.',0,(SELECT id FROM public.assets WHERE bucket='images' AND storage_path='team/uemit-tenekeci.png')),
  ('Ahmet','Oezbek','Kaufmännischer Leiter','Management','AO','aoezbek@airtuerk.de',true,2018,ARRAY['DATEV','Excel','Personio'],'Steuerung der kaufmännischen Bereiche, Verantwortung für Budget, Reporting und finanzielle Planung des Unternehmens.',0,(SELECT id FROM public.assets WHERE bucket='images' AND storage_path='team/ahmet-oezbek.png')),
  ('Emre','Karakas','Leitung Vertrieb','Management','EK','ekarakas@airtuerk.de',true,2009,ARRAY['HubSpot','LinkedIn','Salesforce'],'Führung des gesamten Vertriebsteams, Entwicklung der Vertriebsstrategie und Aufbau strategischer Kundenbeziehungen.',0,(SELECT id FROM public.assets WHERE bucket='images' AND storage_path='team/emre-karakas.png')),
  ('Hakan','Sezen','Business Development Manager','Management','HS','hakan@airtuerk.de',false,2008,ARRAY['HubSpot','LinkedIn','Notion'],'Identifikation neuer Geschäftsfelder, Aufbau strategischer Partnerschaften und Erschließung neuer Märkte.',0,(SELECT id FROM public.assets WHERE bucket='images' AND storage_path='team/hakan-sezen.png')),
  ('Oruc','Demir','Project Manager','Management','OD','odemir@airtuerk.de',false,2018,ARRAY['Jira','Notion','Slack'],'Planung, Koordination und Umsetzung abteilungsübergreifender Projekte sowie Schnittstelle zwischen Teams und Management.',0,(SELECT id FROM public.assets WHERE bucket='images' AND storage_path='team/oruc-demir.png')),
  ('Murat','Sinim','Head of Operations','Service','MS','msinim@airtuerk.de',true,2015,ARRAY['Salesforce','Slack','Excel'],'Leitung des operativen Service-Bereichs, Verantwortung für Prozesse, Performance und Teamentwicklung.',0,NULL),
  ('Selin','Ülker','Operative Manager','Service','SÜ','suelker@airtuerk.de',false,2018,ARRAY['Salesforce','Excel','Slack'],'Operative Steuerung des Service-Bereichs, Schichtplanung, Qualitätssicherung und Koordination des Teams.',0,NULL),
  ('Ufuk','Köroglu','Mentor','Service','UK','ukoeroglu@airtuerk.de',false,2017,ARRAY['Slack','Notion'],'Einarbeitung neuer Service-Mitarbeiter, fachliche Begleitung und Wissenstransfer im Service-Team.',0,NULL),
  ('Muhittin Oguzhan','Can','Sales Representative – Car Rentals & Transfer','Service','MC','ocan@airtuerk.de',false,2021,ARRAY['Salesforce','Excel'],'Vertrieb von Mietwagen- und Transferleistungen, Beratung von Kunden und Aufbau von Partnerschaften mit Anbietern.',0,NULL),
  ('Aise','Molla Isa','Service Agent','Service','AM','aysem.isa@outlook.de',false,2022,ARRAY['Amadeus','Slack','Outlook'],'Betreuung von Kundenanfragen, Bearbeitung von Buchungen und Umbuchungen, Lösung von Anliegen rund um Flugreisen.',0,NULL),
  ('Erdal','Aksu','Service Agent','Service','EA','eaksu@airtuerkholidays.de',false,2020,ARRAY['Amadeus','Slack','Outlook'],'Bearbeitung eingehender Kundenanfragen, Unterstützung bei Buchungen und Reklamationen.',0,NULL),
  ('Esma','Karacan','Service Agent','Service','EK','ekaracan@airtuerk.de',false,2023,ARRAY['Amadeus','Slack','Outlook'],'Direkter Kundenkontakt, Bearbeitung von Anfragen, Unterstützung bei Buchungsänderungen und Reklamationen.',0,NULL),
  ('Evrim','Yilmaz Cakti','Service Agent','Service','EY','ecakti@airtuerk.de',false,2022,ARRAY['Amadeus','Slack','Outlook'],'Beantwortung von Kundenanfragen, Buchungsbearbeitung und Service rund um Flugreisen.',0,NULL),
  ('Hasan','Oduncu','Service Agent','Service','HO','hoduncu@airtuerk.de',false,2021,ARRAY['Amadeus','Slack','Outlook'],'Telefonische und schriftliche Kundenbetreuung, Bearbeitung von Buchungen und Service-Anliegen.',0,NULL),
  ('Leyla','Ünek','Service Agent','Service','LÜ','luenek@airtuerk.de',false,2024,ARRAY['Amadeus','Slack','Outlook'],'Kundenservice für Flugbuchungen, Umbuchungen und Stornierungen mit Fokus auf zufriedenstellende Lösungen.',0,NULL),
  ('Özden','Can','Service Agent','Service','ÖC','oecan@airtuerk.de',false,2023,ARRAY['Amadeus','Slack','Outlook'],'Bearbeitung von Kundenanfragen über alle Kanäle, Lösung von Buchungs- und Service-Themen.',0,NULL),
  ('Selin','Thoß','Service Agent','Service','ST','selin.thoss@gmx.de',false,2024,ARRAY['Amadeus','Slack','Outlook'],'Kundenbetreuung im Bereich Flugbuchung, Umbuchung und Reklamationsbearbeitung.',0,NULL),
  ('Shaima','Bouzo','Service Agent','Service','SB','sbouzo93@hotmail.de',false,2023,ARRAY['Amadeus','Slack','Outlook'],'Erste Anlaufstelle für Kundenanfragen, Bearbeitung von Buchungsthemen und Reklamationen.',0,NULL),
  ('Tugba','Burnali','Service Agent','Service','TB','tugbaburnali@gmail.com',false,2024,ARRAY['Amadeus','Slack','Outlook'],'Kundenservice rund um Flugreisen, Bearbeitung von Anfragen und Buchungsänderungen.',0,NULL),
  ('Yasin Furkan','Cingi','Service Agent','Service','YC','yasin.cingi@outlook.de',false,2024,ARRAY['Amadeus','Slack','Outlook'],'Kundenkommunikation per Telefon und E-Mail, Buchungsbearbeitung und Lösung individueller Anliegen.',0,NULL),
  ('Yigit','Aktas','Service Agent','Service','YA','digitaktas@gmail.com',false,2025,ARRAY['Amadeus','Slack','Outlook'],'Service-Support für Kunden, Bearbeitung von Buchungen, Umbuchungen und Stornierungen.',0,NULL),
  ('Ufuk','Yildirim','Personalreferent','HR','UY','uyildirim@airtuerk.de',true,2016,ARRAY['Personio','LinkedIn','Outlook'],'Verantwortung für HR-Prozesse, Mitarbeiterentwicklung, arbeitsrechtliche Themen und Personalplanung.',0,NULL),
  ('Beritan','Kurt','Personalreferentin','HR','BK','bkutluay@airtuerk.de',true,2017,ARRAY['Personio','LinkedIn','Outlook'],'Verantwortung für HR-Themen wie Recruiting, Onboarding, Vertragsmanagement und Mitarbeiterbetreuung.',0,NULL),
  ('Gülbahar','Karaman','Pflichtpraktikantin HR','HR','GK','gkaraman@airtuerk.de',false,2025,ARRAY['Personio','Outlook'],'Mitarbeit im Personalwesen, Unterstützung bei Recruiting, Onboarding und administrativen HR-Themen.',0,NULL),
  ('Ali','Kirkim','Financial Data Scientist','Finance','AK','akirkim@airtuerk.de',false,2019,ARRAY['Python','Excel','Power BI'],'Analyse großer Finanzdatensätze, Entwicklung von Reporting-Modellen und datenbasierte Unterstützung strategischer Entscheidungen.',0,NULL),
  ('Kiymet','Caglar','Finance Business Partner – Reporting & Payment Operations','Finance','KC','kcaglar@airtuerk.de',false,2018,ARRAY['DATEV','Excel','Power BI'],'Verantwortung für Reporting und Payment Operations, Schnittstelle zwischen Finance und operativen Bereichen.',0,NULL),
  ('Utku-Deniz','Bostan','Executive Assistant to Management','Finance','UB','ubostan@airtuerk.de',false,2019,ARRAY['Outlook','Notion','Excel'],'Direkte Unterstützung der Geschäftsführung, Koordination von Terminen, Vor- und Nachbereitung von Meetings.',0,NULL),
  ('Sibel','Tobolewski','Debitorenmanagement','Finance','ST','stobolewski@airtuerk.de',false,2017,ARRAY['DATEV','Excel'],'Verwaltung der Forderungen, Mahnwesen, Klärung offener Posten mit Kunden und Pflege der Debitorenkonten.',0,NULL),
  ('Ayse Bahar','Schröder','Mitarbeiterin Abstimmung','Finance','AS','bschroeder@airtuerk.de',false,2020,ARRAY['DATEV','Excel'],'Abstimmung von Konten und Zahlungsströmen, Klärung offener Posten und Unterstützung im Tagesgeschäft der Buchhaltung.',0,NULL),
  ('Ersel','Erdogan','Junior Controller','Finance','EE','eerdogan@airtuerk.de',false,2023,ARRAY['Excel','DATEV','Power BI'],'Unterstützung im Controlling, Erstellung von Auswertungen und Reports sowie Mitarbeit bei Budgetplanung.',0,NULL),
  ('Hasan','Özkaplan','Junior Controller','Finance','HÖ','hoezkaplan@airtuerk.de',false,2024,ARRAY['Excel','DATEV','Power BI'],'Mitarbeit im Controlling, Datenaufbereitung, Reporting und Ad-hoc-Analysen für das Management.',0,NULL),
  ('Oguzhan','Ulubahsi','Junior Controller','Finance','OU','oulubahsi@airtuerk.de',false,2024,ARRAY['Excel','DATEV','Power BI'],'Unterstützung bei der Erstellung von Reports, Analysen und Soll-Ist-Vergleichen für die Geschäftsführung.',0,NULL),
  ('Pelin Ashley','Tasar','Junior Controller','Finance','PT','atasar@airtuerk.de',false,2025,ARRAY['Excel','DATEV','Power BI'],'Mitarbeit im Controlling, Datenanalyse, Aufbereitung von Reports und Mitwirkung an Forecasts.',0,NULL),
  ('Veli Kürsad','Kilincer','Software Technical Lead','IT','VK','kkilincer@airtuerk.de',true,2014,ARRAY['GitHub','Jira','Slack'],'Technische Leitung des Entwicklerteams, Architekturentscheidungen, Codequalität und Mentoring der Developer.',0,NULL),
  ('Efkan','Barin','IT-Systemadministrator & B2B Support','IT','EB','ebarin@airtuerk.de',true,2015,ARRAY['Jira','Slack','Notion'],'Verwaltung der IT-Infrastruktur, Sicherstellung des Systembetriebs und Support für B2B-Partner bei technischen Themen.',0,NULL),
  ('Ertugrul','Murat','Full Stack Developer','IT','EM','emurat@airtuerk.de',false,2018,ARRAY['GitHub','VS Code','Jira'],'Entwicklung von Frontend- und Backend-Komponenten, Implementierung neuer Features und Wartung bestehender Systeme.',0,NULL),
  ('Emre','Gören','Softwareentwickler','IT','EG','egoeren@airtuerk.de',false,2020,ARRAY['GitHub','VS Code','Jira'],'Entwicklung und Pflege interner Anwendungen, Mitarbeit an Features und Fehlerbehebung im bestehenden Code.',0,NULL),
  ('Fikret','Aysel','Softwareentwickler','IT','FA','faysel@airtuerk.de',false,2021,ARRAY['GitHub','VS Code','Jira'],'Konzeption und Umsetzung von Software-Features, Codereviews und kontinuierliche Verbesserung der Plattform.',0,NULL),
  ('Hasan','Cangümüs','Softwareentwickler','IT','HC','hcanguemues@airtuerk.de',false,2019,ARRAY['GitHub','VS Code','Jira'],'Entwicklung neuer Funktionen, Bugfixing und Optimierung bestehender Module der internen Systeme.',0,NULL),
  ('Mammad','Hummatov','Softwareentwickler','IT','MH','mhummatov@airtuerk.de',false,2022,ARRAY['GitHub','VS Code','Jira'],'Entwicklung und Wartung von Anwendungen, Umsetzung neuer Features in enger Abstimmung mit dem Team.',0,NULL),
  ('Mustafa','Coban','Softwareentwickler','IT','MC','mcoban@airtuerk.de',false,2022,ARRAY['GitHub','VS Code','Jira'],'Umsetzung von Software-Features, Pflege bestehender Codebasis und Mitarbeit an technischen Optimierungen.',0,NULL),
  ('Mustafa','Dogruer','Softwareentwickler','IT','MD','mdogruer@airtuerk.de',false,2023,ARRAY['GitHub','VS Code','Jira'],'Mitarbeit in der Entwicklung der internen Plattform, Implementierung neuer Funktionen und Pflege bestehender Module.',0,NULL),
  ('Ufuk','Dogan','Softwareentwickler','IT','UD','udogan@airtuerk.de',false,2021,ARRAY['GitHub','VS Code','Jira'],'Entwicklung neuer Software-Komponenten, Codereviews und Mitwirkung an architektonischen Entscheidungen.',0,NULL),
  ('Ulvi','Lachinov','Softwareentwickler','IT','UL','ulachinov@airtuerk.de',false,2022,ARRAY['GitHub','VS Code','Jira'],'Implementierung neuer Features, Wartung bestehender Anwendungen und Beteiligung an Sprint-Planungen.',0,NULL),
  ('Ziya','Almas','Softwareentwickler','IT','ZA','zalmas@airtuerk.de',false,2023,ARRAY['GitHub','VS Code','Jira'],'Entwicklung neuer Features, Bugfixing und Mitarbeit an Performance- und Stabilitätsverbesserungen.',0,NULL),
  ('Kazım Göker','Kulakcı','Mitarbeiter im IT-Support','IT','KK','gkulakci@airtuerk.de',false,2020,ARRAY['Jira','Slack'],'First- und Second-Level-Support für Mitarbeiter, Hardware-Setup und Behebung technischer Probleme.',0,NULL),
  ('Yasin','Polat','Mitarbeiter im IT-Support','IT','YP','ypolat@airtuerk.de',false,2024,ARRAY['Jira','Slack'],'IT-Support für Mitarbeiter, Wartung von Arbeitsplatzgeräten und Bearbeitung von Helpdesk-Tickets.',0,NULL),
  ('Tim','Sahin','Head of Flight Charter','Flugdisposition','TS','tsahin@airtuerk.de',true,2014,ARRAY['Amadeus','Excel','Slack'],'Leitung des Flight-Charter-Bereichs, Verantwortung für Charterabwicklung und strategische Airline-Partnerschaften.',0,NULL),
  ('Cem Isik','Yildiz','Mitarbeiter Flugdisposition','Flugdisposition','CY','cyildiz@airtuerk.de',false,2018,ARRAY['Amadeus','Excel','Outlook'],'Disposition von Flugaufträgen, Koordination mit Airlines und Sicherstellung reibungsloser Buchungsabläufe.',0,NULL),
  ('Eyüp','Buldan','Service Agent','Flugdisposition','EB','eyupbuldan@gmail.com',false,2022,ARRAY['Amadeus','Slack','Outlook'],'Unterstützung in der Flugdisposition, Bearbeitung kurzfristiger Buchungsthemen und Koordination mit Airlines.',0,NULL),
  ('Harun Zafer','Ertürk','Mitarbeiter Flugdispo','Flugdisposition','HE','zertuerk@airtuerk.de',false,2020,ARRAY['Amadeus','Excel','Outlook'],'Tägliche Disposition von Flügen, Kommunikation mit Airlines und Sicherstellung pünktlicher Abläufe.',0,NULL),
  ('Sevket Uraz','Yorulmaz','Mitarbeiter Flugdispo','Flugdisposition','SY','uyorulmaz@airtuerk.de',false,2021,ARRAY['Amadeus','Excel','Outlook'],'Bearbeitung der Flugdisposition, Abstimmung mit Airline-Partnern und Klärung operativer Themen.',0,NULL),
  ('Mahmut','Özcan','Sales Representative','Vertrieb','MÖ','moezcan@airtuerk.de',false,2019,ARRAY['HubSpot','LinkedIn','Outlook'],'Akquise neuer Kunden, Pflege bestehender Geschäftsbeziehungen und Vertrieb von Reisedienstleistungen.',0,NULL),
  ('Muhammed','Muhammed','Sales Representative','Vertrieb','MM','mmuhammed@airtuerk.de',false,2021,ARRAY['HubSpot','LinkedIn','Outlook'],'Aktive Kundenakquise, Beratung von Geschäftskunden und Erschließung neuer Vertriebspotentiale.',0,NULL),
  ('Onur','Türeray','Sales Representative','Vertrieb','OT','otuereray@airtuerk.de',false,2022,ARRAY['HubSpot','LinkedIn','Outlook'],'Aufbau und Betreuung von Kundenbeziehungen, Verkauf von Reise- und Servicedienstleistungen.',0,NULL),
  ('Ozge','Caglar','Sales Representative','Vertrieb','OC','ozge.caglar@hotmail.com',false,2023,ARRAY['HubSpot','LinkedIn','Outlook'],'Vertrieb an B2B-Kunden, Angebotsbearbeitung und kontinuierliche Kundenpflege.',0,NULL),
  ('Ayten','Koc','Office Managerin','Verwaltung','AK','akoc@airtuerk.de',false,2017,ARRAY['Outlook','Excel'],'Empfang und Begrüßung von Besuchern, Telefonzentrale sowie Unterstützung bei administrativen Tätigkeiten.',0,NULL),
  ('Esra','Adigüzel','Empfangsmitarbeiterin','Verwaltung','EA','eadiguezel@airtuerk.de',false,2021,ARRAY['Outlook','Excel'],'Erste Anlaufstelle für Besucher, Telefonbetreuung und allgemeine Office-Aufgaben im Empfangsbereich.',0,NULL),
  ('Nargiza','Ak','Service-/Reinigungskraft','Verwaltung','NA','nargizadzhelilova@gmail.com',false,2023,ARRAY['Slack'],'Pflege und Sauberkeit der Büroräume, Unterstützung bei kleineren Office-Aufgaben.',0,NULL),
  ('Buhara','Demir','Marketing Manager','Marketing','BD','bdemir@airtuerk.de',true,2018,ARRAY['Figma','Webflow','Canva'],'Verantwortung für die Marketingstrategie, Markenführung und Steuerung aller Marketingmaßnahmen.',0,(SELECT id FROM public.assets WHERE bucket='images' AND storage_path='team/buhara-demir.png')),
  ('Emirkan','Erkara','UX-/UI-Designer','Marketing','EE','eerkara@airtuerk.de',false,2024,ARRAY['Figma','Webflow','Canva'],'Erstellung von Content für Website, Social Media und Kampagnen sowie Pflege der Markenkommunikation.',0,NULL),
  ('Ercüment','Koca','Service Agent','airtuerk Holidays','EK','ekoca@airtuerk.de',false,2020,ARRAY['Amadeus','Outlook'],'Kundenbetreuung im Holidays-Bereich, Bearbeitung von Pauschalreisebuchungen und individueller Reiseanfragen.',0,NULL),
  ('Özlem','Dursun','Kundendienstmitarbeiter','airtuerk Holidays','ÖD','odursun@airtuerkholidays.de',false,2019,ARRAY['Amadeus','Outlook'],'Beratung und Betreuung von Holidays-Kunden, Bearbeitung von Buchungen und Reklamationen für Pauschalreisen.',0,NULL)
ON CONFLICT (email) DO NOTHING;

-- sort_order: alphabetical by last_name then first_name, in 10er steps.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY last_name, first_name) * 10 AS so
  FROM public.team_members
)
UPDATE public.team_members tm SET sort_order = ordered.so
FROM ordered WHERE tm.id = ordered.id;

-- ── 3. team_member_brands (primary brand per person) ───────────────────────
INSERT INTO public.team_member_brands (team_member_id, brand_id, is_primary)
SELECT tm.id, b.id, true
FROM public.team_members tm
CROSS JOIN public.brands b
WHERE b.slug = 'airtuerk-holidays' AND tm.department = 'airtuerk Holidays'
ON CONFLICT (team_member_id, brand_id) DO NOTHING;

INSERT INTO public.team_member_brands (team_member_id, brand_id, is_primary)
SELECT tm.id, b.id, true
FROM public.team_members tm
CROSS JOIN public.brands b
WHERE b.slug = 'airtuerk-service' AND tm.department <> 'airtuerk Holidays'
ON CONFLICT (team_member_id, brand_id) DO NOTHING;
