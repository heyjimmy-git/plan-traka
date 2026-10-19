/* ---------- editor ---------- */
const dlg = $("editor");
let edIndex = null;
let delArmed = false;
function disarmDelete() { delArmed = false; $("edDelete").classList.remove("armed"); $("edDelete").textContent = "Eliminar"; }
function openEditor(i) {
  edIndex = i;
  const b = i == null ? { k: "bike" } : blocksFor(sel)[i];
  $("edHeading").textContent = i == null ? "Nueva sesión" : "Editar sesión";
  $("edDate").textContent = dateLabel(sel);
  $("ekRaceLbl").hidden = b.k !== "race";
  const k = KIND_LABEL[b.k] ? b.k : "other";
  document.querySelectorAll('input[name="edKind"]').forEach((r) => { r.checked = r.value === k; });
  $("edTitle").value = b.title || "";
  $("edTime").value = b.h || "";
  $("edDur").value = (b.d || "").replace(/(\d)'/g, "$1 min");
  $("edZone").value = b.z || "";
  $("edWork").value = b.w || "";
  $("edText").value = b.t || "";
  $("edDelete").hidden = i == null;
  disarmDelete();
  dlg.showModal();
  dlg.scrollTop = 0;
}
$("edForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const blocks = blocksFor(sel).map((x) => Object.assign({}, x));
  const k = (document.querySelector('input[name="edKind"]:checked') || {}).value || "other";
  const prev = edIndex == null ? { n: null, tags: [] } : blocks[edIndex];
  const val = (id) => $(id).value.trim();
  let h = val("edTime") || null;
  if (h && /^flexible/i.test(h)) h = null;
  if (h) h = h.replace(/^(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})$/, "$1–$2");
  const nb = Object.assign({}, prev, {
    k,
    title: val("edTitle") || KIND_LABEL[k],
    h,
    d: val("edDur") || null,
    z: val("edZone") || null,
    t: val("edText"),
    w: val("edWork") || null,
    tags: k === prev.k ? (prev.tags || []) : [],
  });
  if (edIndex == null) blocks.push(nb); else blocks[edIndex] = nb;
  setDayBlocks(sel, blocks);
  dlg.close();
  renderDay(false); renderStrip();
  toast(edIndex == null ? "Sesión añadida" : "Sesión guardada");
});
$("edCancel").addEventListener("click", () => dlg.close());
$("edDelete").addEventListener("click", () => {
  if (!delArmed) { delArmed = true; $("edDelete").classList.add("armed"); $("edDelete").textContent = "Toca otra vez para eliminar"; return; }
  const blocks = blocksFor(sel).map((x) => Object.assign({}, x));
  blocks.splice(edIndex, 1);
  setDayBlocks(sel, blocks);
  dlg.close();
  renderDay(false); renderStrip();
  toast("Sesión eliminada");
});
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
$("sessions").addEventListener("click", (e) => { const b = e.target.closest("[data-edit]"); if (b) openEditor(Number(b.dataset.edit)); });
$("addSession").addEventListener("click", () => openEditor(null));
$("restore").addEventListener("click", () => {
  if (!confirm("¿Volver al plan original de este día? Se borran las sesiones que has cambiado o añadido hoy.")) return;
  delete cambios[sel];
  persist();
  renderDay(false); renderStrip();
  toast("Plan original restaurado");
});

/* ---------- copia de seguridad ---------- */
$("exportBtn").addEventListener("click", async () => {
  const data = JSON.stringify({ app: "plan-traka", v: 1, exportado: new Date().toISOString(), registro: store, cambios, comidas, menu: menus, compra }, null, 2);
  const name = `plan-la-traka-copia-${isoLocal(new Date())}.json`;
  const file = new File([data], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Copia Plan La Traka" }); return; }
    catch (err) { if (err && err.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || data.app !== "plan-traka") throw new Error("formato");
    const when = data.exportado ? new Date(data.exportado).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "sin fecha";
    if (!confirm(`Esto sustituye tus sesiones editadas y tu registro por los de la copia del ${when}. ¿Continuar?`)) return;
    store = data.registro || {};
    cambios = data.cambios || {};
    comidas = dtMigrateAll(data.comidas || {});
    menus = Object.assign({ versiones: [], horas: {}, ref: {} }, data.menu || {});
    compra = data.compra || {};
    persist();
    renderAll();
    toast("Copia recuperada");
  } catch (err) {
    toast("Ese archivo no es una copia de este plan");
  }
});

/* ---------- eventos ---------- */
["rodilla", "tibial"].forEach((f) => {
  $(f).innerHTML = Array.from({ length: 11 }, (_, v) =>
    `<button type="button" id="${f}${v}" class="lv-${level(v)}" data-v="${v}" aria-pressed="false" aria-label="${v}">${v}</button>`).join("");
  $(f).addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    const v = Number(b.dataset.v);
    saveLog({ [f]: (store[sel] || {})[f] === v ? null : v });
  });
});
$("seg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-v]"); if (!b) return;
  saveLog({ hecho: (store[sel] || {}).hecho === b.dataset.v ? null : b.dataset.v });
});
$("notes").addEventListener("change", (e) => saveLog({ notas: e.target.value.trim() }));
$("notes").addEventListener("input", (e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + 2 + "px"; });
$("strip").addEventListener("click", (e) => { const b = e.target.closest("[data-date]"); if (b) go(b.dataset.date); });
$("prevWeek").addEventListener("click", () => goWeek(selDay().w - 1));
$("nextWeek").addEventListener("click", () => goWeek(selDay().w + 1));
$("backToday").addEventListener("click", () => go(todayISO));
const pickWeek = (e) => { const r = e.target.closest("[data-w]"); if (r) goWeek(Number(r.dataset.w)); };
$("pf").addEventListener("click", pickWeek);
$("pf").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickWeek(e); } });
document.addEventListener("keydown", (e) => {
  if (dlg.open || e.target.closest("textarea, input")) return;
  if (e.key === "ArrowLeft") shiftDay(-1);
  if (e.key === "ArrowRight") shiftDay(1);
});
let tx = null, ty = null;
$("sessions").addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
$("sessions").addEventListener("touchend", (e) => {
  if (tx === null) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  tx = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftDay(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const now = isoLocal(new Date());
  if (now === todayISO) return;
  const wasToday = sel === clampDate(todayISO);
  todayISO = now;
  if (wasToday) sel = clampDate(now);
  renderHeader(); renderWeek(); renderDay(false); renderProfile();
});

renderGuides();
renderAll();
