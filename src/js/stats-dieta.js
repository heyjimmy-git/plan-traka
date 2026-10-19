/* ================= Estadísticas de la dieta ================= */
const dtDietDays = (C) => C.days.filter((x) => x.date >= DIET.desde && x.date <= C.today);
function dtCount(dates) {
  const c = { ok: 0, cambio: 0, no: 0, sin: 0 };
  dates.forEach((date) => dtTomas(date).forEach((t) => { c[t.log.st || "sin"]++; }));
  return c;
}

function dtKpis(C) {
  const days = dtDietDays(C).filter((x) => dayDiff(x.date, C.today) <= 6);
  const c = dtCount(days.map((x) => x.date)), marked = c.ok + c.cambio + c.no;
  const pct = marked ? Math.round((c.ok / marked) * 100) : null;
  const ag = days.map((x) => dtRec(x.date).agua || 0).filter(Boolean);
  const avg = ag.length ? (ag.reduce((a, v) => a + v, 0) / ag.length) * 0.25 : null;
  return [
    {
      lbl: "Dieta · 7 días",
      v: pct == null ? "—" : `<span data-to="${pct}" data-fmt="pct">${pct}%</span>`,
      sub: marked ? `${c.ok} tal cual · ${c.cambio} con cambios · ${c.no} ${c.no === 1 ? "saltada" : "saltadas"}` : "Marca tus comidas en Hoy",
    },
    {
      lbl: "Agua media · 7 días",
      v: avg == null ? "—" : `<span data-to="${avg.toFixed(1)}" data-fmt="1">${sxNum(avg)}</span><small>L</small>`,
      sub: avg == null ? "Apunta los vasos en Hoy" : `Meta 2,5 L · cumplida ${ag.filter((v) => v >= AGUA_VASOS).length} de ${days.length} días`,
    },
  ];
}

// Cumplimiento por semana: tal cual / con cambios / saltadas / sin marcar
function sxRenderDiet(C) {
  const sec = $("sxDietSec");
  // Empieza en la primera semana con algo apuntado: antes no existía el registro de comidas
  const firstLog = Object.keys(comidas).filter((d) => d >= DIET.desde && d <= C.today && dtHas(comidas[d])).sort()[0];
  const firstW = firstLog && IDX.has(firstLog) ? DAYS[IDX.get(firstLog)].w : C.nowW;
  if (!C.nowW || C.nowW < firstW) { sec.hidden = true; return; }
  sec.hidden = false;
  const weeks = [];
  for (let n = firstW; n <= Math.min(C.nowW, PLAN_WEEKS); n++) {
    const ds = C.days.filter((x) => x.d.w === n && x.date >= (firstLog || DIET.desde) && x.date <= C.today).map((x) => x.date);
    weeks.push({ n, c: dtCount(ds) });
  }
  const tot = weeks.reduce((a, w) => { ["ok", "cambio", "no", "sin"].forEach((k) => { a[k] += w.c[k]; }); return a; }, { ok: 0, cambio: 0, no: 0, sin: 0 });
  const all = tot.ok + tot.cambio + tot.no + tot.sin;
  $("sxDietSub").textContent = all ? `${tot.ok + tot.cambio} de ${all} tomas hechas desde que empezaste a apuntarlas` : "Tomas del menú que llevas hechas";
  const SEG = [["ok", "var(--ok)", "Tal cual"], ["cambio", "var(--part)", "Con cambios"], ["no", "var(--no)", "Saltada"], ["sin", "color-mix(in srgb, var(--ink-3) 38%, var(--surface))", "Sin marcar"]];
  const W = 340, padL = 24, padR = 4, top = 14, base = 120, H = 140;
  const max = Math.max(10, Math.ceil(Math.max(...weeks.map((w) => w.c.ok + w.c.cambio + w.c.no + w.c.sin)) / 10) * 10);
  const slot = (W - padL - padR) / Math.max(weeks.length, 1), bw = Math.min(24, Math.max(6, slot * 0.6));
  const Y = (v) => base - (v / max) * (base - top);
  let s = "";
  [0.5, 1].forEach((p) => { const v = Math.round(max * p); s += `<line class="sx-grid" x1="${padL}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sx-ax" x="${padL - 5}" y="${Y(v) + 3}" text-anchor="end">${v}</text>`; });
  weeks.forEach((w, i) => {
    const cx = padL + slot * i + slot / 2, x = cx - bw / 2;
    const segs = SEG.filter(([k]) => w.c[k] > 0);
    let yCur = base, g = `<g class="sx-col" data-col="${i}">`;
    segs.forEach(([k, col], j) => {
      const h = (w.c[k] / max) * (base - top), y0 = yCur - h, y1 = yCur - (j > 0 ? 2 : 0);
      const attrs = `style="--i:${i};fill:${col}"`;
      g += j === segs.length - 1 ? sxTopBar(x, y0, bw, Math.max(1, y1 - y0), "grow", attrs) : `<rect class="grow" ${attrs} x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y1 - y0).toFixed(1)}"/>`;
      yCur = y0;
    });
    s += g + "</g>";
    s += `<text class="sx-ax${w.n === C.nowW ? " is-now" : ""}" x="${cx}" y="${base + 13}" text-anchor="middle">${w.n}</text>`;
    const rows = SEG.filter(([k]) => w.c[k]).map(([k, col, l]) => ({ v: String(w.c[k]), l: l.toLowerCase() }));
    const id = sxTip({ title: `Semana ${w.n} · ${SXA.weekRange(w.n)}`, rows: rows.length ? rows : [{ v: "—", l: "sin tomas" }] });
    s += `<rect class="sx-hit" data-tip="${id}" data-col="${i}" tabindex="0" role="button" aria-label="Semana ${w.n}: ${w.c.ok} tal cual, ${w.c.cambio} con cambios, ${w.c.no} saltadas" x="${padL + slot * i}" y="${top - 8}" width="${slot}" height="${base - top + 22}"/>`;
  });
  s += `<line class="sx-base" x1="${padL}" x2="${W}" y1="${base}" y2="${base}"/>`;
  $("sxDiet").innerHTML =
    `<svg class="sx-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Tomas del menú por semana">${s}</svg>` +
    `<div class="sx-legend">${SEG.map(([, col, l]) => `<span><i style="--c:${col}"></i>${l}</span>`).join("")}</div>` +
    `<details class="sx-table"><summary>Ver datos en tabla</summary><div class="sx-tbl"><table><thead><tr><th>Semana</th><th>Tal cual</th><th>Cambios</th><th>Saltadas</th><th>Sin marcar</th></tr></thead><tbody>${weeks.map((w) =>
      `<tr><td>${w.n}</td><td>${w.c.ok}</td><td>${w.c.cambio}</td><td>${w.c.no}</td><td>${w.c.sin}</td></tr>`).join("")}</tbody></table></div></details>`;
}

