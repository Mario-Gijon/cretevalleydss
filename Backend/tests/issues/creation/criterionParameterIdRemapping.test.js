import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { Issue } from "../../../models/Issues.js";
import { buildIssueModelRequestPayload } from "../../../modules/issues/modelExecution/buildIssueModelRequestPayload.js";
import {
  persistPreparedIssueCreation,
  prepareIssueCreation,
} from "../../../modules/issues/creation/createIssue.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
  prepareAndPersistIssueCreation,
  persistPreparedIssueCreationInTransaction,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

afterEach(() => {
  vi.restoreAllMocks();
});

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const decisionModelsServiceRoot = resolve(projectRoot, "DecisionModelsService");
const python = resolve(decisionModelsServiceRoot, ".venv/bin/python");
const prometheeInputScript = [
  "import json, sys",
  "from schemas.model_requests import GenericModelExecutionRequest",
  "from models.promethee_vi.executor import _input",
  "payload = GenericModelExecutionRequest.model_validate(json.load(sys.stdin))",
  "execution_input = _input(payload)",
  "print(json.dumps({'q_thresholds': execution_input['q_thresholds'], 's_thresholds': execution_input['s_thresholds'], 'p_thresholds': execution_input['p_thresholds'], 'preference_functions': execution_input['preference_functions'], 'weights_lower': execution_input['weights_lower'], 'weights_upper': execution_input['weights_upper']}))",
].join("\n");

const readPrometheeInput = (payload) => JSON.parse(execFileSync(
  python,
  ["-c", prometheeInputScript],
  {
    cwd: decisionModelsServiceRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  }
));

const criterionParameter = (key, structure = "numberCriterion", extra = {}) => ({
  key,
  name: key,
  parameterStructureKey: structure,
  required: true,
  ...extra,
});

