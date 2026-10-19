/* ================= Estadísticas: datos propios del plan La Traka ================= */
const SXA = {
  weeks: 31, planWeeks: 30, volWeeks: 30,
  race: "2027-04-12", raceLabel: "La Traka 100 km",
  kinds: [{ k: "bike", label: "Bici" }, { k: "swim", label: "Natación" }, { k: "run", label: "Carrera a pie" }, { k: "gym", label: "Fuerza" }],
  blocks: (d) => blocksFor(d.date),
  name: (b) => b.title || KIND_LABEL[b.k] || "Sesión",
  weekRange: (n) => fmtRange(WEEKS[n - 1].ini, WEEKS[n - 1].fin),
  hasFeel: (rec) => rec.rodilla != null || rec.tibial != null,
  feelRows: (rec) => [["rodilla", "Rodilla"], ["tibial", "Tibial"]].filter(([f]) => rec[f] != null).map(([f, l]) => ({ v: String(rec[f]), l: `${l} · ${sxLvName[sxLv(rec[f])]}` })),
  noteChips: (rec) => [["rodilla", "Rodilla"], ["tibial", "Tibial"]].filter(([f]) => rec[f] != null).map(([f, l]) => `<span class="sx-tag ${sxLvCls[sxLv(rec[f])]}"><i></i>${l} ${rec[f]}</span>`).join(""),
  renderFeel: (C) => sxRenderPain(C),
  feelKpi(C) {
    const g = Math.min(3, sxGreenWeeks(C, "tibial"));
    const last = [...C.days].reverse().find((x) => x.rec.tibial != null);
    const chip = last ? `<span class="sx-chip ${sxLvCls[sxLv(last.rec.tibial)]}"><i></i>Último: ${last.rec.tibial} · ${sxLvName[sxLv(last.rec.tibial)]}</span>` : "";
    return {
      lbl: "Tibial en verde",
      v: `<span data-to="${g}">${g}</span><small>de 3 sem.</small>`,
      sub: `${g >= 3 ? "Ya puedes subir la carrera a pie" : "Semanas seguidas para subir la carrera a pie"}${chip ? "<br>" + chip : ""}`,
    };
  },
  records(C) {
    const nut = C.days.filter((x) => x.bl.some((b) => (b.tags || []).includes("Nutrición")));
    const desc = C.weeks.filter((w) => WEEKS[w.n - 1] && WEEKS[w.n - 1].descarga && w.n < C.nowW);
    const descOk = desc.filter((w) => w.due && w.score / w.due >= 0.75).length;
    const escritos = Object.values(cambios).reduce((a, bs) => a + bs.filter((b) => b.w).length, 0);
    return [
      { k: "Salidas con nutrición de carrera", s: "Las del plan en las que ensayas geles y bebida", v: `${nut.filter((x) => x.f === 1).length}/${nut.length}` },
      { k: "Semanas de descarga cumplidas", s: "De las ya pasadas (4, 10, 13, 20 y 26)", v: desc.length ? `${descOk}/${desc.length}` : "—" },
      { k: "Entrenos concretos escritos", s: "Sesiones con tu entreno detallado", v: String(escritos) },
    ];
  },
  badges(C) {
    const doneBike = (min) => C.days.some((x) => x.f === 1 && x.bl.some((b, i) => b.k === "bike" && x.mins[i] >= min));
    const g = sxGreenWeeks(C, "tibial");
    return [
      { t: "Tres horas de gravel", d: "Primera salida de 3 h o más", on: doneBike(180) },
      { t: "Cuatro horas", d: "Una salida de 4 h o más", on: doneBike(240) },
      { t: "Gasolina probada", d: "Primera salida con nutrición de carrera", on: C.days.some((x) => x.f === 1 && x.bl.some((b) => (b.tags || []).includes("Nutrición"))) },
      { t: "Tibial en verde", d: "3 semanas seguidas en verde (0–2)", on: g >= 3, prog: [Math.min(g, 3), 3] },
      { t: "Tu propio plan", d: "Tu primer entreno concreto escrito", on: Object.values(cambios).some((bs) => bs.some((b) => b.w)) },
      { t: "Meta en La Traka", d: "12 de abril terminado", on: C.days[IDX.get("2027-04-12")].f === 1 },
      ...dtBadges(C),
    ];
  },
};

