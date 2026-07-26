import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import build_past_accuracy_report as report


def test_extract_score_metrics_from_accuracy_table_row():
    text = """### Cumulative Accuracy Table (W3–W6)

| Week | Direction Accuracy | Magnitude Accuracy | Confidence Calibration | Overall Score |
| :--- | :---: | :---: | :---: | :---: |
| **W7** | 8/10 | 7/10 | 8/10 | **7.5/10** |
"""

    metrics = report.extract_score_metrics(text, week_num=7)

    assert metrics["direction"] == "8/10"
    assert metrics["magnitude"] == "7/10"
    assert metrics["confidence"] == "8/10"
    assert metrics["overall"] == "7.5/10"
