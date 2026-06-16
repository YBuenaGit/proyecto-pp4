export type BookTextSection = {
  label: string;
  text?: string | null;
};

export type BookTextBlock = {
  label: string;
  text: string;
};

export type BookTextPage = {
  blocks: BookTextBlock[];
};

const CHARS_PER_LINE = 64;
const MIN_CHUNK_LINES = 4;

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() ?? "";
}

function estimateLineCount(text: string) {
  return text
    .split("\n")
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
}

function findBreakIndex(text: string, maxChars: number) {
  if (text.length <= maxChars) return text.length;

  const windowStart = Math.max(0, maxChars - 220);
  const candidates = ["\n\n", "\n", ". ", "; ", ", ", " "];

  for (const candidate of candidates) {
    const index = text.lastIndexOf(candidate, maxChars);
    if (index >= windowStart) {
      return index + candidate.length;
    }
  }

  return maxChars;
}

function takeTextChunk(text: string, lineBudget: number) {
  const safeLineBudget = Math.max(MIN_CHUNK_LINES, lineBudget);
  const maxChars = safeLineBudget * CHARS_PER_LINE;

  if (estimateLineCount(text) <= safeLineBudget) {
    return { chunk: text, rest: "" };
  }

  let breakIndex = findBreakIndex(text, maxChars);
  let chunk = text.slice(0, breakIndex).trim();
  let rest = text.slice(breakIndex).trim();

  while (estimateLineCount(chunk) > safeLineBudget && chunk.length > CHARS_PER_LINE) {
    breakIndex = findBreakIndex(chunk, Math.max(CHARS_PER_LINE, Math.floor(chunk.length * 0.85)));
    rest = `${chunk.slice(breakIndex).trim()} ${rest}`.trim();
    chunk = chunk.slice(0, breakIndex).trim();
  }

  if (!chunk) {
    chunk = text.slice(0, maxChars).trim();
    rest = text.slice(maxChars).trim();
  }

  return { chunk, rest };
}

export function paginateBookTextSections(
  sections: BookTextSection[],
  options: {
    firstPageLines?: number;
    continuationPageLines?: number;
    sectionOverheadLines?: number;
  } = {},
) {
  const firstPageLines = options.firstPageLines ?? 13;
  const continuationPageLines = options.continuationPageLines ?? 19;
  const sectionOverheadLines = options.sectionOverheadLines ?? 2;
  const pages: BookTextPage[] = [];
  let current: BookTextPage = { blocks: [] };
  let remainingLines = firstPageLines;

  function startNewPage() {
    if (current.blocks.length) {
      pages.push(current);
    }
    current = { blocks: [] };
    remainingLines = continuationPageLines;
  }

  sections.forEach((section) => {
    let text = normalizeText(section.text);
    let isContinuation = false;

    while (text) {
      const wholeSectionLines = estimateLineCount(text) + sectionOverheadLines;
      const minimumLinesNeeded = Math.min(wholeSectionLines, MIN_CHUNK_LINES + sectionOverheadLines);

      if (current.blocks.length && remainingLines < minimumLinesNeeded) {
        startNewPage();
      }

      const availableLines = Math.max(MIN_CHUNK_LINES, remainingLines - sectionOverheadLines);
      const { chunk, rest } = takeTextChunk(text, availableLines);

      current.blocks.push({
        label: isContinuation ? `${section.label} (continuacion)` : section.label,
        text: chunk,
      });

      remainingLines -= estimateLineCount(chunk) + sectionOverheadLines;
      text = rest;
      isContinuation = true;

      if (text) {
        startNewPage();
      }
    }
  });

  if (current.blocks.length || !pages.length) {
    pages.push(current);
  }

  return pages;
}

export function chunkForBookPages<T>(items: T[], size: number) {
  const pages: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }

  return pages.length ? pages : [[]];
}