// Kcal apuntadas frente a la referencia del menú, y horas de entreno debajo (mismo eje de fechas)
function sxRenderFoodStats(C) {
  const sec = $("sxFoodSec");
  const logged = C.days.filter((x) => dtRec(x.date).kcal || (dtRef(x.date) || {}).kcal);
  if (!logged.length) { sec.hidden = true; return; }
  sec.hidden = false;
  const endIdx = Math.max(C.nowIdx, 0);
  const win = C.days.slice(Math.max(0, endIdx - 20), endIdx + 1);
  const kcals = win.map((x) => dtRec(x.date).kcal || null);
  const refs = win.map((x) => (dtRef(x.date) || {}).kcal || null);
  const known = kcals.filter(Boolean);
  const avg = known.length ? known.reduce((a, v) => a + v, 0) / known.length : 0;
  const maxK = Math.max(...known, ...refs.filter(Boolean), 1), maxMin = Math.max(...win.map((x) => x.plan), 60);
  const W = 340, padL = 26, padR = 4, slot = (W - padL - padR) / win.length;
  const bw = Math.min(22, Math.max(5, slot * 0.6));
  const top = 12, base = 86, H = 104;
  const chart = (values, max, cls, fmt, label, withRef) => {
    let s = "";
    [0.5, 1].forEach((p) => {
      const y = base - p * (base - top);
      s += `<line class="sx-grid" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"/><text class="sx-ax" x="${padL - 5}" y="${y + 3}" text-anchor="end">${fmt(max * p)}</text>`;
    });
    win.forEach((x, i) => {
      const v = values[i], cx = padL + slot * i + slot / 2;
      if (v) s += sxTopBar(cx - bw / 2, base - (v / max) * (base - top), bw, (v / max) * (base - top), `${cls} grow`, `style="--i:${i}"`);
      if (withRef && refs[i]) { const y = base - (refs[i] / max) * (base - top); s += `<line class="sx-ref" x1="${(cx - bw / 2 - 2).toFixed(1)}" x2="${(cx + bw / 2 + 2).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
      const rows = [];
      if (kcals[i]) rows.push({ c: "accent", v: kcalFmt(kcals[i]), l: "kcal apuntadas" });
      if (refs[i]) rows.push({ c: "on-ink", v: kcalFmt(refs[i]), l: "kcal del menú" });
      rows.push({ v: sxH(x.plan), l: "de entreno" });
      const id = sxTip({ title: sxDate(x.date), rows, note: dtTrainLine(x.date), date: x.date });
      s += `<rect class="sx-hit" data-tip="${id}" data-col="${i}" tabindex="0" role="button" aria-label="${esc(sxDate(x.date))}: ${v ? fmt(v) : "sin datos"}" x="${padL + slot * i}" y="${top - 6}" width="${slot}" height="${base - top + 18}"/>`;
    });
    if (withRef && known.length > 1) {
      const y = base - (avg / max) * (base - top);
      s += `<line class="sx-avg" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"/><text class="sx-ax" x="${W}" y="${y - 4}" text-anchor="end">media ${kcalFmt(Math.round(avg))}</text>`;
    }
    s += `<line class="sx-base" x1="${padL}" x2="${W}" y1="${base}" y2="${base}"/>`;
    return `<div><div class="sx-mini-h"><span>${label}</span></div><svg class="sx-svg no-dim" viewBox="0 0 ${W} ${H}" role="group" aria-label="${label} por día">${s}</svg></div>`;
  };
  const fmtK = (v) => kcalFmt(Math.round(v / 100) * 100);
  const fmtT = (v) => sxH(Math.round(v / 15) * 15);
  const diffs = win.map((x, i) => (kcals[i] && refs[i] ? kcals[i] - refs[i] : null)).filter((v) => v != null);
  const dAvg = diffs.length ? Math.round(diffs.reduce((a, v) => a + v, 0) / diffs.length) : null;
  $("sxFoodSub").textContent = `${known.length} ${known.length === 1 ? "día con kcal apuntadas" : "días con kcal apuntadas"} de los últimos ${win.length}`;
  $("sxFood").innerHTML =
    `<div class="sx-pair">${chart(kcals, maxK, "sx-acc", fmtK, "Kcal por día", true)}${chart(win.map((x) => x.plan), maxMin, "sx-neutral", fmtT, "Entreno por día", false)}</div>` +
    `<div class="sx-legend"><span><i style="--c:var(--accent)"></i>Kcal apuntadas</span><span><i class="line" style="--c:var(--ink)"></i>Kcal del menú</span><span><i style="--c:color-mix(in srgb, var(--ink-3) 50%, var(--surface))"></i>Horas de entreno</span></div>` +
    (known.length
      ? `<p class="sx-insight">Media <b>${kcalFmt(Math.round(avg))} kcal</b> en los días apuntados${dAvg != null ? ` · <b>${dAvg >= 0 ? "+" : "−"}${kcalFmt(Math.abs(dAvg))} kcal</b> de media frente al menú` : ""}.</p>`
      : `<p class="sx-insight">Apunta en <b>Hoy</b> las kcal que te diga la IA y aquí las verás frente a las del menú y a tu entreno.</p>`) +
    `<details class="sx-table"><summary>Ver datos en tabla</summary><div class="sx-tbl"><table><thead><tr><th>Día</th><th>Kcal</th><th>Menú</th><th>Entreno</th></tr></thead><tbody>${win.map((x, i) =>
      `<tr><td>${esc(sxDate(x.date))}</td><td>${kcals[i] ? kcalFmt(kcals[i]) : "—"}</td><td>${refs[i] ? kcalFmt(refs[i]) : "—"}</td><td>${x.plan ? sxH(x.plan) : "—"}</td></tr>`).join("")}</tbody></table></div></details>`;
}

function dtBadges(C) {
  const days = dtDietDays(C);
  const streak = (test) => { let run = 0, best = 0; days.forEach((x) => { if (test(dtRec(x.date))) { run++; best = Math.max(best, run); } else if (x.date !== C.today) run = 0; }); return best; };
  const agua = streak((r) => (r.agua || 0) >= AGUA_VASOS);
  const crea = streak((r) => !!(r.sup || {}).creatina);
  const fullWeek = C.weeks.some((w) => {
    const ds = C.days.filter((x) => x.d.w === w.n && x.date >= DIET.desde && x.date <= C.today);
    if (ds.length < 7) return false;
    const c = dtCount(ds.map((x) => x.date));
    return c.no === 0 && c.sin === 0 && c.ok + c.cambio > 0;
  });
  return [
    { t: "Hidratada", d: "7 días seguidos llegando a 2,5 L", on: agua >= 7, prog: [Math.min(agua, 7), 7] },
    { t: "Semana de dieta redonda", d: "Todas las tomas de una semana hechas", on: fullWeek },
    { t: "Suplementos al día", d: "14 días seguidos con la creatina", on: crea >= 14, prog: [Math.min(crea, 14), 14] },
  ];
}
