import { createBadRequestError } from "../../../utils/common/errors.js";

export const throwInvalidModelParametersError = ({ modelName, parameterErrors }) => {
  const firstError = parameterErrors[0];
  const summary = parameterErrors
    .map((error) => `${error.parameter} ${error.message}`)
    .join(", ");

  throw createBadRequestError(
    `Invalid model parameters for model '${modelName}': ${summary}`,
    {
      field: `paramValues.${firstError.parameter}`,
      details: {
        model: modelName,
        invalidParameters: parameterErrors,
      },
    }
  );
};

export const throwUnknownModelParametersError = ({
  modelName,
  unknownParameters,
  allowedParameters,
}) => {
  throw createBadRequestError(
    `Unknown model parameters for model '${modelName}': ${unknownParameters.join(", ")}`,
    {
      field: `paramValues.${unknownParameters[0]}`,
      details: {
        model: modelName,
        unknownParameters,
        allowedParameters,
      },
    }
  );
};
