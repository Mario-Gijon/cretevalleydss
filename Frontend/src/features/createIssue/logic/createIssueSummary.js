import dayjs from "dayjs";

export const CREATE_ISSUE_STEPS = [
  "Model",
  "Alternatives",
  "Criteria",
  "Experts",
  "Expression domain",
  "Summary",
];

export const CREATE_ISSUE_STEP_DESCRIPTIONS = {
  Model: "Choose the decision model used to process the evaluations.",
  Alternatives: "Add the options that will be compared in the decision.",
  Criteria: "Define the factors used to evaluate the alternatives.",
  Experts: "Choose the experts who will participate in the decision.",
  "Expression domain": "Choose the scale used to express the evaluations.",
  Summary: "Review the configuration before creating the issue.",
};

export const getCreateIssueStepDescription = (activeStep) => {
  const step = CREATE_ISSUE_STEPS[activeStep];
  return CREATE_ISSUE_STEP_DESCRIPTIONS[step] ?? "";
};

export const buildCreateIssueAllData = ({
  issueName,
  issueDescription,
  selectedModel,
  effectiveIsConsensus,
  alternatives,
  criteria,
  addedExperts,
  expertWeights,
  closureDate,
  expressionDomainConfig,
  criteriaWeightingConfig,
  paramValues,
  consensusMaxPhases,
  consensusThreshold,
  simulateConsensus,
}) => ({
  issueName,
  issueDescription,
  selectedModel,
  isConsensus: effectiveIsConsensus,
  alternatives,
  criteria,
  addedExperts,
  expertWeights,
  closureDate: closureDate ? dayjs(closureDate).startOf("day").toDate() : null,
  expressionDomainConfig,
  criteriaWeightingConfig,
  paramValues,
  ...(effectiveIsConsensus && { consensusMaxPhases, consensusThreshold }),
  simulateConsensus,
});

export const buildCreateIssueHeaderSubtitle = (activeStep) => {
  const label = CREATE_ISSUE_STEPS[activeStep] ?? "";
  const total = CREATE_ISSUE_STEPS.length;
  return `${label} • Step ${activeStep + 1}/${total}`;
};
