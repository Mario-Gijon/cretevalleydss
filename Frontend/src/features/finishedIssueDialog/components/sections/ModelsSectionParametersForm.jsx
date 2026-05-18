import { Stack, Typography } from "@mui/material";

import { resolveModelParameterAdapter } from "../../../modelParameters";

const SCENARIO_CRITERIA_WEIGHTING_KEY = "manualCriteriaWeights";

const ModelsSectionParametersForm = ({ model, values, setValues, leafNames }) => {
  if (!model) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        Select a model to configure its parameters.
      </Typography>
    );
  }

  const params = Array.isArray(model?.parameters) ? model.parameters : [];
  if (params.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        This model has no parameters.
      </Typography>
    );
  }

  const leafCriteria = Array.isArray(leafNames)
    ? leafNames.map((name, index) => ({
        _id: `leaf-${index}`,
        name,
      }))
    : [];

  return (
    <Stack spacing={2}>
      {params.map((parameter, index) => {
        const paramKey = parameter?.key;
        if (!paramKey) return null;

        const paramLabel = parameter?.label || paramKey;
        let renderParameter = parameter;
        let { adapter, registryKey } = resolveModelParameterAdapter(renderParameter);

        // Some model snapshots may omit `ui.component` for criteria weights.
        // Keep scenario editing strict by forcing the canonical weights renderer.
        if (
          !adapter?.FieldComponent &&
          (parameter?.semanticRole === "criteriaWeights" || paramKey === "weights")
        ) {
          renderParameter = {
            ...parameter,
            scope: parameter?.scope || "perCriterion",
            ui: {
              ...(parameter?.ui && typeof parameter.ui === "object" ? parameter.ui : {}),
              component: parameter?.type === "fuzzyArray"
                ? "fuzzyCriteriaWeights"
                : "criteriaWeights",
            },
          };
          ({ adapter, registryKey } = resolveModelParameterAdapter(renderParameter));
        }
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
            parameter={renderParameter}
            paramKey={paramKey}
            paramLabel={paramLabel}
            paramValues={values || {}}
            setParamValues={setValues}
            defaultModelParams={false}
            setDefaultModelParams={() => {}}
            leafCriteria={leafCriteria}
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
