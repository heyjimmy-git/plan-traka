const PLAN = __PLAN__;
const DAYS = PLAN.days;
const WEEKS = PLAN.weeks;
const PHASES = PLAN.phases;
const IDX = new Map(DAYS.map((d, i) => [d.date, i]));
const RACE = "2027-04-12";
const PLAN_WEEKS = 30;
const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const LETTER = { "Lunes":"L", "Martes":"M", "Miércoles":"X", "Jueves":"J", "Viernes":"V", "Sábado":"S", "Domingo":"D" };
const KIND_LABEL = { bike: "Bici", run: "Carrera a pie", swim: "Natación", gym: "Fuerza", rest: "Descanso", other: "Sesión", race: "Carrera" };
const SHORT_PHASE = ["Adaptación", "Base / Volumen", "Navidad", "Específica", "Pico", "Taper"];
const LS_REG = "plan-traka-registro";
const LS_EDIT = "plan-traka-cambios";
const PENCIL = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.8 3.2 14.8 6.2 6.4 14.6 2.8 15.2 3.4 11.6z"/><path d="m10.3 4.7 3 3"/></svg>';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const fmtH = (h) => { const m = Math.round(h * 12) * 5; return m < 60 ? `${m}'` : `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ""}`; };
function fmtRange(a, b) {
  const [, ma, da] = a.split("-").map(Number), [, mb, db] = b.split("-").map(Number);
  if (a === b) return `${da} ${MONTHS[ma - 1]}`;
  return ma === mb ? `${da}–${db} ${MONTHS[mb - 1]}` : `${da} ${MONTHS[ma - 1]}–${db} ${MONTHS[mb - 1]}`;
}
function dateLabel(iso) {
  const d = DAYS[IDX.get(iso)], [, m, dd] = iso.split("-").map(Number);
  return `${d.dow} ${dd} ${MONTHS[m - 1]}`;
}

let todayISO = isoLocal(new Date());
const clampDate = (iso) => IDX.has(iso) ? iso : iso < DAYS[0].date ? DAYS[0].date : DAYS[DAYS.length - 1].date;
let sel = clampDate(todayISO);
const selDay = () => DAYS[IDX.get(sel)];
const phaseOf = (w) => PHASES.find((p) => w >= p.a && w <= p.b) || null;

/* ---------- datos en este móvil ---------- */
function load(key) { try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) { return {}; } }
let store = load(LS_REG);
let cambios = load(LS_EDIT);
let storageOK = true;
function persist() {
  try {
    localStorage.setItem(LS_REG, JSON.stringify(store));
    localStorage.setItem(LS_EDIT, JSON.stringify(cambios));
    localStorage.setItem(LS_FOOD, JSON.stringify(comidas));
    localStorage.setItem(LS_MENU, JSON.stringify(menus));
    localStorage.setItem(LS_SHOP, JSON.stringify(compra));
    storageOK = true;
  } catch (e) { storageOK = false; }
  renderDataMeta();
}
const blocksFor = (date) => cambios[date] || DAYS[IDX.get(date)].b;
const canon = (bs) => JSON.stringify(bs.map((b) => [b.k, b.title || "", b.h || "", b.d || "", b.z || "", b.t || "", b.w || "", b.n || "", (b.tags || []).join("|")]));
function setDayBlocks(date, blocks) {
  if (canon(blocks) === canon(DAYS[IDX.get(date)].b)) delete cambios[date];
  else cambios[date] = blocks;
  persist();
}
function saveLog(patch) {
  store[sel] = Object.assign({}, store[sel] || {}, patch, { actualizado: new Date().toISOString() });
  persist();
  renderLog(); renderStrip(); renderStats();
}

const level = (v) => v == null ? null : v <= 2 ? "g" : v <= 4 ? "a" : "r";
const SEMA = { g: PLAN.semaforo[0], a: PLAN.semaforo[1], r: PLAN.semaforo[2] };
const worstPain = (rec) => rec ? Math.max(rec.rodilla ?? -1, rec.tibial ?? -1) : -1;

