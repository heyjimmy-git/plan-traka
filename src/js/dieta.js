/* ================= Dieta: datos, menú y registro ================= */
const DIET = __DIET__;
const LS_FOOD = "plan-traka-comidas";
const LS_MENU = "plan-traka-menu";
const LS_SHOP = "plan-traka-compra";
const DOWS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const TOMAS = DIET.tomas.map((t) => t.id);
const TOMA_LABEL = Object.fromEntries(DIET.tomas.map((t) => [t.id, t.label]));
const SUPS = [["creatina", "Creatina"], ["magnesio", "Magnesio"], ["whey", "Whey"]];
const AGUA_VASOS = 10; // 10 vasos de 250 ml = 2,5 L
const ST_LABEL = { ok: "Tal cual", cambio: "Con cambios", no: "Saltada" };
const ST_CLS = { ok: "sx-ok", cambio: "sx-warn", no: "sx-bad" };
const ST_BTN = { ok: "Tal cual", cambio: "Cambios", no: "Saltada" };
const CHECK = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2.5 6.2 2.3 2.3 4.7-5"/></svg>';
const kcalFmt = (v) => Number(v).toLocaleString("es-ES");
const litros = (vasos) => (vasos * 0.25).toLocaleString("es-ES", { maximumFractionDigits: 2 });
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hm = (s) => { const m = String(s || "").match(/(\d{1,2})[:.](\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const fmtHM = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

/* ---------- registro (migra el formato de texto libre anterior) ---------- */
function dtMigrate(rec) {
  if (!rec || rec.v === 2) return rec;
  const out = { v: 2, tomas: {} };
  TOMAS.forEach((k) => { if (String(rec[k] || "").trim()) out.tomas[k] = { nota: String(rec[k]).trim() }; });
  if (String(rec.picoteo || "").trim()) out.extra = String(rec.picoteo).trim();
  if (rec.kcal) out.kcal = rec.kcal;
  if (rec.actualizado) out.actualizado = rec.actualizado;
  return out;
}
function dtMigrateAll(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((d) => { const r = dtMigrate(obj[d]); if (r) out[d] = r; });
  return out;
}
let comidas = dtMigrateAll(load(LS_FOOD));
let menus = Object.assign({ versiones: [], horas: {}, ref: {} }, load(LS_MENU));
let compra = load(LS_SHOP);

const dtRec = (date) => comidas[date] || {};
const dtTomaLog = (rec, id) => { rec.tomas = rec.tomas || {}; return (rec.tomas[id] = rec.tomas[id] || {}); };
function dtHas(rec) {
  if (!rec) return false;
  const tomaData = Object.values(rec.tomas || {}).some((t) => t && (t.st || t.nota || t.var || t.alt || Object.keys(t.opt || {}).length));
  return tomaData || !!rec.kcal || !!rec.agua || !!rec.extra || Object.values(rec.sup || {}).some(Boolean);
}
function dtSave(date, mutate) {
  const rec = JSON.parse(JSON.stringify(comidas[date] || {}));
  rec.v = 2; rec.tomas = rec.tomas || {};
  mutate(rec);
  Object.keys(rec.tomas).forEach((k) => { const t = rec.tomas[k]; if (!t || !Object.keys(t).length) delete rec.tomas[k]; });
  rec.actualizado = new Date().toISOString();
  if (dtHas(rec)) comidas[date] = rec; else delete comidas[date];
  persist();
}

/* ---------- menú: versiones (la de la nutricionista y las que edite ella) ---------- */
const DIET_BASE = { id: "base", desde: DIET.desde, semana: DIET.semana };
const dtVersions = () => [DIET_BASE, ...(menus.versiones || [])].sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0));
function dtVersionFor(date) { let v = null; dtVersions().forEach((x) => { if (x.desde <= date) v = x; }); return v; }
function dtTomaDef(dayMenu, id) {
  const v = dayMenu && dayMenu[id];
  if (!v) return null;
  return Array.isArray(v) ? { label: null, items: v } : { label: v.label || null, items: v.items || [] };
}

// Una línea del menú: "a) …" es una variante de la toma; "1 kiwi o 90g piña" da a elegir
function dtParse(line) {
  const raw = String(line).trim();
  const vm = raw.match(/^([ab])\)\s*(.*)$/i);
  const text = vm ? vm[2] : raw;
  const parts = text.split(/\s+o\s+/);
  return {
    raw, text,
    variant: vm ? vm[1].toLowerCase() : null,
    opts: parts.length > 1 && parts.every((p) => /^\d/.test(p)) ? parts : null,
    libre: /\blibre\b/i.test(text),
  };
}
const dtVisible = (t) => t.items.map((it, idx) => [it, idx]).filter(([it]) => !it.variant || it.variant === (t.log.var || "a"));
function dtItemText(it, log, idx, firstIfNone) {
  if (!it.opts) return it.text;
  const k = (log.opt || {})[idx];
  return k != null && it.opts[k] ? it.opts[k] : firstIfNone ? it.opts[0] : it.opts.join(" o ");
}