/* ================= Estadísticas: datos ================= */
const SX_DOWS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const sxReduce = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const sxDay = (iso) => DAYS[IDX.get(iso)];
function sxH(min) {
  const m = Math.round((min || 0) / 5) * 5;
  if (m < 60) return `${m}'`;
  return `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
}
function sxDate(iso, withDow = true) {
  const d = sxDay(iso), [, m, dd] = iso.split("-").map(Number);
  return `${withDow && d ? d.dow.slice(0, 3).toLowerCase() + " " : ""}${dd} ${MONTHS[m - 1]}`;
}
const sxNum = (v, dec = 1) => v.toFixed(dec).replace(".", ",");

// Minutos estimados de una sesión a partir de su duración escrita
function sxMin(b) {
  if (!b || b.k === "rest" || b.k === "race") return 0;
  const raw = String(b.d || "").toLowerCase().replace(/~/g, "").trim();
  if (raw) {
    const mt = raw.match(/^(\d{1,2}(?:\.\d{3})+|\d+)\s*(?:[–-]\s*(\d{1,2}(?:\.\d{3})+|\d+))?\s*m$/);
    if (mt) {
      const a = +mt[1].replace(/\./g, ""), c = mt[2] ? +mt[2].replace(/\./g, "") : a;
      return Math.round(((a + c) / 2 / 100) * 2.15);
    }
    const vals = raw.split(/\s*[–-]\s*/).map((p) => {
      const h = p.match(/(\d+)\s*h\s*(\d+)?/);
      if (h) return +h[1] * 60 + (+h[2] || 0);
      const m = p.match(/(\d+)/);
      return m ? +m[1] : null;
    }).filter((v) => v > 0);
    if (vals.length) return Math.round(vals.reduce((a, v) => a + v, 0) / vals.length);
  }
  return ["gym", "crossfit", "swim"].includes(b.k) ? 60 : 0;
}

function sxBuild() {
  const today = todayISO;
  const kindKeys = SXA.kinds.map((k) => k.k);
  const kindOf = (k) => (kindKeys.includes(k) ? k : "other");
  const nowIdx = IDX.has(today) ? IDX.get(today) : today < DAYS[0].date ? -1 : DAYS.length - 1;
  const nowW = nowIdx >= 0 ? DAYS[nowIdx].w : 0;
  const weeks = Array.from({ length: SXA.weeks }, (_, i) => ({ n: i + 1, plan: 0, done: 0, planK: {}, doneK: {}, due: 0, score: 0, trainDays: 0, fullDone: 0 }));
  const planK = {}, dueK = {}, doneK = {};
  const dow = SX_DOWS.map((name) => ({ name, due: 0, score: 0 }));
  const days = DAYS.map((d) => {
    const bl = SXA.blocks(d);
    const rec = store[d.date] || {};
    const train = bl.some((b) => b.k !== "rest");
    const mins = bl.map(sxMin);
    const plan = mins.reduce((a, m) => a + m, 0);
    // Lo marcado en días futuros no cuenta hasta que llegue ese día
    const f = d.date > today ? 0 : rec.hecho === "Sí" ? 1 : rec.hecho === "Parcial" ? 0.5 : 0;
    const past = d.date < today, isToday = d.date === today;
    const due = train && (past || (isToday && !!rec.hecho));
    const x = { d, date: d.date, bl, rec, train, mins, plan, f, done: plan * f, past, isToday, due, race: bl.some((b) => b.k === "race") };
    const w = weeks[d.w - 1];
    bl.forEach((b, i) => {
      const k = kindOf(b.k), m = mins[i];
      if (!m) return;
      planK[k] = (planK[k] || 0) + m;
      if (due) dueK[k] = (dueK[k] || 0) + m;
      if (f) doneK[k] = (doneK[k] || 0) + m * f;
      if (w) {
        w.planK[k] = (w.planK[k] || 0) + m; w.plan += m;
        if (f) { w.doneK[k] = (w.doneK[k] || 0) + m * f; w.done += m * f; }
      }
    });
    if (w && train) { w.trainDays++; if (f === 1) w.fullDone++; }
    if (w && due) { w.due++; w.score += f; }
    if (due) { const o = dow[SX_DOWS.indexOf(d.dow)]; o.due++; o.score += f; }
    return x;
  });
  const dueDays = days.filter((x) => x.due);
  const score = dueDays.reduce((a, x) => a + x.f, 0);
  let run = 0, best = 0;
  days.forEach((x) => {
    if (!x.train || x.date > today) return;
    if (x.f > 0) { run++; best = Math.max(best, run); }
    else if (!x.isToday) run = 0;
  });
  const sessPlan = dueDays.reduce((a, x) => a + x.bl.filter((b) => b.k !== "rest").length, 0);
  const sessDone = dueDays.filter((x) => x.f === 1).reduce((a, x) => a + x.bl.filter((b) => b.k !== "rest").length, 0);
  const logged = days.filter((x) => x.rec && (x.rec.hecho || x.rec.notas || SXA.hasFeel(x.rec)));
  return {
    today, nowIdx, nowW, days, weeks, dow, planK, dueK, doneK, kindOf,
    dueCount: dueDays.length, score, pct: dueDays.length ? score / dueDays.length : null,
    streak: run, best, sessPlan, sessDone,
    doneMin: days.reduce((a, x) => a + x.done, 0),
    dueMin: dueDays.reduce((a, x) => a + x.plan, 0),
    logged,
  };
}

/* ================= Tooltip ================= */
const SXT = new Map();
let sxTipSeq = 0, sxTipEl = null;
function sxTip(data) { const id = "t" + ++sxTipSeq; SXT.set(id, data); return id; }
function sxTipHide() {
  $("sxTip").hidden = true; sxTipEl = null;
  document.querySelectorAll(".sx-svg[data-hot]").forEach((s) => s.removeAttribute("data-hot"));
  document.querySelectorAll(".sx-col.hot").forEach((g) => g.classList.remove("hot"));
}
function sxTipShow(el) {
  const data = SXT.get(el.getAttribute("data-tip"));
  if (!data) return;
  sxTipHide();
  sxTipEl = el;
  const tip = $("sxTip");
  tip.replaceChildren();
  const add = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  tip.append(add("div", "t", data.title));
  (data.rows || []).forEach((r) => {
    const row = add("div", "r"), key = add("i");
    if (r.c) key.style.setProperty("--c", `var(--${r.c})`); else key.style.visibility = "hidden";
    row.append(key, add("b", null, r.v), add("span", null, r.l || ""));
    tip.append(row);
  });
  if (data.note) tip.append(add("div", "note", data.note));
  if (data.date) {
    const btn = add("button", null, "Abrir este día");
    btn.type = "button";
    btn.addEventListener("click", () => { sxShow("hoy"); go(data.date, false); });
    tip.append(btn);
  }
  tip.hidden = false;
  const host = $("sx").getBoundingClientRect(), r = el.getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const x = Math.max(0, Math.min(r.left + r.width / 2 - host.left - w / 2, host.width - w));
  const y = r.top - h - 10 > 8 ? r.top - host.top - h - 10 : r.bottom - host.top + 10;
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  const svg = el.closest(".sx-svg");
  if (svg && el.dataset.col != null) {
    svg.setAttribute("data-hot", "");
    svg.querySelectorAll(`.sx-col[data-col="${el.dataset.col}"]`).forEach((g) => g.classList.add("hot"));
  }
}

/* ================= Pestañas y animación ================= */
function sxCountAll(root) {
  root.querySelectorAll("[data-to]").forEach((el) => {
    const to = +el.dataset.to, fmt = el.dataset.fmt;
    const f = (v) => fmt === "h" ? sxH(v) : fmt === "pct" ? `${Math.round(v)}%` : fmt === "1" ? sxNum(v) : String(Math.round(v));
    el.textContent = f(to);
    if (sxReduce() || !to) return;
    const t0 = performance.now(), dur = 800;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = f(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
let sxGoTimer;
const SX_VIEWS = { hoy: "viewHoy", menu: "viewFood", stats: "viewStats" };
function sxShow(tab) {
  const view = SX_VIEWS[tab] ? tab : "hoy";
  Object.keys(SX_VIEWS).forEach((k) => { $(SX_VIEWS[k]).hidden = k !== view; });
  $("tabHoy").setAttribute("aria-current", view === "hoy" ? "page" : "false");
  $("tabFood").setAttribute("aria-current", view === "menu" ? "page" : "false");
  $("tabStats").setAttribute("aria-current", view === "stats" ? "page" : "false");
  sxTipHide();
  const hash = view === "stats" ? "#estadisticas" : view === "menu" ? "#menu" : location.pathname + location.search;
  try { history.replaceState(null, "", hash); } catch (e) {}
  window.scrollTo(0, 0);
  if (view === "menu") {
    try { localStorage.setItem("menu-visto", "1"); } catch (e) {}
    $("tabFoodNew").hidden = true;
    menuWeek = selDay().w;
    renderMenu();
    return;
  }
  if (view !== "stats") return;
  try { localStorage.setItem("sx-visto", "1"); } catch (e) {}
  $("tabNew").hidden = true;
  const root = $("sx");
  root.classList.remove("sx-go");
  sxRender();
  void root.offsetWidth;
  root.classList.add("sx-go");
  clearTimeout(sxGoTimer);
  sxGoTimer = setTimeout(() => root.classList.remove("sx-go"), 2000);
}

/* ================= Cabecera, anillo y KPIs ================= */
function sxRenderHero(C) {
  const w = C.nowW ? `Semana ${Math.min(C.nowW, SXA.weeks)} de ${SXA.planWeeks}` : "Antes de empezar";
  $("sxSub").textContent = `${w} · ${SXA.raceLabel}`;
  const pct = C.pct == null ? null : Math.round(C.pct * 100);
  const R = 50, L = 2 * Math.PI * R;
  const state = pct == null ? ["sx-none", "Aún sin datos"] : pct >= 85 ? ["sx-ok", "Clavando el plan"] : pct >= 65 ? ["sx-warn", "Buen ritmo, sin despistes"] : ["sx-bad", "Toca retomar el hilo"];
  const doneDays = C.days.filter((x) => x.due && x.f > 0).length;
  const text = C.dueCount
    ? `Has cumplido <b>${sxNum(C.score, C.score % 1 ? 1 : 0)}</b> de <b>${C.dueCount}</b> ${C.dueCount === 1 ? "día" : "días"} de entreno que llevas de plan (parciales cuentan la mitad).`
    : "Cuando marques tus sesiones como hechas en <b>Hoy</b>, aquí verás cómo vas.";
  const total = DAYS.length, dayN = Math.max(0, C.nowIdx + 1);
  const toRace = Math.max(0, dayDiff(C.today, SXA.race));
  $("sxHero").innerHTML =
    `<div class="sx-hero">
      <svg class="sx-ring" viewBox="0 0 120 120" role="img" aria-label="Adherencia ${pct == null ? "sin datos" : pct + "%"}">
        <circle class="trk" cx="60" cy="60" r="${R}"/>
        <circle class="val" id="sxRingVal" cx="60" cy="60" r="${R}" transform="rotate(-90 60 60)" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${L.toFixed(1)}" ${pct == null ? 'visibility="hidden"' : ""}/>
        <text x="60" y="61" ${pct == null ? "" : `data-to="${pct}" data-fmt="pct"`}>${pct == null ? "—" : pct + "%"}</text>
      </svg>
      <div class="sx-hero-txt">
        <span class="eyebrow">Adherencia hasta hoy</span>
        <p>${text}</p>
        <span class="sx-chip ${state[0]}"><i></i>${state[1]}</span>
      </div>
    </div>
    <div class="sx-road">
      <div class="sx-road-top"><span>Día <b>${dayN}</b> de ${total}</span><span><b>${toRace}</b> días para la salida</span></div>
      <div class="sx-road-bar" role="img" aria-label="Plan recorrido ${Math.round((dayN / total) * 100)}%"><b class="growx" style="width:${((dayN / total) * 100).toFixed(1)}%"></b></div>
      <div class="sx-road-meta"><span>${sxDate(DAYS[0].date, false)}</span><span>${Math.round((dayN / total) * 100)}% del plan recorrido</span><span>${sxDate(SXA.race, false)}</span></div>
    </div>`;
  if (pct != null) {
    const target = (L * (1 - Math.min(1, pct / 100))).toFixed(1);
    const ring = $("sxRingVal");
    if (sxReduce()) ring.setAttribute("stroke-dashoffset", target);
    else requestAnimationFrame(() => requestAnimationFrame(() => ring.setAttribute("stroke-dashoffset", target)));
  }
}

function sxSpark(values) {
  if (values.length < 2) return "";
  const W = 140, H = 28, max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - (v / max) * (H - 6)]);
  const last = pts[pts.length - 1];
  return `<svg class="sx-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("")}" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" vector-effect="non-scaling-stroke"/></svg>`;
}

