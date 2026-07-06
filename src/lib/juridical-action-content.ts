const sectionLabels = {
  description: "Descripcion / relato",
  guidanceProvided: "Intervencion realizada / orientacion brindada",
  nextStepDescription: "Proxima accion",
} as const;

type SectionLabel = (typeof sectionLabels)[keyof typeof sectionLabels];
type SectionMatch = { label: SectionLabel; marker: string; index: number };

export type JuridicalActionContentParts = {
  description: string;
  guidanceProvided: string;
  nextStepDescription: string;
};

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function buildJuridicalActionContent(
  parts: Partial<JuridicalActionContentParts>,
) {
  return [
    [sectionLabels.description, clean(parts.description)],
    [sectionLabels.guidanceProvided, clean(parts.guidanceProvided)],
    [sectionLabels.nextStepDescription, clean(parts.nextStepDescription)],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}:\n${value}`)
    .join("\n\n");
}

export function parseJuridicalActionContent(
  content: string | null | undefined,
): JuridicalActionContentParts {
  const text = clean(content);
  if (!text)
    return { description: "", guidanceProvided: "", nextStepDescription: "" };

  const labels = Object.values(sectionLabels);
  const matches: SectionMatch[] = labels
    .flatMap((label) => {
      const marker = `${label}:\n`;
      const index = text.indexOf(marker);
      return index >= 0 ? [{ label, marker, index }] : [];
    })
    .sort((a, b) => a.index - b.index);

  if (!matches.length)
    return { description: text, guidanceProvided: "", nextStepDescription: "" };

  const parts: JuridicalActionContentParts = {
    description: "",
    guidanceProvided: "",
    nextStepDescription: "",
  };
  matches.forEach((match, index) => {
    const start = match.index + match.marker.length;
    const end = matches[index + 1]?.index ?? text.length;
    const value = text.slice(start, end).trim();
    if (match.label === sectionLabels.description) parts.description = value;
    if (match.label === sectionLabels.guidanceProvided)
      parts.guidanceProvided = value;
    if (match.label === sectionLabels.nextStepDescription)
      parts.nextStepDescription = value;
  });

  return parts;
}

function compactDerivationDescription(content: string | null | undefined) {
  const text = clean(content);
  if (!text) return "Derivacion";

  const firstLine = text.split(/\r?\n/)[0]?.trim() ?? "";
  const match = firstLine.match(/^(Derivacion a [^:.]+)(?:[:.].*)?$/i);
  return (match?.[1] ?? firstLine).replace(/\s+/g, " ").trim();
}

export function parseJuridicalActionContentForDisplay(
  content: string | null | undefined,
  actionType: string | null | undefined,
): JuridicalActionContentParts {
  if (actionType !== "DERIVACION") return parseJuridicalActionContent(content);

  return {
    description: compactDerivationDescription(
      parseJuridicalActionContent(content).description || content,
    ),
    guidanceProvided: "",
    nextStepDescription: "",
  };
}
