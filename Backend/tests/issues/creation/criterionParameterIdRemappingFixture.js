import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { Issue } from "../../../models/Issues.js";
import { buildIssueModelRequestPayload } from "../../../modules/issues/modelExecution/buildIssueModelRequestPayload.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
  prepareAndPersistIssueCreation,
} from "../../setup/fixtures.js";

const criterionParameter = (key, structure = "numberCriterion", extra = {}) => ({
  key,
  name: key,
  parameterStructureKey: structure,
  required: true,
  ...extra,
});

export const prometheeParameters = [
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

export const createPrometheeFixtures = async () => {
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

export const buildIssueInfo = ({ model, domain, expert, criteria, paramValues }) =>
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

export const createRemappedPrometheeRequestPayload = async ({
  owner,
  expert,
  model,
  domain,
}) => {
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

  return { issue, payload, idByName, inputIds, valuesByParameter };
};
