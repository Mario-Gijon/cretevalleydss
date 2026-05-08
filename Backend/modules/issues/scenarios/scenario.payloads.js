export const buildScenarioPayload = (scenarioDoc) => {
  const evaluationStructure = scenarioDoc.evaluationStructure;

  return {
    ...scenarioDoc,
    evaluationStructure,
  };
};
