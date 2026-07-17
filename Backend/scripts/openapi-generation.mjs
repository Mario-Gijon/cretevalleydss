const isObjectRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const hasDocumentedOpenApiPaths = (specification) =>
  isObjectRecord(specification) &&
  isObjectRecord(specification.paths) &&
  Object.keys(specification.paths).length > 0;

const applyPrimaryServerUrl = (specification, serverUrl) => {
  const normalizedServerUrl = String(serverUrl ?? "").trim();

  if (!normalizedServerUrl) {
    throw new Error("A non-empty OpenAPI server URL is required.");
  }

  const currentServers = Array.isArray(specification.servers)
    ? specification.servers
    : [];
  const currentPrimaryServer = isObjectRecord(currentServers[0])
    ? currentServers[0]
    : { description: "Current API server" };

  return {
    ...specification,
    servers: [
      {
        ...currentPrimaryServer,
        url: normalizedServerUrl,
      },
      ...currentServers.slice(1),
    ],
  };
};

export const selectOpenApiSpecification = ({
  generatedSpecification,
  existingSpecification,
  serverUrl,
}) => {
  if (hasDocumentedOpenApiPaths(generatedSpecification)) {
    return {
      specification: applyPrimaryServerUrl(
        generatedSpecification,
        serverUrl
      ),
      source: "generated",
      warning: null,
    };
  }

  if (!hasDocumentedOpenApiPaths(existingSpecification)) {
    throw new Error(
      "swagger-jsdoc discovered zero paths and no existing non-empty OpenAPI specification is available; refusing to write an empty API contract."
    );
  }

  return {
    specification: applyPrimaryServerUrl(existingSpecification, serverUrl),
    source: "existing-fallback",
    warning:
      "swagger-jsdoc discovered zero paths; preserving the existing non-empty OpenAPI specification instead.",
  };
};
