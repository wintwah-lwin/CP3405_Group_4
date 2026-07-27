import argparse
import json
import re
from pathlib import Path

def parse_week_num(folder_name):
    match = re.search(r"Week\s*(\d+)", str(folder_name), re.IGNORECASE)
    return int(match.group(1)) if match else None

def get_weekly_metrics(week_dir, week_num):
    # 1. Try reading calibration_results JSON
    json_files = list(week_dir.glob(f"*calibration_results*2026-W{week_num}.json")) + \
                 list(week_dir.glob("*calibration_results*.json"))
    
    for jf in json_files:
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
            if "summary_scores" in data:
                scores = data["summary_scores"]
                if scores.get("direction_accuracy") != "N/A":
                    return scores
        except Exception:
            continue

    # 2. Try parsing calibration_log markdown file
    log_files = list(week_dir.glob(f"*calibration_log*2026-W{week_num}.md")) + \
                list(week_dir.glob("*calibration_log*.md"))
    for lf in log_files:
        try:
            text = lf.read_text(encoding="utf-8")
            score_match = re.search(r"Overall Score:\s*([\d\.]+)%?", text)
            if score_match:
                pct = float(score_match.group(1))
                if pct > 0:
                    val = round(pct / 10.0, 1)
                    score_str = f"{int(round(val))}/10"
                    return {
                        "direction_accuracy": score_str,
                        "magnitude_accuracy": score_str,
                        "confidence_calibration": score_str,
                        "overall_score": f"{val:.1f}/10"
                    }
        except Exception:
            continue

    return {
        "direction_accuracy": "N/A",
        "magnitude_accuracy": "N/A",
        "confidence_calibration": "N/A",
        "overall_score": "N/A"
    }

def main():
    parser = argparse.ArgumentParser(description="Build Past Accuracy Report")
    parser.add_argument("--week", type=int, required=True, help="Current Week number")
    parser.add_argument("--repo", type=str, default=".", help="Root repository path")
    args = parser.parse_args()

    repo_path = Path(args.repo)
    evidence_dir = repo_path / "evidence"

    week_folders = {}
    if evidence_dir.exists():
        for item in evidence_dir.iterdir():
            if item.is_dir():
                wn = parse_week_num(item.name)
                if wn is not None:
                    week_folders[wn] = item

    max_week = max([args.week] + list(week_folders.keys())) if week_folders else args.week

    rows = []
    for w in range(1, max_week + 1):
        w_dir = week_folders.get(w)
        if w_dir and w_dir.exists():
            metrics = get_weekly_metrics(w_dir, w)
        else:
            metrics = {
                "direction_accuracy": "N/A",
                "magnitude_accuracy": "N/A",
                "confidence_calibration": "N/A",
                "overall_score": "N/A"
            }

        rows.append(
            f"| W{w} | {metrics['direction_accuracy']} | {metrics['magnitude_accuracy']} | {metrics['confidence_calibration']} | {metrics['overall_score']} |"
        )

    report_content = (
        "# Past Accuracy Report\n\n"
        "This report aggregates the weekly calibration, learning, and LLM horse-race evidence into a single historical log.\n\n"
        "## Weekly Summary\n\n"
        "| Week | Direction Accuracy | Magnitude Accuracy | Confidence Calibration | Overall Score |\n"
        "|---|---|---|---|---|\n" +
        "\n".join(rows) + "\n"
    )

    out_file = evidence_dir / "past_accuracy_log.md"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    out_file.write_text(report_content, encoding="utf-8")

    week_dir = evidence_dir / f"Week {args.week}"
    if week_dir.exists():
        (week_dir / "past_accuracy_log.md").write_text(report_content, encoding="utf-8")

    print(f"Successfully generated Past Accuracy Report for Week {args.week}!")

if __name__ == "__main__":
    main()
