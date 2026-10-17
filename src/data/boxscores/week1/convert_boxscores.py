#!/usr/bin/env python3
"""
Convert stats-app box score CSVs into JSON for Schedule.jsx / BoxscoreModal.jsx.

Usage:
    python convert_boxscores.py <csv_dir> [--schedule schedule.json] [--players players.json]
                                [--out boxscores] [--week N]

For every CSV it:
  * finds the matching game in schedule.json (same two teams + division, either order)
    and uses that exact matchup string as "game" (e.g. "Red vs Green (Boys)")
  * orders team1/team2 to follow the schedule's matchup order
  * writes <out>/week<N>/<slug>.json
"""
import argparse
import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Key put on every stats row so groupStatsByTeam() can group by team.
# If your boxscoreUtils.js groups on a different key, change it here.
TEAM_KEY = "Team"

TEXT_COLS = {"Player Name", "No.", "Time", "+/-"}
RENAME = {"Block": "Blocks", "Steal": "Steals"}  # modal reads p.Blocks / p.Steals
SKIP_ROWS = {"team events", "totals"}


def norm_team(name):
    name = re.sub(r"\s+", " ", name).strip()
    if name.lower() == "grey":  # always Gray
        name = "Gray"
    return name


def tkey(name):
    return norm_team(name).lower()


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def to_value(col, raw):
    raw = raw.strip()
    if col in TEXT_COLS or raw.endswith("%"):
        return raw
    try:
        f = float(raw)
        return int(f) if f.is_integer() else f
    except ValueError:
        return raw


def parse_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))

    # Header block
    matchup_line = rows[1][0].strip()
    date_line = rows[2][0].strip()
    season_type = rows[3][0].strip()

    # Score table: row starting with "," then period labels ... Total
    score_idx = next(i for i, r in enumerate(rows) if r and r[0] == "" and "Total" in r)
    labels = [c.strip() for c in rows[score_idx] if c.strip()]
    periods = labels[:-1]  # drop "Total"
    scores = []
    r = score_idx + 1
    while r < len(rows) and rows[r] and rows[r][0].strip():
        vals = [c.strip() for c in rows[r][1:1 + len(labels)]]
        scores.append((norm_team(rows[r][0]), [int(v) for v in vals]))
        r += 1

    # Team sections
    teams = {}
    i = 0
    while i < len(rows):
        cell = rows[i][0].strip() if rows[i] else ""
        m = re.match(r"^(VISITORS|HOME):\s*(.+)$", cell)
        if m:
            team = norm_team(m.group(2))
            header = [h.strip() for h in rows[i + 1]]
            while header and header[-1] == "":
                header.pop()
            header = [re.sub(r"\s+", " ", h) for h in header]
            players = []
            j = i + 2
            while j < len(rows) and rows[j] and rows[j][0].strip():
                row = rows[j]
                name = row[0].strip()
                if name.lower() not in SKIP_ROWS:
                    rec = {}
                    for col, raw in zip(header, row):
                        key = RENAME.get(col, col)
                        rec[key] = to_value(col, raw)
                    rec[TEAM_KEY] = team
                    players.append(rec)
                j += 1
            teams[team] = players
            i = j
        else:
            i += 1

    return {
        "matchup_line": matchup_line,
        "date": date_line,
        "season_type": season_type,
        "periods": periods,
        "scores": scores,
        "teams": teams,
    }


def detect_division(parsed, players_json):
    """Majority vote: match last names within each team against players.json."""
    votes = {"Boys": 0, "Girls": 0}
    for team, plist in parsed["teams"].items():
        for p in plist:
            last = p["Player Name"].strip().split()[-1].lower()
            # one vote per division per player, even if the roster lists a name twice
            divs = {ref["division"] for ref in players_json["players"]
                    if tkey(ref["team"]) == tkey(team) and ref["last_name"].lower() == last}
            if len(divs) == 1:  # names listed in both divisions say nothing
                votes[divs.pop()] += 1
    if votes["Boys"] == votes["Girls"]:
        raise ValueError(f"cannot determine division (votes: {votes})")
    return max(votes, key=votes.get), votes


