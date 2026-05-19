import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  ButtonGroup,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
  ToggleButton,
} from "@mui/material";
import { getLeafCriteria } from "../../../utils/criteria.utils";
import { resolveModelParameterAdapter } from "../../modelParameters";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  buildDefaultFuzzyWeightVector,
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
  resolveFuzzyCriteriaWeightValueCount,
} from "../utils/criteriaWeighting.model";
import { useIssuesDataContext } from "../../../context/issues/issues.context";

const CRITERIA_WEIGHTING_MODES = Object.freeze({
  CREATOR_FUZZY: "creatorFuzzy",
  CREATOR_MANUAL: "creatorManual",
  EXPERT_MANUAL: "expertManual",
  CREATOR_BWM: "creatorBwm",
  EXPERT_BWM: "expertBwm",
  EXPERT_BWM_CMCC: "expertBwmCmcc",
});

const buildDefaultFuzzyWeightsByCriterion = (leafCriteria, valueCount) => {
  const names = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  const baseVector = buildDefaultFuzzyWeightVector(valueCount);
  return names.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = [...baseVector];
    return accumulator;
  }, {});
};

const formatDisplayNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2);
};

const normalizeMode = (mode) =>
  typeof mode === "string" && mode.trim()
    ? mode.trim()
    : CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL;

const isDeepEqual = (left, right) => {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => isDeepEqual(item, right[index]));
  }
  if (
    left &&
    right &&
    typeof left === "object" &&
    typeof right === "object" &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => isDeepEqual(left[key], right[key]));
  }
  return false;
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveAssignedDomainIds = (domainAssignments) => {
  const expertsAssignments = domainAssignments?.experts;
  if (!isPlainObject(expertsAssignments)) {
    return [];
  }

  const domainIds = new Set();

  for (const expertAssignments of Object.values(expertsAssignments)) {
    const alternativesBlock = expertAssignments?.alternatives;
    if (!isPlainObject(alternativesBlock)) continue;

    for (const alternativeValue of Object.values(alternativesBlock)) {
      const criteriaBlock = alternativeValue?.criteria;
      if (!isPlainObject(criteriaBlock)) continue;

      for (const domainId of Object.values(criteriaBlock)) {
        const normalized = String(domainId || "").trim();
        if (normalized) {
          domainIds.add(normalized);
        }
      }
    }
  }

  return Array.from(domainIds);
};

const buildEqualWeightsByCriterion = (leafCriteria) => {
  const criterionNames = leafCriteria
    .map((criterion) => criterion?.name)
    .filter(Boolean);

  if (criterionNames.length === 0) {
    return {};
  }

  const baseWeight = Number((1 / criterionNames.length).toFixed(6));
  const weightsByCriterion = {};

  let consumed = 0;
  criterionNames.forEach((criterionName, index) => {
    if (index === criterionNames.length - 1) {
      weightsByCriterion[criterionName] = Number((1 - consumed).toFixed(6));
      return;
    }

    weightsByCriterion[criterionName] = baseWeight;
    consumed += baseWeight;
  });

  return weightsByCriterion;
};

const buildDefaultBwmPayload = (leafCriteria) => {
  const criterionNames = leafCriteria
    .map((criterion) => criterion?.name)
    .filter(Boolean);
  const bestCriterion = criterionNames[0] || "";
  const worstCriterion =
    criterionNames.length > 1
      ? criterionNames[criterionNames.length - 1]
      : criterionNames[0] || "";

  const bestToOthers = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = criterionName === bestCriterion ? 1 : "";
    return accumulator;
  }, {});

  const othersToWorst = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = criterionName === worstCriterion ? 1 : "";
    return accumulator;
  }, {});

  return {
    bestCriterion,
    worstCriterion,
    bestToOthers,
    othersToWorst,
  };
};