/* ---------- horas: el pre-entreno y la cena se colocan según el entreno del día ---------- */
function dtSessions(date) {
  const out = [];
  let prev = null;
  blocksFor(date).forEach((b, i) => {
    if (b.k === "rest") return;
    let start = hm(b.h), end = null;
    const r = String(b.h || "").match(/[–-]\s*(\d{1,2}[:.]\d{2})/);
    if (r) end = hm(r[1]);
    if (start == null) {
      // "Seguido" va dentro del tramo de la sesión anterior (lunes 20:00–22:30: carrera + natación)
      if (/seguido/i.test(b.h || "") && prev && !prev.explicit) { start = prev.end; end = start + (sxMin(b) || 45); }
      else return;
    }
    const explicit = end != null;
    if (end == null) end = start + (sxMin(b) || 60);
    prev = { i, start, end, explicit };
    out.push(prev);
  });
  return out;
}
function dtTimes(date, dayMenu) {
  const t = {};
  DIET.tomas.forEach((x) => { t[x.id] = hm((menus.horas || {})[x.id] || x.hora); });
  const ss = dtSessions(date).filter((s) => s.start >= (t.comida || 0) + 60);
  if (ss.length) {
    const first = Math.min(...ss.map((s) => s.start)), last = Math.max(...ss.map((s) => s.end));
    const mer = dtTomaDef(dayMenu, "merienda");
    if (mer && /pre/i.test(mer.label || "")) t.merienda = first - 60;
    if (t.cena != null && t.cena < last + 15) t.cena = Math.ceil((last + 15) / 5) * 5;
  }
  return t;
}

/* ---------- las tomas de un día, con su registro ---------- */
function dtDefLines(date, id, rec) {
  const ver = dtVersionFor(date);
  if (!ver) return { label: null, lines: [] };
  const dow = DAYS[IDX.get(date)].dow;
  const def = dtTomaDef(ver.semana[dow], id);
  const log = ((rec || dtRec(date)).tomas || {})[id] || {};
  if (id === "desayuno" && log.alt && ver.semana[log.alt]) {
    const alt = dtTomaDef(ver.semana[log.alt], "desayuno");
    if (alt) return { label: def && def.label, lines: alt.items };
  }
  return { label: def && def.label, lines: def ? def.items : [] };
}
function dtTomas(date) {
  if (date < DIET.desde || !IDX.has(date)) return [];
  const ver = dtVersionFor(date);
  if (!ver) return [];
  const dayMenu = ver.semana[DAYS[IDX.get(date)].dow];
  const rec = dtRec(date);
  const times = dtTimes(date, dayMenu);
  return TOMAS.map((id) => {
    const log = (rec.tomas || {})[id] || {};
    const def = dtDefLines(date, id, rec);
    const lines = log.items || def.lines;
    if (!lines.length) return null;
    return { id, label: def.label || TOMA_LABEL[id], min: times[id], items: lines.map(dtParse), log };
  }).filter(Boolean);
}
const dtRestDay = (date) => !blocksFor(date).some((b) => b.k !== "rest");
function dtRef(date) {
  const ver = dtVersionFor(date);
  return ver && ((menus.ref || {})[ver.id] || {})[DAYS[IDX.get(date)].dow] || null;
}
function dtBreakfastAlts(date) {
  const ver = dtVersionFor(date);
  if (!ver) return [];
  const own = JSON.stringify((dtTomaDef(ver.semana[DAYS[IDX.get(date)].dow], "desayuno") || {}).items || []);
  const seen = new Set([own]);
  return DOWS.map((dow) => {
    const def = dtTomaDef(ver.semana[dow], "desayuno");
    const key = JSON.stringify(def ? def.items : []);
    if (!def || seen.has(key)) return null;
    seen.add(key);
    return { dow, label: `Como el del ${dow.toLowerCase()}` };
  }).filter(Boolean);
}