const prometheeParameters = [
  criterionParameter("q", "numberCriterion", { default: 0.05 }),
  criterionParameter("s", "numberCriterion", { default: 0.10 }),
  criterionParameter("p", "numberCriterion", { default: 0.20 }),
  criterionParameter("f", "selectCriterion", {
    valueType: "string",
    default: "t5",
    restrictions: { allowed: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"] },
  }),
  criterionParameter("w_lower", "numberCriterion", { default: 1 }),
  criterionParameter("w_upper", "numberCriterion", { default: 1 }),
  criterionParameter("iterations", "numberGlobal", {
    valueType: "integer",
    default: 1,
    restrictions: { min: 1, max: null, allowed: null },
  }),
];

const createPrometheeFixtures = async () => {
  const owner = await createConfirmedUser({ email: "criterion-remap-owner@example.com" });
  const expert = await createConfirmedUser({ email: "criterion-remap-expert@example.com" });
  const model = await createIssueModel({
    name: "PROMETHEE VI criterion ID remapping",
    apiModelKey: "promethee_vi",
    apiEndpoint: { method: "POST", path: "/promethee_vi" },
    parameters: prometheeParameters,
  });
  const domain = await createExpressionDomainFixture({ userId: owner._id });
  return { owner, expert, model, domain };
};

const buildIssueInfo = ({ model, domain, expert, criteria, paramValues }) =>
  buildCreateIssueInfo({
    selectedModelId: model._id,
    globalDomainId: domain._id,
    addedExperts: [expert.email],
    alternatives: [
      { id: "temporary-alt-coast", name: "Coastal option" },
      { id: "temporary-alt-forest", name: "Forest option" },
    ],
    criteria,
    paramValues,
  });

describe("criterion-keyed model parameter remapping during issue creation", () => {
  it("remaps added, nested, and reordered criteria to Mongo ids for PROMETHEE VI", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();

    // The final form has added Reliability, removed an earlier criterion, and reordered Cost first.
    const inputIds = {
      quality: "temporary-quality",
      cost: "temporary-cost",
      reliability: "temporary-reliability",
    };
    const valuesByParameter = {
      q: { quality: 0.03, cost: 0.07, reliability: 0.13 },
      s: { quality: 0.11, cost: 0.17, reliability: 0.19 },
      p: { quality: 0.21, cost: 0.27, reliability: 0.29 },
      f: { quality: "t2", cost: "t6", reliability: "t3" },
      w_lower: { quality: 0.4, cost: 0.6, reliability: 0.5 },
      w_upper: { quality: 0.7, cost: 0.9, reliability: 0.8 },
    };
    const paramValues = Object.fromEntries(
      Object.entries(valuesByParameter).map(([key, byName]) => [
        key,
        Object.fromEntries(Object.entries(inputIds).map(([name, id]) => [id, byName[name]])),
      ])
    );
    paramValues.iterations = 1;

    await prepareAndPersistIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [
          { id: inputIds.cost, name: "Cost", type: "cost", children: [] },
          {
            id: "temporary-service-group",
            name: "Service",
            type: "group",
            children: [
              { id: inputIds.reliability, name: "Reliability", type: "benefit", children: [] },
              { id: inputIds.quality, name: "Quality", type: "benefit", children: [] },
            ],
          },
        ],
        paramValues,
      }),
    });

    const issue = await Issue.findOne({ name: "Example issue" });
    const alternatives = await Alternative.find({ issue: issue._id }).lean();
    const criteriaByName = new Map(
      (await Criterion.find({ issue: issue._id, isLeaf: true }).lean())
        .map((criterion) => [criterion.name, criterion])
    );
    const evaluations = [{
      expert: { _id: "expert-remapping", name: "Remapping expert", email: expert.email },
      payload: Object.fromEntries(alternatives.map((alternative) => [
        String(alternative._id),
        Object.fromEntries([...criteriaByName.values()].map((criterion, index) => [String(criterion._id), 4 + index])),
      ])),
    }];
    const payload = await buildIssueModelRequestPayload({
      issue,
      structureKey: "alternativeCriteriaMatrix",
      evaluations,
      phase: 0,
    });

    const idByName = Object.fromEntries(
      [...criteriaByName].map(([name, criterion]) => [name, String(criterion._id)])
    );
    expect(Object.values(idByName).every((id) => !Object.values(inputIds).includes(id))).toBe(true);
    expect(payload.context.criteria.map(({ name }) => name)).toEqual([
      "Cost",
      "Reliability",
      "Quality",
    ]);
    expect(payload.modelParameters).toEqual(issue.modelParameters);

    for (const [parameterKey, byName] of Object.entries(valuesByParameter)) {
      for (const [name, value] of Object.entries(byName)) {
        const criterionName = `${name[0].toUpperCase()}${name.slice(1)}`;
        expect(issue.modelParameters[parameterKey][idByName[criterionName]]).toBe(value);
      }
      expect(Object.keys(issue.modelParameters[parameterKey]).sort()).toEqual(
        Object.values(idByName).sort()
      );
    }

    expect(payload.context.criteria.map(({ id }) => id)).toEqual([
      idByName.Cost,
      idByName.Reliability,
      idByName.Quality,
    ]);
    expect(readPrometheeInput(payload)).toEqual({
      q_thresholds: [0.07, 0.13, 0.03],
      s_thresholds: [0.17, 0.19, 0.11],
      p_thresholds: [0.27, 0.29, 0.21],
      preference_functions: ["t6", "t3", "t2"],
      weights_lower: [0.6, 0.5, 0.4],
      weights_upper: [0.9, 0.8, 0.7],
    });
  }, 20000);

  it("rejects values left behind for a criterion deleted before submission", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const issueInfo = buildIssueInfo({
      model,
      domain,
      expert,
      criteria: [{
        id: "temporary-kept",
        name: "Kept criterion",
        type: "benefit",
        children: [],
      }],
      paramValues: {
        q: { "temporary-kept": 0.05, "temporary-removed": 0.1 },
      },
    });

    await expect(prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo,
    })).rejects.toThrow("contains unknown criterion key 'temporary-removed'");
    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
  });

  it("rejects direct persistence without an active transaction before writing", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const preparedIssueCreation = await prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [{
          id: "temporary-quality",
          name: "Quality",
          type: "benefit",
          children: [],
        }],
        paramValues: {},
      }),
    });

    await expect(persistPreparedIssueCreation({
      preparedIssueCreation,
    })).rejects.toMatchObject({
      field: "session",
      message: "Issue creation persistence requires an active MongoDB transaction",
    });

    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  });

  it("rolls back alternatives and criteria when issue persistence fails", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const preparedIssueCreation = await prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [{
          id: "temporary-quality",
          name: "Quality",
          type: "benefit",
          children: [],
        }],
        paramValues: {},
      }),
    });
    const session = await mongoose.startSession();
    const issueSaveError = new Error("forced issue save failure");
    const alternativeInsert = vi.spyOn(Alternative, "insertMany");
    const criterionInsert = vi.spyOn(Criterion, "insertMany");
    vi.spyOn(Issue.prototype, "save").mockRejectedValueOnce(issueSaveError);

    try {
      await expect(session.withTransaction(() => persistPreparedIssueCreation({
        preparedIssueCreation,
        session,
      }))).rejects.toBe(issueSaveError);
    } finally {
      await session.endSession();
    }

    expect(alternativeInsert).toHaveBeenCalledOnce();
    expect(criterionInsert).toHaveBeenCalledOnce();
    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  });

  it("rejects ambiguous criterion identities before writing documents", async () => {
    const { owner, expert, model, domain } = await createPrometheeFixtures();
    const sharedId = "temporary-duplicate-identity";

    const preparedIssueCreation = await prepareIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildIssueInfo({
        model,
        domain,
        expert,
        criteria: [{
          id: sharedId,
          name: "Group",
          type: "group",
          children: [{
            id: sharedId,
            name: "Criterion",
            type: "benefit",
            children: [],
          }],
        }],
        paramValues: {},
      }),
    });
    await expect(persistPreparedIssueCreationInTransaction(
      preparedIssueCreation
    )).rejects.toThrow("is duplicated and cannot be remapped");

    expect(await Issue.countDocuments({ name: "Example issue" })).toBe(0);
    expect(await Criterion.countDocuments()).toBe(0);
    expect(await Alternative.countDocuments()).toBe(0);
  });
});