function sxRenderKpis(C) {
  const weeksSoFar = C.weeks.slice(0, Math.max(1, Math.min(C.nowW, SXA.volWeeks)));
  const tiles = [
    { lbl: "Racha actual", v: `<span data-to="${C.streak}">${C.streak}</span><small>${C.streak === 1 ? "día" : "días"}</small>`, sub: `Días de entreno seguidos cumplidos · mejor: <b>${C.best}</b>` },
    { lbl: "Horas hechas", v: `<span data-to="${Math.round(C.doneMin)}" data-fmt="h">${sxH(C.doneMin)}</span>`, sub: `de ${sxH(C.dueMin)} planificadas hasta hoy`, spark: sxSpark(weeksSoFar.map((w) => w.done)) },
    { lbl: "Sesiones hechas", v: `<span data-to="${C.sessDone}">${C.sessDone}</span><small>de ${C.sessPlan}</small>`, sub: "Sesiones de días marcados como hechos" },
    SXA.feelKpi(C),
    ...dtKpis(C),
  ];
  $("sxKpis").innerHTML = tiles.map((t, i) =>
    `<div class="sx-kpi rise" style="--i:${i}"><span class="lbl">${t.lbl}</span><span class="v">${t.v}</span><span class="sub">${t.sub}</span>${t.spark || ""}</div>`).join("");
}

