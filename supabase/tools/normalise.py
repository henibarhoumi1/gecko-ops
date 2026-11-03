#!/usr/bin/env python3
"""Turns catalog.sql listings into sorted text and compares two of them.

  normalise.py listing <raw listing> <out.tsv>
      One object per line, "section<TAB>key<TAB>value", whitespace collapsed, sorted.

  normalise.py diff <expected.tsv> <live.tsv> --summary <public.md> --full <full.md> [--expect-identical]
      Three lists: in the repository but missing live; live but missing from the repository; present in
      both but different. The summary shows only object names, kinds and short hashes, because GitHub job
      summaries in a public repository can be read by anyone. The full report has the definitions and is
      only ever stored encrypted. With --expect-identical, any difference makes the command fail (used in
      CI, where both sides come from the same migrations).
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

FIELD = "\x1f"
RECORD = "\0"
NOT_COMPARED = {"fact", "source"}
SUMMARY_LIMIT = 300

Listing = dict[tuple[str, str], str]


def _collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_raw(raw: str) -> Listing:
    """Reads psql's unaligned output: fields split by the unit separator, records ended by a zero byte."""
    out: Listing = {}
    for record in raw.split(RECORD):
        record = record.strip("\r\n")
        if not record.strip():
            continue
        fields = record.split(FIELD)
        if len(fields) != 3:
            raise ValueError(f"expected 3 fields, got {len(fields)}: {record[:120]!r}")
        section, key, value = (f.strip("\r\n") for f in fields)
        section, key = _collapse(section), _collapse(key)
        if section == "source":
            value = value.replace("\r", "\\r").replace("\t", "\\t").replace("\n", "\\n")
        else:
            value = _collapse(value)
        if (section, key) in out and out[(section, key)] != value:
            raise ValueError(f"duplicate key with different values: {section} {key}")
        out[(section, key)] = value
    return out


def to_tsv(listing: Listing) -> str:
    return "".join(f"{s}\t{k}\t{v}\n" for (s, k), v in sorted(listing.items()))


def read_tsv(text: str) -> Listing:
    out: Listing = {}
    for line in text.splitlines():
        if not line:
            continue
        section, key, value = line.split("\t", 2)
        out[(section, key)] = value
    return out


def short_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:10]


def compare(expected: Listing, live: Listing):
    exp = {k: v for k, v in expected.items() if k[0] not in NOT_COMPARED}
    liv = {k: v for k, v in live.items() if k[0] not in NOT_COMPARED}
    only_repo = sorted(set(exp) - set(liv))
    only_live = sorted(set(liv) - set(exp))
    different = sorted(k for k in set(exp) & set(liv) if exp[k] != liv[k])
    return exp, liv, only_repo, only_live, different


def _facts(listing: Listing) -> dict[str, str]:
    return {k: v for (s, k), v in listing.items() if s == "fact"}


def _history_line(facts: dict[str, str]) -> str:
    versions = sorted(k.split(" ", 1)[1] for k in facts if k.startswith("history "))
    if not versions:
        return "no migration history table (none recorded)"
    return f"{len(versions)} versions recorded ({versions[0]} to {versions[-1]})"


def _fact_lines(expected: Listing, live: Listing) -> list[str]:
    fe, fl = _facts(expected), _facts(live)
    ve, vl = fe.get("server_version_major", "?"), fl.get("server_version_major", "?")
    lines = [
        f"- PostgreSQL major version: live **{vl}**, expected build **{ve}**"
        + ("" if ve == vl else " (different: rebuild expected on the live version before trusting the diff)"),
        f"- Live migration history: {_history_line(fl)}",
        "- Live extensions: "
        + (", ".join(sorted(k.split(" ", 1)[1] for k in fl if k.startswith("extension "))) or "none"),
        "- Live default grants in public: "
        + (", ".join(sorted(k.split(" ", 1)[1] for k in fl if k.startswith("default_acl "))) or "none"),
    ]
    return lines


def _counts_table(exp: Listing, liv: Listing, only_repo, only_live, different) -> list[str]:
    sections = sorted({s for s, _ in exp} | {s for s, _ in liv})
    rows = ["| Section | Repository | Live | Only in repository | Only live | Different |", "|---|---|---|---|---|---|"]
    for sec in sections:
        rows.append(
            f"| {sec} | {sum(1 for s, _ in exp if s == sec)} | {sum(1 for s, _ in liv if s == sec)} "
            f"| {sum(1 for s, _ in only_repo if s == sec)} | {sum(1 for s, _ in only_live if s == sec)} "
            f"| {sum(1 for s, _ in different if s == sec)} |"
        )
    return rows


