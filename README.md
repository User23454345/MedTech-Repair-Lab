# ⚕ MedTech Repair Lab

**Interaktive virtuelle Werkstatt für Medizintechnik.** Lerne, wie Medizingeräte aufgebaut sind,
wie typische technische Fehler entstehen und wie eine systematische Fehlerdiagnose funktioniert –
mit virtuellen Messgeräten, nachvollziehbaren Messwerten und vollständig ausgearbeiteten
Servicefällen.

> ⚠ **Lernsimulation – keine Serviceanleitung.** Gerätemodelle, Steckerbelegungen, Testpunkte,
> Servicemenüs und Messwerte sind generisch bzw. fiktiv. Für reale Arbeiten an Medizinprodukten
> sind ausschließlich Herstellerunterlagen, die erforderliche Qualifikation und die geltenden
> Vorschriften (u. a. MPDG, MPBetreibV, IEC 62353) maßgeblich.

## Starten

Keine Installation nötig: **`index.html` im Browser öffnen** (Doppelklick genügt).
Alternativ mit lokalem Webserver, z. B.:

```bash
python3 -m http.server 8000
```

und dann `http://localhost:8000` aufrufen. Der Lernfortschritt wird im Browser gespeichert (localStorage).

## Was steckt drin?

| Bereich | Inhalt |
|---|---|
| 🧰 **Arbeitsplatz & Reparaturfälle** | Servicefälle in 9 Lernschritten: Ausgangssituation → Fehlerbeschreibung → Technische Grundlagen → Untersuchung → Mögliche Ursachen → Diagnose (Diagnosebaum, Grundursache, Instandsetzung, Funktionsprüfung) → Erklärung → Dokumentation (Instandsetzungsbericht) → Abschlusstest. Bewertung mit 100 Punkten. |
| 📟 **Messgeräteschrank** | Multimeter (mit echtem Netzwerk-Solver), Oszilloskop, Patientensimulator, EKG-Simulator, Sicherheitsanalysator (IEC 62353), Druckmessgerät, Durchfluss-/Beatmungsanalysator, Pumpenprüfgerät – jeweils mit Übungsaufbauten und zuschaltbaren Lernfehlern. |
| 🩺 **Gerätebibliothek** | Patientenmonitor, Beatmungsgerät, Infusionspumpe, Spritzenpumpe, EKG-Gerät, Defibrillator, Absauggerät, Blutdruckmessgerät, Ultraschallgerät, Dialysegerät: Aufbau, Komponenten, Signalweg, typische Fehler, Verschleiß, Funktionskontrolle, Sicherheit. |
| 📦 **Ersatzteillager** | Ersatz- und Verschleißteilkunde mit Fehlerbildern, Austauschhinweisen und Prüfungen nach dem Tausch. |
| 📚 **Technische Dokumentation** | Geräteaufbau, Schaltplanverständnis, systematische Fehlersuche, Verschleiß, Ersatzteilkunde, Dokumentation, Funktionskontrolle, elektrische Sicherheit, rechtlicher Rahmen, Hygiene. |

### Referenzfall: „Patientenmonitor zeigt keine Sauerstoffsättigung an“

Vollständig ausgearbeitet: Anamnese, Sichtprüfung, Servicemenü, Fehlerprotokoll, SpO₂-Simulator
mit Tauschtests, Multimeter-Durchgangsprüfung mit Biegetest (intermittierender Aderbruch),
Diodentest von LEDs und Photodiode, Signalverfolgung mit dem Oszilloskop, Diagnosebaum,
Instandsetzung (inkl. typischer Fehlentscheidungen wie „Tausch auf Verdacht“ oder „Kabel löten“),
Funktions- und Sicherheitsprüfung, Instandsetzungsbericht und Abschlusstest.

## Prinzipien

* **Deterministisch statt zufällig:** Jeder Fehlerfall hat einen definierten Zustand; alle
  Messwerte werden daraus berechnet. Gleiche Messung → gleiches Ergebnis.
* **Belegen statt raten:** Im Diagnosebaum werden Antworten nur akzeptiert, wenn die dafür nötigen
  Befunde tatsächlich erhoben wurden.
* **Vorher/Nachher konsistent:** Die Instandsetzung ändert den Simulationszustand; die
  Funktionsprüfung misst mit denselben Modellen.

## Entwicklung

* Architektur und Datenformate: [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md)
* Automatische Prüfungen (Querverweise, Determinismus, Erreichbarkeit aller Befunde,
  Musterlösung jedes Falls = 100 Punkte):

```bash
node tests/check.js
```
