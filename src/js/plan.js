/* ---------- sesiones ---------- */
function timeHTML(b) {
  if (!b.h) return `<div class="s-time is-flex"><span>Flexible</span></div>`;
  const m = b.h.match(/^(\d{1,2}[:.]\d{2})(?:\s*[–-]\s*(\d{1,2}[:.]\d{2}))?$/);
  if (m) return `<div class="s-time"><span>${esc(m[1])}${m[2] ? `<small>hasta ${esc(m[2])}</small>` : ""}</span></div>`;
  return `<div class="s-time is-word"><span>${esc(b.h)}</span></div>`;
}
function durHTML(d) {
  return esc(d)
    .replace(/(\d)-(\d)/g, "$1–$2")
    .replace(/(\d)\s*(?:min\b|')/g, '$1<span class="u">min</span>')
    .replace(/(\d)\s*m\b/g, '$1<span class="u">m</span>')
    .replace(/(\d)\s*km\b/g, '$1<span class="u">km</span>');
}
function sessionHTML(b, i) {
  const k = KIND_LABEL[b.k] ? b.k : "other";
  const title = b.title || KIND_LABEL[k];
  let head;
  if (k === "race") head = `<div class="s-kind">Día D</div><div class="s-main">${esc(title)}</div>`;
  else if (b.d && k !== "rest") head = `<div class="s-kind">${esc(title)}</div><div class="s-main">${durHTML(b.d)}</div>`;
  else head = `<div class="s-main">${esc(title)}</div>`;
  const tags = (b.z ? `<span class="tag zone">${esc(b.z)}</span>` : "") +
    (b.tags || []).map((t) => `<span class="tag${/^Opcional/.test(t) ? " opt" : ""}">${esc(t)}</span>`).join("");
  return `<li class="s k-${k} s--${k}">${timeHTML(b)}<div class="s-body">${head}` +
    (b.t ? `<p class="s-text">${esc(b.t)}</p>` : "") +
    (b.w ? `<div class="work"><span class="eyebrow">Entreno concreto</span><p>${esc(b.w)}</p></div>` : "") +
    (tags ? `<div class="tags">${tags}</div>` : "") +
    (b.n ? `<p class="s-note"><b>Rodilla / tibial</b>${esc(b.n)}</p>` : "") +
    `</div><button type="button" class="s-edit" data-edit="${i}" aria-label="Editar ${esc(title)}">${PENCIL}</button></li>`;
}

/* ---------- render ---------- */
function renderHeader() {
  const n = dayDiff(todayISO, RACE);
  if (n > 1) { $("countN").textContent = n; $("countL").innerHTML = "días para<br>la salida"; }
  else if (n === 1) { $("countN").textContent = "1"; $("countL").innerHTML = "día para<br>la salida"; }
  else if (n === 0) { $("countN").textContent = "Hoy"; $("countL").innerHTML = "es La<br>Traka"; }
  else { $("countN").textContent = "✓"; $("countL").innerHTML = "carrera<br>terminada"; }
}

function renderStrip() {
  const d = selDay();
  $("strip").innerHTML = DAYS.filter((x) => x.w === d.w).map((x) => {
    const day = Number(x.date.slice(8));
    const kinds = [...new Set(blocksFor(x.date).map((b) => KIND_LABEL[b.k] ? b.k : "other"))].slice(0, 3);
    const rec = store[x.date];
    const done = rec && rec.hecho === "Sí";
    const lv = level(worstPain(rec) < 0 ? null : worstPain(rec));
    const cls = ["dbtn", x.date === sel ? "is-sel" : "", x.date === todayISO ? "is-today" : ""].join(" ");
    const lab = `${x.dow} ${day}${x.date === todayISO ? ", hoy" : ""}${done ? ", hecho" : ""}${lv && lv !== "g" ? ", con dolor" : ""}`;
    return `<button type="button" class="${cls}" data-date="${x.date}" aria-label="${lab}" aria-current="${x.date === sel ? "date" : "false"}">` +
      (lv && lv !== "g" ? `<i class="pdot lv-${lv}"></i>` : "") +
      (done ? '<svg class="chk" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2.5 6.2 2.3 2.3 4.7-5"/></svg>' : "") +
      `<span class="dl">${LETTER[x.dow]}</span><span class="dn">${day}</span>` +
      `<span class="marks">${kinds.map((k) => `<i class="k-${k}"></i>`).join("")}</span></button>`;
  }).join("");
}

function renderWeek() {
  const d = selDay();
  const w = WEEKS[d.w - 1];
  const ph = phaseOf(w.n);
  if (w.n > PLAN_WEEKS) {
    $("weekTitle").innerHTML = `<strong>Día de la carrera</strong> · ${fmtRange(w.ini, w.fin)}<span class="sub">La Traka · 100 km · Girona</span>`;
    $("phaseNote").hidden = true;
  } else {
    $("weekTitle").innerHTML = `<strong>Semana ${w.n}</strong> · ${fmtRange(w.ini, w.fin)}<span class="sub">${esc(ph.name)} · ≈${fmtH(w.h)} de entreno${w.descarga ? ' · <span class="chip-d">Descarga</span>' : ""}</span>`;
    $("phaseNote").hidden = false;
    $("phaseLbl").textContent = `Fase ${PHASES.indexOf(ph) + 1} · ${ph.name} · semanas ${ph.a}–${ph.b}`;
    $("phaseObj").textContent = ph.obj;
    const rule = PLAN.prevSections.flatMap((s) => s.items).find((t) => /semanas de descarga/i.test(t));
    $("descarga").hidden = !w.descarga;
    if (w.descarga) $("descarga").innerHTML = `<b>Semana de descarga.</b> ${esc(rule || "")}`;
  }
  $("prevWeek").disabled = d.w === 1;
  $("nextWeek").disabled = d.w === WEEKS.length;
  renderStrip();
}

function renderDay(animate) {
  const d = selDay();
  const [, m, dd] = d.date.split("-").map(Number);
  $("date").innerHTML = `${esc(d.dow)} <span class="num">${dd}</span> ${MONTHS[m - 1]}`;
  const diff = dayDiff(todayISO, d.date);
  const rel = $("rel");
  rel.textContent = diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : diff === -1 ? "Ayer" : diff > 1 ? `En ${diff} días` : `Hace ${-diff} días`;
  rel.classList.toggle("is-today", diff === 0);
  const ph = phaseOf(d.w);
  $("dayWeek").textContent = ph ? `S${d.w} de ${PLAN_WEEKS} · ${ph.name}` : "Día de la carrera";
  $("backToday").hidden = diff === 0 || !IDX.has(todayISO);
  const blocks = blocksFor(sel);
  const list = $("sessions");
  list.innerHTML = blocks.length ? blocks.map(sessionHTML).join("") : `<li class="s-empty">Sin sesiones este día.</li>`;
  $("edited").hidden = !cambios[sel];
  if (animate) { list.classList.remove("anim"); void list.offsetWidth; list.classList.add("anim"); }
  renderLog();
}

function renderLog() {
  const rec = store[sel] || {};
  document.querySelectorAll("#seg button").forEach((b) => b.setAttribute("aria-pressed", String(rec.hecho === b.dataset.v)));
  ["rodilla", "tibial"].forEach((f) => {
    document.querySelectorAll(`#${f} button`).forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === rec[f])));
    $(f + "Val").textContent = rec[f] == null ? "Sin apuntar" : `${rec[f]} · ${SEMA[level(rec[f])].lv}`;
  });
  const worst = worstPain(rec);
  const sema = $("sema");
  if (worst < 0) { sema.hidden = true; }
  else {
    const lv = level(worst), s = SEMA[lv];
    sema.hidden = false;
    sema.className = `sema lv-${lv}`;
    sema.innerHTML = `<i></i><b>${esc(s.lv)} · ${esc(s.rango)}</b><span>${esc(s.acc)}</span>`;
  }
  const notes = $("notes");
  if (document.activeElement !== notes) notes.value = rec.notas || "";
}

