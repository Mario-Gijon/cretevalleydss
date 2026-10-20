import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PARAMETER_FIELD_REGISTRY,
  resolveParameterFieldEntry,
} from "../../../src/features/decisionPlugins/modelParameters";
import { buildParameterContext } from "../../../src/features/modelParameters/context/index.js";
import {
  reconcileBoundaryProfiles,
  reconcileBoundaryProfilesAfterCategoryChange,
  validateBoundaryProfilesValue,
} from "../../../src/features/decisionPlugins/modelParameters/fields/boundaryProfiles/boundaryProfilesValues.js";

const modelParameters = [
  { key: "categories", parameterStructureKey: "orderedCategories" },
  { key: "boundaries", label: "Profiles", parameterStructureKey: "boundaryProfiles" },
];
const categories = [
  { categoryId: "low", label: "Low", order: 0 },
  { categoryId: "medium", label: "Medium", order: 1 },
  { categoryId: "high", label: "High", order: 2 },
];
const criteriaTree = [
  {
    id: "parent",
    name: "Sustainability",
    children: [
      { id: "benefit-id", name: "Renewables", type: "benefit", children: [] },
      { id: "cost-id", name: "Cost", type: "cost", children: [] },
    ],
  },
];
const parameterContext = buildParameterContext({
  model: { parameters: modelParameters },
  criteriaTree,
  leafCriteria: criteriaTree[0].children,
  parameterDefinitions: modelParameters,
  parameterValues: { categories },
  expressionDomains: [
    { id: "domain-benefit", name: "Renewables scale", typeKey: "numericDiscrete", definition: { min: 0, max: 10, step: 5 } },
    { id: "domain-cost", name: "Cost scale", typeKey: "numericContinuous", definition: { min: 0, max: 10 } },
  ],
  expressionDomainConfig: {
    mode: "byCriterion",
    domainsByCriterion: { Renewables: "domain-benefit", Cost: "domain-cost" },
  },
});
const value = {
  profiles: [
    { profileId: "p-medium", categoryId: "medium", valuesByCriterionId: { "benefit-id": 4, "cost-id": 8 } },
    { profileId: "p-high", categoryId: "high", valuesByCriterionId: { "benefit-id": 7, "cost-id": 4 } },
  ],
};
const parameter = modelParameters[1];

const BoundaryFieldHarness = () => {
  const [values, setValues] = useState({ categories: [categories[0], categories[2]], boundaries: { profiles: [] } });
  const context = useMemo(() => buildParameterContext({
    parameterDefinitions: modelParameters,
    parameterValues: values,
    leafCriteria: [{ id: "benefit-id", name: "Renewables", type: "benefit" }],
    expressionDomains: [
      { id: "domain-benefit", name: "Renewables scale", typeKey: "numericContinuous", definition: { min: 0, max: 10 } },
    ],
    expressionDomainConfig: { mode: "global", globalDomainId: "domain-benefit" },
  }), [values]);
  const Field = PARAMETER_FIELD_REGISTRY.boundaryProfiles.FieldComponent;
  return (
    <Field
      parameter={parameter}
      value={values.boundaries}
      parameterContext={context}
      onChange={(boundaries) => setValues((previous) => ({ ...previous, boundaries }))}
    />
  );
};

