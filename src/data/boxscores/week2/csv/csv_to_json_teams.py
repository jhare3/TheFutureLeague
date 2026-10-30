import csv
import json

def convert_basketball_csv_to_json(csv_file_path, json_file_path):
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines()]
    
    game_name = lines[1] if len(lines) > 1 else "Unknown Game"
    date_str = lines[2] if len(lines) > 2 else ""
    
    # Parse scores & team names
    scores = {"team1": {}, "team2": {}}
    score_headers = []
    
    for i, line in enumerate(lines[:15]):
        if ',Total' in line or (',' in line and '1' in line and 'Total' in line):
            score_headers = [h.strip() for h in line.split(',')]
            if i + 1 < len(lines):
                t1_data = [x.strip() for x in lines[i+1].split(',')]
                t1_name = t1_data[0]
                scores["team1"]["name"] = t1_name
                for h_idx in range(1, len(score_headers)):
                    if h_idx < len(t1_data):
                        scores["team1"][score_headers[h_idx]] = t1_data[h_idx]
            
            if i + 2 < len(lines):
                t2_data = [x.strip() for x in lines[i+2].split(',')]
                t2_name = t2_data[0]
                scores["team2"]["name"] = t2_name
                for h_idx in range(1, len(score_headers)):
                    if h_idx < len(t2_data):
                        scores["team2"][score_headers[h_idx]] = t2_data[h_idx]
            break

    # Parse player stats categorized by team (Visitors vs Home)
    all_stats = []
    
    visitors_name = scores.get("team1", {}).get("name", "Visitors")
    home_name = scores.get("team2", {}).get("name", "Home")
    
    current_team_name = None
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('VISITORS:'):
            current_team_name = visitors_name
            i += 1
            if i < len(lines):
                headers = [h.strip() for h in lines[i].split(',')]
                i += 1
                while i < len(lines) and lines[i] and not lines[i].startswith('VISITORS:') and not lines[i].startswith('HOME:'):
                    row_vals = [x.strip() for x in lines[i].split(',')]
                    if row_vals[0] in ['Team Events', 'Totals', 'Team Totals']:
                        i += 1
                        continue
                    if len(row_vals) > 1 and row_vals[0]:
                        player_name_raw = row_vals[0]
                        player_no = row_vals[1] if len(row_vals) > 1 else ""
                        if player_no and not player_no.startswith('#') and player_no.isdigit():
                            player_name = f"#{player_no} {player_name_raw}"
                        elif player_no and player_no.startswith('#'):
                            player_name = f"{player_no} {player_name_raw}"
                        else:
                            player_name = player_name_raw
                        
                        stat_obj = {"Player Name": player_name, "Team": current_team_name}
                        for h_idx in range(2, len(headers)):
                            if h_idx < len(row_vals):
                                h_name = headers[h_idx]
                                if h_name == 'Block': h_name = 'Blocks'
                                if h_name == 'Deflection': h_name = 'Deflections'
                                if h_name == 'Steal': h_name = 'Steals'
                                if h_name == 'T-over': h_name = 'Turnovers'
                                if h_name == 'Chrg Tkn': h_name = 'Charge Taken'
                                stat_obj[h_name] = row_vals[h_idx]
                        all_stats.append(stat_obj)
                    i += 1
        elif line.startswith('HOME:'):
            current_team_name = home_name
            i += 1
            if i < len(lines):
                headers = [h.strip() for h in lines[i].split(',')]
                i += 1
                while i < len(lines) and lines[i] and not lines[i].startswith('VISITORS:') and not lines[i].startswith('HOME:'):
                    row_vals = [x.strip() for x in lines[i].split(',')]
                    if row_vals[0] in ['Team Events', 'Totals', 'Team Totals']:
                        i += 1
                        continue
                    if len(row_vals) > 1 and row_vals[0]:
                        player_name_raw = row_vals[0]
                        player_no = row_vals[1] if len(row_vals) > 1 else ""
                        if player_no and not player_no.startswith('#') and player_no.isdigit():
                            player_name = f"#{player_no} {player_name_raw}"
                        elif player_no and player_no.startswith('#'):
                            player_name = f"{player_no} {player_name_raw}"
                        else:
                            player_name = player_name_raw
                        
                        stat_obj = {"Player Name": player_name, "Team": current_team_name}
                        for h_idx in range(2, len(headers)):
                            if h_idx < len(row_vals):
                                h_name = headers[h_idx]
                                if h_name == 'Block': h_name = 'Blocks'
                                if h_name == 'Deflection': h_name = 'Deflections'
                                if h_name == 'Steal': h_name = 'Steals'
                                if h_name == 'T-over': h_name = 'Turnovers'
                                if h_name == 'Chrg Tkn': h_name = 'Charge Taken'
                                stat_obj[h_name] = row_vals[h_idx]
                        all_stats.append(stat_obj)
                    i += 1
        else:
            i += 1

    output_data = {
        "game": game_name,
        "date": date_str,
        "scores": scores,
        "stats": all_stats
    }

    with open(json_file_path, 'w', encoding='utf-8') as out_f:
        json.dump(output_data, out_f, indent=2)

def batch_convert():
    import os
    import glob
    
    # Automatically find all CSV files in the current folder
    files_to_convert = glob.glob("*.csv")
    
    if not files_to_convert:
        print("No CSV files found in this directory.")
        return
        
    for csv_file in files_to_convert:
        # Clean up the string to match the team1_vs_team2_date_time format
        clean_name = csv_file.replace('.csv', '')
        clean_name = clean_name.replace(' vs. ', '_vs_').replace(' vs ', '_vs_')
        clean_name = clean_name.replace(' , ', '_').replace(', ', '_')
        clean_name = clean_name.replace(' ', '_').replace('/', '_')
        # Clean up any trailing or double underscores
        while '__' in clean_name:
            clean_name = clean_name.replace('__', '_')
        clean_name = clean_name.strip('_')
        
        json_file = clean_name + '.json'
        
        print(f"Converting '{csv_file}' -> '{json_file}'")
        convert_basketball_csv_to_json(csv_file, json_file)

if __name__ == "__main__":
    batch_convert()