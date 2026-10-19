/* ================= Menú del día: tomas y hábitos (pestaña Menú) ================= */
function dtTomaHTML(t, date) {
  const st = t.log.st || null;
  const vsel = t.log.var || "a";
  // Marcada como tal cual o saltada: se pliega en una línea para que el día no se haga eterno
  const folded = st === "ok" || st === "no";
  const items = folded ? "" : dtVisible(t).map(([it, idx]) => {
    if (it.opts) {
      const chosen = (t.log.opt || {})[idx];
      return `<li class="tm-it"><span class="tm-opts" role="group" aria-label="Elige una opción">${it.opts.map((o, k) =>
        `<button type="button" class="tm-opt" data-toma-opt="${t.id}:${idx}:${k}" aria-pressed="${chosen === k}">${esc(o)}</button>`).join("")}</span></li>`;
    }
    return `<li class="tm-it${it.libre ? " is-libre" : ""}">${esc(it.text)}</li>`;
  }).join("");
  const summary = folded ? `<p class="tm-sum">${esc(dtVisible(t).map(([it, idx]) => dtItemText(it, t.log, idx, false)).join(" · "))}</p>` : "";
  const variants = !folded && t.items.some((it) => it.variant)
    ? `<div class="seg tm-var" role="group" aria-label="Opción de ${esc(t.label)}">${["a", "b"].map((v) =>
        `<button type="button" data-toma-var="${t.id}:${v}" aria-pressed="${vsel === v}">Opción ${v}</button>`).join("")}</div>`
    : "";
  const alts = !folded && t.id === "desayuno" && !t.log.items ? dtBreakfastAlts(date) : [];
  const altHTML = alts.length
    ? `<div class="tm-alt"><span class="eyebrow">Otro desayuno</span>${alts.map((a) =>
        `<button type="button" class="tm-opt" data-toma-alt="${a.dow}" aria-pressed="${t.log.alt === a.dow}">${esc(a.label)}</button>`).join("")}</div>`
    : "";
  const acts = ["ok", "cambio", "no"].map((s) =>
    `<button type="button" class="tm-st ${ST_CLS[s]}" data-toma-st="${t.id}:${s}" aria-pressed="${st === s}" aria-label="${ST_LABEL[s]}"><i></i>${ST_BTN[s]}</button>`).join("");
  const nota = st === "cambio" || t.log.nota
    ? `<input class="tm-nota" type="text" data-toma-nota="${t.id}" value="${esc(t.log.nota || "")}" placeholder="¿Qué cambiaste?" aria-label="Qué cambiaste en ${esc(t.label)}" autocomplete="off">`
    : "";
  return `<li class="s s--toma${st ? " is-" + st : ""}" data-toma="${t.id}">${timeHTML({ h: fmtHM(t.min) })}` +
    `<div class="s-body tm"><div class="s-kind">${esc(t.label)}</div>${folded ? summary : `<ul class="tm-items">${items}</ul>`}${variants}${altHTML}` +
    `<div class="tm-acts" role="group" aria-label="Cómo fue: ${esc(t.label)}">${acts}</div>${nota}</div></li>`;
}

function tomasHTML(date) {
  const tomas = dtTomas(date).sort((a, b) => a.min - b.min);
  if (tomas.length) return tomas.map((t) => dtTomaHTML(t, date)).join("");
  return `<li class="s-empty">${date < DIET.desde ? `La dieta empieza el ${sxDate(DIET.desde, false)}.` : "Sin menú este día."}</li>`;
}

function renderMenuDay() {
  const d = selDay(), diff = dayDiff(todayISO, sel);
  const rel = diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : diff === -1 ? "Ayer" : diff > 1 ? `En ${diff} días` : `Hace ${-diff} días`;
  $("mdDay").innerHTML = `<strong>${esc(dateLabel(sel))}</strong><span class="sub">${rel} · S${d.w}${diff !== 0 && IDX.has(todayISO) ? ' · <button type="button" class="link" id="mdToday">Volver a hoy</button>' : ""}</span>`;
  $("mdPrev").disabled = IDX.get(sel) === 0;
  $("mdNext").disabled = IDX.get(sel) === DAYS.length - 1;
  // El entreno solo como contexto: explica por qué el pre-entreno o la cena cambian de hora
  const bl = blocksFor(sel).filter((b) => b.k !== "rest");
  $("mdTrain").innerHTML = `<span class="eyebrow">Entreno del día</span>` + (bl.length
    ? bl.map((b) => `<span class="k-${KIND_LABEL[b.k] ? b.k : "other"}"><i></i>${esc(b.title || KIND_LABEL[b.k] || "Sesión")}${b.h && /\d/.test(b.h) ? ` · ${esc(b.h)}` : ""}</span>`).join("")
    : '<span class="k-rest"><i></i>Descanso</span>');
  $("mnTomas").innerHTML = tomasHTML(sel);
  renderHabits();
}
const rerenderDay = () => renderMenuDay();

