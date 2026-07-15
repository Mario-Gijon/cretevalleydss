import { getScenarioCompleteness } from "./serializeScenarios.js";

export const serializeExecutionMetadata = ({ scenarios }) => ({
  contractVersion: 1,
  generatedAt: new Date().toISOString(),
  completeness: {
    missingEvidence: [
      { code: "BASE_MODEL_DEFINITION_SNAPSHOT_NOT_STORED" },
      ...getScenarioCompleteness({ scenarios }),
    ],
  },
});
