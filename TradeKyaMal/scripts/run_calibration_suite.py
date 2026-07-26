import argparse
import json
import re
import fnmatch
import shutil
from datetime import datetime
from pathlib import Path
import yfinance as yf

OUTPUT_DIR = Path("evidence")
REPORT_MD = "calibration_report_2026-W{week}.md"
RESULTS_JSON = "calibration_results_2026-W{week}.json"
HISTORY_JSON = "calibration_history.json"
PAST_ACCURACY_MD = "past_accuracy_log.md"

TICKERS = {
    "SPX": "^GSPC",
    "NDX": "^NDX",
    "IWM": "IWM",
    "Technology": "XLK",
    "Financials": "XLF",
    "Healthcare": "XLV",
    "Energy": "XLE",
    "Industrials": "XLI",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Materials": "XLB",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Communication Services": "XLC"
}

def find_file(folder, patterns):
    if not folder or not folder.exists():
        return None
    for pattern in patterns:
        for f in folder.glob("*"):
            if fnmatch.fnmatch(f.name.lower(), pattern.lower()):
                return f
    return None

def read_file(path):
    try:
        return Path(path).read_text(encoding="utf-8")
    except Exception:
        return ""

def load_prediction_files(repo_path, week):
    evidence_root = repo_path / "evidence"
    evidence = evidence_root / f"Week {week}"
    prior_evidence = evidence_root / f"Week {week - 1}" if week > 1 else None

    folders = []
    if evidence.exists():
        folders.append(evidence)
    if evidence_root.exists():
        folders.append(evidence_root)

    patterns = {
        "Macro": [
            f"macro_agent_2026-W{week}.md",
            f"*macro*w{week}*.md",
            f"*macro*.md"
        ],
        "Almanac": [
            f"almanac_agent_2026-W{week}.md",
            f"*almanac*w{week}*.md",
            f"*almanac*.md"
        ],
        "Technical": [
            f"technical_agent_2026-W{week}.md",
            f"*technical*w{week}*.md",
            f"*technical*.md"
        ],
        "LLM": [
            f"llm_integration_2026-W{week}.md",
            f"*llm*w{week}*.md",
            f"*llm*.md"
        ],
        "Human": [
            f"human_score_2026-W{week}.md",
            f"*human*w{week}*.md",
            f"*human*.md"
        ],
    }

    loaded = {}

    for key, pats in patterns.items():
        for folder in folders:
            f = find_file(folder, pats)
            if f:
                loaded[key] = {
                    "path": str(f),
                    "text": read_file(f),
                }
                break

    if prior_evidence and prior_evidence.exists():
        prior_final = find_file(
            prior_evidence,
            [
                f"final_prediction_2026-W{week - 1}.md",
                f"*final_prediction*w{week - 1}*.md",
                f"*final*w{week - 1}*.md"
            ]
        )
        if prior_final:
            loaded["Final Prediction"] = {
                "path": str(prior_final),
                "text": read_file(prior_final),
            }

    return loaded

def parse_direction(text):
    if not text:
        return "Unknown"
    text_lower = text.lower()
    if "bullish" in text_lower and "bearish" not in text_lower:
        return "Bullish"
    elif "bearish" in text_lower and "bullish" not in text_lower:
        return "Bearish"
    elif "neutral-bullish" in text_lower or "neutral bullish" in text_lower:
        return "Neutral-Bullish"
    elif "neutral-bearish" in text_lower or "neutral bearish" in text_lower:
        return "Neutral-Bearish"
    elif "neutral" in text_lower:
        return "Neutral"
    return "Unknown"

def extract_predictions(loaded_files):
    predictions = {}
    
    for key in ["Macro", "Almanac", "Technical", "Human", "Final Prediction"]:
        if key in loaded_files:
            predictions[key] = parse_direction(loaded_files[key]["text"])
        else:
            predictions[key] = "Unknown"

    if "LLM" in loaded_files:
        text = loaded_files["LLM"]["text"]
        gpt_match = re.search(r"GPT.*?:?\s*(Bullish|Bearish|Neutral-Bullish|Neutral-Bearish|Neutral)", text, re.IGNORECASE)
        gemini_match = re.search(r"Gemini.*?:?\s*(Bullish|Bearish|Neutral-Bullish|Neutral-Bearish|Neutral)", text, re.IGNORECASE)
        
        predictions["GPT"] = gpt_match.group(1).title() if gpt_match else parse_direction(text)
        predictions["Gemini"] = gemini_match.group(1).title() if gemini_match else parse_direction(text)
    else:
        predictions["GPT"] = "Unknown"
        predictions["Gemini"] = "Unknown"

    return predictions

