/* ================= Pestaña Menú ================= */
let menuWeek = null;
const renderFoodIfVisible = () => { if (!$("viewFood").hidden) renderMenu(); };
const weekDays = (w) => DAYS.filter((d) => d.w === w);
const menuDateOf = (w) => { const ds = weekDays(w); return (ds.find((d) => d.date >= DIET.desde) || ds[ds.length - 1]).date; };

function renderMenu() {
  if (menuWeek == null) menuWeek = selDay().w;
  const w = menuWeek, wk = WEEKS[w - 1], ph = phaseOf(w);
  $("mnSub").textContent = DIET.fuente;
  $("mnWeek").innerHTML = `<strong>${w > PLAN_WEEKS ? "Día de la carrera" : `Semana ${w}`}</strong> · ${fmtRange(wk.ini, wk.fin)}<span class="sub">${ph ? esc(ph.name) : "La Traka"}</span>`;
  $("mnPrev").disabled = w <= 1;
  $("mnNext").disabled = w >= WEEKS.length;
  $("mnNotice").hidden = !(todayISO > DIET.hasta && !(menus.versiones || []).some((v) => v.desde > DIET.hasta));
  renderMenuDays(w); renderShop(w); renderRef(w);
}

function renderMenuDays(w) {
  const days = weekDays(w);
  if (days.every((d) => d.date < DIET.desde)) {
    $("mnDays").innerHTML = `<p class="fd-empty">La dieta empieza el ${sxDate(DIET.desde, false)}. Avanza a una semana posterior para ver el menú.</p>`;
    return;
  }
  $("mnDays").innerHTML = days.map((d) => {
    const tomas = dtTomas(d.date), day = Number(d.date.slice(8));
    const head = `<span class="mn-d"><b>${LETTER[d.dow]}</b>${day}</span>`;
    if (!tomas.length) return `<div class="mn-day is-off">${head}<span class="mn-txt"><span class="mn-l2">Sin menú</span></span></div>`;
    const marked = tomas.filter((t) => t.log.st).length;
    const comida = tomas.find((t) => t.id === "comida"), cena = tomas.find((t) => t.id === "cena");
    // Resumen del día: la proteína de la comida y de la cena
    const PROT = /pollo|pavo|ternera|pescado|at[uú]n|salm[oó]n|sepia|chipir|gambas|huevo|legumbre|lomo|jam[oó]n|merluza|carne/i;
    const main = (t) => {
      if (!t) return "";
      const xs = dtVisible(t).map(([it]) => it.text);
      return xs.find((x) => PROT.test(x)) || xs.find((x) => /^\d/.test(x) && !/yogur|creatina/i.test(x)) || xs[0];
    };
    const rec = dtRec(d.date), ref = dtRef(d.date);
    const kc = rec.kcal ? `${kcalFmt(rec.kcal)} kcal` : ref && ref.kcal ? `≈${kcalFmt(ref.kcal)} kcal` : "";
    const dots = tomas.map((t) => `<i class="${t.log.st ? ST_CLS[t.log.st] : "sx-none"}" title="${esc(t.label)}: ${t.log.st ? ST_LABEL[t.log.st] : "sin marcar"}"></i>`).join("");
    return `<button type="button" class="mn-day${d.date === todayISO ? " is-today" : ""}" data-mn-day="${d.date}" aria-label="${esc(dateLabel(d.date))}: ${marked} de ${tomas.length} tomas marcadas">${head}` +
      `<span class="mn-txt"><span class="mn-l1">${esc([main(comida), main(cena)].filter(Boolean).join(" · "))}</span><span class="mn-l2">${marked}/${tomas.length} marcadas${kc ? " · " + kc : ""}</span></span>` +
      `<span class="mn-dots" aria-hidden="true">${dots}</span></button>`;
  }).join("");
}

/* ---------- lista de la compra ---------- */
function renderShop(w) {
  const items = dtShopItems(w);
  const st = compra[shopKey(w)] || {};
  const done = st.done || {}, extra = st.extra || [];
  const total = items.length + extra.length, hechos = items.filter((x) => done[x.key]).length + extra.filter((x) => x.done).length;
  $("mnShopSub").textContent = total ? `${hechos} de ${total} en el carro · sale del menú de los 7 días` : "Sale del menú de los 7 días";
  if (!total) { $("mnShop").innerHTML = `<p class="fd-empty">No hay menú en esta semana.</p>`; return; }
  $("mnShop").innerHTML =
    items.map((x) => `<label class="mn-chk"><input type="checkbox" data-shop="${esc(x.key)}"${done[x.key] ? " checked" : ""}><span>${esc(dtShopLabel(x))}</span></label>`).join("") +
    extra.map((x, i) => `<div class="mn-chk"><input type="checkbox" id="shx${i}" data-shop-extra="${i}"${x.done ? " checked" : ""}><label for="shx${i}">${esc(x.t)}</label><button type="button" class="mn-x" data-shop-del="${i}" aria-label="Quitar ${esc(x.t)}">×</button></div>`).join("");
}
function saveShop(w, mutate) {
  const st = JSON.parse(JSON.stringify(compra[shopKey(w)] || { done: {}, extra: [] }));
  st.done = st.done || {}; st.extra = st.extra || [];
  mutate(st);
  compra[shopKey(w)] = st;
  persist();
  renderShop(w);
}
function shopText(w) {
  const st = compra[shopKey(w)] || {}, done = st.done || {};
  const pend = dtShopItems(w).filter((x) => !done[x.key]).map(dtShopLabel).concat((st.extra || []).filter((x) => !x.done).map((x) => x.t));
  const wk = WEEKS[w - 1];
  return pend.length ? [`Lista de la compra · semana ${w} (${fmtRange(wk.ini, wk.fin)})`, ...pend.map((x) => `- ${x}`)].join("\n") : null;
}

