import {
  createIssueScenario as createIssueScenarioUseCase,
  getIssueScenariosPayload,
  getScenarioByIdPayload,
  removeIssueScenario,
} from "../../modules/issues/scenarios/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const createIssueScenario = async (req, res) => {
  const { scenarioId } = await createIssueScenarioUseCase({
    userId: req.uid,
    issueId: req.params.id,
    targetModelId: req.body.targetModelId,
    scenarioName: req.body.scenarioName,
    scenarioDescription: req.body.scenarioDescription,
    paramOverrides: req.body.paramOverrides,
  });

  return sendSuccess(
    res,
    "Scenario created successfully",
    {
      scenarioId,
    },
    201
  );
};

export const getIssueScenarios = async (req, res) => {
  const { scenarios } = await getIssueScenariosPayload({
    issueId: req.params.id,
    userId: req.uid,
  });

  return sendSuccess(res, "Scenarios fetched successfully", scenarios);
};

export const getScenarioById = async (req, res) => {
  const { scenario } = await getScenarioByIdPayload({
    scenarioId: req.params.scenarioId,
    userId: req.uid,
  });

  return sendSuccess(res, "Scenario fetched successfully", scenario);
};

export const removeScenario = async (req, res) => {
  const scenarioId = req.params.scenarioId;

  await removeIssueScenario({
    scenarioId,
    userId: req.uid,
  });

  return sendSuccess(res, "Scenario deleted", { scenarioId });
};
