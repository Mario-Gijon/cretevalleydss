import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  CRITERIA_WEIGHTING_MODES,
  buildApiCriteriaWeightingConfig,
  buildConfigByMode,
  isManualCriteriaWeightingApiModel,
  normalizeCriteriaWeightingLevel,
  normalizeMode,
  resolveCriteriaWeightingLevel,
} from "../../logic/createIssueCriteriaWeightingModes";
import { isParentCriteriaWeightingAvailable } from "../../logic/createIssueParentCriteriaWeighting";
import {
  buildCreateIssueEqualManualWeights,
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
  resolveFuzzyCriteriaWeightValueCount,
} from "../../logic/createIssueCriteriaWeighting";
import {
  buildCriteriaWeightingDecisionContext,
  buildCriteriaWeightingInitializationIdentity,
  buildCreatorCriteriaWeightingInitialization,
} from "../../logic/createIssueCriteriaWeightingInitialization";
import { resolveAssignedDomainIds } from "../../logic/createIssueAssignedDomains";
import { collectLeafCriteriaByRoot } from "../../logic/createIssueCriteriaTree";
import {
  isDeepEqual,
  normalizeFuzzyWeightsByRoot,
  normalizeManualWeightsByRoot,
} from "../../logic/createIssueCriteriaWeightValues";
import { CriteriaWeightingMethodCard } from "./CriteriaWeightingMethodCard";
import { CriteriaWeightingMccAction } from "./CriteriaWeightingMccAction";
import { resolveCriteriaWeightingMccAvailability } from "../../logic/createIssueCriteriaWeightingMcc";
import { EVALUATION_STAGES } from "../../../decisionPlugins/evaluations/evaluationStages";
import { getEvaluationStructureEntryForStage } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry";
import { requireCompleteEvaluationObject } from "../../../issueEvaluation/logic/requireCompleteEvaluationObject";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";

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

  const leafCriterionItems = useMemo(
    () =>
      leafCriteria
        .map((criterion) => ({
          id: criterion?.id,
          name: criterion?.name,
        }))
        .filter((criterion) => criterion.id && criterion.name),
    [leafCriteria]
  );

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
  const [parentConfirmationOpen, setParentConfirmationOpen] = useState(false);
  const requestedLevel = normalizeCriteriaWeightingLevel(
    criteriaWeightingConfig?.level
  );
  const parentHierarchyAvailable = useMemo(
    () => isParentCriteriaWeightingAvailable(criteria),
    [criteria]
  );
  const parentLevelAvailable = parentHierarchyAvailable;
  const availableCriteriaWeightingModels = useMemo(
    () =>
      (Array.isArray(criteriaWeightingModels) ? criteriaWeightingModels : []).filter(
        (modelItem) => modelItem?.modelKind === "criteriaWeighting"
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
  const apiCriteriaWeightingOptions = useMemo(
    () =>
      visibleApiCriteriaWeightingModels.map((modelItem) => {
        const structureEntry = getEvaluationStructureEntryForStage({
          structureKey: modelItem?.evaluationStructureKey || "",
          stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
        });
        const canInitialize =
          Boolean(structureEntry?.View) &&
          typeof structureEntry?.buildInitialEvaluation === "function";

        return {
          model: modelItem,
          structureEntry,
          canInitialize,
        };
      }),
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
          selectedApiCriteriaWeightingModel?.evaluationStructureKey || "",
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      }),
    [selectedApiCriteriaWeightingModel]
  );
  const SelectedCriteriaWeightingView =
    selectedCriteriaWeightingStructureEntry?.View || null;
  const selectedStructureCanInitialize =
    Boolean(SelectedCriteriaWeightingView) &&
    typeof selectedCriteriaWeightingStructureEntry?.buildInitialEvaluation ===
      "function";
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

  const buildCreatorApiConfig = (criteriaModel, structureEntry) => {
    const decisionContext = buildCriteriaWeightingDecisionContext({
      criteriaWeightingModel: criteriaModel,
      structureEntry,
      criteriaTree: criteria,
      leafCriteria,
    });
    const initialization = buildCreatorCriteriaWeightingInitialization({
      criteriaWeightingModel: criteriaModel,
      structureEntry,
      decisionContext,
    });
    const nextConfig = buildApiCriteriaWeightingConfig({
      mode: CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL,
      leafCriteria,
      criteriaWeightingModel: criteriaModel,
      level: requestedLevel,
    });

    return {
      ...nextConfig,
      payload: initialization.evaluation,
      initializationIdentity: initialization.initializationIdentity,
    };
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
    if (!setCriteriaWeightingConfig || !criteriaWeightingConfig?.mode) return;

    const normalizedLevel = parentLevelAvailable
      ? resolveCriteriaWeightingLevel(criteriaWeightingConfig)
      : "leaf";
    if (criteriaWeightingConfig.level === normalizedLevel) return;

    setCriteriaWeightingConfig({
      ...criteriaWeightingConfig,
      level: normalizedLevel,
    });
  }, [
    criteriaWeightingConfig,
    parentLevelAvailable,
    setCriteriaWeightingConfig,
  ]);

  useEffect(() => {
    if (!setCriteriaWeightingConfig) return;
    if (!modelUsesWeights) return;
    if (!criteriaWeightingConfig?.mode) return;

    if (mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
      const sourceWeights =
        criteriaWeightingConfig?.payload?.weightsByCriterion;
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
      const sourceWeights =
        criteriaWeightingConfig?.payload?.weightsByCriterion;
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

  const safeConfig = useMemo(
    () =>
      criteriaWeightingConfig || buildConfigByMode({ mode, leafCriteria }),
    [criteriaWeightingConfig, leafCriteria, mode]
  );

  const criteriaWeightingDecisionContext = useMemo(() => {
    if (!selectedCriteriaWeightingStructureEntry) {
      return null;
    }

    return buildCriteriaWeightingDecisionContext({
      criteriaWeightingModel: selectedApiCriteriaWeightingModel,
      structureEntry: selectedCriteriaWeightingStructureEntry,
      criteriaWeightingParameters:
        safeConfig?.criteriaWeightingParameters || {},
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
  const creatorInitializationIdentity = useMemo(() => {
    if (
      mode !== CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL ||
      !criteriaWeightingDecisionContext ||
      !selectedApiCriteriaWeightingModel ||
      !selectedStructureCanInitialize
    ) {
      return null;
    }

    return buildCriteriaWeightingInitializationIdentity({
      criteriaWeightingModel: selectedApiCriteriaWeightingModel,
      structureEntry: selectedCriteriaWeightingStructureEntry,
      decisionContext: criteriaWeightingDecisionContext,
    });
  }, [
    criteriaWeightingDecisionContext,
    mode,
    selectedApiCriteriaWeightingModel,
    selectedCriteriaWeightingStructureEntry,
    selectedStructureCanInitialize,
  ]);

  useEffect(() => {
    if (!setCriteriaWeightingConfig || !creatorInitializationIdentity) {
      return;
    }

    if (
      safeConfig?.initializationIdentity ===
        creatorInitializationIdentity &&
      safeConfig?.payload &&
      typeof safeConfig.payload === "object" &&
      !Array.isArray(safeConfig.payload)
    ) {
      return;
    }

    const initialization = buildCreatorCriteriaWeightingInitialization({
      criteriaWeightingModel: selectedApiCriteriaWeightingModel,
      structureEntry: selectedCriteriaWeightingStructureEntry,
      decisionContext: criteriaWeightingDecisionContext,
    });

    setCriteriaWeightingConfig({
      ...safeConfig,
      payload: initialization.evaluation,
      initializationIdentity: creatorInitializationIdentity,
    });
  }, [
    criteriaWeightingDecisionContext,
    creatorInitializationIdentity,
    safeConfig,
    selectedApiCriteriaWeightingModel,
    selectedCriteriaWeightingStructureEntry,
    setCriteriaWeightingConfig,
  ]);

  const criteriaWeightingEvaluation = useMemo(() => {
    if (!criteriaWeightingDecisionContext) {
      return null;
    }
    if (
      mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL &&
      safeConfig?.initializationIdentity !== creatorInitializationIdentity
    ) {
      return null;
    }

    return safeConfig?.payload ?? null;
  }, [
    criteriaWeightingDecisionContext,
    creatorInitializationIdentity,
    mode,
    safeConfig?.initializationIdentity,
    safeConfig?.payload,
  ]);
  if (!modelUsesWeights) {
    return null;
  }
  const equalWeightsActionAvailable =
    mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL &&
    leafCriterionItems.length > 1;
  const equalWeightsActive = (() => {
    if (!equalWeightsActionAvailable) return false;
    const equalWeights = buildCreateIssueEqualManualWeights(leafCriterionItems);
    const currentWeights = safeConfig?.payload?.weightsByCriterion;
    return leafCriterionItems.every((criterion) => {
      const current = Number(currentWeights?.[criterion.id]);
      const expected = Number(equalWeights?.[criterion.id]);
      return Number.isFinite(current) && Number.isFinite(expected) &&
        Math.abs(current - expected) <= 0.000001;
    });
  })();
  const mccActionAvailable = resolveCriteriaWeightingMccAvailability({
    selectedModel,
    criteria,
    criteriaWeightingConfig,
    criteriaWeightingModels,
  });
  const selectedCriteriaWeightingModelKey = String(
    safeConfig?.criteriaWeightingModelKey || ""
  ).trim();
  const selectedCriteriaWeightingModelId = String(
    safeConfig?.criteriaWeightingModelId || ""
  ).trim();
  const manualByExpertsSelected =
    mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL;
  const manualSelected =
    mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL || manualByExpertsSelected;
  const canRenderCreatorEvaluation =
    selectedStructureCanInitialize &&
    criteriaWeightingDecisionContext !== null;

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
        spacing={1}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
      >
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
          <ToggleButtonGroup
            exclusive
            size="small"
            color="info"
            value={requestedLevel}
            aria-label="Criteria weighting level"
            onChange={(_, nextLevel) => {
              if (!nextLevel) return;
              if (nextLevel === "parent") {
                setParentConfirmationOpen(true);
                return;
              }
              updateConfig(
                { ...safeConfig, level: "leaf" },
                { markDirty: true }
              );
            }}
            sx={{
              "& .MuiToggleButton-root": {
                px: 1.1,
                py: 0.45,
                fontWeight: "fontWeightBold",
                typography: "caption",
                letterSpacing: 0.25,
                textTransform: "uppercase",
              },
            }}
          >
            <Tooltip title="Weight the criteria used directly to evaluate alternatives.">
              <ToggleButton value="leaf" aria-label="Leaf criteria weighting">
                Leaf criteria
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Weight the parent criteria; each parent weight is distributed equally among its direct leaf criteria.">
              <span>
                <ToggleButton
                  value="parent"
                  aria-label="Parent criteria weighting"
                  disabled={!parentLevelAvailable}
                >
                  Parent criteria
                </ToggleButton>
              </span>
            </Tooltip>
          </ToggleButtonGroup>
          {mccActionAvailable ? (
            <CriteriaWeightingMccAction
              selectedModel={selectedModel}
              criteria={criteria}
              criteriaWeightingConfig={criteriaWeightingConfig}
              setCriteriaWeightingConfig={setCriteriaWeightingConfig}
              setDefaultModelParams={setDefaultModelParams}
            />
          ) : null}
          {equalWeightsActionAvailable ? (
            <ToggleButton
              value="equalWeights"
              selected={equalWeightsActive}
              onClick={() =>
                updateConfig(
                  {
                    ...(criteriaWeightingConfig || {}),
                    payload: {
                      ...(criteriaWeightingConfig?.payload || {}),
                      weightsByCriterion:
                        buildCreateIssueEqualManualWeights(leafCriterionItems),
                    },
                  },
                  { markDirty: true }
                )
              }
              size="small"
              color="info"
              sx={{
                px: 1.4, py: 0.55, borderColor: equalWeightsActive ? "rgba(75, 210, 207, 0.72)" : "rgba(255,255,255,0.16)", color: equalWeightsActive ? "info.main" : "text.secondary", fontWeight: "fontWeightBold", typography: "caption", letterSpacing: 0.25, textTransform: "uppercase",
                "&.Mui-selected": { color: "info.main", backgroundColor: "rgba(75, 210, 207, 0.10)" },
                "&.Mui-selected:hover": { backgroundColor: "rgba(75, 210, 207, 0.14)" },
              }}
            >
              Equal weights
            </ToggleButton>
          ) : null}
        </Stack>
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
            selected={manualSelected}
            onClick={() =>
              updateConfig(
                buildConfigByMode({
                  mode: CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL,
                  leafCriteria,
                  level: requestedLevel,
                }),
                { markDirty: true }
              )
            }
          />

          {apiCriteriaWeightingOptions.map((option) => {
            const criteriaModel = option.model;
            const modelId = String(
              criteriaModel?._id || criteriaModel?.id || ""
            ).trim();
            const selected =
              (mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL ||
                mode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL) &&
              (selectedCriteriaWeightingModelId === modelId ||
                selectedCriteriaWeightingModelKey ===
                  String(criteriaModel?.apiModelKey || "").trim());
            const supportsCreator =
              criteriaModel?.supportsCreatorCriteriaWeighting === true;
            const supportsExperts =
              criteriaModel?.supportsExpertCriteriaWeighting === true;
            const canSelect =
              supportsExperts || (supportsCreator && option.canInitialize);

            return (
              <CriteriaWeightingMethodCard
                key={String(modelId || criteriaModel?.apiModelKey)}
                title={getCriteriaWeightingModelLabel(criteriaModel)}
                description={
                  supportsCreator ? "Compute now" : "Experts evaluate later"
                }
                selected={selected}
                disabled={isSingleCriterion || !canSelect}
                onClick={() => {
                  updateConfig(
                    supportsCreator
                      ? buildCreatorApiConfig(criteriaModel, option.structureEntry)
                      : buildApiCriteriaWeightingConfig({
                          mode: CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
                          leafCriteria,
                          criteriaWeightingModel: criteriaModel,
                          level: requestedLevel,
                        }),
                    { markDirty: true }
                  );
                }}
              />
            );
          })}
        </Stack>
      )}

      {!isFuzzyModel && !isSingleCriterion && !manualExpertWeightingAvailable ? (
        <Alert severity="warning">
          Manual expert weighting is unavailable because the manual criteria
          weighting ApiModel is missing or does not support expert-side
          weighting.
        </Alert>
      ) : null}

      {!isFuzzyModel
        ? apiCriteriaWeightingOptions
            .filter((option) => option.model?.supportsCreatorCriteriaWeighting === true)
            .filter((option) => !option.canInitialize)
            .map((option) => (
              <Alert
                severity="warning"
                key={`${String(
                  option.model?._id || option.model?.apiModelKey
                )}-creator-unavailable`}
              >
                {getCriteriaWeightingModelLabel(option.model)} cannot be
                computed during issue creation because its evaluation
                structure does not expose both a View and
                buildInitialEvaluation.
              </Alert>
            ))
        : null}

      {manualByExpertsSelected ? (
        <Alert severity="info">
          Criteria weights will be collected from experts and aggregated before
          alternative evaluation.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL ? (
        <Alert severity="info">
          Preferences will be collected from experts and aggregated before
          alternative evaluation.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL ? (
        canRenderCreatorEvaluation ? (
          criteriaWeightingEvaluation !== null ? (
            <SelectedCriteriaWeightingView
              decisionContext={criteriaWeightingDecisionContext}
              evaluation={criteriaWeightingEvaluation}
              setEvaluation={(nextEvaluation) =>
                updateConfig(
                  {
                    ...safeConfig,
                    payload: requireCompleteEvaluationObject(nextEvaluation),
                  },
                  { markDirty: true }
                )
              }
              collectiveEvaluation={null}
              readOnly={false}
              loading={false}
            />
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Preparing the criteria weighting evaluation…
            </Typography>
          )
        ) : (
          <Alert severity="warning">
            This criteria weighting model cannot be computed during issue
            creation because its structure does not expose both a View and
            buildInitialEvaluation.
          </Alert>
        )
      ) : null}

      <ConfirmationDialog
        open={parentConfirmationOpen}
        onClose={() => setParentConfirmationOpen(false)}
        tone="info"
        title="Use parent criteria weighting?"
        subtitle="Weights will be produced for the parent criteria instead of the leaf criteria. Each resulting parent weight will be distributed equally among its direct leaf criteria. Alternative evaluations will continue to use the leaf criteria."
        actions={[
          {
            label: "Cancel",
            onClick: () => setParentConfirmationOpen(false),
          },
          {
            label: "Use parent criteria",
            color: "info",
            variant: "contained",
            onClick: () => {
              updateConfig(
                {
                  ...safeConfig,
                  level: "parent",
                },
                { markDirty: true }
              );
              setParentConfirmationOpen(false);
            },
          },
        ]}
      />
    </Stack>
  );
};

export default CriteriaWeightingPanel;