/* ================= Calendario de constancia ================= */
function sxState(x) {
  if (x.rec.hecho === "Sí") return { k: "done", label: "Hecho" };
  if (x.rec.hecho === "Parcial") return { k: "part", label: "Parcial" };
  if (x.rec.hecho === "No") return { k: "no", label: "No hecho" };
  if (x.race) return { k: "race", label: "Día de carrera" };
  if (!x.train) return { k: "rest", label: "Descanso" };
  if (x.isToday) return { k: "next", label: "Hoy · sin marcar" };
  return x.past ? { k: "miss", label: "Sin marcar" } : { k: "next", label: "Próximo" };
}
function sxRenderHeat(C) {
  const wrap = $("sxHeatWrap");
  const nW = SXA.weeks, lab = 16, top = 15, gap = 3;
  const fit = Math.floor((wrap.clientWidth - 8 - lab) / nW) - gap;
  const cell = Math.max(18, Math.min(30, fit));
  const W = lab + nW * (cell + gap), H = top + 7 * (cell + gap);
  const X = (col) => lab + col * (cell + gap);
  let s = "";
  SX_DOWS.forEach((d, r) => {
    s += `<text class="sx-ax" x="0" y="${top + r * (cell + gap) + cell / 2 + 3}">${LETTER[d]}</text>`;
  });
  for (let n = 1; n <= nW; n++) {
    if (nW > 16 && n !== 1 && n % 5 && n !== C.nowW) continue;
    s += `<text class="sx-ax${n === C.nowW ? " is-now" : ""}" x="${X(n - 1) + cell / 2}" y="9" text-anchor="middle">${n}</text>`;
  }
  C.days.forEach((x) => {
    const col = x.d.w - 1, row = SX_DOWS.indexOf(x.d.dow);
    if (col >= nW || row < 0) return;
    const px = X(col), py = top + row * (cell + gap), rx = Math.min(5, cell / 4);
    const st = sxState(x);
    s += `<rect class="st-${st.k} pop" style="--i:${col}" x="${px}" y="${py}" width="${cell}" height="${cell}" rx="${rx}"/>`;
    if (st.k === "rest") s += `<circle class="st-dot" cx="${px + cell / 2}" cy="${py + cell / 2}" r="${Math.max(1.6, cell / 10)}"/>`;
    if (x.isToday) s += `<rect class="st-today" x="${px - 1.5}" y="${py - 1.5}" width="${cell + 3}" height="${cell + 3}" rx="${rx + 1}"/>`;
    const sessions = x.bl.filter((b) => b.k !== "rest").map(SXA.name).join(" + ") || "Descanso";
    const rows = [{ v: st.label }];
    if (x.plan) rows.push({ v: sxH(x.plan), l: "planificado" });
    rows.push(...SXA.feelRows(x.rec));
    const id = sxTip({ title: `${sxDate(x.date)} · semana ${x.d.w}`, rows, note: sessions, date: x.date });
    s += `<rect class="sx-hit" data-tip="${id}" tabindex="0" role="button" aria-label="${esc(sxDate(x.date))}: ${esc(st.label)}" x="${px - gap / 2}" y="${py - gap / 2}" width="${cell + gap}" height="${cell + gap}"/>`;
  });
  wrap.innerHTML = `<svg class="sx-svg sx-heat no-dim" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px" role="group" aria-label="Calendario de constancia por días">${s}</svg>`;
  if (C.nowW && W > wrap.clientWidth) wrap.scrollLeft = Math.max(0, X(C.nowW - 1) - wrap.clientWidth / 2);
  const leg = [
    ["var(--ok)", "Hecho"], ["var(--part)", "Parcial"], ["var(--no)", "No hecho"],
    ["color-mix(in srgb, var(--ink-3) 38%, var(--surface))", "Sin marcar"],
    ["var(--sunken)", "Descanso", "restdot"], ["var(--sunken)", "Próximo"], ["", "Hoy", "ring"], ["var(--ink)", "Carrera"],
  ];
  $("sxHeatLegend").innerHTML = leg.map(([c, t, cls]) => `<span><i class="${cls || ""}" style="--c:${c}"></i>${t}</span>`).join("");
}

/* ================= Volumen semanal ================= */
function sxTopBar(x, y, w, h, cls, attrs = "") {
  if (!(h > 0.5)) return "";
  const r = Math.min(4, w / 2, h);
  return `<path class="${cls}" ${attrs} d="M${x.toFixed(1)},${(y + h).toFixed(1)}V${(y + r).toFixed(1)}Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)}H${(x + w - r).toFixed(1)}Q${(x + w).toFixed(1)},${y.toFixed(1)} ${(x + w).toFixed(1)},${(y + r).toFixed(1)}V${(y + h).toFixed(1)}Z"/>`;
}
function sxKindsWith(obj) {
  const list = SXA.kinds.filter((k) => obj[k.k] > 0);
  if (obj.other > 0) list.push({ k: "other", label: "Otros" });
  return list;
}
function sxRenderVol(C) {
  const n = SXA.volWeeks, W = 340, H = 176, padL = 24, padR = 4, top = 16, base = 150;
  const ws = C.weeks.slice(0, n);
  const maxH = Math.max(2, Math.ceil(Math.max(...ws.map((w) => Math.max(w.plan, w.done))) / 60 / 2) * 2);
  const Y = (min) => base - (min / 60 / maxH) * (base - top);
  const slot = (W - padL - padR) / n, bw = Math.min(24, Math.max(5, slot * 0.64));
  const step = maxH <= 6 ? 2 : maxH <= 12 ? 4 : 5;
  let s = "";
  for (let h = step; h <= maxH; h += step) {
    s += `<line class="sx-grid" x1="${padL}" x2="${W}" y1="${Y(h * 60)}" y2="${Y(h * 60)}"/><text class="sx-ax" x="${padL - 5}" y="${Y(h * 60) + 3}" text-anchor="end">${h}h</text>`;
  }
  ws.forEach((w, i) => {
    const cx = padL + slot * i + slot / 2, x = cx - bw / 2;
    let g = `<g class="sx-col" data-col="${i}">`;
    g += sxTopBar(x, Y(w.plan), bw, base - Y(w.plan), "sx-plan grow", `style="--i:${i}"`);
    const segs = sxKindsWith(w.doneK);
    let yCur = base;
    segs.forEach((k, j) => {
      const hgt = (w.doneK[k.k] / 60 / maxH) * (base - top);
      const y0 = yCur - hgt, y1 = yCur - (j > 0 ? 2 : 0);
      const cls = `sx-kf k-${k.k} grow`;
      g += j === segs.length - 1 ? sxTopBar(x, y0, bw, Math.max(1, y1 - y0), cls, `style="--i:${i}"`) : `<rect class="${cls}" style="--i:${i}" x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y1 - y0).toFixed(1)}"/>`;
      yCur = y0;
    });
    g += "</g>";
    s += g;
    if (w.n === C.nowW && w.done > 0) s += `<text class="sx-lbl" x="${cx}" y="${Y(Math.max(w.done, w.plan)) - 5}">${sxH(w.done)}</text>`;
    const show = n <= 16 || w.n === 1 || w.n % 5 === 0 || w.n === C.nowW;
    if (show && !(n > 16 && w.n !== C.nowW && Math.abs(w.n - C.nowW) <= 1)) s += `<text class="sx-ax${w.n === C.nowW ? " is-now" : ""}" x="${cx}" y="${base + 13}" text-anchor="middle">${w.n}</text>`;
    const rows = sxKindsWith(w.doneK).map((k) => ({ c: k.k === "other" ? "ink-3" : k.k, v: sxH(w.doneK[k.k]), l: k.label }));
    rows.push({ v: sxH(w.done), l: "hecho en total" }, { v: sxH(w.plan), l: "planificado" });
    const id = sxTip({ title: `Semana ${w.n} · ${SXA.weekRange(w.n)}`, rows });
    s += `<rect class="sx-hit" data-tip="${id}" data-col="${i}" tabindex="0" role="button" aria-label="Semana ${w.n}: ${sxH(w.done)} hechas de ${sxH(w.plan)}" x="${padL + slot * i}" y="${top - 10}" width="${slot}" height="${base - top + 24}"/>`;
  });
  s += `<line class="sx-base" x1="${padL}" x2="${W}" y1="${base}" y2="${base}"/>`;
  $("sxVol").innerHTML = `<svg class="sx-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Horas por semana: hechas y planificadas">${s}</svg>`;
  $("sxVolSub").textContent = C.doneMin > 0 ? "Horas hechas por disciplina frente a lo planificado (gris)" : "Aún no hay horas hechas: en gris, lo que marca el plan cada semana";
  $("sxVolLegend").innerHTML = sxKindsWith(C.planK).map((k) => `<span><i class="k-${k.k}"></i>${k.label}</span>`).join("") + `<span><i style="--c:var(--sunken)"></i>Planificado</span>`;
  $("sxVolTbl").innerHTML = `<table><thead><tr><th>Semana</th><th>Fechas</th><th>Plan</th><th>Hecho</th><th>Cumplido</th></tr></thead><tbody>${ws.map((w) =>
    `<tr><td>${w.n}</td><td>${esc(SXA.weekRange(w.n))}</td><td>${sxH(w.plan)}</td><td>${w.done ? sxH(w.done) : "—"}</td><td>${w.due ? Math.round((w.score / w.due) * 100) + "%" : "—"}</td></tr>`).join("")}</tbody></table>`;
}

