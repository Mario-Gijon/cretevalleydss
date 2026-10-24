import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

const BoundaryFieldHarness = ({ showValidation = false, multipleBoundaries = false, criteriaCount = 1 }) => {
  const activeCategories = multipleBoundaries ? categories : [categories[0], categories[2]];
  const leafCriteria = Array.from({ length: criteriaCount }, (_, index) => ({
    id: index === 0 ? "benefit-id" : `criterion-${index + 1}-id`,
    name: index === 0 ? "Renewables" : `Criterion ${index + 1}`,
    type: "benefit",
  }));
  const [values, setValues] = useState({ categories: activeCategories, boundaries: { profiles: [] } });
  const context = useMemo(() => buildParameterContext({
    parameterDefinitions: modelParameters,
    parameterValues: values,
    leafCriteria,
    expressionDomains: [
      { id: "domain-benefit", name: "Renewables scale", typeKey: "numericContinuous", definition: { min: 0, max: 10 } },
    ],
    expressionDomainConfig: { mode: "global", globalDomainId: "domain-benefit" },
  }), [leafCriteria, values]);
  const Field = PARAMETER_FIELD_REGISTRY.boundaryProfiles.FieldComponent;
  return (
    <>
      <Field
        parameter={parameter}
        value={values.boundaries}
        parameterContext={context}
        showValidation={showValidation}
        onChange={(boundaries) => setValues((previous) => ({ ...previous, boundaries }))}
      />
      <output hidden data-testid="boundary-values">{JSON.stringify(values.boundaries)}</output>
    </>
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

  it("explains unsupported domains without converting saved profile values", () => {
    const unsupportedContext = {
      ...parameterContext,
      criterionDomainsById: {
        ...parameterContext.criterionDomainsById,
        "benefit-id": { typeKey: "boolean", definition: { min: 0, max: 1 } },
      },
    };
    expect(validateBoundaryProfilesValue(parameter, value, unsupportedContext))
      .toMatch(/Use a continuous or discrete numeric domain for Renewables/);
    expect(value.profiles[0].valuesByCriterionId["benefit-id"]).toBe(4);
  });

  it("rejects a configured range that does not overlap its expression domain", () => {
    const conflictingLimits = { ...parameter, restrictions: { min: 11, max: 12 } };
    expect(validateBoundaryProfilesValue(conflictingLimits, value, parameterContext))
      .toMatch(/Adjust the numeric limits for Renewables to fit its expression domain/);
  });

  it("creates a profile for each configured boundary and stores values by criterion ID", async () => {
    const user = userEvent.setup();
    render(<BoundaryFieldHarness />);

    expect(screen.getByText("Classification references")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About classification references" })).toBeInTheDocument();
    expect(screen.getByText("Benefit · 0–10")).toBeInTheDocument();
    expect(screen.getByRole("table").textContent).not.toMatch(/profileId|categoryId|criterionId|[0-9a-f]{8}-[0-9a-f-]{27}/i);
    const input = await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });
    await user.type(input, "4.25");
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Renewables reference in Low → High" })).toHaveValue(4.25));
    expect(JSON.parse(screen.getByTestId("boundary-values").textContent).profiles[0].valuesByCriterionId)
      .toEqual({ "benefit-id": "4.25" });
    expect(screen.queryByText(/Enter a finite number/)).not.toBeInTheDocument();
  });

  it("shows every reference as a separate desktop table column", async () => {
    render(<BoundaryFieldHarness multipleBoundaries />);
    expect(await screen.findByRole("spinbutton", { name: "Renewables reference in Low → Medium" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Renewables reference in Medium → High" })).toBeInTheDocument();
  });

  it("keeps six criteria in a scrollable classification matrix", async () => {
    render(<BoundaryFieldHarness multipleBoundaries criteriaCount={6} />);
    const table = await screen.findByRole("table", { name: "Classification reference values" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    expect(within(table).getByText("Criterion 6")).toBeInTheDocument();
    expect(within(table).getByText("Low → Medium")).toBeInTheDocument();
    expect(within(table).getByText("Medium → High")).toBeInTheDocument();
  });

  it("shows one shared reference at a time on mobile", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const user = userEvent.setup();
    render(<BoundaryFieldHarness multipleBoundaries />);
    const select = await screen.findByRole("combobox", { name: "Classification reference" });
    expect(screen.getByRole("spinbutton", { name: "Renewables reference in Low → Medium" })).toBeInTheDocument();
    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "Medium → High" }));
    expect(screen.getByRole("spinbutton", { name: "Renewables reference in Medium → High" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Renewables reference in Low → Medium" })).not.toBeInTheDocument();
  });

  it("does not show red validation alerts before a user edits an incomplete profile", async () => {
    render(<BoundaryFieldHarness />);
    await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByText("1 value to enter")).toBeInTheDocument();
  });

  it("shows a field-level message after validation is explicitly requested", async () => {
    render(<BoundaryFieldHarness showValidation />);
    const input = await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });
    expect(input).toBeInvalid();
    expect(screen.getByText("Enter a value for Renewables in the Low → High boundary.")).toBeInTheDocument();
  });

  it("validates missing profiles, missing values, nonnumeric values and domain ranges", () => {
    expect(validateBoundaryProfilesValue(parameter, { profiles: [value.profiles[0]] }, parameterContext)).toMatch(/Medium → High reference profile/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        { ...value.profiles[0], valuesByCriterionId: { "benefit-id": 4 } },
        value.profiles[1],
      ],
    }, parameterContext)).toMatch(/Enter a value for Cost in the Low → Medium boundary/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        { ...value.profiles[0], valuesByCriterionId: { ...value.profiles[0].valuesByCriterionId, "benefit-id": "not a number" } },
        value.profiles[1],
      ],
    }, parameterContext)).toMatch(/numeric value/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        { ...value.profiles[0], valuesByCriterionId: { ...value.profiles[0].valuesByCriterionId, "benefit-id": 12 } },
        value.profiles[1],
      ],
    }, parameterContext)).toMatch(/Renewables must be between 0 and 10/);
  });

  it("uses category names with friendly indexes when labels are duplicated", () => {
    const duplicateCategories = categories.map((category) => ({ ...category, label: "Shared" }));
    const duplicateContext = buildParameterContext({
      parameterDefinitions: modelParameters,
      parameterValues: { categories: duplicateCategories },
      leafCriteria: parameterContext.leafCriteria,
      criterionDomainsById: parameterContext.criterionDomainsById,
    });
    const error = validateBoundaryProfilesValue(parameter, { profiles: [] }, duplicateContext);
    expect(error).toMatch(/Shared \(category 1\) → Shared \(category 2\)/);
    expect(error).not.toMatch(/categoryId|profileId|criterionId|[0-9a-f]{8}-[0-9a-f-]{27}/i);
  });

  it("checks benefit and cost dominance between consecutive profiles", () => {
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        value.profiles[0],
        { ...value.profiles[1], valuesByCriterionId: { "benefit-id": 3, "cost-id": 4 } },
      ],
    }, parameterContext)).toMatch(/must be at least as favorable/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        value.profiles[0],
        { ...value.profiles[1], valuesByCriterionId: { "benefit-id": 7, "cost-id": 9 } },
      ],
    }, parameterContext)).toMatch(/must be at least as favorable/);
    expect(validateBoundaryProfilesValue(parameter, {
      profiles: [
        value.profiles[0],
        { ...value.profiles[1], valuesByCriterionId: { "benefit-id": 4, "cost-id": 8 } },
      ],
    }, parameterContext)).toMatch(/more favorable than the previous boundary/);
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
    }))).toMatch(/saved boundary no longer matches the current category order/);
  });

  it("preserves saved values for removed criteria until the user explicitly reviews them", () => {
    const profileWithOldCriterion = {
      profiles: [{
        profileId: "profile-high",
        categoryId: "high",
        valuesByCriterionId: { "benefit-id": 6, "removed-criterion-id": 8 },
      }],
    };
    const result = reconcileBoundaryProfiles({
      value: profileWithOldCriterion,
      categories: [categories[0], categories[2]],
      leafCriteria: [{ id: "new-id", name: "New criterion", type: "benefit" }],
    });
    expect(result.value.profiles[0].valuesByCriterionId).toEqual({
      "benefit-id": 6,
      "removed-criterion-id": 8,
      "new-id": "",
    });

    const context = buildParameterContext({
      parameterDefinitions: modelParameters,
      parameterValues: { categories: [categories[0], categories[2]] },
      leafCriteria: [{ id: "new-id", name: "New criterion", type: "benefit" }],
    });
    const error = validateBoundaryProfilesValue(parameter, result.value, context);
    expect(error).toMatch(/saved value for a criterion that is no longer in the Issue/i);
    expect(error).not.toContain("removed-criterion-id");
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
    expect(result.profiles[1].profileId).toBe("profile-top");
    expect(result.profiles[2]).toMatchObject({
      categoryId: "high",
      valuesByCriterionId: { "benefit-id": "", "cost-id": "" },
    });
    expect(result.profiles[2].profileId).toBe("profile-high");
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
    expect(screen.getAllByText("Saved value for removed criterion")).toHaveLength(2);
    expect(screen.getByText("Saved boundary needs review")).toBeInTheDocument();
    expect(screen.queryByText(/historical-id|deleted/)).not.toBeInTheDocument();
  });
});
