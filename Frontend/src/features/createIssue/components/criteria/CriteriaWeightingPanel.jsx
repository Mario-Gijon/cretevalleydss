import { useEffect, useMemo } from "react";
import { Alert, Button, ButtonGroup, Stack, Typography } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
  resolveFuzzyCriteriaWeightValueCount,
} from "../../utils/criteriaWeighting.model";
import {
  CRITERIA_WEIGHTING_MODES,
  buildConfigByMode,
  collectLeafCriteriaByRoot,
  isDeepEqual,
  normalizeBwmPayload,
  normalizeFuzzyWeightsByRoot,
  normalizeManualWeightsByRoot,
  normalizeMode,
  resolveAssignedDomainIds,
} from "./criteriaWeighting.helpers";
import { ManualCriteriaWeightsEditor } from "./ManualCriteriaWeightsEditor";
import { FuzzyCriteriaWeightsEditor } from "./FuzzyCriteriaWeightsEditor";
import { BwmCriteriaWeightsEditor } from "./BwmCriteriaWeightsEditor";

export const CriteriaWeightingPanel = ({
  selectedModel,
  criteria,
  criteriaWeightingConfig,
  setCriteriaWeightingConfig,
  setDefaultModelParams,
  domainAssignments,
}) => {
  const { globalDomains, expressionDomains } = useIssuesDataContext();

  const modelUsesWeights = modelUsesCriteriaWeights(selectedModel);
  const isFuzzyModel = isFuzzyCriteriaWeightModel(selectedModel);

  const leafCriteria = useMemo(
    () => getLeafCriteria(Array.isArray(criteria) ? criteria : []),
    [criteria]
  );
  const criterionNames = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  const leafByRoot = useMemo(
    () => collectLeafCriteriaByRoot(Array.isArray(criteria) ? criteria : []),
    [criteria]
  );
  const isSingleCriterion = leafCriteria.length === 1;

  const assignedDomainIds = useMemo(
    () => resolveAssignedDomainIds(domainAssignments),
    [domainAssignments]
  );
  const assignedDomains = useMemo(() => {
    const domainById = new Map(
      [...(Array.isArray(globalDomains) ? globalDomains : []), ...(Array.isArray(expressionDomains) ? expressionDomains : [])]
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
        totalLeafCount: criterionNames.length,
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
        totalLeafCount: criterionNames.length,
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

    if (mode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM) {
      const normalizedPayload = normalizeBwmPayload({
        payload: criteriaWeightingConfig?.payload,
        criterionNames,
      });

      if (isDeepEqual(criteriaWeightingConfig?.payload || {}, normalizedPayload)) {
        return;
      }

      setCriteriaWeightingConfig({
        ...criteriaWeightingConfig,
        payload: normalizedPayload,
      });
    }
  }, [
    criteriaWeightingConfig,
    criterionNames,
    fuzzyValueCount,
    leafByRoot,
    mode,
    modelUsesWeights,
    setCriteriaWeightingConfig,
  ]);

  if (!modelUsesWeights) {
    return null;
  }

  const safeConfig = criteriaWeightingConfig || buildConfigByMode({ mode, leafCriteria });

  return (
    <Stack spacing={1.25} sx={{ p: 1.5, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2 }}>
      <Typography variant="body1" sx={{ fontWeight: "bold" }}>
        Criteria weights
      </Typography>

      <ButtonGroup color="secondary" size="small" sx={{ flexWrap: "wrap" }}>
        {isFuzzyModel ? (
          <Button variant="contained">Fuzzy criteria weights</Button>
        ) : (
          <>
            <Button
              variant={mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL ? "contained" : "outlined"}
              onClick={() =>
                updateConfig(
                  buildConfigByMode({
                    mode: CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL,
                    leafCriteria,
                  }),
                  { markDirty: true }
                )
              }
            >
              Manual
            </Button>

            <Button
              variant={mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL ? "contained" : "outlined"}
              onClick={() =>
                updateConfig(
                  buildConfigByMode({
                    mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
                    leafCriteria,
                  }),
                  { markDirty: true }
                )
              }
              disabled={isSingleCriterion}
            >
              Manual by experts
            </Button>

            <Button
              variant={mode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM ? "contained" : "outlined"}
              onClick={() =>
                updateConfig(
                  buildConfigByMode({
                    mode: CRITERIA_WEIGHTING_MODES.CREATOR_BWM,
                    leafCriteria,
                  }),
                  { markDirty: true }
                )
              }
              disabled={isSingleCriterion}
            >
              BWM
            </Button>

            <Button
              variant={mode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM ? "contained" : "outlined"}
              onClick={() =>
                updateConfig(
                  buildConfigByMode({
                    mode: CRITERIA_WEIGHTING_MODES.EXPERT_BWM,
                    leafCriteria,
                  }),
                  { markDirty: true }
                )
              }
              disabled={isSingleCriterion}
            >
              BWM by experts
            </Button>

            <Button disabled>BWM simulated consensus</Button>
          </>
        )}
      </ButtonGroup>

      {mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL ? (
        <Alert severity="info">
          Criteria weights will be collected from experts and aggregated before alternative evaluation.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM ? (
        <Alert severity="info">
          BWM preferences will be collected from experts and aggregated before alternative evaluation.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM_CMCC ? (
        <Alert severity="warning">
          Simulated consensus for BWM will be available later.
        </Alert>
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL ? (
        <ManualCriteriaWeightsEditor
          criterionNames={criterionNames}
          weightsByCriterion={safeConfig?.payload?.weightsByCriterion || {}}
          isSingleCriterion={isSingleCriterion}
          onWeightChange={(criterionName, value) => {
            updateConfig(
              {
                ...safeConfig,
                payload: {
                  ...(safeConfig?.payload || {}),
                  weightsByCriterion: {
                    ...(safeConfig?.payload?.weightsByCriterion || {}),
                    [criterionName]: value,
                  },
                },
              },
              { markDirty: true }
            );
          }}
        />
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY ? (
        <FuzzyCriteriaWeightsEditor
          criterionNames={criterionNames}
          fuzzyValueCount={fuzzyValueCount}
          weightsByCriterion={safeConfig?.payload?.weightsByCriterion || {}}
          isSingleCriterion={isSingleCriterion}
          onVectorChange={(criterionName, nextVector) => {
            updateConfig(
              {
                ...safeConfig,
                payload: {
                  ...(safeConfig?.payload || {}),
                  weightsByCriterion: {
                    ...(safeConfig?.payload?.weightsByCriterion || {}),
                    [criterionName]: nextVector,
                  },
                },
              },
              { markDirty: true }
            );
          }}
        />
      ) : null}

      {mode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM ? (
        <BwmCriteriaWeightsEditor
          criterionNames={criterionNames}
          payload={safeConfig?.payload || {}}
          onPayloadChange={(payload) => {
            updateConfig(
              {
                ...safeConfig,
                payload,
              },
              { markDirty: true }
            );
          }}
        />
      ) : null}
    </Stack>
  );
};

export default CriteriaWeightingPanel;