/* ---------- kcal de referencia del menú ---------- */
function renderRef(w) {
  const ver = dtVersionFor(menuDateOf(w));
  if (!ver) { $("mnRef").innerHTML = `<p class="fd-empty">No hay menú en esta semana.</p>`; return; }
  const ref = (menus.ref || {})[ver.id] || {};
  const known = DOWS.filter((d) => ref[d] && ref[d].kcal);
  $("mnRefSub").textContent = known.length ? `${known.length} de 7 días con referencia · menú ${ver.id === "base" ? "de la nutricionista" : `editado desde el ${sxDate(ver.desde, false)}`}` : "Pídeselas a la IA una vez y quedan guardadas para comparar con lo que comes";
  $("mnRef").innerHTML = `<table class="mn-ref"><thead><tr><th>Día</th><th>Kcal</th><th>H · P · G (g)</th></tr></thead><tbody>${DOWS.map((d) => {
    const r = ref[d] || {};
    return `<tr><td>${d}</td><td><input type="number" inputmode="numeric" min="0" max="9000" step="10" data-ref="${d}" value="${r.kcal || ""}" placeholder="—" aria-label="Kcal de referencia del ${d.toLowerCase()}"></td><td>${r.h != null || r.p != null || r.g != null ? `${r.h ?? "—"} · ${r.p ?? "—"} · ${r.g ?? "—"}` : "—"}</td></tr>`;
  }).join("")}</tbody></table>`;
  $("mnRef").dataset.ver = ver.id;
}
function saveRef(verId, patch) {
  menus.ref = menus.ref || {};
  menus.ref[verId] = Object.assign({}, menus.ref[verId] || {}, patch);
  persist();
}

/* ---------- pautas ---------- */
function renderPautas() {
  $("mnPautas").innerHTML =
    `<h3>Suplementación</h3><ul>${DIET.suplementos.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` +
    `<h3>Aclaraciones</h3><ul>${DIET.pautas.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` +
    `<p class="closing">${esc(DIET.fuente)}. Las opciones con "o" y las variantes a/b se eligen en cada toma desde Hoy.</p>`;
}

/* ---------- editor del menú ---------- */
const mnDlg = $("mnEditor");
let mnResetArmed = false;
function mnLoadDay() {
  const dow = (document.querySelector('input[name="mnDow"]:checked') || {}).value || "Lunes";
  const desde = $("mnEdDesde").value || todayISO;
  const ver = dtVersionFor(desde < DIET.desde ? DIET.desde : desde) || DIET_BASE;
  TOMAS.forEach((id) => {
    const def = dtTomaDef(ver.semana[dow], id);
    const ta = $("mnEd-" + id);
    ta.value = def ? def.items.join("\n") : "";
    if (id === "merienda") $("mnEdMerLabel").value = (def && def.label) || "";
  });
}
function openMenuEditor() {
  const d = selDay();
  document.querySelectorAll('input[name="mnDow"]').forEach((r) => { r.checked = r.value === d.dow; });
  $("mnEdDesde").value = todayISO < DIET.desde ? DIET.desde : todayISO;
  DIET.tomas.forEach((t) => { $("mnEdH-" + t.id).value = (menus.horas || {})[t.id] || t.hora; });
  mnLoadDay();
  mnResetArmed = false; $("mnEdReset").textContent = "Volver al menú original"; $("mnEdReset").classList.remove("armed");
  $("mnEdReset").hidden = !(menus.versiones || []).length;
  mnDlg.showModal();
  mnDlg.scrollTop = 0;
}
$("mnEdForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const dow = (document.querySelector('input[name="mnDow"]:checked') || {}).value;
  let desde = $("mnEdDesde").value || todayISO;
  if (desde < DIET.desde) desde = DIET.desde;
  const ver = dtVersionFor(desde) || DIET_BASE;
  const semana = JSON.parse(JSON.stringify(ver.semana));
  const day = {};
  TOMAS.forEach((id) => {
    const items = $("mnEd-" + id).value.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!items.length) return;
    const label = id === "merienda" ? $("mnEdMerLabel").value.trim() : "";
    day[id] = label && label !== TOMA_LABEL[id] ? { label, items } : items;
  });
  semana[dow] = day;
  const changed = JSON.stringify(semana) !== JSON.stringify(ver.semana);
  if (changed) {
    menus.versiones = (menus.versiones || []).filter((v) => v.desde !== desde);
    const id = "v" + Date.now().toString(36);
    menus.versiones.push({ id, desde, semana });
    // Las kcal de referencia de los demás días siguen valiendo; las del día cambiado, no
    menus.ref = menus.ref || {};
    menus.ref[id] = JSON.parse(JSON.stringify(menus.ref[ver.id] || {}));
    delete menus.ref[id][dow];
  }
  const horas = {};
  DIET.tomas.forEach((t) => { const v = $("mnEdH-" + t.id).value; if (v && v !== t.hora) horas[t.id] = v; });
  menus.horas = horas;
  persist();
  mnDlg.close();
  renderMenu(); rerenderDay();
  toast(changed ? `Menú del ${dow.toLowerCase()} guardado desde el ${sxDate(desde, false)}` : "Horas guardadas");
});
$("mnEdCancel").addEventListener("click", () => mnDlg.close());
mnDlg.addEventListener("click", (e) => { if (e.target === mnDlg) mnDlg.close(); });
document.querySelectorAll('input[name="mnDow"]').forEach((r) => r.addEventListener("change", mnLoadDay));
$("mnEdDesde").addEventListener("change", mnLoadDay);
$("mnEdReset").addEventListener("click", () => {
  if (!mnResetArmed) { mnResetArmed = true; $("mnEdReset").classList.add("armed"); $("mnEdReset").textContent = "Toca otra vez para borrar tus cambios"; return; }
  menus.versiones = [];
  persist();
  mnDlg.close();
  renderMenu(); rerenderDay();
  toast("Vuelves al menú de la nutricionista");
});

