#!/usr/bin/env python3
"""Ensambla src/ en index.html.

La app tiene que ser un único archivo para funcionar sin cobertura, así que el
código vive repartido en src/ y este script lo junta. Uso:  python3 build.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
CSS = ["base.css", "hoy.css", "stats.css", "dieta.css"]
# stats.js va el último: su arranque puede abrir Estadísticas al cargar (#estadisticas) y necesita todo lo anterior listo
JS = ["core.js", "dieta.js", "plan.js", "dia.js", "menu.js", "editor.js", "stats-dieta.js", "stats.js"]


def data(name, raw=False):
    text = (SRC / "data" / name).read_text()
    if not raw:  # los JSON editables se guardan legibles y se minifican aquí
        text = json.dumps(json.loads(text), ensure_ascii=False, separators=(",", ":"))
    return text.replace("</", "<\\/")


def build():
    page = (SRC / "index.template.html").read_text()
    css = "".join((SRC / "css" / f).read_text() for f in CSS)
    js = "".join((SRC / "js" / f).read_text() for f in JS)
    js = js.replace("__PLAN__", data("plan.json", raw=True), 1)
    if "__DIET__" in js:
        js = js.replace("__DIET__", data("dieta.json"), 1)
    for mark in ("{{CSS}}", "{{JS}}"):
        assert page.count(mark) == 1, f"falta {mark} en la plantilla"
    out = page.replace("{{CSS}}", css).replace("{{JS}}", js)
    assert "__PLAN__" not in out and "__DIET__" not in out
    (ROOT / "index.html").write_text(out)
    return out


if __name__ == "__main__":
    out = build()
    print(f"index.html: {len(out) // 1024} KB")