def fetch_market_data():
    actuals = {}
    for name, ticker in TICKERS.items():
        try:
            data = yf.Ticker(ticker).history(period="5d")
            if not data.empty and len(data) >= 2:
                start_val = round(data["Close"].iloc[0], 2)
                end_val = round(data["Close"].iloc[-1], 2)
                change_pct = round(((end_val - start_val) / start_val) * 100, 2)
                
                if change_pct > 0.2:
                    direction = "Bullish"
                elif change_pct < -0.2:
                    direction = "Bearish"
                else:
                    direction = "Neutral"

                actuals[name] = {
                    "start": start_val,
                    "end": end_val,
                    "change_pct": change_pct,
                    "direction": direction
                }
            else:
                actuals[name] = {"start": 0.0, "end": 0.0, "change_pct": 0.0, "direction": "Unknown"}
        except Exception:
            actuals[name] = {"start": 0.0, "end": 0.0, "change_pct": 0.0, "direction": "Unknown"}
            
    return actuals

def score_calibration(predictions, actuals):
    core_assets = ["SPX", "NDX", "IWM"]
    results = {}

    for pred_key, pred_val in predictions.items():
        rows = []
        correct = 0
        partial = 0
        wrong = 0
        no_score = 0

        for asset in core_assets:
            actual_dir = actuals.get(asset, {}).get("direction", "Unknown")
            change_pct = actuals.get(asset, {}).get("change_pct", 0.0)

            if pred_val == "Unknown" or actual_dir == "Unknown":
                res = "No Score"
                score = 0
                no_score += 1
            elif pred_val == actual_dir:
                res = "Correct"
                score = 100
                correct += 1
            elif "Neutral" in pred_val or "Neutral" in actual_dir:
                res = "Partial"
                score = 50
                partial += 1
            else:
                res = "Wrong"
                score = 0
                wrong += 1

            rows.append({
                "asset": asset,
                "prediction": pred_val,
                "actual_direction": actual_dir,
                "actual_change_pct": change_pct,
                "result": res,
                "score": score
            })

        total_scored = correct + partial + wrong
        accuracy = round(((correct + (0.5 * partial)) / total_scored * 100), 1) if total_scored > 0 else 0.0

        results[pred_key] = {
            "prediction": pred_val,
            "rows": rows,
            "correct": correct,
            "partial": partial,
            "wrong": wrong,
            "no_score": no_score,
            "accuracy": accuracy
        }

    return results

def compute_summary_scores(predictions, calibration_results):
    final_res = calibration_results.get("Final Prediction", {})
    correct = final_res.get("correct", 0)
    partial = final_res.get("partial", 0)
    wrong = final_res.get("wrong", 0)
    total = correct + partial + wrong

    has_valid_data = total > 0 and predictions.get("Final Prediction") != "Unknown"

    if has_valid_data:
        dir_val = int(round(((correct + 0.5 * partial) / total) * 10))
        mag_val = int(round((correct / total) * 10))
        
        valid_preds = [v for k, v in predictions.items() if v != "Unknown"]
        agreement = sum(1 for v in valid_preds if v == predictions.get("Final Prediction"))
        conf_val = int(round((agreement / max(1, len(valid_preds))) * 10))
        
        overall_val = round((dir_val + mag_val + conf_val) / 3.0, 1)

        return {
            "direction_accuracy": f"{dir_val}/10",
            "magnitude_accuracy": f"{mag_val}/10",
            "confidence_calibration": f"{conf_val}/10",
            "overall_score": f"{overall_val:.1f}/10"
        }
    else:
        return {
            "direction_accuracy": "N/A",
            "magnitude_accuracy": "N/A",
            "confidence_calibration": "N/A",
            "overall_score": "N/A"
        }

