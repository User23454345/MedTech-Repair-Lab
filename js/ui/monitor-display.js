/*
 * Darstellung eines (generischen) Patientenmonitor-Bildschirms
 * mit Sweep-Kurven, Zahlenfeldern und Meldungszeile.
 *
 * getFrame(t) -> {
 *   waves: [{id,label,color, fn(t) -> Wert (-1..1) | null}],
 *   values: [{id,label,value,unit,color,sub,alarm}],
 *   messages: [{text, level:'high'|'med'|'low'|'info'}]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  MTRL.ui = MTRL.ui || {};

  MTRL.ui.monitorDisplay = function (container, getFrame, opts) {
    const o = Object.assign({ title: 'Patientenmonitor (Lernmodell)', width: 520, laneHeight: 86, speed: 110 }, opts || {});
    const first = getFrame(0);
    const lanes = Math.max(1, first.waves.length);
    const W = o.width;
    const H = lanes * o.laneHeight;
    const canvas = h('canvas.mon-canvas', { role: 'img', 'aria-label': 'Kurvendarstellung des Monitors' });
    const c2d = MTRL.dom.setupCanvas(canvas, W, H);
    const msgBar = h('div.mon-msgs', { 'aria-live': 'polite' });
    const valuesCol = h('div.mon-values');
    const screen = h(
      'div.monitor',
      h('div.mon-top', h('span.mon-title', o.title), h('span.mon-clock', '')),
      msgBar,
      h('div.mon-body', h('div.mon-waves', canvas), valuesCol)
    );
    container.appendChild(screen);

    c2d.fillStyle = '#000';
    c2d.fillRect(0, 0, W, H);
    let x = 0;
    let t = 0;
    let lastVals = null;
    let lastValT = -10;
    const prev = new Array(lanes).fill(null);

    function renderValues(frame) {
      clear(valuesCol);
      frame.values.forEach((v) => {
        valuesCol.appendChild(
          h(
            'div.mon-val' + (v.alarm ? '.alarm' : ''),
            { style: { color: v.color || '#7CFC00' } },
            h('div.mv-label', v.label),
            h('div.mv-num', v.value),
            h('div.mv-unit', v.unit || ''),
            v.sub ? h('div.mv-sub', v.sub) : null
          )
        );
      });
      clear(msgBar);
      if (!frame.messages || !frame.messages.length) msgBar.appendChild(h('span.msg.none', 'Keine Meldungen'));
      (frame.messages || []).forEach((m) => msgBar.appendChild(h('span.msg.' + (m.level || 'info'), m.text)));
    }

    MTRL.dom.animate(canvas, (dt) => {
      const frame = getFrame(t);
      const steps = Math.max(1, Math.round(dt * o.speed));
      for (let s = 0; s < steps; s++) {
        const ts = t + (s / steps) * dt;
        frame.waves.forEach((w, i) => {
          const top = i * o.laneHeight;
          const mid = top + o.laneHeight / 2;
          // Löschbalken vor dem Cursor
          c2d.fillStyle = '#000';
          c2d.fillRect(x + 1, top, 14, o.laneHeight);
          const v = w.fn(ts);
          const y = v === null || v === undefined ? null : mid - v * (o.laneHeight * 0.4);
          if (y !== null) {
            c2d.strokeStyle = w.color;
            c2d.lineWidth = 1.6;
            c2d.beginPath();
            if (prev[i] !== null && x > 0) c2d.moveTo(x - 1, prev[i]);
            else c2d.moveTo(x, y);
            c2d.lineTo(x, y);
            c2d.stroke();
          } else if (s === 0) {
            // flache, gestrichelte Nulllinie bei fehlendem Signal
            c2d.fillStyle = w.color;
            c2d.globalAlpha = 0.35;
            if (x % 6 < 3) c2d.fillRect(x, mid, 1, 1);
            c2d.globalAlpha = 1;
          }
          prev[i] = y;
          if (s === 0 && x < 2) {
            c2d.fillStyle = w.color;
            c2d.font = '11px system-ui, sans-serif';
            c2d.fillText(w.label, 4, top + 13);
          }
        });
        x += 1;
        if (x >= W) {
          x = 0;
          prev.fill(null);
        }
      }
      t += dt;
      if (t - lastValT >= 1 || !lastVals) {
        lastValT = t;
        lastVals = frame;
        renderValues(frame);
        const clock = screen.querySelector('.mon-clock');
        if (clock) clock.textContent = 'Simulation · ' + MTRL.util.fmt(t, 0) + ' s';
      }
    });
    return screen;
  };
})(window);
