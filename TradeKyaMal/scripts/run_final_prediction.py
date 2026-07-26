#!/usr/bin/env python3

import argparse
import re
import shutil
from datetime import datetime
from pathlib import Path


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"
REPORT_MD = "final_prediction_2026-W{week}.md"


def read_file(path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def find_file(folder, patterns):
    if not folder.exists():
        return None

    for pattern in patterns:
        matches = sorted(folder.glob(pattern), reverse=True)
        if matches:
            return matches[0]

    return None


def load_reports(repo_path, week):
    incoming = repo_path / "incoming"
    evidence = repo_path / "evidence" / f"Week {week}"
    folders = [incoming, evidence]

    file_patterns = {
        "macro": [
            f"macro_report_w{week}.md",
            f"*macro*w{week}*.md",
            f"*macro*W{week}*.md",
            "*macro*.md",
        ],
        "almanac": [
            f"almanac_agent_2026-W{week}.md",
            f"*almanac*W{week}*.md",
            f"*almanac*w{week}*.md",
            "*almanac*.md",
        ],
        "technical": [
            f"technical_agent_2026-W{week}.md",
            f"*technical*W{week}*.md",
            f"*technical*w{week}*.md",
            "*technical*.md",
        ],
        "llm": [
            f"llm_integration_2026-W{week}.md",
            f"*llm*W{week}*.md",
            f"*llm*w{week}*.md",
            "*llm*.md",
        ],
        "agreement": [
            f"agreement_matrix_2026-W{week}.md",
            f"*agreement*W{week}*.md",
            f"*agreement*w{week}*.md",
            "*agreement*.md",
        ],
        "human": [
            f"human_score_2026-W{week}.md",
            f"*human*W{week}*.md",
            f"*human*w{week}*.md",
            f"*test_human_score*.md",
            "*human*.md",
        ],
    }

    reports = {}

    for key, patterns in file_patterns.items():
        for folder in folders:
            found = find_file(folder, patterns)
            if found:
                reports[key] = {
                    "path": found,
                    "text": read_file(found),
                }
                break

    return reports


def clean_value(value):
    if not value:
        return "Unknown"

    value = value.strip()
    value = value.replace("*", "")
    value = value.replace("`", "")
    value = value.replace(":", "")
    value = value.strip()

    value = re.split(r"\n|\|", value)[0].strip()

    return value if value else "Unknown"


def extract_first(patterns, text, default="Unknown"):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return clean_value(match.group(1))
    return default


def detect_bias_from_text(text):
    lowered = text.lower()

    if "neutral-bullish" in lowered or "neutral to bullish" in lowered:
        return "Neutral-Bullish"

    if "neutral-bearish" in lowered or "neutral to cautious" in lowered or "neutral-to-cautious" in lowered:
        return "Neutral-Bearish"

    if "cautiously bearish" in lowered or "bearish / high-volatility" in lowered:
        return "Cautiously Bearish / High-Volatility"

    if "bullish" in lowered and "bearish" not in lowered:
        return "Bullish"

    if "bearish" in lowered and "bullish" not in lowered:
        return "Bearish"

    if "neutral" in lowered:
        return "Neutral"

    return "Unknown"


def extract_bias(text, source):
    patterns = [
        r"\*\*FINAL MARKET BIAS:\*\*\s*([^\n]+)",
        r"FINAL MARKET BIAS:\s*([^\n]+)",
        r"\*\*FINAL TECHNICAL BIAS:\*\*\s*([^\n]+)",
        r"FINAL TECHNICAL BIAS:\s*([^\n]+)",
        r"\*\*TECHNICAL BIAS:\*\*\s*([^\n]+)",
        r"TECHNICAL BIAS:\s*([^\n]+)",
        r"\*\*ALMANAC BIAS:\*\*\s*([^\n]+)",
        r"ALMANAC BIAS:\s*([^\n]+)",
        r"\*\*MACRO BIAS:\*\*\s*([^\n]+)",
        r"MACRO BIAS:\s*([^\n]+)",
        r"\*\*HUMAN FINAL BIAS:\*\*\s*([^\n]+)",
        r"HUMAN FINAL BIAS:\s*([^\n]+)",
        r"\*\*Verdict:\*\*\s*([^\n]+)",
        r"Verdict:\s*([^\n]+)",
        r"Overall Market Bias:\s*([^\n]+)",
        r"- Overall Market Bias:\s*([^\n]+)",
        r"\*\*ALMANAC BIAS:\*\*\s*([^\n]+)",
    ]

    result = extract_first(patterns, text, "Unknown")

    if result != "Unknown":
        return result

    return detect_bias_from_text(text)


def extract_confidence(text):
    patterns = [
        r"\*\*CONFIDENCE:\*\*\s*([^\n]+)",
        r"CONFIDENCE:\s*([^\n]+)",
        r"\*\*Confidence:\*\*\s*([^\n]+)",
        r"Confidence:\s*([^\n]+)",
        r"- Confidence:\s*([^\n]+)",
    ]

    result = extract_first(patterns, text, "Unknown")

    if result != "Unknown":
        return result

    lowered = text.lower()

    if "medium-high" in lowered:
        return "Medium-High"
    if "medium" in lowered:
        return "Medium"
    if "high" in lowered:
        return "High"
    if "low" in lowered:
        return "Low"

    return "Unknown"


def extract_primary_driver(text):
    patterns = [
        r"\*\*PRIMARY DRIVER:\*\*\s*([^\n]+)",
        r"PRIMARY DRIVER:\s*([^\n]+)",
        r"Primary Driver:\s*([^\n]+)",
        r"- Primary Driver:\s*([^\n]+)",
        r"\*\*MAIN THESIS:\*\*\s*([\s\S]*?)(?:\n\n|\n##|\n\*\*)",
        r"MAIN THESIS:\s*([\s\S]*?)(?:\n\n|\n##|\n\*\*)",
    ]

    result = extract_first(patterns, text, "Mixed signals")

    if len(result) > 180:
        result = result[:180] + "..."

    return result


def bias_to_score(bias):
    b = bias.lower()

    if "neutral-bullish" in b:
        return 0.75

    if "bullish" in b and "bearish" not in b:
        return 1

    if "neutral-bearish" in b:
        return -0.75

    if "bearish" in b or "cautious" in b:
        return -1

    if "neutral" in b or "mixed" in b:
        return 0

    return 0


def confidence_weight(confidence):
    c = confidence.lower()

    if "medium-high" in c:
        return 1.1
    if "high" in c:
        return 1.2
    if "medium" in c:
        return 1.0
    if "low" in c:
        return 0.7

    return 1.0


def calculate_final_decision(summary):
    weights = {
        "macro": 1.0,
        "almanac": 1.0,
        "technical": 1.3,
        "llm": 1.2,
        "human": 1.5,
    }

    total = 0
    details = []

    for key, item in summary.items():
        if key not in weights:
            continue

        score = bias_to_score(item["bias"])
        weight = weights[key]
        conf = confidence_weight(item["confidence"])
        weighted = score * weight * conf

        total += weighted

        details.append({
            "source": key.title(),
            "bias": item["bias"],
            "confidence": item["confidence"],
            "weighted_score": round(weighted, 2),
        })

    if total >= 2:
        final_bias = "Bullish"
    elif total >= 0.5:
        final_bias = "Neutral-Bullish"
    elif total <= -2:
        final_bias = "Bearish"
    elif total <= -0.5:
        final_bias = "Neutral-Bearish"
    else:
        final_bias = "Neutral / Mixed"

    if abs(total) >= 3:
        confidence = "High"
    elif abs(total) >= 1:
        confidence = "Medium"
    else:
        confidence = "Low-Medium"

    return {
        "final_bias": final_bias,
        "confidence": confidence,
        "score": round(total, 2),
        "details": details,
    }


def build_summary_table(summary):
    lines = [
        "| Source | Bias / Verdict | Confidence | Primary Driver |",
        "|---|---|---|---|",
    ]

    for key, item in summary.items():
        lines.append(
            f"| {key.title()} | {item['bias']} | {item['confidence']} | {item['primary_driver']} |"
        )

    return "\n".join(lines)


def build_score_table(decision):
    lines = [
        "| Source | Bias | Confidence | Weighted Score |",
        "|---|---|---|---:|",
    ]

    for item in decision["details"]:
        lines.append(
            f"| {item['source']} | {item['bias']} | {item['confidence']} | {item['weighted_score']} |"
        )

    lines.append(f"| **Total** |  |  | **{decision['score']}** |")

    return "\n".join(lines)


def extract_risks(reports):
    combined = "\n".join([v["text"] for v in reports.values()])

    keywords = [
        "inflation",
        "Fed",
        "Federal Reserve",
        "VIX",
        "geopolitical",
        "oil",
        "yield",
        "earnings",
        "support",
        "resistance",
        "weakness",
        "volatility",
        "risk",
        "invalidation",
    ]

    risks = []

    for line in combined.splitlines():
        clean = line.strip("-•> ").strip()

        if len(clean) < 25 or len(clean) > 220:
            continue

        if any(k.lower() in clean.lower() for k in keywords):
            risks.append(clean)

        if len(risks) >= 8:
            break

    if not risks:
        risks = [
            "Unexpected inflation data could change rate expectations.",
            "A sharp rise in VIX could weaken risk appetite.",
            "A break below key technical support would invalidate the bullish view.",
        ]

    return risks


def build_final_report(week, reports):
    prepared = datetime.now().strftime("%d %B %Y, %I:%M %p")

    summary = {}

    for key in ["macro", "almanac", "technical", "llm", "human"]:
        text = reports.get(key, {}).get("text", "")

        if text:
            summary[key] = {
                "bias": extract_bias(text, key),
                "confidence": extract_confidence(text),
                "primary_driver": extract_primary_driver(text),
            }
        else:
            summary[key] = {
                "bias": "Missing",
                "confidence": "Missing",
                "primary_driver": "Report not found",
            }

    decision = calculate_final_decision(summary)
    risks = extract_risks(reports)
    risk_text = "\n".join([f"- {risk}" for risk in risks])

    source_files = "\n".join(
        [
            f"- {key.title()}: `{value['path'].name}`"
            for key, value in reports.items()
        ]
    )

    return f"""# Final Weekly Prediction — W{week}

**Generated:** {prepared}  
**Output Type:** Automated final prediction after Macro, Almanac, Technical, LLM and Human Score review.

---

## 1. Executive Summary

**FINAL MARKET BIAS:** {decision["final_bias"]}  
**CONFIDENCE:** {decision["confidence"]}  
**MODEL SCORE:** {decision["score"]}

The final prediction combines the automated Macro Agent, Almanac Agent, Technical Agent, LLM Integration output and the manual Human Score override. The Human Score is weighted more heavily because it represents final team judgement after reviewing the automated outputs.

---

## 2. Source Summary

{build_summary_table(summary)}

---

## 3. Weighted Decision Matrix

{build_score_table(decision)}

---

## 4. Final Market View

The automated system gives a final **{decision["final_bias"]}** outlook for Week {week}. This means the final stance is based on the combined evidence from live market data, technical structure, seasonal context, LLM reasoning and human review.

---

## 5. Key Risks to Monitor

{risk_text}

---

## 6. Human Override Role

The Human Score remains manual. It is used as a calibration layer to adjust the final output where the team believes the automated agents may underweight real-world context, sudden news risk, market psychology or event uncertainty.

---

## 7. Invalidation

The final prediction should be reviewed again if:
- Major indices break below key weekly support.
- VIX rises sharply.
- Inflation or labour-market data changes Federal Reserve expectations.
- Sector leadership weakens significantly.
- GPT and Gemini disagreement increases in the next run.

---

## 8. Files Used

{source_files}

---

## 9. Final Recommendation

**Recommendation:** Maintain a **{decision["final_bias"]}** market stance with **{decision["confidence"]}** confidence.

This report is ready to be used as the final weekly prediction input for the later calibration suite.
"""


def copy_outputs(week, repo_path):
    report_name = REPORT_MD.format(week=week)
    src = OUTPUT_DIR / report_name

    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    incoming = repo_path / "incoming"
    incoming.mkdir(exist_ok=True)

    shutil.copy2(src, week_dir / report_name)
    shutil.copy2(src, incoming / report_name)


def main():
    parser = argparse.ArgumentParser(description="Automated Final Prediction Builder")
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve() if args.repo else Path.cwd()

    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=== Step 1: Loading reports ===")
    reports = load_reports(repo_path, args.week)

    print("Files found:")
    for key, value in reports.items():
        print(f"  {key}: {value['path']}")

    print("=== Step 2: Building final prediction ===")
    report = build_final_report(args.week, reports)

    report_path = OUTPUT_DIR / REPORT_MD.format(week=args.week)
    report_path.write_text(report, encoding="utf-8")

    print(f"Created: {report_path}")

    if args.repo:
        print("=== Step 3: Copying to evidence and incoming ===")
        copy_outputs(args.week, repo_path)

    print("Done. Final prediction generated.")


if __name__ == "__main__":
    main()