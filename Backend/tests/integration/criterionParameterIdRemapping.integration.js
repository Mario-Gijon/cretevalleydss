import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createPrometheeFixtures,
  createRemappedPrometheeRequestPayload,
} from "../issues/creation/criterionParameterIdRemappingFixture.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const python = process.env.DECISION_MODELS_PYTHON?.trim();
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const decisionModelsServiceRoot = resolve(repositoryRoot, "DecisionModelsService");
const prometheeInputScript = [
  "import json, sys",
  "from schemas.model_requests import GenericModelExecutionRequest",
  "from models.promethee_vi.executor import _input",
  "payload = GenericModelExecutionRequest.model_validate(json.load(sys.stdin))",
  "execution_input = _input(payload)",
  "print(json.dumps({'q_thresholds': execution_input['q_thresholds'], 's_thresholds': execution_input['s_thresholds'], 'p_thresholds': execution_input['p_thresholds'], 'preference_functions': execution_input['preference_functions'], 'weights_lower': execution_input['weights_lower'], 'weights_upper': execution_input['weights_upper']}))",
].join("\n");

const readPrometheeInput = (payload) => {
  if (!python) {
    throw new Error(
      "Set DECISION_MODELS_PYTHON to a Python interpreter with DecisionModelsService dependencies installed."
    );
  }

  return JSON.parse(execFileSync(
    python,
    ["-c", prometheeInputScript],
    {
      cwd: decisionModelsServiceRoot,
      input: JSON.stringify(payload),
      encoding: "utf8",
    }
  ));
};

describe("Backend and DecisionModelsService criterion parameter integration", () => {
  it("passes remapped PROMETHEE VI parameters to the real input preparer", async () => {
    const fixtures = await createPrometheeFixtures();
    const { payload } = await createRemappedPrometheeRequestPayload(fixtures);

    expect(readPrometheeInput(payload)).toEqual({
      q_thresholds: [0.07, 0.13, 0.03],
      s_thresholds: [0.17, 0.19, 0.11],
      p_thresholds: [0.27, 0.29, 0.21],
      preference_functions: ["t6", "t3", "t2"],
      weights_lower: [0.6, 0.5, 0.4],
      weights_upper: [0.9, 0.8, 0.7],
    });
  }, 20000);
});
