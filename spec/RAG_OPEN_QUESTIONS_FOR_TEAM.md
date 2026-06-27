# airtuerk Intelligence — offene Fragen ans Team (Wissens-Validierung)

**Stand:** 2026-06-28 · **Kontext:** Wir testen die KI automatisch gegen 84 Gold-Fragen
(`scripts/rag-eval.ts`). Aktuelle echte Trefferquote **86,9 %**. Die folgenden Fragen
beantwortet die KI noch falsch oder unvollständig — meist, weil die hinterlegte Information
veraltet/fehlt. **Bitte je Zeile kurz bestätigen oder korrigieren.** Danach pflegen wir die
Antworten in die Wissensbasis ein und die KI beantwortet sie korrekt.

> Hinweis: Geheime Daten (volle IBANs, Kreditkartennummern, Passwörter) sind **bewusst NICHT**
> in der KI — sie lehnt dort korrekt ab und verweist an die zuständige Person. Dazu keine Aktion nötig.

---

## Teil A — Fakten bestätigen oder korrigieren
*(Die KI gibt hier aktuell eine falsche/unvollständige Antwort. „Bei uns hinterlegt" = unser
Stand vom 22.06.2026. Bitte bestätigen [✔] oder die richtige Version eintragen.)*

| # | Frage | Bei uns hinterlegt | Was die KI falsch macht | Korrekt? / richtige Antwort |
|---|-------|--------------------|-------------------------|------------------------------|
| 1 | **Pegasus Konti** — PNR-Format + ab wann Airline-PNR? | Format **6-stellig (Buchstaben + Zahlen)**; ab 14 Tage vor Abflug (One Log In Liste / Mybooking) | nennt veraltetes Format „Axxx" | ____________ |
| 2 | **ETI Konti** — E-Mail in den Öffnungszeiten + richtige Bezeichnung? | **flug@eti.de** — das ist die **airtuerk** Flugdispo (nicht „ETI Flugdispo") | nennt sie „ETI Flugdispo" statt „airtuerk Flugdispo" | ____________ |
| 3 | **WEGO TRAVEL** — wer bearbeitet Direktkunden-Stornos? | **Nur WEGO selbst** (airtuerk bearbeitet diese nicht) | sagt, sie wisse es nicht | ____________ |
| 4 | **Portal-Tagesstorno** — Widerrufsrecht? | **Kein Widerrufsrecht am Buchungstag**; Kulanz nur bei kostenlos/gering stornierbaren Buchungen | lässt die Kernregel weg | ____________ |
| 5 | **PayPal-Account** — wer gibt den SMS-Code? | Anfrage an **Selin Köroğlu** | nennt niemanden / lehnt ab | ____________ (noch zuständig?) |
| 6 | **TUIfly** — PET/PETC wie anmelden? | **servicecenter@tuifly.com** oder telefonisch | nennt nur veranstalter­spezifische Wege, nicht den TUIfly-Direktkontakt | ____________ |
| 7 | **Er Car** — Flughafen-Nummern (ADB/IST)? | ADB **+90 543 325 26 12**, IST **+90 537 918 29 66** | findet die Nummern nicht | ____________ (noch aktuell?) |
| 8 | **AurumTours** — Sonderregel für airtuerk? | Sonderrufnummer **08921129759**, Mo–Fr 9–18 / Sa–So 10–18 Uhr | findet die Info nicht | ____________ |
| 9 | **Nissa Car** — Notfallnummer + Ansprechpartner? | **+90 542 443 72 75**, **Kadir Alıcı** | nennt zusätzlich **abweichende** Nummern → bitte DIE eine richtige Nummer bestätigen | ____________ |

---

## Teil B — Aktuell keine Info hinterlegt — sollen wir sie aufnehmen?
*(Hier ist die korrekte KI-Antwort eigentlich „liegt mir nicht vor". Bitte entscheiden, ob es
dazu eine offizielle Regel gibt, die wir aufnehmen sollen.)*

| # | Frage | Status | Soll aufgenommen werden? Wenn ja: welche Regel? |
|---|-------|--------|--------------------------------------------------|
| 10 | **Mietwagen-Kaution-Höhe?** | keine Info hinterlegt (die KI **erfindet** hier fälschlich einen Security-Deposit — wird technisch entschärft) | ⬜ nein, „liegt nicht vor" ist korrekt  ⬜ ja → Regel: __________ |
| 11 | **Stornogebühr bei Lufthansa-Direktbuchung?** | keine Info hinterlegt | ⬜ nein, „liegt nicht vor" ist korrekt  ⬜ ja → Regel: __________ |

---

## Nächste Schritte (intern, nach Rücklauf)
- Teil A bestätigte/korrigierte Fakten → als `company_context` einpflegen (D-070-Muster) → Harness erneut messen (Ziel ~92 %+).
- #10 Kaution-Halluzination → technischer Fix (KI soll „liegt nicht vor" sagen statt erfinden), unabhängig vom Team-Rücklauf.
- #7 Er Car / #8 AurumTours stehen bereits im Korpus, werden aber nicht gefunden → zusätzlich Re-Chunking der Lieferanten-Seiten (nach Demo).
- Quelle der Liste: `spec/RAG_EVAL_BASELINE_2026-06-28.md` (D-099–D-104).
