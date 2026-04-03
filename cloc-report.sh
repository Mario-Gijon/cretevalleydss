#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="reports/cloc"
mkdir -p "$OUT_DIR"

TARGETS=(Frontend Backend ApiModels)

EXCLUDE_DIRS="node_modules,.git,dist,build,coverage,.next,out,.turbo,__pycache__,env-server,venv,.venv,env"
NOT_MATCH_F='(vite\.config\.js|tsconfig\.json|requirements\.txt|function_calls_example\.txt|\.gitignore|\.env(\..*)?|Dockerfile.*|.*\.dockerfile|.*\.sh)$'
INCLUDE_EXT="js,jsx,ts,tsx,py,mjs,cjs"

echo "Generando reporte por lenguaje..."
cloc "${TARGETS[@]}" \
  --csv \
  --quiet \
  --hide-rate \
  --report-file="$OUT_DIR/by_language.csv" \
  --include-ext="$INCLUDE_EXT" \
  --exclude-dir="$EXCLUDE_DIRS" \
  --not-match-f="$NOT_MATCH_F"

echo "Generando reporte por fichero..."
cloc "${TARGETS[@]}" \
  --by-file \
  --csv \
  --quiet \
  --hide-rate \
  --report-file="$OUT_DIR/by_file.csv" \
  --include-ext="$INCLUDE_EXT" \
  --exclude-dir="$EXCLUDE_DIRS" \
  --not-match-f="$NOT_MATCH_F"

echo "Generando CSV de totales..."
python3 - <<'PY'
import csv
from pathlib import Path

base = Path("reports/cloc")
src = base / "by_language.csv"
dst = base / "totals.csv"

with src.open("r", encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    rows = list(reader)

header_idx = None
sum_idx = None

for i, row in enumerate(rows):
    normalized = [cell.strip().lower() for cell in row]

    if normalized[:5] == ["files", "language", "blank", "comment", "code"]:
        header_idx = i
        continue

    if header_idx is not None and len(row) >= 5 and row[1].strip().upper() == "SUM":
        sum_idx = i
        break

if header_idx is None:
    raise SystemExit("No se encontró la cabecera CSV en by_language.csv")

if sum_idx is None:
    raise SystemExit("No se encontró la fila SUM en by_language.csv")

sum_row = rows[sum_idx]

with dst.open("w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["metric", "value"])
    writer.writerow(["files", sum_row[0]])
    writer.writerow(["blank", sum_row[2]])
    writer.writerow(["comment", sum_row[3]])
    writer.writerow(["code", sum_row[4]])

print(f"Totales guardados en {dst}")
PY

echo
echo "Listo. Archivos generados en: $OUT_DIR"
echo "  - by_language.csv"
echo "  - by_file.csv"
echo "  - totals.csv"