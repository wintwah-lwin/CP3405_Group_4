#!/usr/bin/env python3

import argparse
import json
import os
import re
import shutil
from datetime import datetime
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"

LLM_OUTPUT_MD = "llm_integration_2026-W{week}.md"
AGREEMENT_MD = "agreement_matrix_2026-W{week}.md"
LLM_LOG_JSON = "llm_responses_2026-W{week}.json"


def read_file(path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def find_latest_file(folder, patterns):
    for pattern in patterns:
        files = sorted(folder.glob(pattern), reverse=True)
        if files:
            return files[0]
    return None


def load_agent_reports(repo_path, week):
    incoming = repo_path / "incoming"
    evidence_week = repo_path / "evidence" / f"Week {week}"

    search_folders = [incoming, evidence_week]

    reports = {}

    for folder in search_folders:
        if not folder.exists():
            continue

        if "macro" not in reports:
            f = find_latest_file(folder, [f"*macro*w{week}*.md", f"*macro*W{week}*.md", "*macro*.md"])
            if f:
                reports["macro"] = read_file(f)

        if "almanac" not in reports:
            f = find_latest_file(folder, [f"*almanac*W{week}*.md", f"*almanac*w{week}*.md", "*almanac*.md"])
            if f:
                reports["almanac"] = read_file(f)

        if "technical" not in reports:
            f = find_latest_file(folder, [f"*technical*W{week}*.md", f"*technical*w{week}*.md", "*technical*.md"])
            if f:
                reports["technical"] = read_file(f)

    return reports


def build_prompt(week, reports):
    macro = reports.get("macro", "MISSING MACRO REPORT")
    almanac = reports.get("almanac", "MISSING ALMANAC REPORT")
    technical = reports.get("technical", "MISSING TECHNICAL REPORT")

    return f"""
You are an LLM market-integration agent for CP3405 Group 4.

Your task:
Generate a weekly prediction for SPX, NDX, IWM, and all 11 S&P sectors.

Use the three agent reports below:
1. Macro Agent
2. Almanac Agent
3. Technical Agent

Do not invent data that is not in the reports.
If data is missing, say it is missing.
Give structured output only.

Required output format:

# LLM Market Prediction — W{week}

## 1. Executive Summary
- Overall Market Bias:
- Confidence:
- Primary Driver:

## 2. Index Predictions
| Instrument | Direction | Confidence | Reason |
|---|---|---|---|
| SPX | Bullish/Neutral/Bearish | Low/Medium/High | ... |
| NDX | Bullish/Neutral/Bearish | Low/Medium/High | ... |
| IWM | Bullish/Neutral/Bearish | Low/Medium/High | ... |

## 3. Sector Predictions
| Sector | Direction | Confidence | Reason |
|---|---|---|---|
| Technology | ... | ... | ... |
| Financials | ... | ... | ... |
| Healthcare | ... | ... | ... |
| Energy | ... | ... | ... |
| Industrials | ... | ... | ... |
| Utilities | ... | ... | ... |
| Real Estate | ... | ... | ... |
| Materials | ... | ... | ... |
| Consumer Discretionary | ... | ... | ... |
| Consumer Staples | ... | ... | ... |
| Communication Services | ... | ... | ... |

## 4. Key Agreement / Disagreement
- Where Macro, Almanac and Technical agree:
- Where they disagree:
- Main risk:

## 5. Final Prediction
- Final Bias:
- Human Review Needed: Yes/No
- Reason:

REPORTS BELOW:

===== MACRO AGENT REPORT =====
{macro}

===== ALMANAC AGENT REPORT =====
{almanac}

===== TECHNICAL AGENT REPORT =====
{technical}
"""


def call_openai(prompt):
    if OpenAI is None:
        return {
            "model": "openai",
            "ok": False,
            "text": "OpenAI package not installed. Run: /usr/local/bin/python3 -m pip install openai"
        }

    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        return {
            "model": "openai",
            "ok": False,
            "text": "OPENAI_API_KEY not found in environment."
        }

    try:
        client = OpenAI(api_key=api_key)

        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=prompt,
        )

        return {
            "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            "ok": True,
            "text": response.output_text
        }

    except Exception as e:
        return {
            "model": "openai",
            "ok": False,
            "text": f"OpenAI call failed: {e}"
        }


def call_gemini(prompt):
    if genai is None:
        return {
            "model": "gemini",
            "ok": False,
            "text": "Gemini package not installed. Run: /usr/local/bin/python3 -m pip install google-generativeai"
        }

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return {
            "model": "gemini",
            "ok": False,
            "text": "GEMINI_API_KEY not found in environment."
        }

    try:
        genai.configure(api_key=api_key)

        model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        model = genai.GenerativeModel(model_name)

        response = model.generate_content(prompt)

        return {
            "model": model_name,
            "ok": True,
            "text": response.text
        }

    except Exception as e:
        return {
            "model": "gemini",
            "ok": False,
            "text": f"Gemini call failed: {e}"
        }


