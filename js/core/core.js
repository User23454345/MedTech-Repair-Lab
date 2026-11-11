/*
 * MedTech Repair Lab – Kern
 * ------------------------------------------------------------
 * Globale Registry für Geräte, Reparaturfälle, Messgeräte, Ersatzteile
 * und Wissensartikel. Alle Inhalte werden datengetrieben registriert,
 * damit neue Geräte/Fälle ohne Änderung am Kern ergänzt werden können.
 *
 * Läuft als klassisches Script (öffnen per Doppelklick auf index.html
 * möglich) und ebenso in Node (für die automatischen Tests).
 */
(function (g) {
  'use strict';

  const MTRL = (g.MTRL = g.MTRL || {});

  MTRL.version = '1.0.0';
  MTRL.devices = new Map();
  MTRL.cases = new Map();
  MTRL.instruments = new Map();
  MTRL.parts = new Map();
  MTRL.knowledge = new Map();
  MTRL.sandboxes = new Map();
  MTRL.problems = []; // Validierungsprobleme beim Registrieren (für Tests/Konsole)

  function problem(kind, id, msg) {
    const p = `[${kind}:${id}] ${msg}`;
    MTRL.problems.push(p);
    if (g.console) g.console.warn('MTRL: ' + p);
  }

  function requireFields(kind, obj, fields) {
    for (const f of fields) {
      if (obj[f] === undefined || obj[f] === null || obj[f] === '') {
        problem(kind, obj.id || '?', `Pflichtfeld fehlt: ${f}`);
      }
    }
  }

  /* ---------------- Registrierung ---------------- */

  MTRL.registerDevice = function (d) {
    requireFields('device', d, ['id', 'name', 'category', 'summary', 'principle', 'components', 'signalPath', 'faults', 'functionChecks', 'safety']);
    if (MTRL.devices.has(d.id)) problem('device', d.id, 'doppelt registriert');
    d.components = d.components || [];
    d.faults = d.faults || [];
    d.wearParts = d.wearParts || [];
    d.instruments = d.instruments || [];
    MTRL.devices.set(d.id, d);
    return d;
  };

  MTRL.CASE_STEPS = [
    { id: 'situation', title: 'Ausgangssituation' },
    { id: 'symptom', title: 'Fehlerbeschreibung' },
    { id: 'basics', title: 'Technische Grundlagen' },
    { id: 'investigate', title: 'Untersuchung' },
    { id: 'causes', title: 'Mögliche Ursachen' },
    { id: 'diagnosis', title: 'Diagnose' },
    { id: 'explanation', title: 'Erklärung' },
    { id: 'documentation', title: 'Dokumentation' },
    { id: 'quiz', title: 'Abschlusstest' },
  ];

  MTRL.registerCase = function (c) {
    requireFields('case', c, ['id', 'deviceId', 'title', 'situation', 'symptom', 'basics', 'investigations', 'hypotheses', 'diagnosis', 'explanation', 'documentation', 'quiz', 'createState']);
    if (MTRL.cases.has(c.id)) problem('case', c.id, 'doppelt registriert');
    const invIds = new Set((c.investigations || []).map((i) => i.id));
    const hypIds = new Set((c.hypotheses || []).map((h) => h.id));
    (c.investigations || []).forEach((inv) => {
      if (!inv.id || !inv.title) problem('case', c.id, 'Untersuchung ohne id/title');
      if (inv.type === 'instrument' && !inv.instrument) problem('case', c.id, `Untersuchung ${inv.id}: instrument fehlt`);
    });
    (c.hypotheses || []).forEach((h) => {
      if (!['confirmed', 'excluded'].includes(h.expected)) problem('case', c.id, `Hypothese ${h.id}: expected muss confirmed|excluded sein`);
      (h.evidence || []).forEach((e) => {
        if (!MTRL.findingIndex(c).has(e)) problem('case', c.id, `Hypothese ${h.id}: unbekannter Befund ${e}`);
      });
    });
    const tree = c.diagnosis && c.diagnosis.tree;
    if (tree) {
      if (!tree.nodes[tree.start]) problem('case', c.id, 'Diagnosebaum: Startknoten fehlt');
      Object.entries(tree.nodes).forEach(([nid, n]) => {
        (n.answers || []).forEach((a) => {
          if (a.next && !tree.nodes[a.next]) problem('case', c.id, `Diagnosebaum ${nid}: Ziel ${a.next} fehlt`);
          (a.requires || []).forEach((r) => {
            if (!MTRL.findingIndex(c).has(r)) problem('case', c.id, `Diagnosebaum ${nid}: unbekannter Befund ${r}`);
          });
        });
      });
    }
    const corr = (c.diagnosis.rootCauses || []).filter((r) => r.correct);
    if (corr.length !== 1) problem('case', c.id, 'Genau eine richtige Grundursache erforderlich');
    (c.quiz || []).forEach((q, i) => {
      if (!Array.isArray(q.options) || typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
        problem('case', c.id, `Quizfrage ${i + 1} ungültig`);
      }
    });
    void invIds; void hypIds;
    MTRL.cases.set(c.id, c);
    return c;
  };

  /** Alle in einem Fall definierbaren Befund-IDs (aus Untersuchungen und Fixtures). */
  MTRL.findingIndex = function (c) {
    if (c.__findingIndex) return c.__findingIndex;
    const idx = new Map();
    (c.findings || []).forEach((f) => idx.set(f.id, f));
    Object.defineProperty(c, '__findingIndex', { value: idx, enumerable: false });
    return idx;
  };

  MTRL.registerInstrument = function (inst) {
    requireFields('instrument', inst, ['id', 'name', 'short', 'description', 'render']);
    MTRL.instruments.set(inst.id, inst);
    return inst;
  };

  MTRL.registerSandbox = function (sb) {
    requireFields('sandbox', sb, ['id', 'instrument', 'title', 'fixture']);
    MTRL.sandboxes.set(sb.id, sb);
    return sb;
  };

  MTRL.registerParts = function (list) {
    list.forEach((p) => {
      requireFields('part', p, ['id', 'name', 'category', 'devices', 'function', 'replacement']);
      if (MTRL.parts.has(p.id)) problem('part', p.id, 'doppelt registriert');
      MTRL.parts.set(p.id, p);
    });
  };

  MTRL.registerKnowledge = function (a) {
    requireFields('knowledge', a, ['id', 'title', 'category', 'summary', 'sections']);
    if (MTRL.knowledge.has(a.id)) problem('knowledge', a.id, 'doppelt registriert');
    MTRL.knowledge.set(a.id, a);
    return a;
  };

  /* ---------------- Hilfsfunktionen ---------------- */

  const util = (MTRL.util = {});

  util.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** Deutsche Zahlendarstellung mit fester Nachkommastellenzahl. */
  util.fmt = function (n, digits) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    return Number(n).toLocaleString('de-DE', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  };

  util.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /**
   * Deterministisches "Rauschen": gleiche Eingabe → gleicher Wert.
   * Wichtig: Messwerte dürfen nicht zufällig sein (Anforderung 8),
   * sollen aber realistisch "lebendig" wirken.
   */
  util.noise = function (seed, t) {
    const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1; // −1 … +1
  };

  /** Glattes deterministisches Rauschen (Summe von Sinusanteilen). */
  util.smoothNoise = function (seed, t) {
    return (
      0.5 * Math.sin(2 * Math.PI * (0.31 + seed * 0.07) * t + seed) +
      0.3 * Math.sin(2 * Math.PI * (1.13 + seed * 0.05) * t + 2 * seed) +
      0.2 * Math.sin(2 * Math.PI * (2.71 + seed * 0.03) * t + 3 * seed)
    );
  };

  /**
   * Synthetisches EKG (Ableitung II, normiert auf 1 mV R-Zacke).
   * phase: 0..1 innerhalb eines Herzzyklus.
   */
  util.ecgShape = function (phase) {
    const gauss = (x, mu, sigma, a) => a * Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma));
    return (
      gauss(phase, 0.18, 0.025, 0.12) + // P
      gauss(phase, 0.285, 0.008, -0.12) + // Q
      gauss(phase, 0.3, 0.01, 1.0) + // R
      gauss(phase, 0.318, 0.009, -0.22) + // S
      gauss(phase, 0.55, 0.045, 0.28) // T
    );
  };

  /** Plethysmogramm-Kurvenform (0..1) innerhalb eines Herzzyklus. */
  util.plethShape = function (phase) {
    const up = Math.exp(-Math.pow((phase - 0.22) / 0.09, 2));
    const notch = 0.35 * Math.exp(-Math.pow((phase - 0.5) / 0.08, 2));
    const decay = phase > 0.22 ? 0.45 * Math.exp(-(phase - 0.22) * 3.2) : 0;
    return util.clamp(up + notch + decay * 0.6, 0, 1.2) / 1.2;
  };

  /* ---------------- Netzwerk-Solver für Multimeter ---------------- */

  /**
   * Kleines Netzwerkmodell: Widerstände (bidirektional) und Dioden
   * (gerichtet, Flussspannung Vf). Wird von Fällen und Sandbox-Fixtures
   * genutzt, um Multimeter-Messungen physikalisch nachvollziehbar zu
   * berechnen – statt Messwerte "auszudenken".
   */
  class Netlist {
    constructor() {
      this.nodes = new Set();
      this.res = []; // {a,b,r}
      this.diodes = []; // {anode,cathode,vf}
      this.potentials = {}; // node -> V (nur aktive, gespeiste Netze)
    }
    R(a, b, r) {
      this.nodes.add(a);
      this.nodes.add(b);
      if (isFinite(r)) this.res.push({ a, b, r: Math.max(r, 1e-6) });
      return this;
    }
    D(anode, cathode, vf) {
      this.nodes.add(anode);
      this.nodes.add(cathode);
      this.diodes.push({ anode, cathode, vf });
      return this;
    }
    V(node, volts) {
      this.nodes.add(node);
      this.potentials[node] = volts;
      return this;
    }
    /** Widerstand zwischen a und b per Knotenanalyse (Dioden gelten als offen). */
    resistance(a, b) {
      if (a === b) return 0;
      const list = Array.from(this.nodes);
      // Nur Knoten, die über Widerstände mit a verbunden sind
      const adj = new Map(list.map((n) => [n, []]));
      this.res.forEach((e) => {
        adj.get(e.a).push(e.b);
        adj.get(e.b).push(e.a);
      });
      if (!adj.has(a) || !adj.has(b)) return Infinity;
      const seen = new Set([a]);
      const queue = [a];
      while (queue.length) {
        const n = queue.shift();
        adj.get(n).forEach((m) => {
          if (!seen.has(m)) {
            seen.add(m);
            queue.push(m);
          }
        });
      }
      if (!seen.has(b)) return Infinity;
      // Knotenpotentialverfahren: 1 A in a einspeisen, b = Masse
      const comp = Array.from(seen).filter((n) => n !== b);
      const index = new Map(comp.map((n, i) => [n, i]));
      const N = comp.length;
      const G = Array.from({ length: N }, () => new Array(N).fill(0));
      const I = new Array(N).fill(0);
      this.res.forEach((e) => {
        if (!seen.has(e.a)) return;
        const g = 1 / e.r;
        const ia = index.get(e.a);
        const ib = index.get(e.b);
        if (ia !== undefined) G[ia][ia] += g;
        if (ib !== undefined) G[ib][ib] += g;
        if (ia !== undefined && ib !== undefined) {
          G[ia][ib] -= g;
          G[ib][ia] -= g;
        }
      });
      I[index.get(a)] = 1;
      const v = solve(G, I);
      return v ? v[index.get(a)] : Infinity;
    }
    /**
     * Diodentest: Messstrom ~1 mA von a (rot) nach b (schwarz).
     * Liefert die Spannung in V oder Infinity (OL, > 2 V).
     */
    diodeTest(a, b) {
      const I_TEST = 0.001;
      const edges = [];
      this.res.forEach((e) => {
        edges.push({ from: e.a, to: e.b, v: e.r * I_TEST });
        edges.push({ from: e.b, to: e.a, v: e.r * I_TEST });
      });
      this.diodes.forEach((d) => edges.push({ from: d.anode, to: d.cathode, v: d.vf }));
      // Dijkstra für minimalen Spannungsabfall
      const dist = new Map([[a, 0]]);
      const done = new Set();
      while (true) {
        let best = null;
        let bestV = Infinity;
        dist.forEach((v, n) => {
          if (!done.has(n) && v < bestV) {
            bestV = v;
            best = n;
          }
        });
        if (best === null) break;
        if (best === b) break;
        done.add(best);
        edges.forEach((e) => {
          if (e.from === best) {
            const nv = bestV + e.v;
            if (nv < (dist.has(e.to) ? dist.get(e.to) : Infinity)) dist.set(e.to, nv);
          }
        });
      }
      const v = dist.has(b) ? dist.get(b) : Infinity;
      return v > 2.0 ? Infinity : v;
    }
    voltage(a, b) {
      const va = this.potentials[a];
      const vb = this.potentials[b];
      if (va === undefined || vb === undefined) return 0;
      return va - vb;
    }
  }

  function solve(A, b) {
    const n = b.length;
    const M = A.map((row, i) => row.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-15) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        if (f === 0) continue;
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  }

  MTRL.Netlist = Netlist;

  /**
   * Standard-Auswertung einer Multimetermessung auf einer Netlist.
   * mode: 'ohm' | 'continuity' | 'diode' | 'vdc'
   */
  MTRL.measureNetlist = function (net, mode, a, b) {
    if (!a || !b) return { text: '- - - -', unit: '', value: null };
    if (mode === 'vdc') {
      const v = net.voltage(a, b);
      return { value: v, text: util.fmt(v, 2), unit: 'V' };
    }
    if (mode === 'diode') {
      const v = net.diodeTest(a, b);
      if (!isFinite(v)) return { value: Infinity, text: 'OL', unit: 'V' };
      return { value: v, text: util.fmt(v, 3), unit: 'V' };
    }
    const r = net.resistance(a, b);
    if (mode === 'continuity') {
      if (!isFinite(r) || r > 600) return { value: Infinity, text: 'OL', unit: 'Ω', beep: false };
      return { value: r, text: util.fmt(r, 1), unit: 'Ω', beep: r < 30 };
    }
    // Autorange Ohm
    if (!isFinite(r) || r > 40e6) return { value: Infinity, text: 'OL', unit: 'MΩ' };
    if (r < 400) return { value: r, text: util.fmt(r, 1), unit: 'Ω' };
    if (r < 400e3) return { value: r, text: util.fmt(r / 1e3, 2), unit: 'kΩ' };
    return { value: r, text: util.fmt(r / 1e6, 2), unit: 'MΩ' };
  };

  /* ---------------- Fortschritt (localStorage) ---------------- */

  const STORE_KEY = 'mtrl.progress.v1';
  const memoryStore = {};
  function storage() {
    try {
      if (g.localStorage) return g.localStorage;
    } catch (e) {
      /* z. B. file:// mit gesperrtem Storage */
    }
    return {
      getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
      setItem: (k, v) => {
        memoryStore[k] = String(v);
      },
      removeItem: (k) => {
        delete memoryStore[k];
      },
    };
  }

  MTRL.progress = {
    load() {
      try {
        return JSON.parse(storage().getItem(STORE_KEY)) || { cases: {} };
      } catch (e) {
        return { cases: {} };
      }
    },
    save(p) {
      storage().setItem(STORE_KEY, JSON.stringify(p));
    },
    getCase(id) {
      return this.load().cases[id] || null;
    },
    setCase(id, data) {
      const p = this.load();
      p.cases[id] = data;
      this.save(p);
    },
    reset() {
      storage().removeItem(STORE_KEY);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
