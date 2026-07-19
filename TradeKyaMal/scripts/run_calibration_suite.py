#!/usr/bin/env python3

import argparse
import json
import re
import shutil
from datetime import datetime, date, timedelta
from pathlib import Path

import yfinance as yf


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"

REPORT_MD = "calibration_report_2026-W{week}.md"
RESULTS_JSON = "calibration_results_2026-W{week}.json"
HISTORY_JSON = "calibration_history.json"


ASSETS = {
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
    "Communication Services": "XLC",
}


PREDICTORS = [
    "Macro",
    "Almanac",
    "Technical",
    "GPT",
    "Gemini",
    "Human",
    "Final Prediction",
]


def read_file(path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def find_file(folder, patterns):
    if not folder.exists():
        return None

    for pattern in patterns:
        files = sorted(folder.glob(pattern), reverse=True)
        if files:
            return files[0]

    return None


def load_prediction_files(repo_path, week):
    incoming = repo_path / "incoming"
    evidence = repo_path / "evidence" / f"Week {week}"
    folders = [incoming, evidence]

    patterns = {
        "Macro": [f"*macro*w{week}*.md", f"*macro*W{week}*.md", "*macro*.md"],
        "Almanac": [f"*almanac*W{week}*.md", f"*almanac*w{week}*.md", "*almanac*.md"],
        "Technical": [f"*technical*W{week}*.md", f"*technical*w{week}*.md", "*technical*.md"],
        "LLM": [f"*llm*W{week}*.md", f"*llm*w{week}*.md", "*llm*.md"],
        "Human": [f"*human*W{week}*.md", f"*human*w{week}*.md", "*human*.md"],
        "Final Prediction": [f"*final_prediction*W{week}*.md", f"*final_prediction*w{week}*.md", "*final_prediction*.md"],
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

    return loaded


def normalize_direction(text):
    t = text.lower()

    if "neutral-bullish" in t or "neutral bullish" in t:
        return "Neutral-Bullish"
    if "neutral-bearish" in t or "neutral bearish" in t or "neutral-to-cautious" in t:
        return "Neutral-Bearish"
    if "cautiously bearish" in t or "bearish / high-volatility" in t:
        return "Bearish"
    if "bullish" in t and "bearish" not in t:
        return "Bullish"
    if "bearish" in t or "cautious" in t:
        return "Bearish"
    if "neutral" in t or "mixed" in t:
        return "Neutral"

    return "Unknown"


def extract_general_bias(text):
    patterns = [
        r"\*\*HUMAN FINAL BIAS:\*\*\s*([^\n]+)",
        r"HUMAN FINAL BIAS:\s*([^\n]+)",

        r"\*\*FINAL MARKET BIAS:\*\*\s*([^\n]+)",
        r"FINAL MARKET BIAS:\s*([^\n]+)",

        r"\*\*FINAL TECHNICAL BIAS:\*\*\s*([^\n]+)",
        r"FINAL TECHNICAL BIAS:\s*([^\n]+)",

        r"\*\*ALMANAC BIAS:\*\*\s*([^\n]+)",
        r"ALMANAC BIAS:\s*([^\n]+)",

        r"\*\*MACRO BIAS:\*\*\s*([^\n]+)",
        r"MACRO BIAS:\s*([^\n]+)",

        r"\*\*Verdict:\*\*\s*\**([^\n*]+)\**",
        r"Verdict:\s*\**([^\n*]+)\**",

        r"Overall Market Bias:\s*([^\n]+)",
        r"Final Bias:\s*([^\n]+)",
    ]

    for p in patterns:
        m = re.search(p, text, re.IGNORECASE | re.MULTILINE)
        if m:
            value = m.group(1).strip()
            value = value.replace("*", "").replace(":", "").strip()
            return normalize_direction(value)

    lower = text.lower()

    if "neutral-bullish" in lower:
        return "Neutral-Bullish"
    if "neutral-bearish" in lower:
        return "Neutral-Bearish"
    if "neutral-to-cautious" in lower:
        return "Neutral-Bearish"
    if "bullish" in lower and "bearish" not in lower:
        return "Bullish"
    if "bearish" in lower or "cautious" in lower:
        return "Bearish"
    if "neutral" in lower or "mixed" in lower:
        return "Neutral"

    return "Unknown"


def extract_llm_model_biases(text):
    result = {}

    gpt_match = re.search(r"###\s*(gpt[^\n]+|openai[^\n]+)([\s\S]*?)(?=---|###|# LLM Agreement|$)", text, re.IGNORECASE)
    gemini_match = re.search(r"###\s*(gemini[^\n]+)([\s\S]*?)(?=---|###|# LLM Agreement|$)", text, re.IGNORECASE)

    if gpt_match:
        result["GPT"] = extract_general_bias(gpt_match.group(2))

    if gemini_match:
        result["Gemini"] = extract_general_bias(gemini_match.group(2))

    if "GPT" not in result:
        result["GPT"] = extract_general_bias(text)

    if "Gemini" not in result:
        result["Gemini"] = extract_general_bias(text)

    return result


def extract_predictions(files):
    predictions = {}

    predictions["Macro"] = extract_general_bias(files.get("Macro", {}).get("text", ""))
    predictions["Almanac"] = extract_general_bias(files.get("Almanac", {}).get("text", ""))
    predictions["Technical"] = extract_general_bias(files.get("Technical", {}).get("text", ""))
    predictions["Human"] = extract_general_bias(files.get("Human", {}).get("text", ""))
    predictions["Final Prediction"] = extract_general_bias(files.get("Final Prediction", {}).get("text", ""))

    llm_text = files.get("LLM", {}).get("text", "")
    llm_biases = extract_llm_model_biases(llm_text)

    predictions["GPT"] = llm_biases.get("GPT", "Unknown")
    predictions["Gemini"] = llm_biases.get("Gemini", "Unknown")

    return predictions


def week_dates_from_today():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def fetch_actual_performance(asset_symbol, period="7d"):
    try:
        df = yf.Ticker(asset_symbol).history(period=period, interval="1d", auto_adjust=False)
        df = df.dropna(subset=["Close"])

        if len(df) < 2:
            return {
                "start": None,
                "end": None,
                "change_pct": None,
                "direction": "Unknown",
            }

        start = float(df["Close"].iloc[0])
        end = float(df["Close"].iloc[-1])
        change_pct = ((end - start) / start) * 100

        if change_pct > 0.25:
            direction = "Bullish"
        elif change_pct < -0.25:
            direction = "Bearish"
        else:
            direction = "Neutral"

        return {
            "start": round(start, 2),
            "end": round(end, 2),
            "change_pct": round(change_pct, 2),
            "direction": direction,
        }

    except Exception as e:
        print(f"Actual performance fetch failed for {asset_symbol}: {e}")
        return {
            "start": None,
            "end": None,
            "change_pct": None,
            "direction": "Unknown",
        }


def fetch_actuals():
    actuals = {}

    for name, symbol in ASSETS.items():
        actuals[name] = fetch_actual_performance(symbol)

    return actuals


def score_prediction(prediction, actual_direction):
    pred = normalize_direction(prediction)
    actual = normalize_direction(actual_direction)

    if pred == "Unknown" or actual == "Unknown":
        return {
            "score": 0,
            "result": "No Score",
        }

    if pred == actual:
        return {
            "score": 1,
            "result": "Correct",
        }

    if pred == "Neutral":
        return {
            "score": 0.5,
            "result": "Partial",
        }

    if pred == "Neutral-Bullish" and actual in ["Bullish", "Neutral"]:
        return {
            "score": 0.5,
            "result": "Partial",
        }

    if pred == "Neutral-Bearish" and actual in ["Bearish", "Neutral"]:
        return {
            "score": 0.5,
            "result": "Partial",
        }

    return {
        "score": 0,
        "result": "Wrong",
    }


def calibrate_predictions(predictions, actuals):
    main_assets = ["SPX", "NDX", "IWM"]
    results = {}

    for predictor, prediction in predictions.items():
        rows = []
        total_score = 0
        max_score = 0
        correct = 0
        partial = 0
        wrong = 0
        no_score = 0

        for asset in main_assets:
            actual = actuals.get(asset, {})
            actual_direction = actual.get("direction", "Unknown")
            scored = score_prediction(prediction, actual_direction)

            total_score += scored["score"]
            max_score += 1

            if scored["result"] == "Correct":
                correct += 1
            elif scored["result"] == "Partial":
                partial += 1
            elif scored["result"] == "Wrong":
                wrong += 1
            else:
                no_score += 1

            rows.append({
                "asset": asset,
                "prediction": prediction,
                "actual_direction": actual_direction,
                "actual_change_pct": actual.get("change_pct"),
                "result": scored["result"],
                "score": scored["score"],
            })

        accuracy = (total_score / max_score * 100) if max_score else 0

        results[predictor] = {
            "prediction": prediction,
            "rows": rows,
            "correct": correct,
            "partial": partial,
            "wrong": wrong,
            "no_score": no_score,
            "accuracy": round(accuracy, 1),
        }

    return results


def update_history(repo_path, week, calibration):
    history_path = repo_path / "incoming" / HISTORY_JSON

    if history_path.exists():
        history = json.loads(read_file(history_path))
    else:
        history = {}

    history[f"W{week}"] = {
        predictor: {
            "prediction": data["prediction"],
            "accuracy": data["accuracy"],
            "correct": data["correct"],
            "partial": data["partial"],
            "wrong": data["wrong"],
            "no_score": data["no_score"],
        }
        for predictor, data in calibration.items()
    }

    history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")

    return history


def build_leaderboard(calibration):
    ranked = sorted(calibration.items(), key=lambda x: x[1]["accuracy"], reverse=True)

    lines = [
        "| Rank | Predictor | Prediction | Correct | Partial | Wrong | Accuracy |",
        "|---:|---|---|---:|---:|---:|---:|",
    ]

    for i, (predictor, data) in enumerate(ranked, start=1):
        lines.append(
            f"| {i} | {predictor} | {data['prediction']} | {data['correct']} | {data['partial']} | {data['wrong']} | {data['accuracy']}% |"
        )

    return "\n".join(lines)


def build_actuals_table(actuals):
    lines = [
        "| Asset | Start | End | Change % | Actual Direction |",
        "|---|---:|---:|---:|---|",
    ]

    for asset, data in actuals.items():
        change = data["change_pct"]
        change_text = "N/A" if change is None else f"{change:+.2f}%"

        lines.append(
            f"| {asset} | {data['start']} | {data['end']} | {change_text} | {data['direction']} |"
        )

    return "\n".join(lines)


def build_detail_tables(calibration):
    sections = []

    for predictor, data in calibration.items():
        lines = [
            f"### {predictor}",
            "",
            "| Asset | Prediction | Actual | Change % | Result | Score |",
            "|---|---|---|---:|---|---:|",
        ]

        for row in data["rows"]:
            change = row["actual_change_pct"]
            change_text = "N/A" if change is None else f"{change:+.2f}%"

            lines.append(
                f"| {row['asset']} | {row['prediction']} | {row['actual_direction']} | {change_text} | {row['result']} | {row['score']} |"
            )

        lines.append("")
        lines.append(f"**Accuracy:** {data['accuracy']}%")
        sections.append("\n".join(lines))

    return "\n\n---\n\n".join(sections)


def build_history_table(history):
    predictors = PREDICTORS

    lines = [
        "| Week | " + " | ".join(predictors) + " |",
        "|---|" + "|".join(["---:"] * len(predictors)) + "|",
    ]

    for week, data in sorted(history.items()):
        row = [week]

        for predictor in predictors:
            if predictor in data:
                row.append(f"{data[predictor]['accuracy']}%")
            else:
                row.append("N/A")

        lines.append("| " + " | ".join(row) + " |")

    return "\n".join(lines)


def build_report(week, files, predictions, actuals, calibration, history):
    prepared = datetime.now().strftime("%d %B %Y, %I:%M %p")
    monday, friday = week_dates_from_today()

    ranked = sorted(calibration.items(), key=lambda x: x[1]["accuracy"], reverse=True)
    best = ranked[0][0] if ranked else "N/A"
    worst = ranked[-1][0] if ranked else "N/A"

    source_files = "\n".join(
        [f"- {k}: `{Path(v['path']).name}`" for k, v in files.items()]
    )

    return f"""# Calibration Suite Report — W{week}

**Generated:** {prepared}  
**Mode:** Test mode uses latest available market data. Re-run after Friday market close for final W{week} calibration.  
**Market period checked:** Latest available data window around {monday}–{friday}

---

## 1. Actual Market Outcomes

{build_actuals_table(actuals)}

---

## 2. Extracted Predictions

| Predictor | Extracted Direction |
|---|---|
| Macro | {predictions.get("Macro", "Unknown")} |
| Almanac | {predictions.get("Almanac", "Unknown")} |
| Technical | {predictions.get("Technical", "Unknown")} |
| GPT | {predictions.get("GPT", "Unknown")} |
| Gemini | {predictions.get("Gemini", "Unknown")} |
| Human | {predictions.get("Human", "Unknown")} |
| Final Prediction | {predictions.get("Final Prediction", "Unknown")} |

---

## 3. Calibration Leaderboard

{build_leaderboard(calibration)}

**Best Performer:** {best}  
**Lowest Performer:** {worst}

---

## 4. Detailed Directional Accuracy

{build_detail_tables(calibration)}

---

## 5. Historical Accuracy Database

{build_history_table(history)}

---

## 6. Calibration Method

- Bullish is correct when actual market direction is positive.
- Bearish is correct when actual market direction is negative.
- Neutral receives partial credit when the market is flat or direction is not strong.
- Neutral-Bullish and Neutral-Bearish receive partial credit when they are directionally close.
- Accuracy is calculated using SPX, NDX and IWM as the core calibration instruments.
- Sector actuals are collected and displayed for context, but core scoring uses SPX, NDX and IWM.

---

## 7. Files Used

{source_files}

---

## 8. Next Step

Re-run this calibration after the trading week closes to produce the final accuracy score for W{week}.
"""


def save_outputs(week, repo_path, report, results, history):
    OUTPUT_DIR.mkdir(exist_ok=True)

    report_name = REPORT_MD.format(week=week)
    json_name = RESULTS_JSON.format(week=week)

    report_path = OUTPUT_DIR / report_name
    json_path = OUTPUT_DIR / json_name

    report_path.write_text(report, encoding="utf-8")
    json_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    incoming = repo_path / "incoming"
    incoming.mkdir(exist_ok=True)

    for path in [report_path, json_path]:
        shutil.copy2(path, week_dir / path.name)
        shutil.copy2(path, incoming / path.name)

    hist_path = incoming / HISTORY_JSON
    if hist_path.exists():
        shutil.copy2(hist_path, week_dir / HISTORY_JSON)


def main():
    parser = argparse.ArgumentParser(description="Calibration Suite")
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve() if args.repo else Path.cwd()

    print("=== Step 1: Loading prediction files ===")
    files = load_prediction_files(repo_path, args.week)

    print("Files found:")
    for k, v in files.items():
        print(f"  {k}: {v['path']}")

    print("=== Step 2: Extracting predictions ===")
    predictions = extract_predictions(files)

    print("=== Step 3: Fetching actual market outcomes ===")
    actuals = fetch_actuals()

    print("=== Step 4: Scoring predictions ===")
    calibration = calibrate_predictions(predictions, actuals)

    print("=== Step 5: Updating history database ===")
    history = update_history(repo_path, args.week, calibration)

    print("=== Step 6: Building report ===")
    report = build_report(args.week, files, predictions, actuals, calibration, history)

    results = {
        "week": args.week,
        "generated_at": datetime.now().isoformat(),
        "predictions": predictions,
        "actuals": actuals,
        "calibration": calibration,
        "history": history,
    }

    save_outputs(args.week, repo_path, report, results, history)

    print("Done. Calibration Suite generated.")


if __name__ == "__main__":
    main()