import dayjs from "dayjs";

export const CREATE_ISSUE_STEPS = [
  "Model",
  "Alternatives",
  "Criteria",
  "Experts",
  "Expression domain",
  "Summary",
];

export const buildCreateIssueAllData = ({
  issueName,
  issueDescription,
  selectedModel,
  effectiveIsConsensus,
  alternatives,
  criteria,
  addedExperts,
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