def roster_name(raw_name, team, division, players_json):
    """Return the players.json spelling ('F. Last') for a CSV player name.

    Matches on team + division + last name. If the player is not on the roster,
    falls back to '<first initial>. <last token>' and reports it as unmatched."""
    parts = raw_name.strip().split()
    last = parts[-1]
    cands = [ref for ref in players_json["players"]
             if tkey(ref["team"]) == tkey(team) and ref["division"] == division
             and ref["last_name"].lower() == last.lower()]
    # Players sharing a last name (e.g. the two Longs): pick by first initial
    if len({c["first_name"] for c in cands}) > 1:
        cands = [c for c in cands if c["first_name"][0].lower() == parts[0][0].lower()] or cands
    if cands:
        return f"{cands[0]['first_name']} {cands[0]['last_name']}", True
    return f"{parts[0][0].upper()}. {last}", False


def build_game(parsed, schedule, players_json, week_override=None):
    division, votes = detect_division(parsed, players_json)
    unmatched = []
    for team, plist in parsed["teams"].items():
        for p in plist:
            new, found = roster_name(p["Player Name"], team, division, players_json)
            if not found:
                unmatched.append(f"{team}: '{p['Player Name']}' (#{p['No.']}) not in players.json, used '{new}'")
            p["Player Name"] = new
    names = [s[0] for s in parsed["scores"]]
    pair = {tkey(n) for n in names}

    # Week from the CSV date ("10/11/26, 5:56 PM" -> "October 11")
    dt = datetime.strptime(parsed["date"].split(",")[0].strip(), "%m/%d/%y")
    date_label = f"{dt.strftime('%B')} {dt.day}"
    week_entry = None
    for w in schedule:
        if week_override is not None and w["week"] == week_override:
            week_entry = w
        elif week_override is None and w["date"] == date_label:
            week_entry = w
    if week_entry is None:
        raise ValueError(f"no schedule week for date {date_label}")

    game = None
    for g in week_entry["games"]:
        m = re.match(r"^(.+?) vs (.+?) \((Boys|Girls)\)$", g["matchup"])
        if not m:
            continue
        a, b, div = m.groups()
        if div == division and {tkey(a), tkey(b)} == pair:
            game = g
            first = tkey(a)
            break
    if game is None:
        raise ValueError(f"{names} ({division}) not found in week {week_entry['week']}")

    # team1 = first team in the schedule's matchup string
    ordered = sorted(parsed["scores"], key=lambda s: 0 if tkey(s[0]) == first else 1)

    periods = parsed["periods"]
    n_reg = 4
    team_scores = []
    for name, vals in ordered:
        per = vals[:-1]
        final = vals[-1]
        t = {"name": name}
        for idx, v in enumerate(per[:n_reg], start=1):
            t[f"q{idx}"] = v
        t["half1"] = sum(per[0:2])
        t["half2"] = sum(per[2:4])
        for k, v in enumerate(per[n_reg:], start=1):
            t[f"OT{k}"] = v
        t["final"] = final
        team_scores.append(t)

    stats = []
    for t in team_scores:
        stats.extend(parsed["teams"][t["name"]])

    result = {
        "game": game["matchup"],
        "week": week_entry["week"],
        "date": f"{week_entry['date']}, {dt.year}",
        "time": game["time"],
        "division": division,
        "scores": {"team1": team_scores[0], "team2": team_scores[1]},
        "stats": stats,
    }

    # Sanity: player points must add up to each team's final
    warnings = list(unmatched)
    for t in team_scores:
        pts = sum(p["Points"] for p in parsed["teams"][t["name"]])
        if pts != t["final"]:
            warnings.append(f"{t['name']}: players sum to {pts}, final is {t['final']}")
    return result, votes, warnings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_dir")
    ap.add_argument("--schedule", default="schedule.json")
    ap.add_argument("--players", default="players.json")
    ap.add_argument("--out", default="boxscores")
    ap.add_argument("--week", type=int, default=None)
    args = ap.parse_args()

    schedule = json.load(open(args.schedule, encoding="utf-8"))
    players_json = json.load(open(args.players, encoding="utf-8"))

    ok = True
    for path in sorted(Path(args.csv_dir).glob("*.csv")):
        try:
            parsed = parse_csv(path)
            result, votes, warnings = build_game(parsed, schedule, players_json, args.week)
        except Exception as exc:  # report and keep going
            print(f"FAIL  {path.name}: {exc}")
            ok = False
            continue
        out_dir = Path(args.out) / f"week{result['week']}"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{slug(result['game'])}.json"
        out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        t1, t2 = result["scores"]["team1"], result["scores"]["team2"]
        print(f"OK    {path.name}\n      -> {out_path}  [{result['game']}  {t1['name']} {t1['final']} - {t2['name']} {t2['final']}]  votes={votes}")
        for w in warnings:
            print(f"      WARN {w}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
