import { describe, expect, it } from "vitest";

import { selectOpenApiSpecification } from "../../scripts/openapi-generation.mjs";

const buildExistingSpecification = () => ({
  openapi: "3.0.3",
  info: {
    title: "Existing API",
    version: "1.0.0",
  },
  servers: [
    {
      url: "/old-api",
      description: "Existing primary server",
    },
    {
      url: "https://secondary.example.test",
      description: "Existing secondary server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    schemas: {
      ExistingPayload: {
        type: "object",
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        responses: {
          200: {
            description: "Existing login contract",
          },
        },
      },
    },
  },
});

describe("OpenAPI generation selection", () => {
  it("uses a non-empty generated specification instead of the existing fallback", () => {
    const generatedSpecification = {
      openapi: "3.0.3",
      info: {
        title: "Generated API",
        version: "2.0.0",
      },
      servers: [{ url: "/generated-default" }],
      components: {
        schemas: {
          GeneratedPayload: {
            type: "string",
          },
        },
      },
      paths: {
        "/generated": {
          get: {
            responses: {
              200: {
                description: "Generated contract",
              },
            },
          },
        },
      },
    };

    const result = selectOpenApiSpecification({
      generatedSpecification,
      existingSpecification: buildExistingSpecification(),
      serverUrl: "https://api.example.test",
    });

    expect(result).toEqual({
      specification: {
        ...generatedSpecification,
        servers: [{ url: "https://api.example.test" }],
      },
      source: "generated",
      warning: null,
    });
  });

  it("preserves the existing paths, components, and contracts when generation discovers zero paths", () => {
    const existingSpecification = buildExistingSpecification();
    const originalExistingSpecification = structuredClone(
      existingSpecification
    );

    const result = selectOpenApiSpecification({
      generatedSpecification: {
        openapi: "3.0.3",
        info: {
          title: "Empty generated API",
          version: "9.9.9",
        },
        components: {},
        paths: {},
      },
      existingSpecification,
      serverUrl: "/requested-api",
    });

    expect(result.source).toBe("existing-fallback");
    expect(result.warning).toContain("discovered zero paths");
    expect(result.specification.paths).toEqual(existingSpecification.paths);
    expect(result.specification.components).toEqual(
      existingSpecification.components
    );
    expect(result.specification.info).toEqual(existingSpecification.info);
    expect(result.specification.servers).toEqual([
      {
        url: "/requested-api",
        description: "Existing primary server",
      },
      existingSpecification.servers[1],
    ]);
    expect(existingSpecification).toEqual(originalExistingSpecification);
  });

  it.each([
    ["missing", null],
    ["empty", { openapi: "3.0.3", components: {}, paths: {} }],
  ])(
    "fails safely when generation is empty and the existing fallback is %s",
    (_label, existingSpecification) => {
      expect(() =>
        selectOpenApiSpecification({
          generatedSpecification: {
            openapi: "3.0.3",
            paths: {},
          },
          existingSpecification,
          serverUrl: "/api",
        })
      ).toThrow(
        "swagger-jsdoc discovered zero paths and no existing non-empty OpenAPI specification is available; refusing to write an empty API contract."
      );
    }
  );
});
