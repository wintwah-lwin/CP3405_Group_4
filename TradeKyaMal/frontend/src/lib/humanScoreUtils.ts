import type { HumanScoreData, HumanScoreSection } from '@/lib/types';

const EMPTY_SECTION: HumanScoreSection = { aiScore: 0, teamScore: 0, notes: '' };

const SCORE_SECTIONS = ['macro', 'technical', 'almanac', 'llmConsensus', 'wildcard'] as const;

export function emptyHumanScore(week: number): HumanScoreData {
  return {
    week,
    macro: { ...EMPTY_SECTION },
    technical: { ...EMPTY_SECTION },
    almanac: { ...EMPTY_SECTION },
    llmConsensus: { ...EMPTY_SECTION },
    wildcard: { ...EMPTY_SECTION },
    finalBias: '',
    confidence: 'Medium',
    recommendation: '',
  };
}

export function computeHumanScoreTotal(data: Pick<HumanScoreData, typeof SCORE_SECTIONS[number]>): number {
  return SCORE_SECTIONS.reduce((sum, key) => sum + data[key].teamScore, 0);
}

export function biasToAiScore(bias: string | null | undefined): number {
  if (!bias) return 0;
  const value = bias.toLowerCase();
  if (value.includes('strong') && value.includes('bull')) return 2;
  if (value.includes('strong') && value.includes('bear')) return -2;
  if (value.includes('bull')) return 1;
  if (value.includes('bear')) return -1;
  return 0;
}

function parseSectionScores(text: string): { aiScore: number; teamScore: number } {
  const match = text.match(/\*\*AI Score:\s*([+-]?\d+)\s*\|\s*Team Score:\s*([+-]?\d+)\*\*/i)
    ?? text.match(/AI Score:\s*([+-]?\d+)\s*\|\s*Team Score:\s*([+-]?\d+)/i);
  if (!match) return { aiScore: 0, teamScore: 0 };
  return { aiScore: Number(match[1]), teamScore: Number(match[2]) };
}

