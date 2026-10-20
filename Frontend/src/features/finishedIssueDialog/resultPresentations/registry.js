const PRESENTATION_MODULES = import.meta.glob("./presentations/*/v*/index.js", {
  eager: true,
});

const isComponent = (value) => typeof value === "function" || (
  value !== null && typeof value === "object" && Object.hasOwn(value, "$$typeof")
);

const presentationId = (key, version) => `${key}@${version}`;

const extractFolderIdentity = (modulePath) => {
  const match = modulePath.match(/\.\/presentations\/([^/]+)\/v(\d+)\/index\.js$/);
  if (!match) throw new Error(`[resultPresentations] Invalid module path: ${modulePath}`);
  return { key: match[1], version: Number(match[2]) };
};
export const buildResultPresentationRegistry = (modules = PRESENTATION_MODULES) => {
  const registry = {};
  for (const modulePath of Object.keys(modules).sort()) {
    const entry = modules[modulePath]?.default;
    const folderIdentity = extractFolderIdentity(modulePath);
    if (
      !entry ||
      entry.resultStructureKey !== folderIdentity.key ||
      entry.resultStructureVersion !== folderIdentity.version ||
      typeof entry.normalizeDashboardResult !== "function" ||
      typeof entry.buildDashboardFindings !== "function" ||
      !isComponent(entry.DashboardResultComponent) ||
      !isComponent(entry.ResultHeaderIconComponent) ||
      !isComponent(entry.FinishedIssueCardSummaryComponent) ||
      typeof entry.capabilities?.resultsAnalysis !== "boolean"
    ) {
      throw new Error(`[resultPresentations] Invalid presentation entry: ${modulePath}`);
    }

    const id = presentationId(entry.resultStructureKey, entry.resultStructureVersion);
    if (Object.hasOwn(registry, id)) {
      throw new Error(`[resultPresentations] Duplicate presentation: ${id}`);
    }
    registry[id] = Object.freeze(entry);
  }
  return Object.freeze(registry);
};

export const RESULT_PRESENTATION_REGISTRY = buildResultPresentationRegistry();

export const resolveResultPresentation = ({
  resultStructureKey,
  resultStructureVersion,
} = {}) => {
  const missingPair = (
    resultStructureKey === undefined && resultStructureVersion === undefined
  ) || (resultStructureKey === null && resultStructureVersion === null);

  const key = missingPair ? "ranking" : resultStructureKey;
  const version = missingPair ? 1 : resultStructureVersion;
  if (
    typeof key !== "string" || !key.trim() ||
    !Number.isInteger(version) || version <= 0
  ) {
    return {
      available: false,
      resultStructureKey: key ?? null,
      resultStructureVersion: version ?? null,
      legacyFallback: false,
      presentation: null,
      unavailableReason: "The result structure metadata is incomplete or invalid.",
    };
  }

  const presentation = RESULT_PRESENTATION_REGISTRY[presentationId(key, version)] || null;
  return {
    available: Boolean(presentation),
    resultStructureKey: key,
    resultStructureVersion: version,
    legacyFallback: missingPair,
    presentation,
    unavailableReason: presentation
      ? null
      : `Result presentation for ${presentationId(key, version)} is not available.`,
  };
};
