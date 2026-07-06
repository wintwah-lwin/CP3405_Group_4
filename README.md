# CP3405 Group 4 — Trading Intelligence

## TradeKyaMal (Main Application)

The team's data collection dashboard lives in the **`TradeKyaMal/`** folder:

- **Frontend:** Next.js dashboard (Vercel)
- **Backend:** Express API (Render)
- **Data sources:** [Finviz Futures](https://finviz.com/futures_performance), [Yahoo Sectors](https://finance.yahoo.com/sectors/), [TradingEconomics Calendar](https://tradingeconomics.com/calendar)

Quick start:

```bash
cd TradeKyaMal/backend && npm install && npm run dev
cd TradeKyaMal/frontend && npm install && npm run dev
```

See `TradeKyaMal/README.md` and `TradeKyaMal/API_GUIDE.md` for full setup and deployment.

### Weekly data fetch (Python scripts)

```bash
cd TradeKyaMal/scripts
pip install -r requirements.txt
python run_weekly_fetch.py --week 24
```

This fetches Finviz + yfinance data and auto-commits to `evidence/Week 24/` on this repo.

---

## Roles
Week 3
Tasks:
### Week 23s

**Pull Latest Market Evidence** *(Friday Night / Saturday Morning SGT)*
  -  Gather evidence after US market close.
  -  Collect timestamped screenshots or saved links for Finviz 1W, Yahoo sectors 5D, TradingEconomics calendar, and chart evidence.

     *Draft Individual Agent Outputs** *(Saturday)*
  -  Have each agent write its own individual output before starting any LLM synthesis.
  -  Complete separate files/sections for Almanac, Macro, Technical, and Data/Actuals.

-  **Run LLM Synthesis & Comparisons** *(Saturday Night / Sunday)*
  -  Run synthesis prompts through ChatGPT, Claude, Gemini, and DeepSeek.
  -  Save all raw model responses.
  -  Create a comparison table tracking model agreement and disagreement.

 **Finalize Team Prediction** *(Sunday)*
  -  Have the Human Score lead finalize the Week 23 prediction file.
  -  Ensure the final file includes market direction/range, confidence level, invalidation conditions, and detailed reasoning.
  -  Document what the AI models may have missed.

   **Submit and Release** *(Before Sunday 23:59 SGT)*
  -  Commit all finalized files and data to the repository.
  -  Create GitHub release tag `vW23`.
  -  Post the submission to Discord, including the GitHub URL and release link.

Roles:
1 R1 Product Owner -  
2 R2 Scrum Master - Min Thiha Kyaw
3	R3 Almanac Lead - Yuyang Zhou
4	R4 Macro Lead - Wint Wah Lwin
5	R5 Technical Lead - Amie Phyo
6	R6 LLM Operator - Mojun Zheng
7 R7 Human Score - Cai Mingyu
2	R8 Data Lead - Wint Wah Lwin
8	R9 GitHub Lead - 
9	R10 QA Lead - Thi Han Htun

---


## Roles
Week 2
1 R1 Product Owner - Thi Han Htun
2 R2 Scrum Master - Zheng Yao
3	R3 Almanac Lead - Li Yunchen
4	R4 Macro Lead - Amie Phyo
5	R5 Technical Lead - Min Tet Aung
6	R6 LLM Operator - Yuyang Zhou
7 R7 Human Score - Wint Wah Lwin
2	R8 Data Lead - Min Thiha Kyaw
8	R9 GitHub Lead - Mojun Zheng
9	R10 QA Lead - Cai Mingyu

---
