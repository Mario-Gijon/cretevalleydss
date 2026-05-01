import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalysis.js";

import { getUserFinishedIssueIds } from "../issue.queries.js";
import {
  buildIssueResultsAnalysisContext,
  getAuthorizedResolvedIssueForAnalysisOrThrow,
} from "./analysis.context.js";
import { requestResultsAnalysis } from "../../../services/modelApi/modelAnalysisClient.js";
import { isAppError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const ANALYSIS_VERSION = "1.0";

const resolvePhaseFromContext = (analysisContext, issue) => {
  const phaseFromContext = Number(analysisContext?.evaluations?.phaseUsed);
  if (Number.isInteger(phaseFromContext) && phaseFromContext > 0) {
    return phaseFromContext;
  }

  const phaseFromIssue = Number(issue?.consensusPhase);
  if (Number.isInteger(phaseFromIssue) && phaseFromIssue > 0) {
    return phaseFromIssue;
  }

  return 1;
};

const buildModelSnapshot = (analysisContext) => ({
  apiModelKey: analysisContext?.model?.apiModelKey ?? null,
  evaluationStructure: analysisContext?.model?.evaluationStructure ?? null,
  inputKind: analysisContext?.model?.inputKind ?? null,
  outputKind: analysisContext?.model?.outputKind ?? null,
  lifecycleKind: analysisContext?.model?.lifecycleKind ?? null,
  modelVersion: analysisContext?.model?.modelVersion ?? null,
  versionLabel: analysisContext?.model?.versionLabel ?? null,
});

const toResultsAnalysisDto = (doc) => {
  if (!doc) return null;

  return {
    id: toIdString(doc._id),
    issue: toIdString(doc.issue),
    phase: doc.phase ?? null,
    status: doc.status,
    source: doc.source,
    contextVersion: doc.contextVersion ?? null,
    analysisVersion: doc.analysisVersion ?? null,
    generatedAt: doc.generatedAt ?? null,
    generatedBy: toIdString(doc.generatedBy),
    modelSnapshot: doc.modelSnapshot ?? null,
    contextWarnings: Array.isArray(doc.contextWarnings) ? doc.contextWarnings : [],
    analysis: doc.analysis ?? null,
    error: doc.error?.code || doc.error?.message ? doc.error : null,
  };
};

const saveCompletedResultsAnalysis = async ({
  issue,
  userId,
  analysisContext,
  analysis,
  source = "manual",
}) => {
  const created = await IssueResultsAnalysis.create({
    issue: issue._id,
    phase: resolvePhaseFromContext(analysisContext, issue),
    status: "completed",
    source,
    contextVersion: analysisContext?.contextVersion || null,
    analysisVersion: ANALYSIS_VERSION,
    generatedAt: new Date(),
    generatedBy: userId || null,
    modelSnapshot: buildModelSnapshot(analysisContext),
    contextWarnings: Array.isArray(analysisContext?.warnings)
      ? analysisContext.warnings
      : [],
    analysis,
    error: {
      code: null,
      message: null,
      details: null,
    },
  });

  return created;
};

const saveFailedResultsAnalysis = async ({
  issue,
  userId,
  analysisContext,
  error,
  source = "manual",
}) => {
  const errorCode = error?.code || "RESULTS_ANALYSIS_FAILED";
  const errorMessage = error?.message || "Results analysis generation failed";
  const errorDetails = error?.details ?? null;

  const created = await IssueResultsAnalysis.create({
    issue: issue._id,
    phase: resolvePhaseFromContext(analysisContext, issue),
    status: "failed",
    source,
    contextVersion: analysisContext?.contextVersion || null,
    analysisVersion: ANALYSIS_VERSION,
    generatedAt: new Date(),
    generatedBy: userId || null,
    modelSnapshot: buildModelSnapshot(analysisContext),
    contextWarnings: Array.isArray(analysisContext?.warnings)
      ? analysisContext.warnings
      : [],
    analysis: null,
    error: {
      code: errorCode,
      message: errorMessage,
      details: errorDetails,
    },
  });

  return created;
};

const getLatestIssueResultsAnalysis = async ({ issueId }) => {
  return IssueResultsAnalysis.findOne({ issue: issueId })
    .sort({ generatedAt: -1 })
    .lean();
};

/**
 * Genera, persiste y devuelve un análisis de resultados para un issue finalizado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario solicitante.
 * @returns {Promise<Object>} DTO persistido del análisis generado.
 */
export const generateIssueResultsAnalysisFlow = async ({ issueId, userId }) => {
  const visibleFinishedIssueIds = await getUserFinishedIssueIds(userId, {
    excludeHidden: true,
  });

  const issue = await getAuthorizedResolvedIssueForAnalysisOrThrow({
    issueId,
    userId,
    visibleFinishedIssueIds,
  });

  const analysisContext = await buildIssueResultsAnalysisContext({
    issueId,
    userId,
    visibleFinishedIssueIds,
  });

  try {
    const analysis = await requestResultsAnalysis({
      analysisContext,
    });

    const saved = await saveCompletedResultsAnalysis({
      issue,
      userId,
      analysisContext,
      analysis,
      source: "manual",
    });

    return toResultsAnalysisDto(saved.toObject());
  } catch (error) {
    await saveFailedResultsAnalysis({
      issue,
      userId,
      analysisContext,
      error,
      source: "manual",
    });

    if (isAppError(error)) {
      throw error;
    }

    throw error;
  }
};

/**
 * Obtiene el último análisis de resultados persistido para un issue finalizado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario solicitante.
 * @returns {Promise<Object|null>} DTO del análisis o null si no existe.
 */
export const getSavedIssueResultsAnalysisFlow = async ({ issueId, userId }) => {
  const visibleFinishedIssueIds = await getUserFinishedIssueIds(userId, {
    excludeHidden: true,
  });

  await getAuthorizedResolvedIssueForAnalysisOrThrow({
    issueId,
    userId,
    visibleFinishedIssueIds,
  });

  const latest = await getLatestIssueResultsAnalysis({ issueId });

  return toResultsAnalysisDto(latest);
};
