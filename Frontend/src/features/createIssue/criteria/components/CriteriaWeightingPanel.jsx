import { useEffect, useMemo } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  CRITERIA_WEIGHTING_MODES,
  MANUAL_CRITERIA_WEIGHTS_API_MODEL_KEY,
  buildApiCriteriaWeightingConfig,
  buildConfigByMode,
  isManualCriteriaWeightingApiModel,
  normalizeMode,
} from "../../logic/createIssueCriteriaWeightingModes";
import {
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
  resolveFuzzyCriteriaWeightValueCount,
} from "../../logic/createIssueCriteriaWeighting";
import { resolveAssignedDomainIds } from "../../logic/createIssueAssignedDomains";
import { collectLeafCriteriaByRoot } from "../../logic/createIssueCriteriaTree";
import {
  isDeepEqual,
  normalizeFuzzyWeightsByRoot,
  normalizeManualWeightsByRoot,
} from "../../logic/createIssueCriteriaWeightValues";
import { CriteriaWeightingMethodCard } from "./CriteriaWeightingMethodCard";
import { EVALUATION_STAGES } from "../../../decisionPlugins/evaluations/evaluationStages";
import { getEvaluationStructureEntryForStage } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry";
import { buildEvaluationContext } from "../../../issueEvaluation/logic/buildEvaluationContext";