def extract_bias(text):
    text_lower = text.lower()

    if "bearish" in text_lower and "bullish" not in text_lower:
        return "Bearish"

    if "bullish" in text_lower and "bearish" not in text_lower:
        return "Bullish"

    if "neutral-bullish" in text_lower:
        return "Neutral-Bullish"

    if "neutral-bearish" in text_lower:
        return "Neutral-Bearish"

    if "neutral" in text_lower:
        return "Neutral"

    return "Unknown"


def extract_confidence(text):
    text_lower = text.lower()

    if "confidence: high" in text_lower or "confidence:** high" in text_lower:
        return "High"

    if "confidence: medium" in text_lower or "confidence:** medium" in text_lower:
        return "Medium"

    if "confidence: low" in text_lower or "confidence:** low" in text_lower:
        return "Low"

    return "Unknown"


def build_agreement_matrix(week, responses):
    rows = []

    for r in responses:
        rows.append({
            "model": r["model"],
            "ok": r["ok"],
            "bias": extract_bias(r["text"]),
            "confidence": extract_confidence(r["text"]),
        })

    biases = [r["bias"] for r in rows if r["bias"] != "Unknown"]
    confidences = [r["confidence"] for r in rows if r["confidence"] != "Unknown"]

    bias_agreement = len(set(biases)) == 1 if biases else False
    confidence_agreement = len(set(confidences)) == 1 if confidences else False

    flag = "No"
    if not bias_agreement or not confidence_agreement:
        flag = "Yes"

    lines = [
        f"# LLM Agreement Matrix — W{week}",
        "",
        "| Model | API Success | Extracted Bias | Extracted Confidence |",
        "|---|---|---|---|",
    ]

    for row in rows:
        lines.append(
            f"| {row['model']} | {row['ok']} | {row['bias']} | {row['confidence']} |"
        )

    lines.extend([
        "",
        "## Agreement Check",
        "",
        f"- Bias Agreement: {'Yes' if bias_agreement else 'No'}",
        f"- Confidence Agreement: {'Yes' if confidence_agreement else 'No'}",
        f"- Disagreement Zone Flagged: {flag}",
        "",
        "## Human Review Trigger",
        "",
        "Human review is required if model bias or confidence differs, or if one model API fails.",
    ])

    return "\n".join(lines)


def build_llm_report(week, responses, agreement_matrix):
    stamp = datetime.now().strftime("%d %b %Y, %I:%M %p")

    lines = [
        f"# W{week} — LLM Integration + Calibration Suite",
        "",
        f"**Generated:** {stamp}",
        "",
        "## Models Called",
        "",
    ]

    for r in responses:
        lines.append(f"- {r['model']}: {'Success' if r['ok'] else 'Failed'}")

    lines.extend([
        "",
        "---",
        "",
        "## Model Responses",
        "",
    ])

    for r in responses:
        lines.append(f"### {r['model']}")
        lines.append("")
        lines.append(r["text"])
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append(agreement_matrix)

    return "\n".join(lines)


def save_outputs(week, repo_path, responses, llm_report, agreement_matrix):
    OUTPUT_DIR.mkdir(exist_ok=True)

    llm_name = LLM_OUTPUT_MD.format(week=week)
    agreement_name = AGREEMENT_MD.format(week=week)
    log_name = LLM_LOG_JSON.format(week=week)

    (OUTPUT_DIR / llm_name).write_text(llm_report, encoding="utf-8")
    (OUTPUT_DIR / agreement_name).write_text(agreement_matrix, encoding="utf-8")
    (OUTPUT_DIR / log_name).write_text(json.dumps(responses, indent=2), encoding="utf-8")

    if repo_path:
        week_dir = repo_path / "evidence" / f"Week {week}"
        week_dir.mkdir(parents=True, exist_ok=True)

        incoming = repo_path / "incoming"
        incoming.mkdir(exist_ok=True)

        for filename in [llm_name, agreement_name, log_name]:
            shutil.copy2(OUTPUT_DIR / filename, week_dir / filename)
            shutil.copy2(OUTPUT_DIR / filename, incoming / filename)


def main():
    parser = argparse.ArgumentParser(description="LLM Integration + Calibration Suite")
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve() if args.repo else Path.cwd()

    reports = load_agent_reports(repo_path, args.week)
    prompt = build_prompt(args.week, reports)

    print("=== Step 1: Calling OpenAI ===")
    openai_response = call_openai(prompt)

    print("=== Step 2: Calling Gemini ===")
    gemini_response = call_gemini(prompt)

    responses = [openai_response, gemini_response]

    print("=== Step 3: Building agreement matrix ===")
    agreement_matrix = build_agreement_matrix(args.week, responses)

    print("=== Step 4: Saving LLM reports ===")
    llm_report = build_llm_report(args.week, responses, agreement_matrix)

    save_outputs(args.week, repo_path, responses, llm_report, agreement_matrix)

    print("Done. LLM Integration + Calibration Suite generated.")


if __name__ == "__main__":
    main()