#!/usr/bin/env python3
"""Split a multi-document YAML stream into individual files.

Usage: split-yaml.py <input.yaml> <output-dir>

Each document is written to <output-dir>/<kind>-<name>.yaml.
Documents without kind/name are silently skipped.
"""
import sys
import os
import re


def main():
    if len(sys.argv) != 3:
        sys.exit(f"Usage: {sys.argv[0]} <input.yaml> <outdir>")

    infile, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)

    with open(infile) as f:
        content = f.read()

    # Split on YAML document separators
    docs = re.split(r'\n---[ \t]*\n', "\n" + content)

    for doc in docs:
        doc = doc.strip()
        if not doc:
            continue

        kind_m = re.search(r'^kind:\s+(\S+)', doc, re.MULTILINE)
        name_m = re.search(r'^\s{2}name:\s+(\S+)', doc, re.MULTILINE)
        if not kind_m or not name_m:
            continue

        kind = kind_m.group(1).lower()
        name = name_m.group(1).lower()
        fname = os.path.join(outdir, f"{kind}-{name}.yaml")
        with open(fname, "w") as f:
            f.write(doc + "\n")


if __name__ == "__main__":
    main()
