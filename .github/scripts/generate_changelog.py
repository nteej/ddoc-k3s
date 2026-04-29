#!/usr/bin/env python3
"""
Generate a CHANGELOG.md entry from git commits since the last tag.

Usage:
  python3 generate_changelog.py --version v1.2.0 --output CHANGELOG.md --notes /tmp/notes.md
"""

import argparse
import subprocess
import sys
from datetime import datetime, timezone

GROUPS = [
    ("feat",     "Features"),
    ("fix",      "Bug Fixes"),
    ("perf",     "Performance"),
    ("refactor", "Refactoring"),
    ("docs",     "Documentation"),
    ("ci",       "CI/CD"),
    ("chore",    "Chores"),
    ("k8s",      "Infrastructure"),
    ("other",    "Other Changes"),
]

def git(*args):
    return subprocess.run(["git"] + list(args), capture_output=True, text=True).stdout.strip()

def classify(subject):
    s = subject.lower()
    for key, _ in GROUPS:
        if s.startswith(f"{key}:") or s.startswith(f"{key}("):
            return key
    return "other"

def collect_commits(prev_tag):
    ref = f"{prev_tag}..HEAD" if prev_tag else "HEAD"
    raw = git("log", ref, "--pretty=format:%H|%s", "--no-merges")
    commits = []
    for line in raw.splitlines():
        if "|" not in line:
            continue
        sha, subject = line.split("|", 1)
        commits.append((sha[:7], subject.strip()))
    return commits

def build_entry(version, commits):
    buckets = {k: [] for k, _ in GROUPS}
    for sha, subject in commits:
        key = classify(subject)
        buckets[key].append(f"- {subject} ([`{sha}`](../../commit/{sha}))")

    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [f"## [{version}] - {date}\n"]
    for key, title in GROUPS:
        if buckets[key]:
            lines.append(f"\n### {title}\n")
            lines += buckets[key]

    return "\n".join(lines) + "\n"

def update_changelog(path, entry):
    header = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n"
    try:
        with open(path) as f:
            existing = f.read()
    except FileNotFoundError:
        existing = header

    # Insert new entry after header, before previous entries
    if "## [" in existing:
        idx = existing.index("## [")
        content = existing[:idx] + entry + "\n" + existing[idx:]
    else:
        content = existing + "\n" + entry

    with open(path, "w") as f:
        f.write(content)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--output",  default="CHANGELOG.md")
    parser.add_argument("--notes",   default="/tmp/release_notes.md")
    args = parser.parse_args()

    prev_tag = git("describe", "--tags", "--abbrev=0", "HEAD^") or ""
    if prev_tag.startswith("fatal"):
        prev_tag = ""

    commits = collect_commits(prev_tag)
    if not commits:
        print("No commits found since last tag.", file=sys.stderr)
        commits = []

    entry = build_entry(args.version, commits)

    update_changelog(args.output, entry)
    print(f"Updated {args.output}")

    with open(args.notes, "w") as f:
        f.write(entry)
    print(f"Release notes written to {args.notes}")

if __name__ == "__main__":
    main()