/* ================= Reparto por disciplina ================= */
function sxRenderMix(C) {
  const hasDone = Object.values(C.doneK).some((v) => v > 0);
  const src = hasDone ? C.doneK : C.planK;
  const kinds = sxKindsWith(C.planK);
  const total = kinds.reduce((a, k) => a + (src[k.k] || 0), 0) || 1;
  $("sxMixSub").textContent = hasDone ? "Cómo se reparten las horas que llevas hechas" : "Cómo se reparte el plan completo (aún sin horas hechas)";
  $("sxSplit").setAttribute("role", "img");
  $("sxSplit").setAttribute("aria-label", kinds.map((k) => `${k.label} ${Math.round(((src[k.k] || 0) / total) * 100)}%`).join(", "));
  $("sxSplit").innerHTML = kinds.filter((k) => src[k.k] > 0).map((k) => `<span class="k-${k.k}" style="flex:${src[k.k].toFixed(1)} 1 0"></span>`).join("");
  $("sxMix").innerHTML = kinds.map((k) => {
    const share = Math.round(((src[k.k] || 0) / total) * 100);
    const due = C.dueK[k.k] || 0, done = C.doneK[k.k] || 0;
    const comp = due ? Math.min(1, done / due) : 0;
    const small = due ? `${sxH(done)} de ${sxH(due)} planificadas hasta hoy · ${Math.round(comp * 100)}%` : `${sxH(C.planK[k.k])} en todo el plan`;
    return `<div class="sx-row k-${k.k}"><i></i><span class="nm">${k.label}<small class="sx-sm">${small}</small></span><span class="val">${share}%</span>` +
      `<span class="sx-meter" role="img" aria-label="${k.label}: cumplido ${Math.round(comp * 100)}%"><b class="growx" style="width:${(comp * 100).toFixed(1)}%"></b></span></div>`;
  }).join("");
}

