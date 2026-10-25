import { useMemo, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { decisionMatrixSurface } from "../../../src/features/decisionPlugins/shared/styles/decisionMatrixSurface.styles.js";
import {
  buildEvaluationMatrixDataGridSx,
  evaluationMatrixCellBackground,
} from "../../../src/features/decisionPlugins/evaluations/shared/styles/evaluationMatrixTable.styles.js";

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

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

const BoundaryFieldHarness = ({
  showValidation = false,
  multipleBoundaries = false,
  criteriaCount = 1,
  categoryValues,
  initialBoundaries = { profiles: [] },
  criteria,
  expressionDomainTypeKey = "numericContinuous",
}) => {
  const activeCategories = categoryValues || (multipleBoundaries ? categories : [categories[0], categories[2]]);
  const leafCriteria = criteria || Array.from({ length: criteriaCount }, (_, index) => ({
    id: index === 0 ? "benefit-id" : `criterion-${index + 1}-id`,
    name: index === 0 ? "Renewables" : `Criterion ${index + 1}`,
    type: "benefit",
  }));
  const [values, setValues] = useState({ categories: activeCategories, boundaries: initialBoundaries });
  const context = useMemo(() => buildParameterContext({
    parameterDefinitions: modelParameters,
    parameterValues: values,
    leafCriteria,
    expressionDomains: [
      { id: "domain-benefit", name: "Renewables scale", typeKey: expressionDomainTypeKey, definition: { min: 0, max: 10 } },
    ],
    expressionDomainConfig: { mode: "global", globalDomainId: "domain-benefit" },
  }), [expressionDomainTypeKey, leafCriteria, values]);
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
    expect(screen.queryByText(/values? to enter/i)).not.toBeInTheDocument();
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

  it("keeps the criterion header distinct and gives every reference column the same background", async () => {
    for (const categoryCount of [2, 3, 5]) {
      const categoryValues = Array.from({ length: categoryCount }, (_, index) => ({
        categoryId: `level-${index + 1}`,
        label: `Level ${index + 1}`,
        order: index,
      }));
      const { unmount } = render(<BoundaryFieldHarness categoryValues={categoryValues} />);
      const table = await screen.findByRole("table", { name: "Classification reference values" });
      const firstRow = table.querySelector("tbody tr");
      const criterionCell = firstRow.querySelector("th[scope='row']");
      const referenceCells = [...firstRow.querySelectorAll("td")];
      const criterionBackground = window.getComputedStyle(criterionCell).backgroundColor;
      const referenceBackgrounds = referenceCells.map((cell) => window.getComputedStyle(cell).backgroundColor);

      expect(referenceCells).toHaveLength(categoryCount - 1);
      expect(criterionBackground).not.toBe(referenceBackgrounds[0]);
      expect(new Set(referenceBackgrounds).size).toBe(1);
      expect(criterionBackground).toBe("rgb(12, 12, 12)");
      expect(referenceBackgrounds[0]).not.toBe("rgb(12, 12, 12)");
      unmount();
    }
  });

  it("keeps six criteria in a scrollable classification matrix", async () => {
    render(<BoundaryFieldHarness multipleBoundaries criteriaCount={6} />);
    const table = await screen.findByRole("table", { name: "Classification reference values" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    expect(within(table).getByText("Criterion 6")).toBeInTheDocument();
    expect(within(table).getByText("Low → Medium")).toBeInTheDocument();
    expect(within(table).getByText("Medium → High")).toBeInTheDocument();
    expect(table.parentElement).toHaveStyle({ overflow: "auto" });
  });

  it("keeps real custom category names in bounded headers, including duplicates and special characters", async () => {
    const user = userEvent.setup();
    const customCategories = [
      { categoryId: "risk-low", label: "Riesgo <moderado> & control", order: 0 },
      { categoryId: "duplicate-a", label: "Medium", order: 1 },
      { categoryId: "duplicate-b", label: "Medium", order: 2 },
      { categoryId: "risk-high", label: "Riesgo crítico con un nombre deliberadamente muy largo para probar el ancho", order: 3 },
    ];
    render(<BoundaryFieldHarness categoryValues={customCategories} />);

    const firstHeader = await screen.findByRole("columnheader", { name: "Riesgo <moderado> & control → Medium (2)" });
    const nextDuplicateHeader = screen.getByRole("columnheader", { name: "Medium (2) → Medium (3)" });
    const longHeaderName = "Medium (3) → Riesgo crítico con un nombre deliberadamente muy largo para probar el ancho";
    const longHeader = screen.getByRole("columnheader", { name: longHeaderName });

    expect(firstHeader).toBeInTheDocument();
    expect(nextDuplicateHeader).toBeInTheDocument();
    expect(longHeader).toBeInTheDocument();
    expect(longHeader).toHaveStyle({ maxWidth: "190px" });
    const longHeaderText = within(longHeader).getByText(longHeaderName);
    expect(longHeaderText).toHaveStyle({ overflow: "hidden", textOverflow: "ellipsis" });
    expect(longHeaderText).toHaveAttribute("aria-label", longHeaderName);
    await user.hover(longHeaderText);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(longHeaderName);
    expect(longHeader.textContent).not.toMatch(/categoryId|profileId|[0-9a-f]{8}-[0-9a-f-]{27}/i);
  });

  it("supports large category and criterion configurations with a contained scroll area", async () => {
    const manyCategories = Array.from({ length: 8 }, (_, index) => ({
      categoryId: "category-" + (index + 1),
      label: "Custom level " + (index + 1),
      order: index,
    }));
    const manyCriteria = Array.from({ length: 18 }, (_, index) => ({
      id: "criterion-" + (index + 1),
      name: "Criterion " + (index + 1),
      type: index % 2 ? "cost" : "benefit",
    }));
    render(<BoundaryFieldHarness categoryValues={manyCategories} criteria={manyCriteria} />);

    const table = await screen.findByRole("table", { name: "Classification reference values" });
    expect(within(table).getAllByRole("row")).toHaveLength(19);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    expect(within(table).getAllByRole("spinbutton")).toHaveLength(18 * 7);
    expect(within(table).getByRole("spinbutton", {
      name: "Criterion 18 reference in Custom level 7 → Custom level 8",
    })).toBeInTheDocument();
    expect(table.parentElement).toHaveStyle({ overflow: "auto" });
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

  it("preserves the distinct criterion and reference backgrounds in the mobile table", async () => {
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
    render(<BoundaryFieldHarness multipleBoundaries />);

    const table = await screen.findByRole("table", { name: "Classification reference values" });
    const firstRow = table.querySelector("tbody tr");
    const criterionCell = firstRow.querySelector("th[scope='row']");
    const referenceCells = firstRow.querySelectorAll("td");

    expect(screen.getByRole("combobox", { name: "Classification reference" })).toBeInTheDocument();
    expect(referenceCells).toHaveLength(1);
    expect(window.getComputedStyle(criterionCell).backgroundColor).not.toBe(window.getComputedStyle(referenceCells[0]).backgroundColor);
  });

  it("keeps full custom labels available in the mobile boundary selector", async () => {
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
    const customCategories = [
      { categoryId: "start", label: "Riesgo crítico con etiqueta larga", order: 0 },
      { categoryId: "middle", label: "Riesgo moderado & estable", order: 1 },
      { categoryId: "end", label: "Riesgo bajo con etiqueta igualmente larga", order: 2 },
    ];
    const user = userEvent.setup();
    render(<BoundaryFieldHarness categoryValues={customCategories} />);

    await user.click(await screen.findByRole("combobox", { name: "Classification reference" }));
    expect(await screen.findByRole("option", {
      name: "Riesgo crítico con etiqueta larga → Riesgo moderado & estable",
    })).toBeInTheDocument();
    await user.click(screen.getByRole("option", {
      name: "Riesgo moderado & estable → Riesgo bajo con etiqueta igualmente larga",
    }));
    expect(screen.getByRole("spinbutton", {
      name: "Renewables reference in Riesgo moderado & estable → Riesgo bajo con etiqueta igualmente larga",
    })).toBeInTheDocument();
  });

  it("leaves empty cells blank without a persistent missing-value count", async () => {
    render(<BoundaryFieldHarness />);
    await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("spinbutton", { name: "Renewables reference in Low → High" })).toHaveValue(null);
    expect(screen.queryByText(/values? to enter/i)).not.toBeInTheDocument();
  });

  it("shows a field-level message after validation is explicitly requested", async () => {
    render(<BoundaryFieldHarness showValidation />);
    const input = await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });
    expect(input).toBeInvalid();
    expect(screen.getByText("Enter a value for Renewables in the Low → High boundary.")).toBeInTheDocument();
  });

  it("disables reference editing and explains unsupported expression domains", async () => {
    render(<BoundaryFieldHarness expressionDomainTypeKey="boolean" />);
    const input = await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });

    expect(input).toBeDisabled();
    expect(screen.getByText("Use a continuous or discrete numeric domain for Renewables.")).toBeInTheDocument();
  });

  it("uses the shared A×C matrix surface while leaving A×C styling unchanged", () => {
    expect(decisionMatrixSurface).toEqual({
      headerBackground: "#0c0c0c",
      cellBackground: "#11111128",
      cellBorder: "1px solid rgba(255,255,255,0.075)",
      inputBackground: "rgba(255,255,255,0.035)",
      inputBorder: "1px solid rgba(255,255,255,0.18)",
      inputHoverBorder: "1px solid rgba(255,255,255,0.32)",
    });
    expect(evaluationMatrixCellBackground).toBe("#11111128");
    const styles = buildEvaluationMatrixDataGridSx({ palette: { common: { white: "#fff" }, text: { primary: "#fff", disabled: "#777" } } });
    expect(styles).toMatchObject({
      backgroundColor: "#11111128",
      "& .MuiDataGrid-columnHeaders": { backgroundColor: "#0c0c0c", borderBottom: "1px solid rgba(255,255,255,0.075)" },
      "& .MuiDataGrid-cell": {
        backgroundColor: "#11111128",
        borderRight: "1px solid rgba(255,255,255,0.075)",
        borderBottom: "1px solid rgba(255,255,255,0.075)",
      },
    });
  });

  it("associates edited cells with category IDs after the visual order changes", async () => {
    const reorderedCategories = [categories[0], categories[2], categories[1]];
    const initialBoundaries = {
      profiles: [
        { profileId: "medium-profile", categoryId: "medium", valuesByCriterionId: { "benefit-id": 5 } },
        { profileId: "high-profile", categoryId: "high", valuesByCriterionId: { "benefit-id": 8 } },
      ],
    };
    render(<BoundaryFieldHarness categoryValues={reorderedCategories} initialBoundaries={initialBoundaries} />);

    const highBoundaryInput = await screen.findByRole("spinbutton", { name: "Renewables reference in Low → High" });
    const mediumBoundaryInput = screen.getByRole("spinbutton", { name: "Renewables reference in High → Medium" });
    expect(highBoundaryInput).toHaveValue(8);
    expect(mediumBoundaryInput).toHaveValue(5);
    expect(screen.getByRole("table").querySelector("tbody th")).toHaveStyle({ backgroundColor: decisionMatrixSurface.headerBackground });

    await userEvent.clear(mediumBoundaryInput);
    await userEvent.type(mediumBoundaryInput, "6");
    await waitFor(() => {
      const saved = JSON.parse(screen.getByTestId("boundary-values").textContent).profiles;
      expect(saved.find((profile) => profile.profileId === "medium-profile").valuesByCriterionId["benefit-id"])
        .toBe("6");
      expect(saved.find((profile) => profile.profileId === "high-profile").valuesByCriterionId["benefit-id"])
        .toBe(8);
    });
  });

  it("shows a contextual confirmed resolver only for obsolete references and preserves active values", async () => {
    const user = userEvent.setup();
    const initialBoundaries = {
      profiles: [
        { profileId: "active-profile", categoryId: "high", valuesByCriterionId: { "benefit-id": 4, "retired-criterion": 9 } },
        { profileId: "removed-profile", categoryId: "removed-category", valuesByCriterionId: { "benefit-id": 7 } },
      ],
    };
    render(<BoundaryFieldHarness initialBoundaries={initialBoundaries} />);

    expect(screen.queryByText(/saved values for|saved reference|remove saved value/i)).not.toBeInTheDocument();
    expect(screen.getByRole("table").textContent).not.toMatch(/retired-criterion|removed-category|removed-profile/);
    await user.click(screen.getByRole("button", { name: "Review outdated references" }));
    expect(screen.getByRole("dialog", { name: "Remove outdated references?" })).toBeInTheDocument();
    expect(screen.getByText(/duplicate references will be deleted.*remaining references will be kept/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep references" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId("boundary-values").textContent).profiles).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Review outdated references" }));
    await user.click(screen.getByRole("button", { name: "Remove outdated references" }));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("boundary-values").textContent).profiles).toEqual([{
        profileId: "active-profile",
        categoryId: "high",
        valuesByCriterionId: { "benefit-id": 4 },
      }]);
    });
    expect(screen.queryByRole("button", { name: "Review outdated references" })).not.toBeInTheDocument();
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