/* ---------- eventos de la pestaña ---------- */
$("mnPrev").addEventListener("click", () => { menuWeek = Math.max(1, menuWeek - 1); renderMenu(); });
$("mnNext").addEventListener("click", () => { menuWeek = Math.min(WEEKS.length, menuWeek + 1); renderMenu(); });
$("mnDays").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mn-day]");
  if (b) { sxShow("hoy"); go(b.dataset.mnDay, false); }
});
$("mnShop").addEventListener("change", (e) => {
  const c = e.target.closest("[data-shop]");
  if (c) { saveShop(menuWeek, (st) => { if (c.checked) st.done[c.dataset.shop] = true; else delete st.done[c.dataset.shop]; }); return; }
  const x = e.target.closest("[data-shop-extra]");
  if (x) saveShop(menuWeek, (st) => { st.extra[+x.dataset.shopExtra].done = x.checked; });
});
$("mnShop").addEventListener("click", (e) => {
  const d = e.target.closest("[data-shop-del]");
  if (d) saveShop(menuWeek, (st) => { st.extra.splice(+d.dataset.shopDel, 1); });
});
$("mnShopForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("mnShopAdd").value.trim();
  if (!v) return;
  saveShop(menuWeek, (st) => { st.extra.push({ t: v }); });
  $("mnShopAdd").value = "";
});
$("mnShopShare").addEventListener("click", () => shareText(shopText(menuWeek), false, "Lista copiada"));
$("mnShopClear").addEventListener("click", () => saveShop(menuWeek, (st) => { st.done = {}; st.extra.forEach((x) => { x.done = false; }); }));
$("mnRef").addEventListener("change", (e) => {
  const i = e.target.closest("[data-ref]");
  if (!i) return;
  const v = i.value.trim(), n = v === "" ? null : Math.max(0, Math.round(+v)) || null;
  const verId = $("mnRef").dataset.ver;
  const cur = Object.assign({}, ((menus.ref || {})[verId] || {})[i.dataset.ref] || {});
  if (n == null) delete cur.kcal; else cur.kcal = n;
  saveRef(verId, { [i.dataset.ref]: cur });
  renderMenuDays(menuWeek);
});
$("mnRefAsk").addEventListener("click", () => shareText(dtMenuPrompt(menuDateOf(menuWeek)), false, "Copiado para la IA"));
$("mnRefRead").addEventListener("click", () => {
  const parsed = dtParseRef($("mnRefPaste").value);
  const n = Object.keys(parsed).length;
  if (!n) { toast("No encuentro kcal por días en ese texto"); return; }
  saveRef($("mnRef").dataset.ver, parsed);
  $("mnRefPaste").value = "";
  renderRef(menuWeek); renderMenuDays(menuWeek);
  toast(`Guardadas las kcal de ${n} ${n === 1 ? "día" : "días"}`);
});
$("mnWeekAI").addEventListener("click", () => {
  const dates = weekDays(menuWeek).map((d) => d.date).filter((d) => d <= todayISO);
  shareText(dtEatenPrompt(dates), false, "Copiado para la IA");
});
$("mnEditOpen").addEventListener("click", openMenuEditor);
renderPautas();