/* ================= Sensaciones ================= */
function sxTimeScale(C, idxs, padL, padR, W) {
  const lo = Math.min(...idxs), hi = Math.max(C.nowIdx, ...idxs);
  const span = Math.max(6, hi - lo);
  return { lo, hi: lo + span, X: (i) => padL + ((i - lo) / span) * (W - padL - padR) };
}
function sxPointHits(pts, sc, top, base, W, mk) {
  return pts.map((p, j) => {
    const cx = sc.X(p.i);
    const prev = j ? sc.X(pts[j - 1].i) : cx - 24, next = j < pts.length - 1 ? sc.X(pts[j + 1].i) : cx + 24;
    const x0 = Math.max(0, (prev + cx) / 2), x1 = Math.min(W, (cx + next) / 2);
    const wHit = Math.max(24, x1 - x0);
    return `<g class="sx-col" data-col="${j}"><line class="sx-cross" x1="${cx}" x2="${cx}" y1="${top}" y2="${base}"/></g>` +
      `<rect class="sx-hit" data-tip="${mk(p)}" data-col="${j}" tabindex="0" role="button" aria-label="${esc(sxDate(p.x.date))}" x="${cx - wHit / 2}" y="${top - 6}" width="${wHit}" height="${base - top + 12}"/>`;
  }).join("");
}
function sxRenderRpe(C) {
  $("sxFeelTitle").textContent = "Sensaciones";
  $("sxFeelSub").textContent = "Esfuerzo percibido (RPE 1–10) y su media de 7 días";
  const pts = C.days.map((x, i) => ({ x, i, v: x.rec.rpe })).filter((p) => p.v != null);
  if (!pts.length) { $("sxFeel").innerHTML = `<p class="sx-empty">Apunta tus sensaciones (RPE) en <b>Hoy</b> y aquí verás cómo evoluciona el esfuerzo.</p>`; return; }
  pts.forEach((p) => {
    const win = pts.filter((q) => q.i <= p.i && q.i > p.i - 7);
    p.avg = win.reduce((a, q) => a + q.v, 0) / win.length;
  });
  const W = 340, H = 168, padL = 22, padR = 10, top = 12, base = 140;
  const sc = sxTimeScale(C, pts.map((p) => p.i), padL, padR, W);
  const Y = (v) => base - (v / 10) * (base - top);
  let s = "";
  [2, 4, 6, 8, 10].forEach((v) => { s += `<line class="sx-grid" x1="${padL}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sx-ax" x="${padL - 5}" y="${Y(v) + 3}" text-anchor="end">${v}</text>`; });
  s += sxPointHits(pts, sc, top, base, W, (p) => sxTip({ title: sxDate(p.x.date), rows: [{ v: String(p.v), l: "RPE del día" }, { c: "accent", v: sxNum(p.avg), l: "media 7 días" }], note: p.x.bl.filter((b) => b.k !== "rest").map(SXA.name).join(" + "), date: p.x.date }));
  if (pts.length > 1) s += `<path class="sx-line" d="${pts.map((p, j) => `${j ? "L" : "M"}${sc.X(p.i).toFixed(1)},${Y(p.avg).toFixed(1)}`).join("")}"/>`;
  pts.forEach((p) => { s += `<circle class="sx-dot de pop" style="--i:${Math.round(p.i / 7)}" cx="${sc.X(p.i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4"/>`; });
  const last = pts[pts.length - 1];
  s += `<circle class="sx-dot" style="fill:var(--accent)" cx="${sc.X(last.i).toFixed(1)}" cy="${Y(last.avg).toFixed(1)}" r="4.5"/>`;
  s += `<text class="sx-lbl" x="${Math.min(W - 12, sc.X(last.i))}" y="${Math.max(10, Y(last.avg) - 9)}">${sxNum(last.avg)}</text>`;
  s += `<line class="sx-base" x1="${padL}" x2="${W}" y1="${base}" y2="${base}"/>`;
  s += `<text class="sx-ax" x="${padL}" y="${base + 14}">${sxDate(DAYS[sc.lo].date, false)}</text><text class="sx-ax" x="${W}" y="${base + 14}" text-anchor="end">${sxDate(DAYS[Math.min(sc.hi, DAYS.length - 1)].date, false)}</text>`;
  const avg = pts.reduce((a, p) => a + p.v, 0) / pts.length;
  const hard = pts.reduce((a, p) => (p.v > a.v ? p : a));
  $("sxFeel").innerHTML =
    `<svg class="sx-svg no-dim" viewBox="0 0 ${W} ${H}" role="group" aria-label="Evolución del RPE">${s}</svg>` +
    `<div class="sx-legend"><span><i class="dot" style="--c:var(--ink-3)"></i>RPE del día</span><span><i class="line" style="--c:var(--accent)"></i>Media 7 días</span></div>` +
    `<p class="sx-insight">Media <b>${sxNum(avg)}</b> · día más duro <b>${sxDate(hard.x.date)}</b> (${hard.v}) · días a 8 o más: <b>${pts.filter((p) => p.v >= 8).length}</b></p>` +
    `<details class="sx-table"><summary>Ver datos en tabla</summary><div class="sx-tbl"><table><thead><tr><th>Día</th><th>Sesión</th><th>RPE</th></tr></thead><tbody>${pts.map((p) => `<tr><td>${esc(sxDate(p.x.date))}</td><td>${esc(p.x.bl.filter((b) => b.k !== "rest").map(SXA.name).join(" + "))}</td><td>${p.v}</td></tr>`).join("")}</tbody></table></div></details>`;
}
function sxGreenWeeks(C, field) {
  let streak = 0;
  for (let n = 1; n <= Math.min(C.nowW, SXA.weeks); n++) {
    const vals = C.days.filter((x) => x.d.w === n && x.rec[field] != null).map((x) => x.rec[field]);
    if (!vals.length) { if (n < C.nowW) streak = 0; continue; }
    streak = vals.every((v) => v <= 2) ? streak + 1 : 0;
  }
  return streak;
}
const sxLv = (v) => (v <= 2 ? "g" : v <= 4 ? "a" : "r");
const sxLvName = { g: "Verde", a: "Ámbar", r: "Rojo" };
const sxLvCls = { g: "sx-ok", a: "sx-warn", r: "sx-bad" };
function sxRenderPain(C) {
  $("sxFeelTitle").textContent = "Rodilla y tibial";
  $("sxFeelSub").textContent = "Tu semáforo de dolor día a día (0–10)";
  const fields = [["rodilla", "Rodilla"], ["tibial", "Tibial"]];
  const all = C.days.map((x, i) => ({ x, i })).filter((p) => fields.some(([f]) => p.x.rec[f] != null));
  if (!all.length) { $("sxFeel").innerHTML = `<p class="sx-empty">Apunta el dolor de rodilla y de tibial en <b>Hoy</b> y aquí verás tu semáforo semana a semana.</p>`; return; }
  const W = 340, H = 118, padL = 22, padR = 10, top = 8, base = 96;
  const sc = sxTimeScale(C, all.map((p) => p.i), padL, padR, W);
  const Y = (v) => base - (v / 10) * (base - top);
  const charts = fields.map(([f, name]) => {
    const pts = all.filter((p) => p.x.rec[f] != null).map((p) => ({ ...p, v: p.x.rec[f] }));
    const lastP = pts[pts.length - 1];
    let s = `<rect class="sx-bandz-r" x="${padL}" y="${Y(10)}" width="${W - padL}" height="${Y(4.5) - Y(10)}"/><rect class="sx-bandz-a" x="${padL}" y="${Y(4.5)}" width="${W - padL}" height="${Y(2.5) - Y(4.5)}"/><rect class="sx-bandz-g" x="${padL}" y="${Y(2.5)}" width="${W - padL}" height="${base - Y(2.5)}"/>`;
    [[0, "0"], [2.5, "3"], [4.5, "5"], [10, "10"]].forEach(([v, t]) => { s += `<text class="sx-ax" x="${padL - 5}" y="${Math.min(base, Y(v) + 3)}" text-anchor="end">${t}</text>`; });
    if (pts.length) {
      s += sxPointHits(pts, sc, top, base, W, (p) => sxTip({ title: sxDate(p.x.date), rows: [{ v: String(p.v), l: `${name} · ${sxLvName[sxLv(p.v)]}` }], note: p.x.bl.filter((b) => b.k !== "rest").map(SXA.name).join(" + "), date: p.x.date }));
      if (pts.length > 1) s += `<path class="sx-line de" d="${pts.map((p, j) => `${j ? "L" : "M"}${sc.X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join("")}"/>`;
      pts.forEach((p) => { s += `<circle class="sx-dot lv-${sxLv(p.v)} pop" style="--i:${Math.round(p.i / 7)}" cx="${sc.X(p.i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4.5"/>`; });
    }
    s += `<line class="sx-base" x1="${padL}" x2="${W}" y1="${base}" y2="${base}"/>`;
    s += `<text class="sx-ax" x="${padL}" y="${base + 14}">${sxDate(DAYS[sc.lo].date, false)}</text><text class="sx-ax" x="${W}" y="${base + 14}" text-anchor="end">${sxDate(DAYS[Math.min(sc.hi, DAYS.length - 1)].date, false)}</text>`;
    const chip = lastP ? `<span class="sx-chip ${sxLvCls[sxLv(lastP.v)]}"><i></i>Último: ${lastP.v} · ${sxLvName[sxLv(lastP.v)]}</span>` : `<span class="sx-chip sx-none"><i></i>Sin apuntar</span>`;
    return `<div><div class="sx-mini-h"><span>${name}</span>${chip}</div><svg class="sx-svg no-dim" viewBox="0 0 ${W} ${H}" role="group" aria-label="Dolor de ${name.toLowerCase()} por día">${s}</svg></div>`;
  });
  const g = sxGreenWeeks(C, "tibial");
  const alert = all.filter((p) => fields.some(([f]) => p.x.rec[f] != null && p.x.rec[f] >= 3)).length;
  $("sxFeel").innerHTML =
    `<div class="sx-pair">${charts.join("")}</div>` +
    `<div class="sx-legend"><span><i class="dot" style="--c:var(--ok)"></i>Verde 0–2</span><span><i class="dot" style="--c:var(--part)"></i>Ámbar 3–4</span><span><i class="dot" style="--c:var(--no)"></i>Rojo 5 o más</span></div>` +
    `<p class="sx-insight">Tibial en verde <b>${Math.min(g, 3)} de 3</b> semanas seguidas${g >= 3 ? ": ya puedes subir la duración de la carrera a pie." : " antes de subir la carrera a pie."} Días con dolor 3 o más: <b>${alert}</b>.</p>` +
    `<details class="sx-table"><summary>Ver datos en tabla</summary><div class="sx-tbl"><table><thead><tr><th>Día</th><th>Rodilla</th><th>Tibial</th></tr></thead><tbody>${all.map((p) => `<tr><td>${esc(sxDate(p.x.date))}</td><td>${p.x.rec.rodilla ?? "—"}</td><td>${p.x.rec.tibial ?? "—"}</td></tr>`).join("")}</tbody></table></div></details>`;
}