/* ---------- marcar una toma ---------- */
function dtSetSt(date, id, st) {
  const auto = [];
  dtSave(date, (r) => {
    const t = dtTomaLog(r, id);
    const was = t.st;
    if (was === st) { delete t.st; delete t.items; return; }
    t.st = st;
    t.items = dtDefLines(date, id, r).lines.slice(); // foto del menú de ese día
    if (st === "ok" && was !== "ok") {
      r.sup = r.sup || {};
      const add = id === "cena" ? ["creatina", "magnesio"] : id === "media" ? ["whey"] : [];
      add.forEach((k) => { if (!r.sup[k]) { r.sup[k] = true; auto.push(k); } });
    }
  });
  return auto;
}

/* ---------- lista de la compra ---------- */
const shopKey = (w) => `S${w}`;
function dtShopItems(w) {
  const map = new Map();
  const add = (part) => {
    const p = part.trim().replace(/\s+libre$/i, "");
    if (!p) return;
    const m = p.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|cps)?\s+(.+)$/i);
    if (m) {
      const unit = (m[2] || "").toLowerCase(), name = m[3].trim().replace(/\s+con agua$/i, "");
      const key = `${unit}|${norm(name)}`;
      const cur = map.get(key) || { key, unit, name, qty: 0, n: 0 };
      cur.qty += parseFloat(m[1].replace(",", ".")); cur.n++;
      map.set(key, cur);
    } else {
      const key = `|${norm(p)}`;
      const cur = map.get(key) || { key, unit: null, name: p, qty: null, n: 0 };
      cur.n++;
      map.set(key, cur);
    }
  };
  DAYS.filter((d) => d.w === w).forEach((d) => {
    dtTomas(d.date).forEach((t) => {
      if (t.log.st === "no") return;
      dtVisible(t).forEach(([it, idx]) => {
        const txt = dtItemText(it, t.log, idx, true);
        if (/creatina|bisglicinato|infusi[oó]n|vaso de agua/i.test(txt)) return;
        (txt.includes("(") ? [txt] : txt.split(/,\s*(?=\d)|\s\+\s/)).forEach(add);
      });
    });
  });
  return [...map.values()].sort((a, b) => (a.qty == null) - (b.qty == null) || a.name.localeCompare(b.name, "es"));
}
function dtShopLabel(x) {
  if (x.qty == null) return x.n > 1 ? `${x.name} · ${x.n} días` : x.name;
  const q = Math.round(x.qty * 10) / 10;
  if (!x.unit) return `${q} × ${x.name}`;
  if (x.unit === "g" && q >= 1000) return `${(q / 1000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg ${x.name}`;
  return `${q} ${x.unit} ${x.name}`;
}

