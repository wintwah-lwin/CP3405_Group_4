# Calibration Suite Report — W10

**Generated:** 29 July 2026, 12:21 PM  
**Mode:** Test mode uses latest available market data. Re-run after Friday market close for final W10 calibration.  

---

## 1. Actual Market Outcomes

| Asset | Start | End | Change % | Actual Direction |
|---|---:|---:|---:|---|
| SPX | 7498.96 | 7428.78 | -0.94% | Bearish |
| NDX | 28998.1 | 27763.13 | -4.26% | Bearish |
| IWM | 293.79 | 293.37 | -0.14% | Neutral |
| Technology | 180.27 | 171.09 | -5.09% | Bearish |
| Financials | 56.05 | 57.6 | +2.77% | Bullish |
| Healthcare | 159.43 | 167.26 | +4.91% | Bullish |
| Energy | 59.2 | 57.57 | -2.75% | Bearish |
| Industrials | 178.85 | 182.49 | +2.04% | Bullish |
| Utilities | 45.93 | 45.52 | -0.89% | Bearish |
| Real Estate | 45.01 | 46.01 | +2.22% | Bullish |
| Materials | 50.82 | 52.34 | +2.99% | Bullish |
| Consumer Discretionary | 114.02 | 112.48 | -1.35% | Bearish |
| Consumer Staples | 84.38 | 87.06 | +3.18% | Bullish |
| Communication Services | 109.2 | 109.67 | +0.43% | Bullish |

---

## 2. Extracted Predictions

| Predictor | Extracted Direction |
|---|---|
| Macro | Unknown |
| Almanac | Neutral |
| Technical | Neutral-Bullish |
| Human | Neutral |
| Final Prediction | Bearish |
| GPT | Neutral |
| Gemini | Neutral-Bullish |

---

## 3. Calibration Leaderboard

| Rank | Predictor | Prediction | Correct | Partial | Wrong | Accuracy |
|---:|---|---|---:|---:|---:|---:|
| 1 | Final Prediction | Bearish | 2 | 1 | 0 | 83.3% |
| 2 | Almanac | Neutral | 1 | 2 | 0 | 66.7% |
| 3 | Human | Neutral | 1 | 2 | 0 | 66.7% |
| 4 | GPT | Neutral | 1 | 2 | 0 | 66.7% |
| 5 | Technical | Neutral-Bullish | 0 | 3 | 0 | 50.0% |
| 6 | Gemini | Neutral-Bullish | 0 | 3 | 0 | 50.0% |
| 7 | Macro | Unknown | 0 | 0 | 0 | 0.0% |

**Best Performer:** Final Prediction  
**Lowest Performer:** Macro

---

## 4. Detailed Directional Accuracy

### Macro

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Unknown | Bearish | -0.94% | No Score | 0 |
| NDX | Unknown | Bearish | -4.26% | No Score | 0 |
| IWM | Unknown | Neutral | -0.14% | No Score | 0 |

**Accuracy:** 0.0%

### Almanac

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Neutral | Bearish | -0.94% | Partial | 50 |
| NDX | Neutral | Bearish | -4.26% | Partial | 50 |
| IWM | Neutral | Neutral | -0.14% | Correct | 100 |

**Accuracy:** 66.7%

### Technical

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Neutral-Bullish | Bearish | -0.94% | Partial | 50 |
| NDX | Neutral-Bullish | Bearish | -4.26% | Partial | 50 |
| IWM | Neutral-Bullish | Neutral | -0.14% | Partial | 50 |

**Accuracy:** 50.0%

### Human

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Neutral | Bearish | -0.94% | Partial | 50 |
| NDX | Neutral | Bearish | -4.26% | Partial | 50 |
| IWM | Neutral | Neutral | -0.14% | Correct | 100 |

**Accuracy:** 66.7%

### Final Prediction

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Bearish | Bearish | -0.94% | Correct | 100 |
| NDX | Bearish | Bearish | -4.26% | Correct | 100 |
| IWM | Bearish | Neutral | -0.14% | Partial | 50 |

**Accuracy:** 83.3%

### GPT

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Neutral | Bearish | -0.94% | Partial | 50 |
| NDX | Neutral | Bearish | -4.26% | Partial | 50 |
| IWM | Neutral | Neutral | -0.14% | Correct | 100 |

**Accuracy:** 66.7%

### Gemini

| Asset | Prediction | Actual | Change % | Result | Score |
|---|---|---|---:|---|---:|
| SPX | Neutral-Bullish | Bearish | -0.94% | Partial | 50 |
| NDX | Neutral-Bullish | Bearish | -4.26% | Partial | 50 |
| IWM | Neutral-Bullish | Neutral | -0.14% | Partial | 50 |

**Accuracy:** 50.0%


---

## 5. Files Used

- **Macro:** `/home/runner/work/CP3405_Group_4/CP3405_Group_4/evidence/Week 10/macro_agent_2026-W10.md`
- **Almanac:** `/home/runner/work/CP3405_Group_4/CP3405_Group_4/evidence/Week 10/almanac_agent_2026-W10.md`
- **Technical:** `/home/runner/work/CP3405_Group_4/CP3405_Group_4/evidence/Week 10/technical_agent_2026-W10.md`
- **LLM:** `/home/runner/work/CP3405_Group_4/CP3405_Group_4/evidence/Week 10/llm_integration_2026-W10.md`
- **Human:** `/home/runner/work/CP3405_Group_4/CP3405_Group_4/evidence/human_score_2026-W22.md`
- **Final Prediction:** `/home/runner/work/CP3405_Group_4/CP3405_Group_4/evidence/Week 9/final_prediction_2026-W9.md`