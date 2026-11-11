/*
 * Gemeinsame Bausteine für alle virtuellen Messgeräte.
 *
 * Jedes Messgerät ist eine generische Bedienoberfläche. Was gemessen
 * wird, legt eine "Fixture" fest (Prüfling + Anschlusspunkte + Physik).
 * Dieselbe Oberfläche dient damit im Fall (Fixture des Falls) und im
 * Messgerätelabor (Sandbox-Fixture mit schaltbaren Lernfehlern).
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h } = MTRL.dom;

  MTRL.inst = MTRL.inst || {};

  /**
   * Fixture-Bedienelemente (z. B. "Kabel am Knickschutz bewegen").
   * control: {id, label, type:'toggle'|'select', options?, get(ctx), set(ctx, v), help?}
   */
  MTRL.inst.renderControls = function (fixture, ctx, onChange) {
    const list = (fixture.controls || []).filter((c) => !c.visible || c.visible(ctx));
    if (!list.length) return null;
    return h(
      'div.fixture-controls',
      h('div.fc-title', 'Prüfaufbau'),
      list.map((c) => {
        if (c.type === 'select') {
          return h(
            'label.fc-row',
            h('span', c.label),
            MTRL.dom.select(c.options, c.get(ctx), (v) => {
              c.set(ctx, v);
              if (ctx.save) ctx.save();
              onChange && onChange();
            }),
            c.help ? h('small.muted', c.help) : null
          );
        }
        const cb = h('input', {
          type: 'checkbox',
          checked: !!c.get(ctx),
          on: {
            change: () => {
              c.set(ctx, cb.checked);
              if (ctx.save) ctx.save();
              onChange && onChange();
            },
          },
        });
        return h('label.fc-row.toggle', cb, h('span', c.label), c.help ? h('small.muted', c.help) : null);
      })
    );
  };

  /** Rahmen für ein Messgerät: Kopf + Körper + Hinweise */
  MTRL.inst.frame = function (inst, fixture, body, side) {
    return h(
      'div.instrument-frame',
      h(
        'div.if-head',
        h('span.if-icon', { 'aria-hidden': 'true' }, inst.icon || '⚙'),
        h('div', h('div.if-name', inst.name), h('div.if-sub', fixture.title || ''))
      ),
      h('div.if-grid', h('div.if-main', body), side ? h('div.if-side', side) : null),
      fixture.hint ? h('div.if-hint', { html: fixture.hint }) : null
    );
  };

  /** Pass/Fail-Badge */
  MTRL.inst.badge = function (ok, okText, failText) {
    if (ok === null || ok === undefined) return h('span.badge.neutral', '—');
    return h('span.badge.' + (ok ? 'ok' : 'fail'), ok ? okText || 'i. O.' : failText || 'n. i. O.');
  };

  /** Raster für Oszilloskop/Monitor */
  MTRL.inst.grid = function (ctx, w, hgt, divX, divY, color, sub) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i <= divX; i++) {
      const x = Math.round((i * w) / divX) + 0.5;
      ctx.globalAlpha = i === divX / 2 ? 0.55 : 0.28;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hgt);
      ctx.stroke();
    }
    for (let j = 0; j <= divY; j++) {
      const y = Math.round((j * hgt) / divY) + 0.5;
      ctx.globalAlpha = j === divY / 2 ? 0.55 : 0.28;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    if (sub) {
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < divX * 5; i++) {
        const x = (i * w) / (divX * 5);
        ctx.beginPath();
        ctx.moveTo(x, hgt / 2 - 3);
        ctx.lineTo(x, hgt / 2 + 3);
        ctx.stroke();
      }
      for (let j = 0; j < divY * 5; j++) {
        const y = (j * hgt) / (divY * 5);
        ctx.beginPath();
        ctx.moveTo(w / 2 - 3, y);
        ctx.lineTo(w / 2 + 3, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /** Intervall, das sich selbst beendet, wenn das Element nicht mehr im DOM ist. */
  MTRL.inst.every = function (el, ms, fn) {
    let started = false;
    const id = g.setInterval(() => {
      if (!el.isConnected) {
        if (started) g.clearInterval(id);
        return;
      }
      started = true;
      fn();
    }, ms);
    return () => g.clearInterval(id);
  };
})(window);