/* ================= Día de la semana ================= */
function sxRenderDow(C) {
  const W = 340, H = 142, top = 20, base = 118, padX = 6;
  const slot = (W - padX * 2) / 7, bw = Math.min(24, slot * 0.5);
  const vals = C.dow.map((o) => (o.due ? o.score / o.due : null));
  const withData = vals.map((v, i) => ({ v, i })).filter((o) => o.v != null);
  const best = withData.length > 1 ? withData.reduce((a, o) => (o.v > a.v ? o : a)) : null;
  const worst = withData.length > 1 ? withData.reduce((a, o) => (o.v < a.v ? o : a)) : null;
  let s = "";
  C.dow.forEach((o, i) => {
    const cx = padX + slot * i + slot / 2, x = cx - bw / 2, v = vals[i];
    s += `<g class="sx-col" data-col="${i}">${sxTopBar(x, top, bw, base - top, "sx-plan")}`;
    if (v) s += sxTopBar(x, base - v * (base - top), bw, v * (base - top), "sx-acc grow", `style="--i:${i}"`);
    s += "</g>";
    if (v != null && ((best && i === best.i) || (worst && i === worst.i && worst.v !== best.v))) s += `<text class="sx-lbl" x="${cx}" y="${top - 6}">${Math.round(v * 100)}%</text>`;
    s += `<text class="sx-ax${SX_DOWS[i] === (sxDay(C.today) || {}).dow ? " is-now" : ""}" x="${cx}" y="${base + 15}" text-anchor="middle">${LETTER[o.name]}</text>`;
    const id = sxTip({ title: o.name, rows: v == null ? [{ v: "—", l: "sin días de entreno aún" }] : [{ c: "accent", v: `${Math.round(v * 100)}%`, l: "cumplido" }, { v: `${sxNum(o.score, o.score % 1 ? 1 : 0)}/${o.due}`, l: "días" }] });
    s += `<rect class="sx-hit" data-tip="${id}" data-col="${i}" tabindex="0" role="button" aria-label="${o.name}: ${v == null ? "sin datos" : Math.round(v * 100) + "%"}" x="${padX + slot * i}" y="0" width="${slot}" height="${H}"/>`;
  });
  $("sxDow").innerHTML = `<svg class="sx-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Cumplimiento por día de la semana">${s}</svg>`;
  $("sxDowTxt").innerHTML = best
    ? `Tu mejor día es el <b>${best ? SX_DOWS[best.i].toLowerCase() : ""}</b> (${Math.round(best.v * 100)}%)${worst && worst.v < best.v ? ` y el que más cuesta, el <b>${SX_DOWS[worst.i].toLowerCase()}</b> (${Math.round(worst.v * 100)}%).` : "."}`
    : "Cuando lleves unos días marcados verás qué día cumples más y cuál se te atraganta.";
}

