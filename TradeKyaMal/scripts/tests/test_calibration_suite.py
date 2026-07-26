import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import run_calibration_suite as suite


def test_build_history_table_uses_expected_columns():
    history = {
        "W24": {
            "Macro": {"accuracy": 50.0},
            "Final Prediction": {"accuracy": 100.0},
        }
    }

    table = suite.build_history_table(history)

    assert "| Week | Macro | Almanac | Technical | GPT | Gemini | Human | Final Prediction |" in table
    assert "| W24 | 50.0% | N/A | N/A | N/A | N/A | N/A | 100.0% |" in table


def test_score_prediction_gives_partial_for_neutral_biases():
    assert suite.score_prediction("Neutral-Bearish", "Bullish")["result"] == "Partial"
    assert suite.score_prediction("Neutral-Bullish", "Bearish")["result"] == "Partial"