def update_history(repo_path, week, calibration_results, summary_scores):
    hist_file = repo_path / "evidence" / HISTORY_JSON
    history = {}
    if hist_file.exists():
        try:
            history = json.loads(hist_file.read_text(encoding="utf-8"))
        except Exception:
            history = {}

    w_key = f"W{week}"
    history[w_key] = {
        "summary_scores": summary_scores,
        "predictors": {}
    }
    for pred, data in calibration_results.items():
        history[w_key]["predictors"][pred] = {
            "prediction": data["prediction"],
            "accuracy": data["accuracy"],
            "correct": data["correct"],
            "partial": data["partial"],
            "wrong": data["wrong"],
            "no_score": data["no_score"]
        }

    hist_file.parent.mkdir(parents=True, exist_ok=True)
    hist_file.write_text(json.dumps(history, indent=2), encoding="utf-8")
    return history

def generate_report_md(week, actuals, predictions, calibration_results, history, loaded_files):
    now_str = datetime.now().strftime("%d %B %Y, %I:%M %p")
    
    lines = [
        f"# Calibration Suite Report — W{week}\n",
        f"**Generated:** {now_str}  ",
        f"**Mode:** Test mode uses latest available market data. Re-run after Friday market close for final W{week} calibration.  \n",
        "---\n",
        "## 1. Actual Market Outcomes\n",
        "| Asset | Start | End | Change % | Actual Direction |",
        "|---|---:|---:|---:|---|"
    ]

    for asset, data in actuals.items():
        lines.append(f"| {asset} | {data['start']} | {data['end']} | {data['change_pct']:+.2f}% | {data['direction']} |")

    lines.extend([
        "\n---",
        "\n## 2. Extracted Predictions\n",
        "| Predictor | Extracted Direction |",
        "|---|---|"
    ])
    for pred, val in predictions.items():
        lines.append(f"| {pred} | {val} |")

    lines.extend([
        "\n---",
        "\n## 3. Calibration Leaderboard\n",
        "| Rank | Predictor | Prediction | Correct | Partial | Wrong | Accuracy |",
        "|---:|---|---|---:|---:|---:|---:|"
    ])

    sorted_predictors = sorted(calibration_results.items(), key=lambda x: x[1]['accuracy'], reverse=True)
    for idx, (pred, res) in enumerate(sorted_predictors, 1):
        lines.append(f"| {idx} | {pred} | {res['prediction']} | {res['correct']} | {res['partial']} | {res['wrong']} | {res['accuracy']:.1f}% |")

    best_p = sorted_predictors[0][0] if sorted_predictors else "N/A"
    worst_p = sorted_predictors[-1][0] if sorted_predictors else "N/A"
    lines.append(f"\n**Best Performer:** {best_p}  ")
    lines.append(f"**Lowest Performer:** {worst_p}\n")

    lines.extend(["---", "\n## 4. Detailed Directional Accuracy\n"])
    for pred, res in calibration_results.items():
        lines.append(f"### {pred}\n")
        lines.append("| Asset | Prediction | Actual | Change % | Result | Score |")
        lines.append("|---|---|---|---:|---|---:|")
        for row in res["rows"]:
            lines.append(f"| {row['asset']} | {row['prediction']} | {row['actual_direction']} | {row['actual_change_pct']:+.2f}% | {row['result']} | {row['score']} |")
        lines.append(f"\n**Accuracy:** {res['accuracy']:.1f}%\n")

    lines.extend([
        "\n---",
        "\n## 5. Files Used\n"
    ])
    for key, f_info in loaded_files.items():
        lines.append(f"- **{key}:** `{f_info['path']}`")

    return "\n".join(lines)

def generate_calibration_log(week, predictions, calibration_results, actuals):
    spx = actuals.get("SPX", {})
    ndx = actuals.get("NDX", {})
    iwm = actuals.get("IWM", {})
    final_acc = calibration_results.get("Final Prediction", {}).get("accuracy", 0.0)

    return f"""# Calibration Log – Week {week}

## Team Forecast

Overall View:
{predictions.get('Final Prediction', 'Unknown')}

Confidence:
Medium

## Actual Outcome

SPX: {spx.get('change_pct', 0.0):+.2f}%
NDX: {ndx.get('change_pct', 0.0):+.2f}%
IWM: {iwm.get('change_pct', 0.0):+.2f}%

## Calibration Assessment

Direction:
{"Needs Review" if final_acc < 50 else "Aligned"}

The final directional view was compared with the realized weekly move in SPX, NDX and IWM.

Confidence:
Reasonable

## Calibration Score

Overall Score: {final_acc:.1f}%

## Related Evidence

- Learning Log: learning_log_2026-W{week}.md
- LLM Horse Race: llm_horserace_2026-W{week}.md
"""