/* ---------- hábitos del día ---------- */
function renderHabits() {
  const on = sel >= DIET.desde;
  $("habits").hidden = !on;
  if (!on) return;
  const rec = dtRec(sel), agua = rec.agua || 0, sup = rec.sup || {};
  $("agua").innerHTML = Array.from({ length: AGUA_VASOS }, (_, i) =>
    `<button type="button" class="hb-glass${i < agua ? " on" : ""}" data-agua="${i + 1}" aria-pressed="${i < agua}" aria-label="${i + 1} ${i ? "vasos" : "vaso"}, ${litros(i + 1)} L"></button>`).join("");
  $("aguaVal").textContent = `${litros(agua)} / 2,5 L`;
  const chips = SUPS.slice();
  if (dtRestDay(sel)) chips.push(["pasos", "10-12 mil pasos"]);
  $("sups").innerHTML = chips.map(([k, l]) => `<button type="button" class="hb-chip" data-sup="${k}" aria-pressed="${!!sup[k]}">${CHECK}${esc(l)}</button>`).join("");
  const active = document.activeElement;
  const ex = $("extraFood");
  if (ex !== active) { ex.value = rec.extra || ""; autoGrow(ex); }
  const kc = $("dayKcal");
  if (kc !== active) kc.value = rec.kcal || "";
  const ref = dtRef(sel);
  $("dayKcalHint").textContent = ref && ref.kcal ? `Kcal del día (el menú ronda las ${kcalFmt(ref.kcal)})` : "Kcal del día que te diga la IA";
}

/* ---------- eventos ---------- */
$("mnTomas").addEventListener("click", (e) => {
  const st = e.target.closest("[data-toma-st]");
  if (st) {
    const [id, s] = st.dataset.tomaSt.split(":");
    const auto = dtSetSt(sel, id, s);
    rerenderDay();
    if (s === "cambio" && dtRec(sel).tomas?.[id]?.st === "cambio") {
      const inp = document.querySelector(`[data-toma-nota="${id}"]`);
      if (inp) inp.focus();
    }
    if (auto.length) toast(`También he marcado ${auto.map((k) => SUPS.find((x) => x[0] === k)[1].toLowerCase()).join(" y ")}`);
    return;
  }
  const op = e.target.closest("[data-toma-opt]");
  if (op) {
    const [id, idx, k] = op.dataset.tomaOpt.split(":");
    dtSave(sel, (r) => { const t = dtTomaLog(r, id); t.opt = t.opt || {}; if (t.opt[idx] === +k) delete t.opt[idx]; else t.opt[idx] = +k; });
    rerenderDay();
    return;
  }
  const v = e.target.closest("[data-toma-var]");
  if (v) {
    const [id, val] = v.dataset.tomaVar.split(":");
    dtSave(sel, (r) => { dtTomaLog(r, id).var = val; });
    rerenderDay();
    return;
  }
  const a = e.target.closest("[data-toma-alt]");
  if (a) {
    dtSave(sel, (r) => { const t = dtTomaLog(r, "desayuno"); if (t.alt === a.dataset.tomaAlt) delete t.alt; else t.alt = a.dataset.tomaAlt; t.opt = {}; });
    rerenderDay();
  }
});
$("mnTomas").addEventListener("change", (e) => {
  const n = e.target.closest("[data-toma-nota]");
  if (n) dtSave(sel, (r) => { dtTomaLog(r, n.dataset.tomaNota).nota = n.value.trim(); });
});
$("agua").addEventListener("click", (e) => {
  const b = e.target.closest("[data-agua]");
  if (!b) return;
  const n = +b.dataset.agua;
  dtSave(sel, (r) => { r.agua = r.agua === n ? n - 1 : n; });
  renderHabits();
});
$("sups").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sup]");
  if (!b) return;
  dtSave(sel, (r) => { r.sup = r.sup || {}; r.sup[b.dataset.sup] = !r.sup[b.dataset.sup]; });
  renderHabits();
});
$("extraFood").addEventListener("change", (e) => dtSave(sel, (r) => { r.extra = e.target.value.trim(); }));
$("extraFood").addEventListener("input", (e) => autoGrow(e.target));
$("dayKcal").addEventListener("change", (e) => {
  const v = e.target.value.trim();
  const n = v === "" ? null : Math.min(20000, Math.max(0, Math.round(+v))) || null;
  e.target.value = n == null ? "" : n;
  dtSave(sel, (r) => { r.kcal = n; });
});
$("dayAI").addEventListener("click", () => shareText(dtEatenPrompt([sel]), false, "Copiado para la IA"));
$("mdPrev").addEventListener("click", () => shiftDay(-1));
$("mdNext").addEventListener("click", () => shiftDay(1));
$("mdDay").addEventListener("click", (e) => { if (e.target.closest("#mdToday")) go(todayISO); });
let mdTx = null, mdTy = null;
$("mdCard").addEventListener("touchstart", (e) => {
  if (e.target.closest("textarea, input, button")) { mdTx = null; return; }
  mdTx = e.touches[0].clientX; mdTy = e.touches[0].clientY;
}, { passive: true });
$("mdCard").addEventListener("touchend", (e) => {
  if (mdTx === null) return;
  const dx = e.changedTouches[0].clientX - mdTx, dy = e.changedTouches[0].clientY - mdTy;
  mdTx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftDay(dx < 0 ? 1 : -1);
}, { passive: true });
