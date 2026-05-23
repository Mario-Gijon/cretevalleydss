import { Stack, Typography } from "@mui/material";

import { resolveModelParameterAdapter } from "../../../modelParameters";

const SCENARIO_CRITERIA_WEIGHTING_KEY = "manualCriteriaWeights";

const buildScenarioFormParameters = (model) => {
  const baseParameters = (Array.isArray(model?.parameters) ? model.parameters : []).filter(
    (parameter) =>
      !["criteriaWeights", "fuzzyCriteriaWeights"].includes(parameter?.parameterStructureKey)
  );

  if (model?.usesCriteriaWeights !== true) {
    return baseParameters;
  }

  if (model?.usesFuzzyCriteriaWeights === true) {
    const fuzzyValueCount = Number(model?.fuzzyWeightsValueCount);
    return [
      ...baseParameters,
      {
        key: "weights",
        label: "Fuzzy criteria weights",
        type: "fuzzyArray",
        scope: "perCriterion",
        parameterStructureKey: "fuzzyCriteriaWeights",
        required: true,
        default: "equal",
        restrictions: {
          min: 0,
          max: 1,
          ordered: "nonDecreasing",
          length:
            Number.isInteger(fuzzyValueCount) && fuzzyValueCount >= 2
              ? fuzzyValueCount
              : null,
          allowed: null,
        },
      },
    ];
  }

  return [
    ...baseParameters,
    {
      key: "weights",
      label: "Criteria weights",
      type: "array",
      scope: "perCriterion",
      parameterStructureKey: "criteriaWeights",
      required: true,
      default: "equal",
      restrictions: {
        min: 0,
        max: 1,
        ordered: null,
        length: "matchCriteria",
        allowed: null,
      },
    },
  ];
};

const ModelsSectionParametersForm = ({
  model,
  values,
  setValues,
  leafCriteria,
}) => {
  if (!model) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        Select a model to configure its parameters.
      </Typography>
    );
  }

  const params = buildScenarioFormParameters(model);
  if (params.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        This model has no parameters.
      </Typography>
    );
  }

  const resolvedLeafCriteria = Array.isArray(leafCriteria) ? leafCriteria : [];

  return (
    <Stack spacing={2}>
      {params.map((parameter, index) => {
        const paramKey = parameter?.key;
        if (!paramKey) return null;

        const paramLabel = parameter?.label || paramKey;
        const { adapter, registryKey } = resolveModelParameterAdapter(parameter);
        const FieldComponent = adapter?.FieldComponent || null;

        if (!FieldComponent) {
          return (
            <Stack key={`${paramKey}-${index}`} spacing={0.5}>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                {paramLabel}
              </Typography>
              <Typography variant="caption" color="error">
                Unsupported parameter renderer for `{registryKey}`.
              </Typography>
            </Stack>
          );
        }

        return (
          <FieldComponent
            key={`${paramKey}-${index}`}
            parameter={parameter}
            paramKey={paramKey}
            paramLabel={paramLabel}
            paramValues={values || {}}
            setParamValues={setValues}
            defaultModelParams={false}
            setDefaultModelParams={() => {}}
            leafCriteria={resolvedLeafCriteria}
            criteriaWeightingStructureKey={SCENARIO_CRITERIA_WEIGHTING_KEY}
            setCriteriaWeightingStructureKey={undefined}
            showValidationErrors
          />
        );
      })}
    </Stack>
  );
};

export default ModelsSectionParametersForm;
