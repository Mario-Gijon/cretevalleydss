import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const specificationPath = path.resolve(
  currentDirectory,
  "../../openapi/openapi.json"
);
const specification = JSON.parse(fs.readFileSync(specificationPath, "utf8"));

const findUntypedNullableSchemas = (value, pointer = "#") => {
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      findUntypedNullableSchemas(entry, `${pointer}/${index}`)
    );
  }

  const currentMatch =
    value.nullable === true && typeof value.type !== "string" ? [pointer] : [];

  return [
    ...currentMatch,
    ...Object.entries(value).flatMap(([key, child]) =>
      findUntypedNullableSchemas(child, `${pointer}/${key}`)
    ),
  ];
};

describe("checked-in OpenAPI contract", () => {
  it("contains documented routes instead of a credible empty specification", () => {
    expect(Object.keys(specification.paths ?? {}).length).toBeGreaterThan(0);
  });

  it("assigns a type to every nullable OpenAPI 3.0 schema", () => {
    expect(findUntypedNullableSchemas(specification)).toEqual([]);
  });
});