export const CriteriaWeightingPanel = ({
  selectedModel,
  criteria,
  criteriaWeightingConfig,
  setCriteriaWeightingConfig,
  setDefaultModelParams,
  expressionDomainConfig,
}) => {
  const { globalDomains, expressionDomains, criteriaWeightingModels } =
    useIssuesDataContext();

  const modelUsesWeights = modelUsesCriteriaWeights(selectedModel);
  const isFuzzyModel = isFuzzyCriteriaWeightModel(selectedModel);

  const leafCriteria = useMemo(
    () => getLeafCriteria(Array.isArray(criteria) ? criteria : []),
    [criteria]
  );

  const leafCriterionItems = leafCriteria
    .map((criterion) => ({
      id: criterion?.id,
      name: criterion?.name,
    }))
    .filter((criterion) => criterion.id && criterion.name);

  const leafByRoot = useMemo(
    () => collectLeafCriteriaByRoot(Array.isArray(criteria) ? criteria : []),
    [criteria]
  );

  const isSingleCriterion = leafCriteria.length === 1;

  const assignedDomainIds = useMemo(
    () =>
      resolveAssignedDomainIds({
        expressionDomainConfig,
        leafCriteria,
      }),
    [expressionDomainConfig, leafCriteria]
  );

  const assignedDomains = useMemo(() => {
    const domainById = new Map(
      [
        ...(Array.isArray(globalDomains) ? globalDomains : []),
        ...(Array.isArray(expressionDomains) ? expressionDomains : []),
      ]
        .map((domain) => [String(domain?.id || domain?._id || "").trim(), domain])
        .filter(([id]) => id.length > 0)
    );

    return assignedDomainIds
      .map((domainId) => domainById.get(domainId))
      .filter(Boolean);
  }, [assignedDomainIds, expressionDomains, globalDomains]);

  const fuzzyValueCount = isFuzzyModel
    ? resolveFuzzyCriteriaWeightValueCount(assignedDomains)
    : null;

  const mode = normalizeMode(criteriaWeightingConfig?.mode);
  const availableCriteriaWeightingModels = useMemo(
    () =>
      (Array.isArray(criteriaWeightingModels) ? criteriaWeightingModels : []).filter(
        (modelItem) => modelItem?.isCriteriaWeightingModel === true
      ),
    [criteriaWeightingModels]
  );
  const manualCriteriaWeightingModel = useMemo(
    () =>
      availableCriteriaWeightingModels.find((modelItem) =>
        isManualCriteriaWeightingApiModel(modelItem)
      ) || null,
    [availableCriteriaWeightingModels]
  );
  const visibleApiCriteriaWeightingModels = useMemo(
    () =>
      availableCriteriaWeightingModels.filter(
        (modelItem) => !isManualCriteriaWeightingApiModel(modelItem)
      ),
    [availableCriteriaWeightingModels]
  );
  const creatorApiCriteriaWeightingModels = useMemo(
    () =>
      visibleApiCriteriaWeightingModels.filter(
        (modelItem) => modelItem?.supportsCreatorCriteriaWeighting === true
      ),
    [visibleApiCriteriaWeightingModels]
  );
  const expertApiCriteriaWeightingModels = useMemo(
    () =>
      visibleApiCriteriaWeightingModels.filter(
        (modelItem) => modelItem?.supportsExpertCriteriaWeighting === true
      ),
    [visibleApiCriteriaWeightingModels]
  );
  const selectedApiCriteriaWeightingModel = useMemo(() => {
    const selectedModelId = String(
      criteriaWeightingConfig?.criteriaWeightingModelId || ""
    ).trim();
    const selectedModelKey = String(
      criteriaWeightingConfig?.criteriaWeightingModelKey || ""
    ).trim();

    return (
      availableCriteriaWeightingModels.find((modelItem) => {
        const modelId = String(modelItem?._id || modelItem?.id || "").trim();
        const modelKey = String(modelItem?.apiModelKey || "").trim();

        return (
          (selectedModelId && modelId && modelId === selectedModelId) ||
          (selectedModelKey && modelKey && modelKey === selectedModelKey)
        );
      }) || null
    );
  }, [availableCriteriaWeightingModels, criteriaWeightingConfig]);
  const selectedCriteriaWeightingStructureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey:
          selectedApiCriteriaWeightingModel?.criteriaWeightingStructureKey || "",
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      }),
    [selectedApiCriteriaWeightingModel]
  );
  const SelectedCriteriaWeightingView =
    selectedCriteriaWeightingStructureEntry?.View || null;
  const selectedCriteriaWeightingAdapter =
    selectedCriteriaWeightingStructureEntry?.adapter || null;
  const manualExpertWeightingAvailable =
    manualCriteriaWeightingModel?.supportsExpertCriteriaWeighting === true;

  const getCriteriaWeightingModelLabel = (criteriaModel) => {
    const baseLabel =
      criteriaModel?.displayName || criteriaModel?.name || "Model";

    return String(baseLabel)
      .replace(/\s*criteria\s*weights?\s*$/i, "")
      .trim();
  };

  const updateConfig = (nextConfig, options = {}) => {
    const markDirty = options?.markDirty === true;
    if (markDirty && typeof setDefaultModelParams === "function") {
      setDefaultModelParams(false);
    }
    setCriteriaWeightingConfig?.(nextConfig);
  };

  useEffect(() => {
    if (!setCriteriaWeightingConfig) return;
    if (!modelUsesWeights) return;

    if (isFuzzyModel) {
      if (mode !== CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
        setCriteriaWeightingConfig(
          buildConfigByMode({
            mode: CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY,
            leafCriteria,
          })
        );
      }
      return;
    }

    if (isSingleCriterion) {
      if (mode !== CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
        setCriteriaWeightingConfig(
          buildConfigByMode({
            mode: CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL,
            leafCriteria,
          })
        );
      }
      return;
    }

    if (!criteriaWeightingConfig || !criteriaWeightingConfig.mode) {
      setCriteriaWeightingConfig(
        buildConfigByMode({
          mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
          leafCriteria,
        })
      );
    }
  }, [
    criteriaWeightingConfig,
    isFuzzyModel,
    isSingleCriterion,
    leafCriteria,
    mode,
    modelUsesWeights,
    setCriteriaWeightingConfig,
  ]);

  useEffect(() => {
    if (!setCriteriaWeightingConfig) return;
    if (!modelUsesWeights) return;
    if (!criteriaWeightingConfig?.mode) return;

    if (mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
      const sourceWeights = criteriaWeightingConfig?.payload?.weightsByCriterion;
      const normalizedWeights = normalizeManualWeightsByRoot({
        sourceWeights,
        leafByRoot,
        totalLeafCount: leafCriterionItems.length,
      });

      if (isDeepEqual(sourceWeights || {}, normalizedWeights)) {
        return;
      }

      setCriteriaWeightingConfig({
        ...criteriaWeightingConfig,
        payload: {
          ...(criteriaWeightingConfig.payload || {}),
          weightsByCriterion: normalizedWeights,
        },
      });
      return;
    }

    if (mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
      const sourceWeights = criteriaWeightingConfig?.payload?.weightsByCriterion;
      const normalizedWeights = normalizeFuzzyWeightsByRoot({
        sourceWeights,
        leafByRoot,
        fuzzyValueCount,
        totalLeafCount: leafCriterionItems.length,
      });

      if (isDeepEqual(sourceWeights || {}, normalizedWeights)) {
        return;
      }

      setCriteriaWeightingConfig({
        ...criteriaWeightingConfig,
        payload: {
          ...(criteriaWeightingConfig.payload || {}),
          weightsByCriterion: normalizedWeights,
        },
      });
      return;
    }

  }, [
    criteriaWeightingConfig,
    leafCriterionItems.length,
    fuzzyValueCount,
    leafByRoot,
    mode,
    modelUsesWeights,
    setCriteriaWeightingConfig,
  ]);
  const safeConfig = criteriaWeightingConfig || buildConfigByMode({ mode, leafCriteria });

  const criteriaWeightingEvaluationContext = useMemo(() => {
    if (!selectedCriteriaWeightingStructureEntry) {
      return null;
    }

    return buildEvaluationContext({
      issue: null,
      stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      structure: selectedCriteriaWeightingStructureEntry,
      model: selectedApiCriteriaWeightingModel,
      parameters: {
        modelParameters: {},
        criteriaWeightingParameters: safeConfig?.criteriaWeightingParameters || {},
      },
      alternatives: [],
      criteriaTree: criteria,
      leafCriteria,
    });
  }, [
    selectedApiCriteriaWeightingModel,
    selectedCriteriaWeightingStructureEntry,
    criteria,
    leafCriteria,
    safeConfig?.criteriaWeightingParameters,
  ]);
  const criteriaWeightingEvaluationPayload = useMemo(() => {
    if (!selectedCriteriaWeightingAdapter || !criteriaWeightingEvaluationContext) {
      return null;
    }

    return selectedCriteriaWeightingAdapter.fromBackendPayload({
      evaluationContext: criteriaWeightingEvaluationContext,
      backendPayload: safeConfig?.payload || null,
    });
  }, [
    criteriaWeightingEvaluationContext,
    safeConfig?.payload,
    selectedCriteriaWeightingAdapter,
  ]);
  if (!modelUsesWeights) {
    return null;
  }
  const selectedCriteriaWeightingModelKey = String(
    safeConfig?.criteriaWeightingModelKey || ""
  ).trim();
  const selectedCriteriaWeightingModelId = String(
    safeConfig?.criteriaWeightingModelId || ""
  ).trim();
  const manualByExpertsSelected =
    mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL ||
    (mode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL &&
      selectedCriteriaWeightingModelKey ===
        MANUAL_CRITERIA_WEIGHTS_API_MODEL_KEY);

  return (
    <Stack
      spacing={1.15}
      sx={{
        p: 1.25,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 2,
        background:
          "linear-gradient(135deg, rgba(75, 210, 207, 0.045), rgba(255,255,255,0.012))",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.8}
        alignItems={{ xs: "flex-start", sm: "baseline" }}
      >
        <Typography variant="body1" sx={{ fontWeight: 950 }}>
          Criteria weighting
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
          Choose how criterion weights are produced.
        </Typography>
      </Stack>

      {isFuzzyModel ? (
        <Box
          sx={{
            p: 1.15,
            borderRadius: 1.8,
            border: "1px solid rgba(75, 210, 207, 0.75)",
            background:
              "linear-gradient(135deg, rgba(75, 210, 207, 0.13), rgba(75, 210, 207, 0.035))",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 950 }}>
            Fuzzy criteria weights
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 750 }}>
            Set fuzzy weights using the selected expression domain.
          </Typography>

          {!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2 ? (
            <Alert severity="warning" sx={{ mt: 0.9 }}>
              Fuzzy criteria weights require a consistent linguistic value count in assigned domains.
            </Alert>
          ) : null}
        </Box>
      ) : (
        <Stack
          sx={{
            display: "grid",
            gap: 0.75,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          <CriteriaWeightingMethodCard
            title="Manual"
            description="Set weights now"
            selected={mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL}
            onClick={() =>
              updateConfig(
                buildConfigByMode({
                  mode: CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL,
                  leafCriteria,
                }),
                { markDirty: true }
              )
            }
          />

          <CriteriaWeightingMethodCard
            title="Manual by experts"
            description="Experts evaluate later"
            selected={manualByExpertsSelected}
            disabled={isSingleCriterion || !manualExpertWeightingAvailable}
            onClick={() =>
              updateConfig(
                buildApiCriteriaWeightingConfig({
                  mode: CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
                  leafCriteria,
                  criteriaWeightingModel: manualCriteriaWeightingModel,
                }),
                { markDirty: true }
              )
            }
          />

          {creatorApiCriteriaWeightingModels.map((criteriaModel) => {
            const modelId = String(criteriaModel?._id || criteriaModel?.id || "").trim();
            const selected =
              mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL &&
              (selectedCriteriaWeightingModelId === modelId ||
                selectedCriteriaWeightingModelKey ===
                  String(criteriaModel?.apiModelKey || "").trim());

            return (
              <CriteriaWeightingMethodCard
                key={`${String(modelId || criteriaModel?.apiModelKey)}-creator`}
                title={getCriteriaWeightingModelLabel(criteriaModel)}
                description="Compute now"
                selected={selected}
                disabled={isSingleCriterion}
                onClick={() =>
                  updateConfig(
                    buildApiCriteriaWeightingConfig({
                      mode: CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL,
                      leafCriteria,
                      criteriaWeightingModel: criteriaModel,
                    }),
                    { markDirty: true }
                  )
                }
              />
            );
          })}

          {expertApiCriteriaWeightingModels.map((criteriaModel) => {
            const modelId = String(criteriaModel?._id || criteriaModel?.id || "").trim();
            const selected =
              mode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL &&
              (selectedCriteriaWeightingModelId === modelId ||
                selectedCriteriaWeightingModelKey ===
                  String(criteriaModel?.apiModelKey || "").trim());

            return (
              <CriteriaWeightingMethodCard
                key={`${String(modelId || criteriaModel?.apiModelKey)}-expert`}
                title={`${getCriteriaWeightingModelLabel(criteriaModel)} by experts`}
                description="Experts evaluate later"
                selected={selected}
                disabled={isSingleCriterion}
                onClick={() =>
                  updateConfig(
                    buildApiCriteriaWeightingConfig({
                      mode: CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
                      leafCriteria,
                      criteriaWeightingModel: criteriaModel,
                    }),
                    { markDirty: true }
                  )
                }
              />
            );
          })}
        </Stack>
      )}

      {!isFuzzyModel && !isSingleCriterion && !manualExpertWeightingAvailable ? (
        <Alert severity="warning">
          Manual expert weighting is unavailable because the manual criteria weighting
          ApiModel is missing or does not support expert-side weighting.
        </Alert>
      ) : null}

      {manualByExpertsSelected ? (
        <Alert severity="info">
          Criteria weights will be collected from experts and aggregated before alternative evaluation.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL &&
      selectedCriteriaWeightingModelKey !==
        MANUAL_CRITERIA_WEIGHTS_API_MODEL_KEY ? (
        <Alert severity="info">
          Preferences will be collected from experts and aggregated before alternative evaluation.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL ? (
        SelectedCriteriaWeightingView &&
        selectedCriteriaWeightingAdapter &&
        criteriaWeightingEvaluationContext ? (
          <SelectedCriteriaWeightingView
            evaluationContext={criteriaWeightingEvaluationContext}
            evaluationPayload={criteriaWeightingEvaluationPayload}
            setEvaluationPayload={(evaluationPayload) =>
              updateConfig(
                {
                  ...safeConfig,
                  payload: selectedCriteriaWeightingAdapter.toBackendPayload({
                    evaluationContext: criteriaWeightingEvaluationContext,
                    evaluationPayload,
                    mode: "draft",
                  }),
                },
                { markDirty: true }
              )
            }
            collectivePayload={null}
            readOnly={false}
            loading={false}
          />
        ) : (
          <Alert severity="warning">
            This criteria weighting model cannot be computed during issue creation
            because its structure does not expose a view.
          </Alert>
        )
      ) : null}
    </Stack>
  );
};

export default CriteriaWeightingPanel;
