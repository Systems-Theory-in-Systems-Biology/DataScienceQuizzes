#!/usr/bin/env python3
"""Wandelt die Excel-Fragen in fragen/fragen.js um (ersetzt die Bibliothek SheetJS).

Benutzung:  python3 convert_fragen.py  Fragen1.xlsx [Fragen2.xlsx ...]
Voraussetzung: pip install openpyxl
Der Dateiname ist der Name des Fragenblocks (Unterstriche -> Leerzeichen).
Gelesen wird das Tabellenblatt "quiz_export" (Gross-/Kleinschreibung egal).
"""
import json, os, sys
import openpyxl

SHEET_NAME = "quiz_export"
OUT = os.path.join("fragen", "fragen.js")

def clean(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v

def main(files):
    data = {}
    for path in files:
        wb = openpyxl.load_workbook(path, data_only=True)
        name = next((n for n in wb.sheetnames if n.strip().lower() == SHEET_NAME), None)
        if name is None:
            sys.exit(f'{path}: Tabellenblatt "{SHEET_NAME}" fehlt')
        rows = [[clean(c) for c in r] for r in wb[name].iter_rows(values_only=True)]
        block = os.path.splitext(os.path.basename(path))[0].replace("_", " ").strip()
        data[block] = rows
        print(f"{block}: {len(rows) - 1} Zeilen")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// automatisch erzeugt von convert_fragen.py – nicht von Hand ändern\n")
        f.write("window.QUESTION_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    print("geschrieben:", OUT)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
