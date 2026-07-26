import type { HumanScoreData, HumanScoreSection } from '@/lib/types';

const EMPTY_SECTION: HumanScoreSection = { aiScore: 0, teamScore: 0, notes: '' };

export function emptyHumanScore(week: number): HumanScoreData {
  return {
    week,
    macro: { ...EMPTY_SECTION },
    technical: { ...EMPTY_SECTION },
    almanac: { ...EMPTY_SECTION },
    llmConsensus: { ...EMPTY_SECTION },
    finalBias: '',
    confidence: 'Medium',
  };
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
  const nextHeading = rest.search(/\n## /);
  const block = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const scores = parseSectionScores(block);
  const notes = block
    .replace(/\*\*AI Score:[^*]+\*\*/gi, '')
    .replace(/AI Score:[^\n]+/gi, '')
    .trim();

  return { ...scores, notes };
}

export function parseHumanScoreMarkdown(week: number, markdown: string): HumanScoreData {
  const macro = parseSectionBlock(markdown, /##\s*Macro[^\n]*/i);
  const technical = parseSectionBlock(markdown, /##\s*Technical[^\n]*/i);
  const almanac = parseSectionBlock(markdown, /##\s*Almanac[^\n]*/i);
  const llmConsensus = parseSectionBlock(
    markdown,
    /##\s*(AI Consensus|AI Model Agreement|LLM)[^\n]*/i
  );

  const biasMatch = markdown.match(/\*\*HUMAN FINAL BIAS:\*\*\s*(.+)/i)
    ?? markdown.match(/Verdict:\s*\*\*(.+?)\*\*/i);
  const confidenceMatch = markdown.match(/\*\*CONFIDENCE:\*\*\s*(.+)/i);

  return {
    week,
    macro,
    technical,
    almanac,
    llmConsensus,
    finalBias: biasMatch?.[1]?.trim() ?? '',
    confidence: confidenceMatch?.[1]?.trim() ?? 'Medium',
    markdown,
    source: 'github',
  };
}
