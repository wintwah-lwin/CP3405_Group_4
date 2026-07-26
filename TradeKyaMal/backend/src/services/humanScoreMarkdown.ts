import type { HumanScoreSection } from '../models/HumanScore';

export interface HumanScorePayload {
  week: number;
  macro: HumanScoreSection;
  technical: HumanScoreSection;
  almanac: HumanScoreSection;
  llmConsensus: HumanScoreSection;
  finalBias: string;
  confidence: string;
}

function sectionBlock(title: string, section: HumanScoreSection): string {
  return `## ${title}

AI Score: ${section.aiScore} | Team Score: ${section.teamScore}

${section.notes.trim() || 'No additional notes.'}
`;
}

export function buildHumanScoreMarkdown(payload: HumanScorePayload): string {
  return `# Human Score – Week ${payload.week}

${sectionBlock('Macro / News Weight', payload.macro)}

---

${sectionBlock('Technical Structure', payload.technical)}

---

${sectionBlock('Almanac / Seasonality', payload.almanac)}

---

${sectionBlock('AI Consensus', payload.llmConsensus)}

---

## Overall Team View

**HUMAN FINAL BIAS:** ${payload.finalBias}
**CONFIDENCE:** ${payload.confidence}
`;
}
