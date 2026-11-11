# MedTech Repair Lab – Architektur

Statische Web-App ohne Build-Schritt und ohne Abhängigkeiten. `index.html` lässt sich direkt
im Browser öffnen (auch per Doppelklick, `file://`). Alle Inhalte sind **Daten**, die sich über
eine zentrale Registry anmelden – Geräte, Fälle, Ersatzteile und Wissensartikel lassen sich
ergänzen, ohne Kern oder Oberfläche anzufassen.

```
index.html                  Einstieg, bindet alle Skripte in fester Reihenfolge ein
css/style.css               Design (digitales Labor, dunkles Theme)
js/core/core.js             Registry (MTRL.*), Hilfsfunktionen, Netzwerk-Solver, Fortschritt
js/core/case-engine.js      Ablauf & Bewertung eines Reparaturfalls (CaseSession)
js/ui/dom.js                DOM-Helfer (h, select, segmented, stepper, modal, toast)
js/ui/monitor-display.js    Monitorbild mit Sweep-Kurven
js/instruments/*.js         8 virtuelle Messgeräte (generische Oberflächen)
js/data/devices/*.js        Gerätebibliothek (je Gerät eine Datei)
js/data/parts/*.js          Ersatzteile (je Gerätegruppe eine Datei)
js/data/knowledge/*.js      Wissensartikel
js/data/sandboxes.js        Übungsaufbauten für das Messgerätelabor
js/data/cases/*.js          Reparaturfälle
js/ui/views.js              Werkstatt, Bibliotheken, Labor
js/ui/case-view.js          Fallansicht (9 Lernschritte)
js/ui/app.js                Router & Navigation (zuletzt geladen)
tests/check.js              Automatische Prüfungen: node tests/check.js
```

## Grundprinzip: Messgerät + Fixture

Jedes Messgerät ist eine **generische Bedienoberfläche**. Was gemessen wird, beschreibt eine
**Fixture** (Prüfling, Anschlusspunkte, Physik). Dieselbe Multimeter-Oberfläche misst im
SpO₂-Fall ein Adapterkabel und im Labor ein EKG-Kabel – nur die Fixture unterscheidet sich.

Fixtures berechnen Messwerte **ausschließlich aus einem serialisierbaren Zustand** (`ctx.state`).
Es gibt keinen Zufall: `MTRL.util.noise()` ist deterministisches Pseudo-Rauschen. Für
Widerstands- und Diodenmessungen gibt es einen echten Netzwerk-Solver (`MTRL.Netlist`,
Knotenpotentialverfahren), sodass Messwerte physikalisch nachvollziehbar entstehen.

| Messgerät (`id`)      | Fixture-Schnittstelle (Kurzform) |
|-----------------------|----------------------------------|
| `multimeter`          | `points[]`, `modes[]`, `measure(mode, red, black, ctx, tick)` |
| `oscilloscope`        | `testpoints[]`, `sample(tp, t, ctx)`, `onView(settings, ctx)` |
| `patient-simulator`   | `params[]`, `presets[]`, `display(settings, ctx, t)`, `onSettings` |
| `ecg-simulator`       | `process(electrodes, settings, ctx, t)` |
| `safety-analyzer`     | `protectionClass`, `appliedParts[]`, `values(ctx)`, `onResult` |
| `pressure-meter`      | `setpoints[]`, `tolerance`, `deviceReading(ref, ctx)`, `leak`, `maxReachable` |
| `flow-analyzer`       | `measure(settings, ctx) → {ref, device, alarms}`, `tolerances` |
| `pump-analyzer`       | `rates[]`, `flow(rate, tMin, ctx)`, `occlusion(ctx)` |

Alle Fixtures können `controls` haben (Umschalter/Auswahl im Prüfaufbau, z. B. Tauschtest
oder Biegetest). Im Labor werden darüber Lernfehler zugeschaltet.