def generate_learning_log(week, predictions, actuals):
    spx = actuals.get("SPX", {})
    ndx = actuals.get("NDX", {})
    iwm = actuals.get("IWM", {})

    return f"""# Learning Log – Week {week}

## What We Believed

The team expected the market to remain broadly directional with a {predictions.get('Final Prediction', 'Unknown')} bias.

## What Happened

The weekly actual performance settled at:

- SPX: {spx.get('change_pct', 0.0):+.2f}%
- NDX: {ndx.get('change_pct', 0.0):+.2f}%
- IWM: {iwm.get('change_pct', 0.0):+.2f}%

## What We Learned

1. Directional bias should be anchored to the broader weekly trend rather than isolated news reactions.
2. Model agreement matters, especially when both LLM and human inputs point to the same market regime.

## What We Will Change Next Week

- Re-run calibration after weekly market close.
- Ensure all evidence files are named according to the 2026-W# standard.
"""

def generate_llm_horserace(week, calibration_results):
    gpt_acc = calibration_results.get("GPT", {}).get("accuracy", 0.0)
    gem_acc = calibration_results.get("Gemini", {}).get("accuracy", 0.0)
    winner = "GPT" if gpt_acc >= gem_acc else "Gemini"

    return f"""# LLM Horse Race – Week {week}

## Final Ranking

### 1. GPT
- Accuracy: {gpt_acc:.1f}%
- Extracted Bias: {calibration_results.get("GPT", {}).get("prediction", "Unknown")}

### 2. Gemini
- Accuracy: {gem_acc:.1f}%
- Extracted Bias: {calibration_results.get("Gemini", {}).get("prediction", "Unknown")}

## Who's the Winner

{winner} is the week's winner based on the highest directional calibration score.
"""

def save_outputs(week, repo_path, report, results, history, calibration_log, learning_log, llm_horse_race):
    OUTPUT_DIR.mkdir(exist_ok=True)

    report_name = REPORT_MD.format(week=week)
    json_name = RESULTS_JSON.format(week=week)

    report_path = OUTPUT_DIR / report_name
    json_path = OUTPUT_DIR / json_name

    report_path.write_text(report, encoding="utf-8")
    json_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    generated_files = {
        f"calibration_log_2026-W{week}.md": calibration_log,
        f"learning_log_2026-W{week}.md": learning_log,
        f"llm_horserace_2026-W{week}.md": llm_horse_race,
    }

    for filename, content in generated_files.items():
        output_file = OUTPUT_DIR / filename
        output_file.write_text(content, encoding="utf-8")
        shutil.copy2(output_file, week_dir / filename)

    for path in [report_path, json_path]:
        shutil.copy2(path, week_dir / path.name)

    hist_path = repo_path / "evidence" / HISTORY_JSON
    if hist_path.exists():
        shutil.copy2(hist_path, week_dir / HISTORY_JSON)

def main():
    parser = argparse.ArgumentParser(description="Run Calibration Suite")
    parser.add_argument("--week", type=int, required=True, help="Week number")
    parser.add_argument("--repo", type=str, default=".", help="Root repository path")
    args = parser.parse_args()

    repo_path = Path(args.repo)
    loaded_files = load_prediction_files(repo_path, args.week)
    predictions = extract_predictions(loaded_files)
    actuals = fetch_market_data()
    calibration_results = score_calibration(predictions, actuals)
    summary_scores = compute_summary_scores(predictions, calibration_results)
    history = update_history(repo_path, args.week, calibration_results, summary_scores)

    report_md = generate_report_md(args.week, actuals, predictions, calibration_results, history, loaded_files)
    cal_log = generate_calibration_log(args.week, predictions, calibration_results, actuals)
    learn_log = generate_learning_log(args.week, predictions, actuals)
    llm_race = generate_llm_horserace(args.week, calibration_results)

    full_results = {
        "week": args.week,
        "generated_at": datetime.now().isoformat(),
        "summary_scores": summary_scores,
        "predictions": predictions,
        "actuals": actuals,
        "calibration": calibration_results,
        "history": history
    }

    save_outputs(
        week=args.week,
        repo_path=repo_path,
        report=report_md,
        results=full_results,
        history=history,
        calibration_log=cal_log,
        learning_log=learn_log,
        llm_horse_race=llm_race
    )
    print(f"Successfully processed Week {args.week} calibration!")

if __name__ == "__main__":
    main()