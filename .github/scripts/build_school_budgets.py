#!/usr/bin/env python3
"""Build data/school-budgets.json from NYSED's School Report Card database.

NYSED publishes per-school expenditure data (ESSA financial transparency)
once a year as an Access database inside SRC{year}.zip. There is no
queryable API for school-level budget data anywhere, so we reduce the
file to a small JSON the site can serve statically.

Table used: "Expenditures per Pupil" — one row per school with federal,
state/local, and combined spending plus per-pupil figures and enrollment.
NYC schools are identified by the county prefix of their 12-digit BEDS
code (30-35 = NYC boroughs and citywide districts).
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import urllib.request
import zipfile

# Newest first; the script uses the first zip that downloads.
CANDIDATES = [
    ("25-26", "SRC2026"),
    ("24-25", "SRC2025"),
    ("23-24", "SRC2024"),
    ("22-23", "SRC2023"),
]
URL_TMPL = "https://data.nysed.gov/files/essa/{span}/{name}.zip"

# BEDS county prefix -> borough letter used in DBNs
COUNTY_TO_BORO = {"31": "M", "32": "X", "33": "K", "34": "Q", "35": "R"}
NYC_PREFIXES = ("30", "31", "32", "33", "34", "35")

OUT_PATH = "data/school-budgets.json"


def download_first_available():
    for span, name in CANDIDATES:
        url = URL_TMPL.format(span=span, name=name)
        try:
            print(f"trying {url} ...", flush=True)
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            print(f"downloaded {len(data)/1e6:.0f} MB from {url}")
            return name, data
        except Exception as e:
            print(f"  not available: {e}")
    sys.exit("no SRC zip could be downloaded")


def extract_mdb(zip_bytes):
    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    names = zf.namelist()
    print("zip contents:", names)
    mdbs = [n for n in names if n.lower().endswith((".mdb", ".accdb"))]
    if not mdbs:
        sys.exit("no Access database found in zip")
    # Prefer the file that holds expenditure data (Group 3 per NYSED docs),
    # fall back to the largest.
    mdbs.sort(key=lambda n: (("3" not in os.path.basename(n)), -zf.getinfo(n).file_size))
    target = mdbs[0]
    print("extracting", target)
    path = "/tmp/src.mdb"
    with open(path, "wb") as f:
        f.write(zf.read(target))
    return path, zf, mdbs


def find_expenditure_table(path):
    tables = subprocess.run(["mdb-tables", "-1", path], capture_output=True,
                            text=True, check=True).stdout.splitlines()
    print("tables:", tables)
    for t in tables:
        if re.search(r"expenditure", t, re.I):
            return t
    return None


def export_rows(path, table):
    out = subprocess.run(["mdb-export", path, table], capture_output=True,
                         text=True, check=True).stdout
    rows = list(csv.DictReader(io.StringIO(out)))
    print(f"{len(rows)} rows in '{table}', columns: {list(rows[0].keys()) if rows else []}")
    return rows


def to_num(v):
    if v is None:
        return None
    v = str(v).strip().replace("$", "").replace(",", "")
    if not v or v.upper() in ("NA", "N/A", "-"):
        return None
    try:
        return round(float(v))
    except ValueError:
        return None


def derive_dbn(beds):
    # 331500010321 -> district 15, Brooklyn (33), school 321 -> 15K321
    if len(beds) != 12:
        return None
    boro = COUNTY_TO_BORO.get(beds[:2])
    if not boro:
        return None
    try:
        district = int(beds[2:6]) // 100
    except ValueError:
        return None
    school = beds[-3:]
    if not (1 <= district <= 99):
        return None
    return f"{district:02d}{boro}{school}"


def main():
    name, blob = download_first_available()
    mdb_path, zf, mdbs = extract_mdb(blob)

    table = find_expenditure_table(mdb_path)
    # The expenditure table may live in a different file of the set.
    if table is None:
        for alt in mdbs[1:]:
            with open("/tmp/alt.mdb", "wb") as f:
                f.write(zf.read(alt))
            table = find_expenditure_table("/tmp/alt.mdb")
            if table:
                mdb_path = "/tmp/alt.mdb"
                print("found expenditure table in", alt)
                break
    if table is None:
        sys.exit("no expenditure table found in any database file")

    rows = export_rows(mdb_path, table)
    cols = {c.upper(): c for c in rows[0].keys()}

    def col(row, *names):
        for n in names:
            c = cols.get(n)
            if c is not None:
                return row.get(c)
        return None

    # The table carries several report years — keep only the newest.
    years = {str(col(r, "YEAR") or "").strip() for r in rows}
    latest = max(y for y in years if y.isdigit())
    print("years present:", sorted(years), "-> using", latest)

    schools, year, seen_beds = [], latest, set()
    for r in rows:
        if str(col(r, "YEAR") or "").strip() != latest:
            continue
        beds = str(col(r, "ENTITY_CD") or "").strip()
        if not beds.startswith(NYC_PREFIXES) or len(beds) != 12:
            continue
        if beds.endswith("0000"):   # district/county aggregate rows
            continue
        if beds in seen_beds:
            continue
        seen_beds.add(beds)
        nm = (col(r, "ENTITY_NAME") or "").strip()
        if not nm:
            continue
        total = to_num(col(r, "FED_STATE_LOCAL_EXP"))
        enroll = to_num(col(r, "PUPIL_COUNT_TOT"))
        entry = {
            "beds": beds,
            "instid": str(col(r, "INSTITUTION_ID") or "").strip() or None,
            "dbn": derive_dbn(beds),
            "name": nm,
            "enroll": enroll,
            "fed": to_num(col(r, "FEDERAL_EXP")),
            "sl": to_num(col(r, "STATE_LOCAL_EXP")),
            "total": total,
            "pp_fed": to_num(col(r, "PER_FEDERAL_EXP")),
            "pp_sl": to_num(col(r, "PER_STATE_LOCAL_EXP")),
            "pp": to_num(col(r, "PER_FED_STATE_LOCAL_EXP")),
        }
        if entry["pp"] is None and total and enroll:
            entry["pp"] = round(total / enroll)
        if total is None and entry["pp"] is None:
            continue
        schools.append(entry)

    if len(schools) < 1000:
        sys.exit(f"only {len(schools)} NYC schools parsed — refusing to publish, "
                 "check the table/columns above")

    schools.sort(key=lambda s: s["name"])
    out = {
        "source": f"NYSED School Report Card ({name})",
        "source_url": "https://data.nysed.gov/downloads.php",
        "year": int(year),
        "count": len(schools),
        "schools": schools,
    }
    os.makedirs("data", exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    size = os.path.getsize(OUT_PATH)
    print(f"wrote {OUT_PATH}: {len(schools)} NYC schools, year {year}, {size/1024:.0f} KB")


if __name__ == "__main__":
    main()
