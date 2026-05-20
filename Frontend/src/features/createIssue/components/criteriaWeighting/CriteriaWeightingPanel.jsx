import { useEffect, useMemo } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";

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
} from "../../utils/criteriaWeighting.helpers";
import { CriteriaWeightingMethodCard } from "./CriteriaWeightingMethodCard";
import { BwmCriteriaWeightsEditor } from "./BwmCriteriaWeightsEditor";

export const CriteriaWeightingPanel = ({
  selectedModel,
  criteria,
  criteriaWeightingConfig,
  setCriteriaWeightingConfig,
  setDefaultModelParams,
  expressionDomainConfig,
}) => {
  const { globalDomains, expressionDomains } = useIssuesDataContext();

  const modelUsesWeights = modelUsesCriteriaWeights(selectedModel);
  const isFuzzyModel = isFuzzyCriteriaWeightModel(selectedModel);

  const leafCriteria = useMemo(
    () => getLeafCriteria(Array.isArray(criteria) ? criteria : []),
    [criteria]
  );

  const criterionNames = leafCriteria
    .map((criterion) => criterion?.name)
    .filter(Boolean);

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
            selected={mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL}
            disabled={isSingleCriterion}
            onClick={() =>
              updateConfig(
                buildConfigByMode({
                  mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
                  leafCriteria,
                }),
                { markDirty: true }
              )
            }
          />

          <CriteriaWeightingMethodCard
            title="BWM"
            description="Best-worst now"
            selected={mode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM}
            disabled={isSingleCriterion}
            onClick={() =>
              updateConfig(
                buildConfigByMode({
                  mode: CRITERIA_WEIGHTING_MODES.CREATOR_BWM,
                  leafCriteria,
                }),
                { markDirty: true }
              )
            }
          />

          <CriteriaWeightingMethodCard
            title="BWM by experts"
            description="Experts complete later"
            selected={mode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM}
            disabled={isSingleCriterion}
            onClick={() =>
              updateConfig(
                buildConfigByMode({
                  mode: CRITERIA_WEIGHTING_MODES.EXPERT_BWM,
                  leafCriteria,
                }),
                { markDirty: true }
              )
            }
          />
        </Stack>
      )}

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
