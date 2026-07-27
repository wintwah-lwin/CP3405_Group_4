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

function parseSectionScores(text: string): { aiScore: number; teamScore: number } {
  const match = text.match(/AI Score:\s*([+-]?\d+)\s*\|\s*Team Score:\s*([+-]?\d+)/i)
    ?? text.match(/\*\*AI Score:\s*([+-]?\d+)\s*\|\s*Team Score:\s*([+-]?\d+)\*\*/i);
  if (!match) return { aiScore: 0, teamScore: 0 };
  return { aiScore: Number(match[1]), teamScore: Number(match[2]) };
}

function parseSectionBlock(markdown: string, titlePattern: RegExp): HumanScoreSection {
  const match = markdown.match(titlePattern);
  if (!match || match.index === undefined) return { ...EMPTY_SECTION };

  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextHeading = rest.search(/\n#{2,3} /);
  const block = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const scores = parseSectionScores(block);
  const notes = block
    .replace(/\*\*AI Score:[^*]+\*\*/gi, '')
    .replace(/AI Score:[^\n]+/gi, '')
    .trim();

  return { ...scores, notes };
}

export function parseHumanScoreMarkdown(week: number, markdown: string): HumanScoreData {
  const macro = parseSectionBlock(markdown, /#{2,3}\s*Macro[^\n]*/i);
  const technical = parseSectionBlock(markdown, /#{2,3}\s*Technical[^\n]*/i);
  const almanac = parseSectionBlock(markdown, /#{2,3}\s*Almanac[^\n]*/i);
  const llmConsensus = parseSectionBlock(
    markdown,
    /#{2,3}\s*(AI Consensus|AI Model Agreement|LLM)[^\n]*/i
  );
  const wildcard = parseSectionBlock(
    markdown,
    /#{2,3}\s*(Wild Card|Wild Card \/ Human Observation)[^\n]*/i
  );

  const biasMatch = markdown.match(/\*\*HUMAN FINAL BIAS:\*\*\s*(.+)/i)
    ?? markdown.match(/\*\*Verdict:\*\*\s*(.+)/i)
    ?? markdown.match(/Verdict:\s*\*\*(.+?)\*\*/i);
  const confidenceMatch = markdown.match(/\*\*CONFIDENCE:\*\*\s*(.+)/i)
    ?? markdown.match(/\*\*Confidence:\*\*\s*(.+)/i)
    ?? markdown.match(/Confidence:\s*(.+)/i);
  const recommendationMatch = markdown.match(/\*\*Recommendation:\*\*\s*(.+)/i)
    ?? markdown.match(/Recommendation:\s*(.+)/i);

  return {
    week,
    macro,
    technical,
    almanac,
    llmConsensus,
    wildcard,
    finalBias: biasMatch?.[1]?.trim() ?? '',
    confidence: confidenceMatch?.[1]?.trim() ?? 'Medium',
    recommendation: recommendationMatch?.[1]?.trim() ?? '',
    markdown,
    source: 'github',
  };
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