function renderProfile() {
  const W = 360, x0 = 16, x1 = 326, base = 128, top = 30, maxH = 10;
  const step = (x1 - x0) / (PLAN_WEEKS - 1), hw = step / 2;
  const X = (i) => x0 + (i - 1) * step;
  const Y = (h) => base - (h / maxH) * (base - top);
  const flagX = x1 + 20;
  const xOf = (n) => n > PLAN_WEEKS ? flagX : X(n);
  const selW = selDay().w;
  const nowW = IDX.has(todayISO) ? DAYS[IDX.get(todayISO)].w : null;
  const ws = WEEKS.slice(0, PLAN_WEEKS);
  let s = "";
  PHASES.forEach((p, i) => {
    if (i % 2 === 0) s += `<rect class="pf-band" x="${X(p.a) - hw}" y="${top - 12}" width="${(p.b - p.a + 1) * step}" height="${base - top + 12}"/>`;
  });
  s += `<rect class="pf-selband" x="${xOf(selW) - hw}" y="${top - 12}" width="${step}" height="${base - top + 12}"/>`;
  [5, 10].forEach((h) => {
    s += `<line class="pf-grid" x1="0" x2="${W}" y1="${Y(h)}" y2="${Y(h)}"/><text class="pf-ylab" x="2" y="${Y(h) - 3}">${h}h</text>`;
  });
  const pts = ws.map((w) => [X(w.n), Y(w.h)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  s += `<path class="pf-area" d="${line}L${pts[pts.length - 1][0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z"/>`;
  s += `<path class="pf-line" d="${line}"/>`;
  s += `<line class="pf-base" x1="0" x2="${W}" y1="${base}" y2="${base}"/>`;
  s += `<line class="pf-pole" x1="${flagX}" x2="${flagX}" y1="${base}" y2="${base - 30}"/><path class="pf-flag" d="M${flagX},${base - 30}L${flagX + 12},${base - 25.5}L${flagX},${base - 21}Z"/>`;
  ws.filter((w) => w.descarga).forEach((w) => { s += `<text class="pf-d" x="${X(w.n)}" y="${Y(w.h) + 13}">D</text>`; });
  const peak = ws.reduce((a, b) => (b.h > a.h ? b : a));
  if (nowW !== peak.n) s += `<text class="pf-peak" x="${X(peak.n)}" y="${Y(peak.h) - 7}">máx ${fmtH(peak.h)}</text>`;
  if (nowW) {
    const nx = xOf(nowW), ny = nowW > PLAN_WEEKS ? base : Y(WEEKS[nowW - 1].h);
    s += `<line class="pf-now" x1="${nx}" x2="${nx}" y1="${top - 8}" y2="${base}"/>`;
    s += `<rect class="pf-pill" x="${Math.min(nx - 14, W - 28)}" y="${top - 26}" width="28" height="13" rx="3"/><text class="pf-pilltxt" x="${Math.min(nx, W - 14)}" y="${top - 16.5}">HOY</text>`;
    s += `<circle class="pf-nowdot" cx="${nx}" cy="${ny}" r="3.5"/>`;
  }
  pts.forEach((p, i) => { if (ws[i].n !== nowW) s += `<circle class="pf-dot" cx="${p[0]}" cy="${p[1]}" r="2"/>`; });
  const show = new Set([1, 5, 10, 15, 20, 25, 30]);
  if (selW <= PLAN_WEEKS) {
    [...show].forEach((n) => { if (n !== selW && Math.abs(n - selW) <= 2) show.delete(n); });
    show.add(selW);
  }
  show.forEach((n) => { s += `<text class="pf-wk${n === selW ? " is-sel" : ""}" x="${X(n)}" y="${base + 14}">${n}</text>`; });
  PHASES.forEach((p, i) => {
    const narrow = p.b - p.a < 2;
    s += `<text class="pf-phase" x="${(X(p.a) + X(p.b)) / 2}" y="${base + (narrow ? 42 : 30)}">${esc(SHORT_PHASE[i].toUpperCase())}</text>`;
  });
  s += `<text class="pf-race" x="${W - 1}" y="${base + 30}">12 ABR</text>`;
  WEEKS.forEach((w) => {
    const wide = w.n > PLAN_WEEKS ? step * 2 : step;
    s += `<rect class="pf-hit" data-w="${w.n}" tabindex="0" role="button" aria-label="Ir a ${w.n > PLAN_WEEKS ? "el día de la carrera" : `la semana ${w.n}`}" x="${xOf(w.n) - wide / 2}" y="0" width="${wide}" height="176"/>`;
  });
  $("pf").innerHTML = s;
}

function renderStats() {
  const recs = DAYS.map((d) => store[d.date]).filter(Boolean);
  const si = recs.filter((r) => r.hecho === "Sí").length;
  const parcial = recs.filter((r) => r.hecho === "Parcial").length;
  const alerta = recs.filter((r) => worstPain(r) >= 3).length;
  $("stats").innerHTML = `<span>Hechas <b>${si}</b></span><span>Parciales <b>${parcial}</b></span><span>Plan completado <b>${Math.round((si / DAYS.length) * 100)}%</b></span><span>Días con dolor ≥3 <b>${alerta}</b></span>`;
}

function renderGuides() {
  const S = PLAN.semaforo;
  $("prev").innerHTML =
    `<p>${esc(PLAN.prevIntro)}</p><h3>Semáforo de dolor (rodilla y tibial)</h3><div>` +
    S.map((s, i) => `<div class="sem-row lv-${"gar"[i]}"><i></i><div><strong>${esc(s.lv)} · ${esc(s.rango)}</strong><p>${esc(s.sig)}</p><p><b>Qué haces:</b> ${esc(s.acc)}</p></div></div>`).join("") +
    `</div>` +
    PLAN.prevSections.filter((s) => s.items.length).map((s) =>
      `<h3>${esc(s.h)}</h3>${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}<ul>${s.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>`).join("") +
    `<p class="closing">${esc(PLAN.prevCierre)}</p>`;
  $("zonas").innerHTML =
    `<p>${esc(PLAN.zonasIntro)}</p><div>` +
    PLAN.zonas.map((z) => `<div class="zone"><span class="zone-z">${esc(z.z)}</span><div><strong>${esc(z.nombre)}</strong><span class="meta">RPE ${esc(z.rpe)} · ${esc(z.fc)} FC máx</span><p>${esc(z.siente)}</p><p><b>En tu plan:</b> ${esc(z.plan)}</p></div></div>`).join("") +
    `</div>` + PLAN.zonasTxt.map((t) => `<p>${esc(t)}</p>`).join("");
  $("perfil").innerHTML =
    `<dl class="facts">${Object.entries(PLAN.perfil).map(([k, v]) => `<div><dt class="eyebrow">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` +
    `<h3>Fases del plan</h3><ol class="phases">${PHASES.map((p) => `<li><strong>${esc(p.name)}</strong><span class="wk">S${p.a}–${p.b}</span><br>${esc(p.obj)}</li>`).join("")}</ol>` +
    `<p class="closing">${esc(PLAN.carrera)}</p>`;
}

function renderDataMeta() {
  const ed = Object.keys(cambios).length, reg = Object.keys(store).length, com = Object.keys(comidas).length;
  $("dataMeta").textContent = storageOK
    ? `${ed} ${ed === 1 ? "día editado" : "días editados"} · ${reg} ${reg === 1 ? "día registrado" : "días registrados"} · ${com} ${com === 1 ? "día con comidas" : "días con comidas"}`
    : "Este navegador no deja guardar datos (¿modo privado?). Abre la app desde el icono de inicio.";
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function go(iso, animate = true) {
  const next = clampDate(iso);
  if (next === sel) return;
  sel = next;
  renderWeek(); renderDay(animate); renderProfile(); renderFoodIfVisible();
}
function shiftDay(n) { const i = IDX.get(sel) + n; if (i >= 0 && i < DAYS.length) go(DAYS[i].date); }
function goWeek(n) {
  if (n < 1 || n > WEEKS.length) return;
  const cur = selDay();
  const target = DAYS.find((d) => d.w === n && d.dow === cur.dow) || DAYS.find((d) => d.w === n);
  go(target.date);
}
function renderAll() { renderHeader(); renderWeek(); renderDay(false); renderProfile(); renderStats(); renderDataMeta(); renderFoodIfVisible(); }