function parseSectionBlock(markdown: string, titlePattern: RegExp): HumanScoreSection {
  const match = markdown.match(titlePattern);
  if (!match || match.index === undefined) return { ...EMPTY_SECTION };

  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextHeading = rest.search(/\n#{1,3}\s+\S/);
  const block = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const scores = parseSectionScores(block);
  const notes = block
    .replace(/\*\*AI Score:[^*]+\*\*/gi, '')
    .replace(/AI Score:[^\n]+/gi, '')
    .trim();

  return { ...scores, notes };
}

function parseHeadingValue(markdown: string, heading: string): string {
  const match = markdown.match(new RegExp(`#{1,3}\\s*${heading}\\s*\\n+([^\\n#]+)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parseMultilineHeading(markdown: string, heading: string): string {
  const match = markdown.match(new RegExp(`#{1,3}\\s*${heading}\\s*\\n+([\\s\\S]*?)(?=\\n#{1,3}\\s|$)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

export function parseHumanScoreMarkdown(week: number, markdown: string): HumanScoreData {
  const macro = parseSectionBlock(markdown, /#{1,3}\s*Macro[^\n]*/i);
  const technical = parseSectionBlock(markdown, /#{1,3}\s*Technical[^\n]*/i);
  const almanac = parseSectionBlock(markdown, /#{1,3}\s*Almanac[^\n]*/i);
  const llmConsensus = parseSectionBlock(
    markdown,
    /#{1,3}\s*(AI Consensus|AI Model Agreement|LLM Integration|LLM)[^\n]*/i
  );
  const wildcard = parseSectionBlock(
    markdown,
    /#{1,3}\s*(Wild Card|Wild Card \/ Human Observation)[^\n]*/i
  );

  const finalBias =
    markdown.match(/\*\*HUMAN FINAL BIAS:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? markdown.match(/\*\*Verdict:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? parseHeadingValue(markdown, 'Verdict')
    ?? markdown.match(/Verdict:\s*\*\*(.+?)\*\*/i)?.[1]?.trim()
    ?? '';

  const confidence =
    markdown.match(/\*\*CONFIDENCE:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? markdown.match(/\*\*Confidence:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? parseHeadingValue(markdown, 'Confidence')
    ?? markdown.match(/Confidence:\s*(.+)/i)?.[1]?.trim()
    ?? 'Medium';

  const afterVerdict = markdown.match(/Verdict:\s*\*\*(.+?)\*\*\s*\n+\s*([\s\S]*?)(?=\n#{1,3}\s|\n## Citations|$)/i);

  const recommendation =
    markdown.match(/\*\*Recommendation:\*\*\s*(.+)/i)?.[1]?.trim()
    ?? parseMultilineHeading(markdown, 'Final Call')
    ?? parseMultilineHeading(markdown, 'Final Calibration Summary')
    ?? parseMultilineHeading(markdown, 'Recommendation')
    ?? afterVerdict?.[2]?.trim()
    ?? markdown.match(/Recommendation:\s*(.+)/i)?.[1]?.trim()
    ?? '';

  return {
    week,
    macro,
    technical,
    almanac,
    llmConsensus,
    wildcard,
    finalBias,
    confidence,
    recommendation,
    markdown,
    source: 'github',
  };
}

function sectionBlock(title: string, section: HumanScoreSection): string {
  return `## ${title}

AI Score: ${section.aiScore} | Team Score: ${section.teamScore}

${section.notes.trim() || 'No additional notes.'}
`;
}

function scoreBreakdown(data: HumanScoreData): string {
  const parts = [
    `${data.macro.teamScore >= 0 ? '+' : ''}${data.macro.teamScore} Macro`,
    `${data.technical.teamScore >= 0 ? '+' : ''}${data.technical.teamScore} Technical`,
    `${data.almanac.teamScore >= 0 ? '+' : ''}${data.almanac.teamScore} Almanac`,
    `${data.llmConsensus.teamScore >= 0 ? '+' : ''}${data.llmConsensus.teamScore} AI`,
    `${data.wildcard.teamScore >= 0 ? '+' : ''}${data.wildcard.teamScore} Wild Card`,
  ];
  return parts.join(' ');
}

export function buildHumanScoreMarkdown(data: HumanScoreData): string {
  const total = computeHumanScoreTotal(data);
  const verdict = data.finalBias.trim() || 'Pending';

  return `# Human Score – Week ${data.week}

${sectionBlock('Macro / News Weight', data.macro)}

---

${sectionBlock('Technical Structure', data.technical)}

---

${sectionBlock('Almanac / Seasonality', data.almanac)}

---

${sectionBlock('AI Consensus', data.llmConsensus)}

---

${sectionBlock('Wild Card / Human Observation', data.wildcard)}

---

## Final Decision

**Human Score Total:** ${total >= 0 ? '+' : ''}${total}

(${scoreBreakdown(data)})

**Verdict:** ${verdict}
**CONFIDENCE:** ${data.confidence}
**Recommendation:** ${data.recommendation.trim() || 'No recommendation recorded.'}
`;
}

export function formatScoreBreakdown(data: HumanScoreData): string {
  const parts = [
    `${data.macro.teamScore >= 0 ? '+' : ''}${data.macro.teamScore} Macro`,
    `${data.technical.teamScore >= 0 ? '+' : ''}${data.technical.teamScore} Technical`,
    `${data.almanac.teamScore >= 0 ? '+' : ''}${data.almanac.teamScore} Almanac`,
    `${data.llmConsensus.teamScore >= 0 ? '+' : ''}${data.llmConsensus.teamScore} AI`,
    `${data.wildcard.teamScore >= 0 ? '+' : ''}${data.wildcard.teamScore} Wild Card`,
  ];
  return `(${parts.join(' ')})`;
}

const STORAGE_PREFIX = 'tradekyamal-human-score-w';

export function loadHumanScoreLocal(week: number): HumanScoreData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${week}`);
    if (!raw) return null;
    return JSON.parse(raw) as HumanScoreData;
  } catch {
    return null;
  }
}

export function saveHumanScoreLocal(data: HumanScoreData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_PREFIX}${data.week}`, JSON.stringify(data));
}

export function applyAgentBiases(
  data: HumanScoreData,
  biases: Record<string, string | null | undefined>
): HumanScoreData {
  const next = { ...data };
  const map: Array<[keyof HumanScoreData, string]> = [
    ['macro', 'macro'],
    ['technical', 'technical'],
    ['almanac', 'almanac'],
    ['llmConsensus', 'llm'],
  ];

  for (const [key, agentId] of map) {
    const section = next[key] as HumanScoreSection;
    if (section.aiScore === 0 && section.teamScore === 0 && !section.notes.trim()) {
      const score = biasToAiScore(biases[agentId]);
      (next[key] as HumanScoreSection) = { ...section, aiScore: score, teamScore: score };
    }
  }

  return next;
}