describe("boundaryProfiles model-parameter plugin", () => {
  it("is discovered with field and read-only components", () => {
    const entry = resolveParameterFieldEntry(parameter);
    expect(entry).toBe(PARAMETER_FIELD_REGISTRY.boundaryProfiles);
    expect(entry.FieldComponent).toBeTypeOf("function");
    expect(entry.ReadOnlyComponent).toBeTypeOf("function");
  });

  it("gets current categories and selected domains from the generic parameter context", () => {
    expect(parameterContext.parameterValuesByStructureKey.orderedCategories[0].value).toEqual(categories);
    expect(parameterContext.criterionDomainsById["benefit-id"]).toMatchObject({
      id: "domain-benefit",
      typeKey: "numericDiscrete",
      definition: { min: 0, max: 10, step: 5 },
    });
  });

  it("accepts one profile per upper category and allows intermediate values on discrete domains", () => {
    expect(validateBoundaryProfilesValue(parameter, value, parameterContext)).toBeNull();
  });

  it("creates a profile for each configured boundary and stores values by criterion ID", async () => {
    const user = userEvent.setup();
    render(<BoundaryFieldHarness />);

    const input = await screen.findByRole("spinbutton", { name: "High boundary for Renewables" });
    await user.type(input, "4.25");
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "High boundary for Renewables" })).toHaveValue(4.25));
    expect(screen.queryByText(/Enter a finite number/)).not.toBeInTheDocument();
  });

  it("validates missing profiles, missing values, nonnumeric values and domain ranges", () => {
    expect(validateBoundaryProfilesValue(parameter, { profiles: [value.profiles[0]] }, parameterContext)).toMatch(/profile for 'High'/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        { ...value.profiles[0], valuesByCriterionId: { "benefit-id": 4 } },
        value.profiles[1],
      ],
    }, parameterContext)).toMatch(/Enter a value for 'Cost'/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        { ...value.profiles[0], valuesByCriterionId: { ...value.profiles[0].valuesByCriterionId, "benefit-id": "not a number" } },
        value.profiles[1],
      ],
    }, parameterContext)).toMatch(/finite number/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        { ...value.profiles[0], valuesByCriterionId: { ...value.profiles[0].valuesByCriterionId, "benefit-id": 12 } },
        value.profiles[1],
      ],
    }, parameterContext)).toMatch(/between 0 and 10/);
  });

  it("checks benefit and cost dominance between consecutive profiles", () => {
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        value.profiles[0],
        { ...value.profiles[1], valuesByCriterionId: { "benefit-id": 3, "cost-id": 4 } },
      ],
    }, parameterContext)).toMatch(/benefit order/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        value.profiles[0],
        { ...value.profiles[1], valuesByCriterionId: { "benefit-id": 7, "cost-id": 9 } },
      ],
    }, parameterContext)).toMatch(/cost order/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        value.profiles[0],
        { ...value.profiles[1], valuesByCriterionId: { "benefit-id": 4, "cost-id": 8 } },
      ],
    }, parameterContext)).toMatch(/differ strictly/);
  });

  it("keeps IDs and values for boundaries that remain, creates blank profiles, and retains unmatched profiles for explicit review", () => {
    const expandedCategories = [
      categories[0],
      { categoryId: "between", label: "Between", order: 1 },
      { ...categories[1], order: 2 },
      { ...categories[2], order: 3 },
    ];
    const result = reconcileBoundaryProfiles({ value, categories: expandedCategories, leafCriteria: parameterContext.leafCriteria });
    expect(result.value.profiles).toHaveLength(3);
    expect(result.value.profiles[1]).toMatchObject(value.profiles[0]);
    expect(result.value.profiles[2]).toMatchObject(value.profiles[1]);
    expect(result.value.profiles[0]).toMatchObject({ categoryId: "between", valuesByCriterionId: { "benefit-id": "", "cost-id": "" } });

    const removedBoundary = reconcileBoundaryProfiles({
      value,
      categories: [categories[0], categories[2]],
      leafCriteria: parameterContext.leafCriteria,
    });
    expect(removedBoundary.staleCount).toBe(1);
    expect(removedBoundary.value.profiles).toHaveLength(2);
    expect(removedBoundary.value.profiles[1]).toMatchObject(value.profiles[0]);
    expect(validateBoundaryProfilesValue(parameter, removedBoundary.value, buildParameterContext({
      parameterDefinitions: modelParameters,
      parameterValues: { categories: [categories[0], categories[2]] },
      leafCriteria: parameterContext.leafCriteria,
      criterionDomainsById: parameterContext.criterionDomainsById,
    }))).toMatch(/refers to a category that was removed/);
  });

  it("resets only profiles whose adjacent category pair changes", () => {
    const previousCategories = [
      { categoryId: "low", label: "Low", order: 0 },
      { categoryId: "medium", label: "Medium", order: 1 },
      { categoryId: "high", label: "High", order: 2 },
      { categoryId: "top", label: "Top", order: 3 },
    ];
    const nextCategories = [
      previousCategories[0],
      previousCategories[1],
      previousCategories[3],
      previousCategories[2],
    ].map((category, order) => ({ ...category, order }));
    const previousProfiles = {
      profiles: [
        { profileId: "profile-medium", categoryId: "medium", valuesByCriterionId: { "benefit-id": 2, "cost-id": 9 } },
        { profileId: "profile-high", categoryId: "high", valuesByCriterionId: { "benefit-id": 5, "cost-id": 7 } },
        { profileId: "profile-top", categoryId: "top", valuesByCriterionId: { "benefit-id": 8, "cost-id": 3 } },
      ],
    };

    const result = reconcileBoundaryProfilesAfterCategoryChange({
      value: previousProfiles,
      previousCategories,
      nextCategories,
      leafCriteria: parameterContext.leafCriteria,
    });

    expect(result.profiles).toHaveLength(3);
    expect(result.profiles[0]).toEqual(previousProfiles.profiles[0]);
    expect(result.profiles[1]).toMatchObject({
      categoryId: "top",
      valuesByCriterionId: { "benefit-id": "", "cost-id": "" },
    });
    expect(result.profiles[1].profileId).not.toBe("profile-top");
    expect(result.profiles[2]).toMatchObject({
      categoryId: "high",
      valuesByCriterionId: { "benefit-id": "", "cost-id": "" },
    });
    expect(result.profiles[2].profileId).not.toBe("profile-high");
  });

  it("renders category and criterion names in the read-only component, with ID fallbacks", () => {
    const ReadOnly = PARAMETER_FIELD_REGISTRY.boundaryProfiles.ReadOnlyComponent;
    const readOnlyContext = buildParameterContext({
      parameterDefinitions: modelParameters,
      parameterValues: { categories },
      leafCriteria: [{ id: "benefit-id", name: "Renewables" }],
    });
    render(<ReadOnly value={{ profiles: [
      { profileId: "read-only-1", categoryId: "medium", valuesByCriterionId: { "benefit-id": 4, "historical-id": 6 } },
      { profileId: "read-only-2", categoryId: "deleted", valuesByCriterionId: { "historical-id": 6 } },
    ] }} parameterContext={readOnlyContext} />);
    expect(screen.getByText("Low → Medium")).toBeInTheDocument();
    expect(screen.getByText("Renewables")).toBeInTheDocument();
    expect(screen.getAllByText("Criterion historical-id")).toHaveLength(2);
    expect(screen.getByText("Boundary profile for category deleted")).toBeInTheDocument();
  });
});
