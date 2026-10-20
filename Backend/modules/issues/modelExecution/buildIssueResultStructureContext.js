import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import { getResultStructureOrThrow } from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";
import { resolveResultStructureParameterContextsOrThrow } from "../../decisionPlugins/modelParameters/resolveResultStructureParameterContexts.js";

export const buildIssueResultStructureContextOrThrow = async ({ issue }) => {
  const resultStructureMetadata = resolveResultStructureMetadata(issue);
  const resultStructure = getResultStructureOrThrow(
    resultStructureMetadata.resultStructureKey,
    resultStructureMetadata.resultStructureVersion
  );
  if (Object.keys(resultStructure.modelParameterContexts ?? {}).length === 0) {
    return {};
  }

  const creationSnapshot = await IssueStateSnapshot.findOne({
    issue: issue._id,
    snapshotType: "creation",
  })
    .select("state.model.parameters")
    .lean();
  const parameterDefinitions = creationSnapshot?.state?.model?.parameters;
  if (!Array.isArray(parameterDefinitions)) {
    throw createInternalError(
      "Creation snapshot does not contain the model parameter definitions required by the result structure",
      { field: "issue.creationSnapshot.state.model.parameters" }
    );
  }

  return resolveResultStructureParameterContextsOrThrow({
    ...resultStructureMetadata,
    parameterDefinitions,
    parameterValues: issue.modelParameters,
  });
};
