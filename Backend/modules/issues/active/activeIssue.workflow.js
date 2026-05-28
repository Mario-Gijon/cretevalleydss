import dayjs from "dayjs";

export const buildActiveWorkflowSteps = ({ hasAlternativeConsensus }) => {
  const steps = [
    { key: "criteriaWeighting", label: "Criteria weighting" },
    { key: "weightsFinished", label: "Weights finished" },
    { key: "alternativeEvaluation", label: "Alternative evaluation" },
  ];

  if (hasAlternativeConsensus) {
    steps.push({ key: "alternativeConsensus", label: "Alternative consensus" });
  }

  steps.push({ key: "readyResolve", label: "Ready to resolve" });

  return steps;
};

export const buildDeadlineInfo = (closureDate) => {
  if (!closureDate) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const parsedDate = dayjs(closureDate, "DD-MM-YYYY", true);
  if (!parsedDate.isValid()) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const daysLeft = parsedDate
    .startOf("day")
    .diff(dayjs().startOf("day"), "day");

  return {
    hasDeadline: true,
    daysLeft,
    overdue: daysLeft < 0,
    iso: parsedDate.toISOString(),
  };
};
