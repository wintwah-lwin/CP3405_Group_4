import type { HumanScoreSection } from '../models/HumanScore';

export interface HumanScorePayload {
  week: number;
  macro: HumanScoreSection;
  technical: HumanScoreSection;
  almanac: HumanScoreSection;
  llmConsensus: HumanScoreSection;
  wildcard: HumanScoreSection;
  finalBias: string;
  confidence: string;
  recommendation: string;
}

function sectionBlock(title: string, section: HumanScoreSection): string {
  return `## ${title}

AI Score: ${section.aiScore} | Team Score: ${section.teamScore}

${section.notes.trim() || 'No additional notes.'}
`;
}

function computeTotal(payload: HumanScorePayload): number {
  return (
    payload.macro.teamScore
    + payload.technical.teamScore
    + payload.almanac.teamScore
    + payload.llmConsensus.teamScore
    + payload.wildcard.teamScore
  );
}

function scoreBreakdown(payload: HumanScorePayload): string {
  const parts = [
    `${payload.macro.teamScore >= 0 ? '+' : ''}${payload.macro.teamScore} Macro`,
    `${payload.technical.teamScore >= 0 ? '+' : ''}${payload.technical.teamScore} Technical`,
    `${payload.almanac.teamScore >= 0 ? '+' : ''}${payload.almanac.teamScore} Almanac`,
    `${payload.llmConsensus.teamScore >= 0 ? '+' : ''}${payload.llmConsensus.teamScore} AI`,
    `${payload.wildcard.teamScore >= 0 ? '+' : ''}${payload.wildcard.teamScore} Wild Card`,
  ];
  return parts.join(' ');
}

export function buildHumanScoreMarkdown(payload: HumanScorePayload): string {
  const total = computeTotal(payload);

  return `# Human Score – Week ${payload.week}

${sectionBlock('Macro / News Weight', payload.macro)}

---

${sectionBlock('Technical Structure', payload.technical)}

---

${sectionBlock('Almanac / Seasonality', payload.almanac)}

---

${sectionBlock('AI Consensus', payload.llmConsensus)}

---

${sectionBlock('Wild Card / Human Observation', payload.wildcard)}

---

## Final Decision

**Human Score Total:** ${total}

(${scoreBreakdown(payload)})

**Verdict:** ${payload.finalBias}
**CONFIDENCE:** ${payload.confidence}
**Recommendation:** ${payload.recommendation.trim() || 'No recommendation recorded.'}
`;
}