def _capped(lines: list[str]) -> list[str]:
    if len(lines) <= SUMMARY_LIMIT:
        return lines
    return lines[:SUMMARY_LIMIT] + [f"- … and {len(lines) - SUMMARY_LIMIT} more (see the encrypted report)"]


def render_summary(expected: Listing, live: Listing) -> str:
    exp, liv, only_repo, only_live, different = compare(expected, live)
    total = len(only_repo) + len(only_live) + len(different)
    out = ["# Schema snapshot: live database vs repository", ""]
    out += [f"**{total} differences**: {len(only_repo)} only in the repository, {len(only_live)} only live, "
            f"{len(different)} different.", ""]
    out += ["## Facts", ""] + _fact_lines(expected, live) + [""]
    out += ["## Counts", ""] + _counts_table(exp, liv, only_repo, only_live, different) + [""]
    out += ["## In the repository, missing live", ""]
    out += _capped([f"- `{s}` {k}" for s, k in only_repo]) or ["- none"]
    out += ["", "## Live, missing from the repository", ""]
    out += _capped([f"- `{s}` {k} (`{short_hash(liv[(s, k)])}`)" for s, k in only_live]) or ["- none"]
    out += ["", "## In both, but different", ""]
    out += _capped([f"- `{s}` {k}: repository `{short_hash(exp[(s, k)])}`, live `{short_hash(liv[(s, k)])}`"
                    for s, k in different]) or ["- none"]
    out += ["", "Names and short hashes only. Definitions are in the encrypted artifact of this run."]
    return "\n".join(out) + "\n"


def _source(listing: Listing, kind: str, key: str) -> str | None:
    value = listing.get(("source", f"{kind} {key}"))
    if value is None:
        return None
    return value.replace("\\n", "\n").replace("\\t", "\t").replace("\\r", "\r").replace("\\\\", "\\")


def render_full(expected: Listing, live: Listing) -> str:
    exp, liv, only_repo, only_live, different = compare(expected, live)
    out = ["# Schema snapshot: full report (confidential)", ""]
    out += ["## Facts", ""] + _fact_lines(expected, live) + [""]
    out += ["## In the repository, missing live", ""]
    out += [f"- `{s}` {k}\n  - repository: `{exp[(s, k)]}`" for s, k in only_repo] or ["- none"]
    out += ["", "## Live, missing from the repository", ""]
    for s, k in only_live:
        out.append(f"- `{s}` {k}\n  - live: `{liv[(s, k)]}`")
        src = _source(live, s, k) if s in ("function", "view") else None
        if src:
            out += ["", "```sql", src, "```", ""]
    if not only_live:
        out.append("- none")
    out += ["", "## In both, but different", ""]
    for s, k in different:
        out.append(f"- `{s}` {k}\n  - repository: `{exp[(s, k)]}`\n  - live: `{liv[(s, k)]}`")
        if s in ("function", "view"):
            for label, listing in (("repository", expected), ("live", live)):
                src = _source(listing, s, k)
                if src:
                    out += ["", f"{label} definition:", "", "```sql", src, "```", ""]
    if not different:
        out.append("- none")
    return "\n".join(out) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p_list = sub.add_parser("listing")
    p_list.add_argument("raw")
    p_list.add_argument("out")
    p_diff = sub.add_parser("diff")
    p_diff.add_argument("expected")
    p_diff.add_argument("live")
    p_diff.add_argument("--summary", required=True)
    p_diff.add_argument("--full")
    p_diff.add_argument("--expect-identical", action="store_true")
    args = parser.parse_args(argv)

    if args.command == "listing":
        listing = parse_raw(Path(args.raw).read_text(encoding="utf-8"))
        Path(args.out).write_text(to_tsv(listing), encoding="utf-8")
        print(f"{len(listing)} lines written to {args.out}")
        return 0

    expected = read_tsv(Path(args.expected).read_text(encoding="utf-8"))
    live = read_tsv(Path(args.live).read_text(encoding="utf-8"))
    Path(args.summary).write_text(render_summary(expected, live), encoding="utf-8")
    if args.full:
        Path(args.full).write_text(render_full(expected, live), encoding="utf-8")
    _, _, only_repo, only_live, different = compare(expected, live)
    total = len(only_repo) + len(only_live) + len(different)
    print(f"{total} differences: {len(only_repo)} only in repository, {len(only_live)} only live, "
          f"{len(different)} different")
    if args.expect_identical and total:
        print("expected no differences", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
