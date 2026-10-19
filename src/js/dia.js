/* ================= Menú del día: tomas y hábitos (pestaña Menú) ================= */
// Tomas abiertas a mano para cambiarlas aunque estén terminadas (se olvidan al cambiar de día)
const dtOpen = new Set();
let dtOpenDay = null;
function dtTomaHTML(t, date) {
  if (dtOpenDay !== date) { dtOpen.clear(); dtOpenDay = date; }
  const st = t.log.st || null, eat = t.log.eat || {};
  const nota = String(t.log.nota || "");
  const chip = st ? `<span class="tm-chip ${ST_CLS[st]}"><i></i>${ST_LABEL[st]}</span>` : "";
  const head = `<div class="tm-head"><span class="s-kind">${esc(t.label)}</span>${chip}</div>`;
  const li = (body) => `<li class="s s--toma${st ? " is-" + st : ""}" data-toma="${t.id}">${timeHTML({ h: fmtHM(t.min) })}<div class="s-body tm">${head}${body}</div></li>`;
  // Terminada (todo tal cual o saltada): una línea de resumen que se puede volver a abrir
  if ((st === "ok" || st === "no") && !dtOpen.has(t.id)) {
    const sum = dtVisible(t).map(([it, i]) => dtItemText(it, t.log, i, false)).join(" · ");
    return li(`<button type="button" class="tm-sum" data-toma-open="${t.id}"><span>${esc(sum)}</span><span class="tm-edit">Cambiar</span></button>`);
  }
  const rows = dtVisible(t).map(([it, i]) => {
    const on = !!eat[i];
    if (it.opts) {
      const chosen = (t.log.opt || {})[i];
      return `<li class="tm-row${on ? " on" : ""}"><button type="button" class="tm-box" role="checkbox" aria-checked="${on}" data-toma-eat="${t.id}:${i}" aria-label="${esc(it.opts.join(" o "))}">${CHECK}</button>` +
        `<span class="tm-opts" role="group" aria-label="Elige una opción">${it.opts.map((o, k) =>
          `<button type="button" class="tm-opt" data-toma-opt="${t.id}:${i}:${k}" aria-pressed="${chosen === k}">${esc(o)}</button>`).join("")}</span></li>`;
    }
    return `<li class="tm-row${on ? " on" : ""}${it.libre ? " is-libre" : ""}"><button type="button" class="tm-check" role="checkbox" aria-checked="${on}" data-toma-eat="${t.id}:${i}">` +
      `<span class="tm-box" aria-hidden="true">${CHECK}</span><span>${esc(it.text)}</span></button></li>`;
  }).join("");
  const vsel = t.log.var || "a";
  const variants = t.items.some((it) => it.variant)
    ? `<div class="seg tm-var" role="group" aria-label="Opción de ${esc(t.label)}">${["a", "b"].map((v) =>
        `<button type="button" data-toma-var="${t.id}:${v}" aria-pressed="${vsel === v}">Opción ${v}</button>`).join("")}</div>`
    : "";
  const alts = t.id === "desayuno" && !t.log.items ? dtBreakfastAlts(date) : [];
  const altHTML = alts.length
    ? `<div class="tm-alt"><span class="eyebrow">Otro desayuno</span>${alts.map((a) =>
        `<button type="button" class="tm-opt" data-toma-alt="${a.dow}" aria-pressed="${t.log.alt === a.dow}">${esc(a.label)}</button>`).join("")}</div>`
    : "";
  return li(`${variants}<ul class="tm-rows">${rows}</ul>${altHTML}` +
    `<textarea class="tm-nota" rows="1" data-toma-nota="${t.id}" placeholder="Escribe lo que has comido o cambiado…" aria-label="Qué has comido o cambiado en ${esc(t.label)}">${esc(nota)}</textarea>` +
    `<div class="tm-acts2"><button type="button" class="tm-all" data-toma-all="${t.id}" aria-pressed="${st === "ok"}">${CHECK}Todo tal cual</button>` +
    `<button type="button" class="tm-skip" data-toma-skip="${t.id}" aria-pressed="${st === "no"}">Me la salté</button>` +
    (dtOpen.has(t.id) && (st === "ok" || st === "no") ? `<button type="button" class="link" data-toma-close="${t.id}">Plegar</button>` : "") + `</div>`);
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
  document.querySelectorAll("#mnTomas .tm-nota").forEach(autoGrow);
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
const SUP_NAME = { creatina: "la creatina", magnesio: "el magnesio", whey: "el whey" };
function afterToma(auto) {
  rerenderDay();
  if (auto.length) toast(`También he marcado ${auto.map((k) => SUP_NAME[k]).join(" y ")}`);
}
$("mnTomas").addEventListener("click", (e) => {
  const q = (attr) => e.target.closest(`[${attr}]`);
  let el;
  if ((el = q("data-toma-eat"))) { const [id, i] = el.dataset.tomaEat.split(":"); afterToma(dtToggleEat(sel, id, +i)); return; }
  if ((el = q("data-toma-opt"))) { const [id, i, k] = el.dataset.tomaOpt.split(":"); afterToma(dtPickOpt(sel, id, +i, +k)); return; }
  if ((el = q("data-toma-all"))) { const id = el.dataset.tomaAll; dtOpen.delete(id); afterToma(dtAllEaten(sel, id)); return; }
  if ((el = q("data-toma-skip"))) { const id = el.dataset.tomaSkip; dtOpen.delete(id); afterToma(dtSkip(sel, id)); return; }
  if ((el = q("data-toma-open"))) { dtOpen.add(el.dataset.tomaOpen); rerenderDay(); return; }
  if ((el = q("data-toma-close"))) { dtOpen.delete(el.dataset.tomaClose); rerenderDay(); return; }
  if ((el = q("data-toma-var"))) {
    const [id, v] = el.dataset.tomaVar.split(":");
    afterToma(dtEditToma(sel, id, (log) => { log.var = v; }));
    return;
  }
  if ((el = q("data-toma-alt"))) {
    const dow = el.dataset.tomaAlt;
    dtEditToma(sel, "desayuno", (log) => { if (log.alt === dow) delete log.alt; else log.alt = dow; log.opt = {}; log.eat = {}; delete log.items; });
    rerenderDay();
  }
});
$("mnTomas").addEventListener("change", (e) => {
  const n = e.target.closest("[data-toma-nota]");
  if (n) { dtEditToma(sel, n.dataset.tomaNota, (log) => { log.nota = n.value.trim(); }); rerenderDay(); }
});
$("mnTomas").addEventListener("input", (e) => { if (e.target.matches(".tm-nota")) autoGrow(e.target); });
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
