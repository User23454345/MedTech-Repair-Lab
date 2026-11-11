/*
 * MedTech Repair Lab – Ansichten: Werkstatt, Geräte, Messgeräte,
 * Ersatzteile, Dokumentation, Fallübersicht
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const V = MTRL.views;
  const esc = MTRL.util.esc;

  function caseStatus(id) {
    const p = MTRL.progress.getCase(id);
    if (!p) return { label: 'neu', cls: 'new', score: null };
    if (p.completed) return { label: 'abgeschlossen', cls: 'done', score: p.score ? p.score.total : null };
    return { label: 'in Bearbeitung', cls: 'wip', score: null, step: p.stepIndex };
  }

  /* ======================= Werkstatt ======================= */
  V.workshop = function () {
    const cases = Array.from(MTRL.cases.values());
    const done = cases.filter((c) => caseStatus(c.id).cls === 'done').length;
    const wip = cases.filter((c) => caseStatus(c.id).cls === 'wip').length;

    const station = (cls, icon, title, text, href, stat) =>
      h('a.station.' + cls, { href }, h('div.st-icon', { 'aria-hidden': 'true' }, icon), h('div.st-body', h('h3', title), h('p', text), stat ? h('div.st-stat', stat) : null));

    const nextCase = cases.find((c) => caseStatus(c.id).cls === 'wip') || cases.find((c) => caseStatus(c.id).cls === 'new') || cases[0];

    const root = h(
      'div.workshop',
      { dataset: { title: 'Werkstatt' } },
      h(
        'section.hero',
        h('div.hero-text',
          h('h1', 'Willkommen in der Werkstatt'),
          h('p.lead', 'Lerne, wie Medizingeräte aufgebaut sind, wie typische technische Fehler entstehen und wie man sie systematisch diagnostiziert – mit virtuellen Messgeräten, nachvollziehbaren Messwerten und vollständig dokumentierten Servicefällen.'),
          nextCase ? h('div.hero-actions',
            h('a.btn.primary.big', { href: '#/fall/' + nextCase.id }, caseStatus(nextCase.id).cls === 'wip' ? '▶ Auftrag fortsetzen' : '▶ Ersten Servicefall starten'),
            h('a.btn.big', { href: '#/messgeraete' }, 'Messgeräte ausprobieren')
          ) : null
        ),
        h('div.hero-bench', { 'aria-hidden': 'true', html: benchSVG() })
      ),
      h(
        'section.stations',
        h('h2.section-title', 'Arbeitsbereiche'),
        h(
          'div.station-grid',
          station('bench', '🧰', 'Arbeitsplatz & Auftragseingang', 'Simulierte Reparaturaufträge – von der Fehlermeldung bis zur Freigabe.', '#/faelle', `${cases.length} Aufträge · ${wip} offen · ${done} erledigt`),
          station('diag', '🧭', 'Fehlerdiagnosebereich', 'Befunde sammeln, Ursachen bewerten, Diagnosebaum durchlaufen.', nextCase ? '#/fall/' + nextCase.id : '#/faelle', 'im jeweiligen Fall'),
          station('instr', '📟', 'Messgeräteschrank', 'Multimeter, Oszilloskop, Simulatoren, Sicherheitsanalysator, Druck-, Flow- und Pumpenprüfgeräte.', '#/messgeraete', `${MTRL.instruments.size} Messgeräte · ${MTRL.sandboxes.size} Übungsaufbauten`),
          station('devices', '🩺', 'Gerätebibliothek', 'Aufbau, Komponenten, Signalwege und typische Fehler.', '#/geraete', `${MTRL.devices.size} Geräte`),
          station('parts', '📦', 'Ersatzteillager', 'Ersatzteil- und Verschleißteilkunde mit Prüfhinweisen.', '#/ersatzteile', `${MTRL.parts.size} Teile`),
          station('docs', '📚', 'Technische Dokumentation', 'Grundlagen, Schaltplanverständnis, Prüfungen, Dokumentation, Recht.', '#/wissen', `${MTRL.knowledge.size} Artikel`)
        )
      ),
      h('section', h('h2.section-title', 'Lernweg je Reparaturfall'), h('ol.steps-overview', MTRL.CASE_STEPS.map((s, i) => h('li', h('span.n', String(i + 1)), s.title)))),
      MTRL.ui.disclaimer()
    );
    return root;
  };

  function benchSVG() {
    return `<svg viewBox="0 0 420 260">
      <defs><linearGradient id="bg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1e2a33"/><stop offset="1" stop-color="#121a20"/></linearGradient></defs>
      <rect x="0" y="0" width="420" height="260" rx="14" fill="url(#bg1)"/>
      <rect x="20" y="40" width="380" height="8" fill="#3b4b57"/>
      <g transform="translate(40,60)"><rect width="150" height="100" rx="8" fill="#0a0f12" stroke="#4b5c68" stroke-width="3"/>
        <polyline points="8,50 30,50 36,30 42,72 48,50 70,50 76,30 82,72 88,50 110,50 116,30 122,72 128,50 142,50" fill="none" stroke="#7CFC00" stroke-width="2"/>
        <text x="10" y="90" fill="#22d3ee" font-family="monospace" font-size="14">SpO₂ ---</text></g>
      <g transform="translate(220,70)"><rect width="80" height="120" rx="10" fill="#f6c343"/><rect x="10" y="10" width="60" height="30" rx="3" fill="#a8c3a0"/>
        <text x="40" y="31" font-family="monospace" font-size="14" text-anchor="middle" fill="#1c2b1c">0,47</text>
        <circle cx="40" cy="75" r="20" fill="#2b2b2b"/><line x1="40" y1="75" x2="52" y2="62" stroke="#f6c343" stroke-width="3"/></g>
      <path d="M260 190 C 270 230, 330 240, 350 200" stroke="#e53935" stroke-width="3" fill="none"/>
      <path d="M240 190 C 230 235, 170 240, 150 170" stroke="#222" stroke-width="3" fill="none"/>
      <g transform="translate(320,80)"><rect width="70" height="50" rx="6" fill="#0a0f12" stroke="#4b5c68" stroke-width="2"/>
        <path d="M6 30 L16 30 L16 14 L26 14 L26 30 L36 30 L36 14 L46 14 L46 30 L64 30" stroke="#ffd23f" fill="none" stroke-width="1.5"/></g>
      <rect x="20" y="200" width="380" height="14" rx="4" fill="#5b4636"/>
    </svg>`;
  }

  /* ======================= Fälle ======================= */
  V.caseList = function () {
    const list = Array.from(MTRL.cases.values());
    const byDevice = new Map();
    list.forEach((c) => {
      if (!byDevice.has(c.deviceId)) byDevice.set(c.deviceId, []);
      byDevice.get(c.deviceId).push(c);
    });
    return h(
      'div',
      { dataset: { title: 'Reparaturfälle' } },
      MTRL.ui.pageHead('Reparaturfälle', 'Simulierte Serviceaufträge mit definiertem Fehler, nachvollziehbaren Messwerten und vollständiger Auswertung.'),
      h(
        'div.card-grid',
        list.map((c) => {
          const d = MTRL.devices.get(c.deviceId);
          const s = caseStatus(c.id);
          return h(
            'article.card.case-card',
            h('div.card-top', h('span.card-icon', { 'aria-hidden': 'true' }, d ? d.icon : '🧰'), h('span.status.' + s.cls, s.label)),
            h('h3', c.title),
            h('div.meta', (d ? d.name : c.deviceId) + ' · ' + (c.difficulty || '') + ' · ' + (c.duration || '')),
            h('p', c.summary),
            h('div.tags', (c.tags || []).map((t) => h('span.tag', t))),
            s.score !== null ? h('div.score-line', 'Ergebnis: ', h('b', s.score + ' / 100 Punkte')) : null,
            h(
              'div.card-actions',
              h('a.btn.primary', { href: '#/fall/' + c.id }, s.cls === 'new' ? 'Auftrag annehmen' : s.cls === 'wip' ? 'Fortsetzen' : 'Ansehen'),
              s.cls !== 'new'
                ? h('button.btn', { type: 'button', on: { click: () => { if (g.confirm('Fortschritt dieses Falls zurücksetzen?')) { const p = MTRL.progress.load(); delete p.cases[c.id]; MTRL.progress.save(p); MTRL.navigate('#/faelle'); } } } }, 'Neu starten')
                : null
            )
          );
        })
      ),
      h('div.callout.info', h('b', 'Bibliothek wächst: '), 'Neue Fälle werden als Datendatei ergänzt (siehe docs/ARCHITEKTUR.md). Die Fall-Engine, Messgeräte und Auswertung sind für alle Geräte gleich.')
    );
  };

  /* ======================= Geräte ======================= */
  V.deviceList = function () {
    const cats = new Map();
    MTRL.devices.forEach((d) => {
      if (!cats.has(d.category)) cats.set(d.category, []);
      cats.get(d.category).push(d);
    });
    return h(
      'div',
      { dataset: { title: 'Gerätebibliothek' } },
      MTRL.ui.pageHead('Gerätebibliothek', 'Generische Lernmodelle typischer Medizingeräte: Aufbau, Funktionsprinzip, Signalwege, Verschleiß und typische Fehlerbilder.'),
      Array.from(cats.entries()).map(([cat, list]) =>
        h('section', h('h2.section-title', cat), h('div.card-grid', list.map((d) => {
          const nCases = Array.from(MTRL.cases.values()).filter((c) => c.deviceId === d.id).length;
          return h('a.card.device-card', { href: '#/geraete/' + d.id },
            h('div.card-top', h('span.card-icon', { 'aria-hidden': 'true' }, d.icon || '🩺'), nCases ? h('span.status.wip', nCases + (nCases === 1 ? ' Fall' : ' Fälle')) : null),
            h('h3', d.name), h('p', d.summary));
        })))
      )
    );
  };

  V.deviceDetail = function (id) {
    const d = MTRL.devices.get(id);
    if (!d) return h('div.panel', h('h2', 'Gerät nicht gefunden'));
    const cases = Array.from(MTRL.cases.values()).filter((c) => c.deviceId === id);
    const tabs = [
      ['Überblick', () => h('div',
        h('div.prose', { html: d.principle }),
        d.riskClass ? h('div.kv', h('span', 'Risikoklasse (Orientierung)'), h('span', d.riskClass)) : null,
        d.regulatory ? h('div.kv', h('span', 'Prüfpflichten (Orientierung)'), h('span', d.regulatory)) : null,
        h('div.kv', h('span', 'Relevante Messgeräte'), h('span.chips', (d.instruments || []).map(MTRL.ui.instrumentChip)))
      )],
      ['Aufbau & Komponenten', () => h('div.comp-grid', d.components.map((c) => h('div.comp', h('div.comp-head', h('b', c.name), MTRL.ui.wearBadge(c.wear)), h('p', c.function), c.notes ? h('p.muted', c.notes) : null)))],
      ['Signalweg', () => h('div', h('p', 'Blockschaltbild des Signal- bzw. Energieflusses (vereinfacht). Fehlersuche folgt diesem Weg – von der Quelle zur Anzeige oder in Halbierungsschritten.'), MTRL.ui.signalChain(d.signalPath))],
      ['Typische Fehler', () => {
        const rows = d.faults.map((f) =>
          h('tr', h('td', h('b', f.symptom)), h('td', h('ul', f.causes.map((c) => h('li', c)))), h('td', h('ul', f.checks.map((c) => h('li', c)))))
        );
        return h('table.plain', h('thead', h('tr', h('th', 'Fehlerbild'), h('th', 'Mögliche Ursachen'), h('th', 'Sinnvolle Prüfungen'))), h('tbody', rows));
      }],
      ['Verschleiß & Ersatzteile', () => h('div', h('p', 'Typische Verschleiß- und Ersatzteile dieses Gerätetyps (generisch):'), h('div.chips', (d.wearParts || []).map(MTRL.ui.partLink)))],
      ['Funktionskontrolle', () => h('div', h('p', 'Nach jeder Instandsetzung muss die Funktion belegt werden. Typischer Umfang (Herstellervorgaben haben Vorrang):'), h('ol.checklist', d.functionChecks.map((c) => h('li', c))))],
      ['Sicherheit', () => h('div', h('ul.safety-list', d.safety.map((s) => h('li', s))), MTRL.ui.disclaimer(true))],
      ['Reparaturfälle', () => cases.length ? h('div.card-grid', cases.map((c) => h('a.card', { href: '#/fall/' + c.id }, h('h3', c.title), h('p', c.summary)))) : h('p.muted', 'Für dieses Gerät ist noch kein Servicefall hinterlegt. Die Architektur ist vorbereitet – siehe docs/ARCHITEKTUR.md.')],
    ];
    return h(
      'div',
      { dataset: { title: d.name } },
      h('a.back', { href: '#/geraete' }, '← Gerätebibliothek'),
      MTRL.ui.pageHead((d.icon || '') + ' ' + d.name, d.summary, h('span.tag', d.category)),
      MTRL.ui.tabs(tabs)
    );
  };

  MTRL.ui.tabs = function (tabs, initial) {
    const bar = h('div.tabbar', { role: 'tablist' });
    const panel = h('div.tabpanel', { role: 'tabpanel' });
    const show = (i) => {
      bar.querySelectorAll('button').forEach((b, j) => {
        b.classList.toggle('active', i === j);
        b.setAttribute('aria-selected', i === j ? 'true' : 'false');
      });
      clear(panel);
      panel.appendChild(tabs[i][1]());
    };
    tabs.forEach(([label], i) => bar.appendChild(h('button', { type: 'button', role: 'tab', on: { click: () => show(i) } }, label)));
    show(initial || 0);
    return h('div.tabs', bar, panel);
  };

  /* ======================= Messgeräte ======================= */
  V.instrumentList = function () {
    return h(
      'div',
      { dataset: { title: 'Messgeräte' } },
      MTRL.ui.pageHead('Messgeräteschrank', 'Virtuelle Mess- und Prüfgeräte mit Übungsaufbauten. Schalte Lernfehler zu und beobachte, wie sich die Messwerte nachvollziehbar verändern.'),
      h('div.card-grid', Array.from(MTRL.instruments.values()).map((i) => {
        const sbs = Array.from(MTRL.sandboxes.values()).filter((s) => s.instrument === i.id);
        return h('a.card.instr-card', { href: '#/messgeraet/' + i.id },
          h('div.card-top', h('span.card-icon', { 'aria-hidden': 'true' }, i.icon), h('span.tag', i.category || '')),
          h('h3', i.name), h('p', i.description), h('div.meta', sbs.length + (sbs.length === 1 ? ' Übungsaufbau' : ' Übungsaufbauten')));
      }))
    );
  };

  V.instrumentLab = function (instId, sbId) {
    const inst = MTRL.instruments.get(instId);
    if (!inst) return h('div.panel', h('h2', 'Messgerät nicht gefunden'));
    const sbs = Array.from(MTRL.sandboxes.values()).filter((s) => s.instrument === instId);
    const sb = sbs.find((s) => s.id === sbId) || sbs[0];
    const host = h('div.lab-host');
    const faultInfo = h('div');
    if (sb) {
      const state = sb.createState ? sb.createState() : {};
      const ctx = { state, repaired: false, addFinding: () => false, hasFinding: () => false, save: () => {}, sandbox: true };
      const fx = typeof sb.fixture === 'function' ? sb.fixture(ctx) : sb.fixture;
      inst.render(host, fx, ctx);
      if (sb.tasks && sb.tasks.length) faultInfo.appendChild(h('div.panel.tasks', h('h3', 'Übungsaufgaben'), h('ol', sb.tasks.map((t) => h('li', { html: t })))));
    } else {
      host.appendChild(h('p.muted', 'Für dieses Messgerät ist noch kein Übungsaufbau hinterlegt.'));
    }
    return h(
      'div',
      { dataset: { title: inst.name } },
      h('a.back', { href: '#/messgeraete' }, '← Messgeräteschrank'),
      MTRL.ui.pageHead(inst.icon + ' ' + inst.name, inst.description),
      h('div.lab-layout',
        h('div.lab-main',
          sbs.length > 1 ? h('div.sb-select', h('span', 'Übungsaufbau: '), h('div.segmented', sbs.map((s) => h('a', { href: '#/messgeraet/' + instId + '/' + s.id, class: s === sb ? 'active' : '' }, s.title)))) : null,
          sb ? h('p.sb-desc', { html: sb.description || '' }) : null,
          host,
          faultInfo
        ),
        h('aside.lab-side',
          h('div.panel', h('h3', 'Funktionsprinzip'), h('div.prose', { html: inst.principle })),
          h('div.panel.warnpanel', h('h3', 'Sicherheit'), h('p', inst.safety))
        )
      )
    );
  };

  /* ======================= Ersatzteile ======================= */
  V.openPart = function (id) {
    const p = MTRL.parts.get(id);
    if (!p) return;
    MTRL.dom.modal(p.name, partDetail(p), { wide: true });
  };

  function partDetail(p) {
    return h('div.part-detail',
      h('div.kv', h('span', 'Kategorie'), h('span', p.category)),
      h('div.kv', h('span', 'Geräte'), h('span.chips', p.devices.map((d) => { const dv = MTRL.devices.get(d); return dv ? h('a.chip', { href: '#/geraete/' + d }, dv.icon + ' ' + dv.name) : h('span.chip', d); }))),
      h('div.kv', h('span', 'Funktion'), h('span', p.function)),
      p.wear ? h('div.kv', h('span', 'Verschleiß'), h('span', MTRL.ui.wearBadge(p.wear), ' ', p.wearInfo || '')) : null,
      p.failureModes ? h('div.kv', h('span', 'Typische Fehlerbilder'), h('ul', p.failureModes.map((f) => h('li', f)))) : null,
      h('div.kv', h('span', 'Austausch'), h('span', p.replacement)),
      p.checksAfter ? h('div.kv', h('span', 'Prüfung nach Tausch'), h('ul', p.checksAfter.map((f) => h('li', f)))) : null,
      p.notes ? h('div.kv', h('span', 'Hinweise'), h('span', p.notes)) : null,
      h('p.muted.small', 'Ersatzteile ausschließlich gemäß Ersatzteilliste/Freigabe des Herstellers beschaffen und Rückverfolgbarkeit (Artikel-Nr., Charge, Seriennummer) dokumentieren.')
    );
  }

  V.partsLibrary = function () {
    const all = Array.from(MTRL.parts.values());
    const cats = Array.from(new Set(all.map((p) => p.category))).sort();
    const st = { q: '', cat: '', dev: '' };
    const listHost = h('div.parts-list');
    const render = () => {
      clear(listHost);
      const q = st.q.toLowerCase();
      const res = all.filter((p) => (!st.cat || p.category === st.cat) && (!st.dev || p.devices.includes(st.dev)) && (!q || (p.name + ' ' + p.function + ' ' + (p.notes || '')).toLowerCase().includes(q)));
      if (!res.length) listHost.appendChild(h('p.muted', 'Keine Teile gefunden.'));
      res.forEach((p) =>
        listHost.appendChild(
          h('button.part-row', { type: 'button', on: { click: () => V.openPart(p.id) } },
            h('span.part-name', p.name),
            h('span.part-cat', p.category),
            h('span.part-devs', p.devices.map((d) => (MTRL.devices.get(d) || {}).icon || '').join(' ')),
            p.wear ? MTRL.ui.wearBadge(p.wear) : h('span')
          )
        )
      );
    };
    const filters = h('div.filters',
      h('input', { type: 'search', placeholder: 'Suche nach Teil, Funktion …', 'aria-label': 'Ersatzteile durchsuchen', on: { input: (e) => { st.q = e.target.value; render(); } } }),
      MTRL.dom.select([{ value: '', label: 'Alle Kategorien' }].concat(cats.map((c) => ({ value: c, label: c }))), '', (v) => { st.cat = v; render(); }, { 'aria-label': 'Kategorie' }),
      MTRL.dom.select([{ value: '', label: 'Alle Geräte' }].concat(Array.from(MTRL.devices.values()).map((d) => ({ value: d.id, label: d.name }))), '', (v) => { st.dev = v; render(); }, { 'aria-label': 'Gerät' })
    );
    render();
    return h('div', { dataset: { title: 'Ersatzteillager' } },
      MTRL.ui.pageHead('Ersatzteillager', 'Ersatz- und Verschleißteilkunde: Funktion, typische Fehlerbilder, wer tauschen darf und was danach zu prüfen ist.'),
      h('div.callout.info', h('b', 'Grundsatz: '), 'Nur vom Hersteller freigegebene Ersatzteile verwenden. Teile werden mit Artikelnummer, Charge bzw. Seriennummer dokumentiert. Die Angaben hier sind generisch und ersetzen keine Ersatzteilliste.'),
      filters, listHost);
  };

  /* ======================= Wissen ======================= */
  V.knowledgeList = function () {
    const cats = new Map();
    MTRL.knowledge.forEach((a) => {
      if (!cats.has(a.category)) cats.set(a.category, []);
      cats.get(a.category).push(a);
    });
    return h('div', { dataset: { title: 'Technische Dokumentation' } },
      MTRL.ui.pageHead('Technische Dokumentation', 'Grundlagenwissen für Fehlersuche, Instandsetzung und Prüfung von Medizinprodukten.'),
      Array.from(cats.entries()).map(([cat, list]) => h('section', h('h2.section-title', cat), h('div.card-grid', list.map((a) => h('a.card', { href: '#/wissen/' + a.id }, h('h3', (a.icon ? a.icon + ' ' : '') + a.title), h('p', a.summary)))))));
  };

  V.knowledgeArticle = function (id) {
    const a = MTRL.knowledge.get(id);
    if (!a) return h('div.panel', h('h2', 'Artikel nicht gefunden'), h('a', { href: '#/wissen' }, 'Zur Übersicht'));
    const toc = h('nav.toc', { 'aria-label': 'Inhalt' }, h('b', 'Inhalt'), h('ol', a.sections.map((s, i) => h('li', h('a', { href: 'javascript:void(0)', on: { click: () => { const el = document.getElementById('sec-' + i); if (el) el.scrollIntoView({ behavior: 'smooth' }); } } }, s.title)))));
    return h('div', { dataset: { title: a.title } },
      h('a.back', { href: '#/wissen' }, '← Dokumentation'),
      MTRL.ui.pageHead((a.icon ? a.icon + ' ' : '') + a.title, a.summary, h('span.tag', a.category)),
      h('div.article-layout', toc, h('article.prose.article', a.sections.map((s, i) => h('section', { id: 'sec-' + i }, h('h2', s.title), h('div', { html: s.html })))),
      ),
      a.related && a.related.length ? h('div.panel', h('h3', 'Weiterführend'), h('div.chips', a.related.map((r) => { const ra = MTRL.knowledge.get(r); return ra ? h('a.chip', { href: '#/wissen/' + r }, ra.title) : null; }))) : null
    );
  };

  V.__esc = esc;
})(window);
