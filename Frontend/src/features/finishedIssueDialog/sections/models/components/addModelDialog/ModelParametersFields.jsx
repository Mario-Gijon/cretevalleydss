import { Box, Stack, Typography } from "@mui/material";

import { ParameterFieldHost } from "../../../../../modelParameters/rendering";
import { addModelParameterColorScopeSx } from "../../addModelDialog.styles.js";

const ModelParametersFields = ({
  parameterContext,
  parameters,
  selectedModel,
  values,
  onParameterChange,
}) => (
  <Box sx={addModelParameterColorScopeSx}>
    <Stack spacing={0.8}>
      <Typography sx={{ fontSize: 14, fontWeight: 950 }}>
        Model parameters
      </Typography>

      {selectedModel ? (
        parameters.length ? (
          parameters.map((parameter) => (
            <ParameterFieldHost
              key={parameter.key}
              parameter={parameter}
              value={values?.[parameter.key]}
              onChange={(value) => onParameterChange(parameter.key, value)}
              parameterContext={parameterContext}
              disabled={false}
            />
          ))
        ) : (
          <Typography color="text.secondary">
            This model has no parameters.
          </Typography>
        )
      ) : (
        <Typography color="text.secondary">
          Select an enabled model to load its registered parameters.
        </Typography>
      )}
    </Stack>
  </Box>
);

export default ModelParametersFields;