/* ================= Récords, logros y notas ================= */
function sxRenderRecords(C) {
  let longest = null;
  C.days.forEach((x) => { if (x.f === 1) x.bl.forEach((b, i) => { if (x.mins[i] && (!longest || x.mins[i] > longest.m)) longest = { m: x.mins[i], b, x }; }); });
  const bestWeek = C.weeks.reduce((a, w) => (w.done > (a ? a.done : 0) ? w : a), null);
  const pctWeeks = C.weeks.filter((w) => w.due >= 3);
  const topPct = pctWeeks.reduce((a, w) => (!a || w.score / w.due > a.score / a.due ? w : a), null);
  const rows = [
    { k: "Sesión más larga hecha", s: longest ? `${SXA.name(longest.b)} · ${sxDate(longest.x.date)}` : "Aún ninguna", v: longest ? sxH(longest.m) : "—" },
    { k: "Semana con más horas", s: bestWeek ? `Semana ${bestWeek.n} · ${SXA.weekRange(bestWeek.n)}` : "Aún ninguna", v: bestWeek ? sxH(bestWeek.done) : "—" },
    { k: "Mejor semana en cumplimiento", s: topPct ? `Semana ${topPct.n}` : "Con al menos 3 días de entreno", v: topPct ? `${Math.round((topPct.score / topPct.due) * 100)}%` : "—" },
    { k: "Mejor racha", s: "Días de entreno seguidos cumplidos", v: String(C.best) },
    ...SXA.records(C),
  ];
  $("sxRec").innerHTML = rows.map((r, i) => `<div class="sx-li rise" style="--i:${i}"><span class="k">${r.k}<small>${esc(r.s)}</small></span><span class="v">${r.v}</span></div>`).join("");
}
const SX_ICON_OK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.4 2.9 2.9 6.1-6.6"/></svg>';
const SX_ICON_LOCK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/></svg>';
function sxRenderBadges(C) {
  const hoursDone = C.doneMin / 60;
  const fullWeek = C.weeks.some((w) => w.trainDays > 0 && w.fullDone === w.trainDays);
  const list = [
    { t: "Primer paso", d: "Tu primer entreno marcado como hecho", on: C.days.some((x) => x.f > 0) },
    { t: "Semana redonda", d: "Todos los entrenos de una semana hechos", on: fullWeek },
    { t: "Racha de 7", d: "7 días de entreno seguidos cumplidos", on: C.best >= 7, prog: [Math.min(C.best, 7), 7] },
    { t: "Racha de 21", d: "21 días de entreno seguidos", on: C.best >= 21, prog: [Math.min(C.best, 21), 21] },
    { t: "25 sesiones", d: "Sesiones de días hechos", on: C.sessDone >= 25, prog: [Math.min(C.sessDone, 25), 25] },
    { t: "50 horas", d: "Horas de entreno hechas", on: hoursDone >= 50, prog: [Math.min(Math.floor(hoursDone), 50), 50] },
    ...SXA.badges(C),
  ];
  const on = list.filter((b) => b.on).length;
  $("sxBadgeSub").textContent = `${on} de ${list.length} desbloqueados`;
  $("sxBadges").innerHTML = list.sort((a, b) => b.on - a.on).map((b, i) =>
    `<div class="sx-badge rise${b.on ? " on" : ""}" style="--i:${i}"><span class="ic${b.on ? " pop" : ""}" aria-hidden="true">${b.on ? SX_ICON_OK : SX_ICON_LOCK}</span><span><b>${b.t}</b><small>${b.on ? b.d : b.prog ? `${b.d} · ${b.prog[0]}/${b.prog[1]}` : b.d}</small>${!b.on && b.prog ? `<span class="prog"><b style="display:block;width:${((b.prog[0] / b.prog[1]) * 100).toFixed(0)}%"></b></span>` : ""}</span><span class="sx-vh">${b.on ? "Desbloqueado" : "Bloqueado"}</span></div>`).join("");
}
function sxRenderNotes(C) {
  const notes = C.days.filter((x) => x.rec.notas).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const hecho = { "Sí": ["sx-ok", "Hecho"], "Parcial": ["sx-warn", "Parcial"], "No": ["sx-bad", "No hecho"] };
  $("sxNotes").innerHTML = notes.length
    ? notes.map((x) => `<button type="button" class="sx-note" data-open="${x.date}"><span class="d">${esc(sxDate(x.date))}${x.rec.hecho ? `<span class="sx-tag ${hecho[x.rec.hecho][0]}"><i></i>${hecho[x.rec.hecho][1]}</span>` : ""}${SXA.noteChips(x.rec)}</span><p>${esc(x.rec.notas)}</p></button>`).join("")
    : `<p class="sx-empty">Aún no has escrito notas. Apúntalas en <b>Hoy</b> y aquí tendrás tu diario de entreno.</p>`;
}

/* ================= Render e inicio ================= */
function sxRender() {
  SXT.clear();
  sxTipHide();
  const C = sxBuild();
  sxRenderHero(C); sxRenderKpis(C); sxRenderHeat(C); sxRenderVol(C); sxRenderMix(C);
  SXA.renderFeel(C); sxRenderDow(C); sxRenderDiet(C); sxRenderFoodStats(C); sxRenderRecords(C); sxRenderBadges(C); sxRenderNotes(C);
  sxCountAll($("sx"));
}
(function sxInit() {
  const hover = () => !!(window.matchMedia && matchMedia("(hover: hover)").matches);
  $("tabHoy").addEventListener("click", () => sxShow("hoy"));
  $("tabStats").addEventListener("click", () => sxShow("stats"));
  $("tabFood").addEventListener("click", () => sxShow("menu"));
  try { $("tabFoodNew").hidden = localStorage.getItem("menu-visto") === "1"; } catch (e) { $("tabFoodNew").hidden = true; }
  let seen = false;
  try { seen = localStorage.getItem("sx-visto") === "1"; } catch (e) {}
  $("tabNew").hidden = seen;
  const sx = $("sx");
  sx.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tip]");
    if (t) { if (sxTipEl === t && !hover()) sxTipHide(); else sxTipShow(t); return; }
    const n = e.target.closest("[data-open]");
    if (n) { sxShow("hoy"); go(n.dataset.open, false); return; }
    if (!e.target.closest("#sxTip")) sxTipHide();
  });
  sx.addEventListener("mouseover", (e) => { const t = e.target.closest("[data-tip]"); if (t && t !== sxTipEl && hover()) sxTipShow(t); });
  sx.addEventListener("mouseout", (e) => {
    if (!hover() || !e.target.closest("[data-tip]")) return;
    const to = e.relatedTarget;
    if (!to || !to.closest || !to.closest("[data-tip], #sxTip")) sxTipHide();
  });
  sx.addEventListener("focusin", (e) => { const t = e.target.closest("[data-tip]"); if (t) sxTipShow(t); });
  sx.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { sxTipHide(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-tip]")) {
      e.preventDefault();
      const d = SXT.get(e.target.getAttribute("data-tip"));
      if (d && d.date) { sxShow("hoy"); go(d.date, false); }
    }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#sx")) sxTipHide(); });
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastW || $("viewStats").hidden) return;
    lastW = window.innerWidth;
    sxRender();
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !$("viewStats").hidden) sxRender(); });
  if (location.hash === "#estadisticas") sxShow("stats");
  else if (location.hash === "#menu" || location.hash === "#comidas") sxShow("menu");
})();


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  let swHad = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swHad && !sessionStorage.getItem("sw-recargada")) { sessionStorage.setItem("sw-recargada", "1"); location.reload(); }
    swHad = true;
  });
}