/* ---------- textos para la IA ---------- */
function dtTrainLine(date) {
  const bl = blocksFor(date).filter((b) => b.k !== "rest");
  if (!bl.length) return "Descanso";
  return bl.map((b) => `${b.title || KIND_LABEL[b.k] || "Sesión"}${b.d ? ` ${b.d}` : ""}${b.z ? ` (${b.z})` : ""}`).join(" + ");
}
function dtDayBlock(date) {
  const tomas = dtTomas(date), rec = dtRec(date);
  if (!tomas.length && !dtHas(rec)) return null;
  const lines = [dateLabel(date), `Entreno: ${dtTrainLine(date)}`];
  tomas.forEach((t) => {
    const items = dtVisible(t).map(([it, idx]) => dtItemText(it, t.log, idx, false)).join("; ");
    const st = t.log.st, nota = t.log.nota ? `: ${t.log.nota}` : "";
    if (st === "no") lines.push(`- ${t.label}: no la hice (tocaba ${items})`);
    else lines.push(`- ${t.label} (${st === "ok" ? "tal cual" : st === "cambio" ? `con cambios${nota}` : t.log.nota ? `sin marcar, nota${nota}` : "sin marcar"}): ${items}`);
  });
  if (rec.extra) lines.push(`- Fuera del menú: ${rec.extra}`);
  if (rec.agua) lines.push(`- Agua: ${litros(rec.agua)} L`);
  const ref = dtRef(date);
  if (ref && ref.kcal) lines.push(`Referencia: el menú de ese día ronda las ${kcalFmt(ref.kcal)} kcal.`);
  if (rec.kcal) lines.push(`Kcal que ya tengo apuntadas: ${kcalFmt(rec.kcal)}`);
  return lines.join("\n");
}
function dtEatenPrompt(dates) {
  const parts = dates.map(dtDayBlock).filter(Boolean);
  if (!parts.length) return null;
  return [
    "Estima las kilocalorías y los macronutrientes (hidratos, proteína y grasa) de lo que he comido. Sigo un menú pautado por mi nutricionista: te digo qué tocaba en cada toma y cómo me fue.",
    "Entreno para una ultra de 100 km en gravel, así que te paso también el entreno de cada día.",
    "", parts.join("\n\n"), "",
    "Dime las kcal totales de cada día, el reparto aproximado de macros y si encaja con la carga de entreno que llevo. Si te falta información para estimar algo, dime qué necesitas.",
  ].join("\n");
}
function dtMenuPrompt(date) {
  const ver = dtVersionFor(date) || DIET_BASE;
  const days = DOWS.map((dow) => {
    const lines = [`${dow}:`];
    TOMAS.forEach((id) => {
      const def = dtTomaDef(ver.semana[dow], id);
      if (def && def.items.length) lines.push(`- ${def.label || TOMA_LABEL[id]}: ${def.items.join("; ")}`);
    });
    return lines.join("\n");
  });
  return [
    "Calcula las kcal y los macronutrientes aproximados (hidratos, proteína y grasa) de cada día de este menú semanal pautado por mi nutricionista. Cuando haya opciones (\"o\", a/b), usa la primera.",
    "Responde SOLO con estas 7 líneas, sin nada más:",
    DOWS.map((d) => `${d}: 0000 kcal · H 000 g · P 000 g · G 00 g`).join("\n"),
    "", days.join("\n\n"),
  ].join("\n");
}
function dtParseRef(text) {
  const out = {};
  const lines = norm(text).split(/\n+/);
  DOWS.forEach((dow) => {
    const line = lines.find((l) => l.includes(norm(dow)));
    if (!line) return;
    const k = line.match(/(\d[\d.]*)\s*kcal/) || line.match(/:\s*(\d[\d.]{2,})/);
    if (!k) return;
    const num = (re) => { const x = line.match(re); return x ? +x[1].replace(/\./g, "") : null; };
    out[dow] = {
      kcal: +k[1].replace(/\./g, ""),
      h: num(/\bh(?:idratos)?\s*:?\s*(\d+)/), p: num(/\bp(?:rote\w*)?\s*:?\s*(\d+)/), g: num(/\bg(?:rasas?)?\s*:?\s*(\d+)/),
    };
  });
  return out;
}

/* ---------- compartir o copiar ---------- */
async function shareText(text, copyOnly, okMsg = "Copiado") {
  if (!text) { toast("Todavía no hay nada que mandar"); return; }
  if (!copyOnly && navigator.share) {
    try { await navigator.share({ text }); return; }
    catch (err) { if (err && err.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(text); toast(okMsg); return; } catch (err) {}
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
  document.body.appendChild(ta);
  ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (err) {}
  ta.remove();
  toast(ok ? okMsg : "No se ha podido copiar");
}
function autoGrow(el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }
