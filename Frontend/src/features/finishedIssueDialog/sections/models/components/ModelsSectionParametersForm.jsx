import { Stack, Typography } from "@mui/material";
import { ParameterFieldHost } from "../../../../modelParameters";

const ModelsSectionParametersForm = ({ model, values, setValues, parameterContext }) => {
  if (!model) return <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>Select a model to configure its parameters.</Typography>;
  const parameters = Array.isArray(model.parameterDefinitions) ? model.parameterDefinitions.filter((parameter) => parameter?.key && parameter?.semanticRole !== "criteriaWeights") : [];
  if (!parameters.length) return <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>This model has no parameters.</Typography>;
  return <Stack spacing={2}>{parameters.map((parameter) => <ParameterFieldHost key={parameter.key} parameter={parameter} value={values?.[parameter.key]} onChange={(value) => setValues((current) => ({ ...(current || {}), [parameter.key]: value }))} disabled={false} parameterContext={parameterContext} />)}</Stack>;
};

export default ModelsSectionParametersForm;