## Reparaturfall (Datenformat)

Vollständiges Referenzbeispiel: `js/data/cases/pm-spo2-no-signal.js`.

```
MTRL.registerCase({
  id, deviceId, title, summary, difficulty, duration, tags,
  createState: () => ({...}),                 // definierter Fehlerzustand
  situation: { ticket: {...}, html, checklist },        // 1 Ausgangssituation
  symptom:   { html, display(state, t), observations }, // 2 Fehlerbeschreibung
  basics:    [{ title, html }],                         // 3 Technische Grundlagen
  findings:  [{ id, text, cat }],                       // alle möglichen Befunde
  investigations: [                                     // 4 Untersuchung
    { id, type: 'action', title, minutes, run(ctx) → {html, findings: [...]} },
    { id, type: 'instrument', instrument, fixture(ctx), phase?: 'verify' },
  ],
  hypotheses: [{ id, text, expected: 'confirmed'|'excluded', evidence, explain }], // 5
  diagnosis: {                                          // 6 Diagnose
    tree: { start, nodes: { id: { question, answers: [{label, correct, requires, next, feedback}] } } },
    rootCauses:    [{ id, text, correct, feedback }],   // genau eine richtig
    repairActions: [{ id, text, verdict: 'correct'|'good'|'neutral'|'wrong', completes?, apply(state) }],
    functionChecks:[{ id, title, passFinding, investigation }],
  },
  explanation:   { html },                              // 7 Erklärung
  documentation: { fields: [select|multi|text] },       // 8 Dokumentation
  quiz: [{ q, options, correct, explain }],             // 9 Abschlusstest
});
```

**Regeln für fachlich saubere Fälle**

* Ein Fehler ist **definiert**, nicht zufällig. Jeder Befund folgt aus dem Zustand.
* Antworten im Diagnosebaum werden nur akzeptiert, wenn sie fachlich stimmen **und** die
  belegenden Befunde (`requires`) erhoben wurden – Raten führt nicht zum Ziel.
* Instandsetzung über `apply(state)` verändert den Zustand; die Funktionsprüfung danach misst
  mit denselben Fixtures – das „Vorher/Nachher“ ist so physikalisch konsistent.
* Keine erfundenen Herstelleranleitungen: Belegungen, Testpunkte und Servicemenüs sind als
  **fiktives Lernmodell** gekennzeichnet. Sicherheitskritische Eingriffe (Hochspannung,
  Schutzfunktionen, Netzteil, Isolationsbarriere) werden nicht als Anleitung beschrieben,
  sondern auf Herstellerunterlagen und qualifiziertes Personal verwiesen.

## Bewertung (100 Punkte)

| Teil | Punkte |
|------|-------:|
| Ursachenbewertung (erste vollständige Bewertung zählt) | 20 |
| Grundursache (−10 je Fehlversuch) | 30 |
| Instandsetzung ohne Tausch auf Verdacht | 15 |
| Funktionsprüfungen | 10 |
| Dokumentation | 10 |
| Abschlusstest | 15 |

## Neues Gerät / neuen Fall hinzufügen

1. Datei unter `js/data/devices/`, `js/data/parts/` bzw. `js/data/cases/` anlegen
   (Vorlage: Patientenmonitor-Dateien).
2. Skript-Tag in `index.html` zwischen `@content-start` und `@content-end` ergänzen
   (Reihenfolge: Geräte → Ersatzteile → Wissen → Übungsaufbauten → Fälle).
3. `node tests/check.js` ausführen. Der Test
   * prüft Querverweise (Gerät ↔ Ersatzteil ↔ Messgerät ↔ Wissen),
   * bedient alle Fixtures automatisch (alle Schalterkombinationen) und prüft Determinismus,
   * prüft, dass jeder benötigte Befund tatsächlich erzeugbar ist,
   * spielt die Musterlösung durch und erwartet 100/100 Punkte.