const buildConfigByMode = ({ mode, leafCriteria }) => {
  const resolvedMode = normalizeMode(mode);

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "fuzzy",
      aggregationMode: "none",
      structureKey: "fuzzyCriteriaWeights",
      payload: {},
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "manual",
      aggregationMode: "none",
      structureKey: "manualCriteriaWeights",
      payload: {
        weightsByCriterion: buildEqualWeightsByCriterion(leafCriteria),
      },
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "bwm",
      aggregationMode: "none",
      structureKey: "bestWorstCriteria",
      payload: buildDefaultBwmPayload(leafCriteria),
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM) {
    return {
      mode: resolvedMode,
      source: "experts",
      method: "bwm",
      aggregationMode: "bwmMean",
      structureKey: "bestWorstCriteria",
      payload: {},
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM_CMCC) {
    return {
      mode: resolvedMode,
      source: "experts",
      method: "bwm",
      aggregationMode: "cmccSimulation",
      structureKey: "bestWorstCriteria",
      payload: {},
    };
  }

  return {
    mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
    source: "experts",
    method: "manual",
    aggregationMode: "mean",
    structureKey: "manualCriteriaWeights",
    payload: {},
  };
};

export const ModelParameters = ({
  selectedModel,
  allData,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  handleDefaultChange,
  showValidationErrors = false,
  criteriaWeightingConfig,
  setCriteriaWeightingConfig,
}) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const hasShownUnsupportedRef = useRef(false);

  const leafCriteria = useMemo(() => {
    if (!Array.isArray(allData?.criteria)) return [];
    return getLeafCriteria(allData.criteria);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allData?.criteria)]);

  const hasUnsupportedParameters = useMemo(
    () =>
      (selectedModel?.parameters || []).some((parameter) => {
        const { isSupported } = resolveModelParameterAdapter(parameter);
        return !isSupported;
      }),
    [selectedModel?.parameters]
  );

  const modelUsesWeights = modelUsesCriteriaWeights(selectedModel);
  const mode = normalizeMode(criteriaWeightingConfig?.mode);
  const isFuzzyModel = isFuzzyCriteriaWeightModel(selectedModel);
  const assignedDomainIds = useMemo(
    () => resolveAssignedDomainIds(allData?.domainAssignments),
    [allData?.domainAssignments]
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
  const isSingleCriterion = leafCriteria.length === 1;
  const shouldRenderCriteriaWeightsSection =
    selectedModel?.isMultiCriteria === true && modelUsesWeights;
  const criterionNames = leafCriteria
    .map((criterion) => criterion?.name)
    .filter(Boolean);
  const bwmPayload = criteriaWeightingConfig?.payload || {};

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
    modelUsesWeights,
    isFuzzyModel,
    isSingleCriterion,
    leafCriteria,
    mode,
    setCriteriaWeightingConfig,
  ]);

  useEffect(() => {
    if (!setCriteriaWeightingConfig) return;
    if (!modelUsesWeights) return;
    if (!criteriaWeightingConfig?.mode) return;

    if (mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
      const sourceWeights = criteriaWeightingConfig?.payload?.weightsByCriterion;
      const normalizedWeights =
        isSingleCriterion &&
        Number.isInteger(fuzzyValueCount) &&
        fuzzyValueCount >= 2
          ? criterionNames.reduce((accumulator, criterionName) => {
              accumulator[criterionName] = Array.from(
                { length: fuzzyValueCount },
                () => 1
              );
              return accumulator;
            }, {})
          : buildDefaultFuzzyWeightsByCriterion(
              leafCriteria,
              fuzzyValueCount
            );

      for (const criterionName of criterionNames) {
        const candidate = sourceWeights?.[criterionName];
        if (
          Array.isArray(candidate) &&
          candidate.length === fuzzyValueCount &&
          candidate.every((item) => Number.isFinite(Number(item)))
        ) {
          normalizedWeights[criterionName] = candidate.map(Number);
        }
      }

      if (isDeepEqual(normalizedWeights, sourceWeights || {})) {
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

    if (mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
      const sourceWeights = criteriaWeightingConfig?.payload?.weightsByCriterion;
      const normalizedWeights = criterionNames.reduce((accumulator, criterionName) => {
        accumulator[criterionName] =
          sourceWeights && Object.prototype.hasOwnProperty.call(sourceWeights, criterionName)
            ? sourceWeights[criterionName]
            : "";
        return accumulator;
      }, {});

      const sourceWeightKeys = isPlainObject(sourceWeights)
        ? Object.keys(sourceWeights)
        : [];
      const hasUnknownSourceWeightKeys = sourceWeightKeys.some(
        (criterionName) => !criterionNames.includes(criterionName)
      );
      if (
        isDeepEqual(normalizedWeights, sourceWeights || {}) &&
        !hasUnknownSourceWeightKeys
      ) {
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
      const nextConfig = buildConfigByMode({
        mode: CRITERIA_WEIGHTING_MODES.CREATOR_BWM,
        leafCriteria,
      });
      const existingPayload = criteriaWeightingConfig?.payload || {};
      const mergedPayload = {
        ...nextConfig.payload,
        ...existingPayload,
        bestToOthers: {
          ...(nextConfig.payload.bestToOthers || {}),
          ...(existingPayload.bestToOthers || {}),
        },
        othersToWorst: {
          ...(nextConfig.payload.othersToWorst || {}),
          ...(existingPayload.othersToWorst || {}),
        },
      };

      if (isDeepEqual(existingPayload, mergedPayload)) {
        return;
      }

      setCriteriaWeightingConfig({
        ...nextConfig,
        payload: mergedPayload,
      });
    }
  }, [
    criterionNames,
    criteriaWeightingConfig,
    fuzzyValueCount,
    isSingleCriterion,
    leafCriteria,
    mode,
    modelUsesWeights,
    setCriteriaWeightingConfig,
  ]);

  const updateConfig = (nextConfig, options = {}) => {
    const markDirty = options?.markDirty === true;
    if (markDirty && typeof setDefaultModelParams === "function") {
      setDefaultModelParams(false);
    }
    setCriteriaWeightingConfig?.(nextConfig);
  };

  useEffect(() => {
    if (!hasUnsupportedParameters) {
      hasShownUnsupportedRef.current = false;
      return;
    }

    if (hasShownUnsupportedRef.current) return;
    showSnackbarAlert("No se pudieron mostrar los parámetros del modelo.", "error");
    hasShownUnsupportedRef.current = true;
  }, [hasUnsupportedParameters, showSnackbarAlert]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Model parameters:
        </Typography>

        <ToggleButton
          value="default"
          selected={defaultModelParams}
          onChange={handleDefaultChange}
          color="secondary"
          size="small"
        >
          Default
        </ToggleButton>
      </Stack>

      {shouldRenderCriteriaWeightsSection ? (
        <Stack spacing={1.25} sx={{ p: 1.5, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: "bold" }}>
            Criteria weights
          </Typography>

        <ButtonGroup color="secondary" size="small" sx={{ flexWrap: "wrap" }}>
          {/* {isFuzzyModel ? (
            <Button variant="contained">
              Fuzzy criteria weights
            </Button>
          ) : null} */}
          {!isFuzzyModel ? (
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
          <Button disabled>
            BWM simulated consensus
          </Button>
            </>
          ) : null}
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

        {mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY ? (
          <Stack spacing={1}>
            {!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2 ? (
              <Alert severity="warning">
                Fuzzy criteria weights require a consistent linguistic value count in assigned domains.
              </Alert>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Enter fuzzy weights with non-decreasing values in [0, 1].
              </Typography>
            )}
            <Stack spacing={1.2}>
              {criterionNames.map((criterionName) => {
                const fallbackVector = buildDefaultFuzzyWeightVector(fuzzyValueCount);
                const currentVector =
                  criteriaWeightingConfig?.payload?.weightsByCriterion?.[criterionName];
                const vector = Array.isArray(currentVector)
                  ? currentVector
                  : fallbackVector;

                return (
                  <Stack key={criterionName} spacing={0.5}>
                    <Typography variant="caption">{criterionName}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {Array.from({ length: fuzzyValueCount }).map((_, index) => (
                        <TextField
                          key={`${criterionName}-${index}`}
                          type="number"
                          color="info"
                          size="small"
                          value={vector?.[index] === "" ? "" : formatDisplayNumber(vector?.[index])}
                          disabled={isSingleCriterion}
                          onChange={(event) => {
                            if (isSingleCriterion) return;
                            const value = event.target.value;
                            const parsed = value === "" ? "" : Number(value);
                            const nextVector = Array.from(
                              { length: fuzzyValueCount },
                              (_, vectorIndex) => {
                                const sourceValue = vector?.[vectorIndex];
                                return Number.isFinite(Number(sourceValue))
                                  ? Number(sourceValue)
                                  : fallbackVector[vectorIndex];
                              }
                            );

                            nextVector[index] =
                              parsed === "" || Number.isNaN(parsed) ? "" : parsed;

                            updateConfig({
                              ...criteriaWeightingConfig,
                              payload: {
                                ...(criteriaWeightingConfig?.payload || {}),
                                weightsByCriterion: {
                                  ...(criteriaWeightingConfig?.payload?.weightsByCriterion || {}),
                                  [criterionName]: nextVector,
                                },
                              },
                            }, { markDirty: true });
                          }}
                          inputProps={{ min: 0, max: 1, step: 0.01 }}
                          sx={{ width: 90 }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        ) : null}

        {mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL ? (
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {criterionNames.map((criterionName) => {
              const currentValue =
                criteriaWeightingConfig?.payload?.weightsByCriterion?.[criterionName] ?? "";

              return (
                <Stack key={criterionName} spacing={0.5} alignItems="center">
                  <Typography variant="caption">{criterionName}</Typography>
                  <TextField
                    type="number"
                    color="info"
                    size="small"
                    value={currentValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      const parsed = value === "" ? "" : Number(value);
                      updateConfig({
                        ...criteriaWeightingConfig,
                        payload: {
                          ...(criteriaWeightingConfig?.payload || {}),
                          weightsByCriterion: {
                            ...(criteriaWeightingConfig?.payload?.weightsByCriterion || {}),
                            [criterionName]:
                              parsed === "" || Number.isNaN(parsed)
                                ? ""
                                : Math.max(0, Math.min(1, parsed)),
                          },
                        },
                      }, { markDirty: true });
                    }}
                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                    sx={{ width: 90 }}
                  />
                </Stack>
              );
            })}
          </Stack>
        ) : null}

        {mode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM ? (
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                size="small"
                label="Best criterion"
                value={bwmPayload.bestCriterion || ""}
                onChange={(event) => {
                  const bestCriterion = event.target.value;
                  updateConfig({
                    ...criteriaWeightingConfig,
                    payload: {
                      ...bwmPayload,
                      bestCriterion,
                      bestToOthers: {
                        ...(bwmPayload.bestToOthers || {}),
                        [bestCriterion]: 1,
                      },
                    },
                  }, { markDirty: true });
                }}
                sx={{ minWidth: 220 }}
              >
                {criterionNames.map((criterionName) => (
                  <MenuItem key={criterionName} value={criterionName}>
                    {criterionName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Worst criterion"
                value={bwmPayload.worstCriterion || ""}
                onChange={(event) => {
                  const worstCriterion = event.target.value;
                  updateConfig({
                    ...criteriaWeightingConfig,
                    payload: {
                      ...bwmPayload,
                      worstCriterion,
                      othersToWorst: {
                        ...(bwmPayload.othersToWorst || {}),
                        [worstCriterion]: 1,
                      },
                    },
                  }, { markDirty: true });
                }}
                sx={{ minWidth: 220 }}
              >
                {criterionNames.map((criterionName) => (
                  <MenuItem key={criterionName} value={criterionName}>
                    {criterionName}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Set values from 1 to 9. Self comparisons must be 1.
            </Typography>

            <Stack direction="row" flexWrap="wrap" gap={2}>
              {criterionNames.map((criterionName) => (
                <Stack key={criterionName} spacing={0.5} alignItems="center">
                  <Typography variant="caption">Best vs {criterionName}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    color="info"
                    value={bwmPayload?.bestToOthers?.[criterionName] ?? ""}
                    disabled={criterionName === bwmPayload.bestCriterion}
                    onChange={(event) => {
                      const value = event.target.value;
                      const parsed = value === "" ? "" : Number(value);
                      updateConfig({
                        ...criteriaWeightingConfig,
                        payload: {
                          ...bwmPayload,
                          bestToOthers: {
                            ...(bwmPayload.bestToOthers || {}),
                            [criterionName]:
                              criterionName === bwmPayload.bestCriterion
                                ? 1
                                : parsed === "" || Number.isNaN(parsed)
                                ? ""
                                : Math.max(1, Math.min(9, parsed)),
                          },
                        },
                      }, { markDirty: true });
                    }}
                    inputProps={{ min: 1, max: 9, step: 1 }}
                    sx={{ width: 100 }}
                  />
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={2}>
              {criterionNames.map((criterionName) => (
                <Stack key={criterionName} spacing={0.5} alignItems="center">
                  <Typography variant="caption">{criterionName} vs Worst</Typography>
                  <TextField
                    type="number"
                    size="small"
                    color="info"
                    value={bwmPayload?.othersToWorst?.[criterionName] ?? ""}
                    disabled={criterionName === bwmPayload.worstCriterion}
                    onChange={(event) => {
                      const value = event.target.value;
                      const parsed = value === "" ? "" : Number(value);
                      updateConfig({
                        ...criteriaWeightingConfig,
                        payload: {
                          ...bwmPayload,
                          othersToWorst: {
                            ...(bwmPayload.othersToWorst || {}),
                            [criterionName]:
                              criterionName === bwmPayload.worstCriterion
                                ? 1
                                : parsed === "" || Number.isNaN(parsed)
                                ? ""
                                : Math.max(1, Math.min(9, parsed)),
                          },
                        },
                      }, { markDirty: true });
                    }}
                    inputProps={{ min: 1, max: 9, step: 1 }}
                    sx={{ width: 100 }}
                  />
                </Stack>
              ))}
            </Stack>
          </Stack>
        ) : null}

        {mode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM_CMCC ? (
          <Alert severity="warning">
            Simulated consensus for BWM will be available later.
          </Alert>
        ) : null}
        </Stack>
      ) : null}

        <Stack gap={3} direction={{ xs: "column", md: "row" }} flexWrap="wrap">
        {(selectedModel?.parameters || []).map((parameter, index) => {
          const paramKey = parameter?.key;
          if (!paramKey) return null;

          const paramLabel = parameter?.label || paramKey || "Parameter";
          const { adapter, registryKey } = resolveModelParameterAdapter(parameter);
          const FieldComponent = adapter?.FieldComponent || null;

          if (!FieldComponent) {
            return (
              <Stack key={`${paramKey}-${index}`} spacing={1} sx={{ minWidth: 260 }}>
                <Typography variant="body1">{paramLabel}:</Typography>
                <Typography variant="caption" color="error">
                  Unsupported parameter renderer for `{registryKey}`.
                </Typography>
              </Stack>
            );
          }

          return (
            <Stack key={`${paramKey}-${index}`}>
              <FieldComponent
                parameter={parameter}
                paramKey={paramKey}
                paramLabel={paramLabel}
                paramValues={paramValues}
                setParamValues={setParamValues}
                defaultModelParams={defaultModelParams}
                setDefaultModelParams={setDefaultModelParams}
                leafCriteria={leafCriteria}
                showValidationErrors={showValidationErrors}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ModelParameters;
