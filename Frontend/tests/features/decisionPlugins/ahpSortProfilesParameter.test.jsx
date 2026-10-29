import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelParameters from "../../../src/features/createIssue/summary/components/ModelParameters.jsx";
import {
  PARAMETER_FIELD_REGISTRY,
  resolveParameterFieldEntry,
} from "../../../src/features/decisionPlugins/modelParameters";
import { buildParameterContext } from "../../../src/features/modelParameters/context/index.js";
import {
  describeAHPSortCategoryChange,
  normalizeAHPSortProfilesValue,
  reconcileAHPSortProfilesAfterCategoryChange,
  validateAHPSortProfilesValue,
} from "../../../src/features/decisionPlugins/modelParameters/fields/ahpSortProfiles/ahpSortProfilesValues.js";

const categories = [
  { categoryId: "category-low", label: "Low", order: 0 },
  { categoryId: "category-medium", label: "Medium", order: 1 },
  { categoryId: "category-high", label: "High", order: 2 },
];
const categoriesWithTop = [
  ...categories,
  { categoryId: "category-top", label: "Top", order: 3 },
];
const parameters = [
  { key: "orderedCategories", label: "Categories", parameterStructureKey: "orderedCategories" },
  { key: "ahpSortProfiles", label: "AHPSort I profiles", parameterStructureKey: "ahpSortProfiles" },
  { key: "ahpSortGroup", label: "Group classification", parameterStructureKey: "ahpSortGroup", required: false },
];
const profileParameter = parameters[1];
const limitingValue = {
  mode: "limiting",
  profiles: [
    { profileId: "boundary-low-medium", lowerCategoryId: "category-low", upperCategoryId: "category-medium" },
    { profileId: "boundary-medium-high", lowerCategoryId: "category-medium", upperCategoryId: "category-high" },
  ],
};
const centralValue = {
  mode: "central",
  profiles: [
    { profileId: "center-low", categoryId: "category-low" },
    { profileId: "center-medium", categoryId: "category-medium" },
    { profileId: "center-high", categoryId: "category-high" },
  ],
  tiePolicy: "optimistic",
};
const limitingValueWithTop = {
  mode: "limiting",
  profiles: [
    limitingValue.profiles[0],
    limitingValue.profiles[1],
    { profileId: "boundary-high-top", lowerCategoryId: "category-high", upperCategoryId: "category-top" },
  ],
};

const FieldHarness = ({ initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const context = useMemo(() => buildParameterContext({
    parameterDefinitions: parameters,
    parameterValues: { orderedCategories: categories, ...(initialValue ? { ahpSortProfiles: initialValue } : {}) },
    leafCriteria: [],
  }), [initialValue]);
  const Field = PARAMETER_FIELD_REGISTRY.ahpSortProfiles.FieldComponent;
  return (
    <>
      <Field parameter={profileParameter} value={value} onChange={setValue} parameterContext={context} />
      <output hidden data-testid="ahpsort-value">{JSON.stringify(value)}</output>
    </>
  );
};

const contextFor = (categoryValues = categories) => buildParameterContext({
  parameterDefinitions: parameters,
  parameterValues: { orderedCategories: categoryValues },
  leafCriteria: [],
});

const ModelParametersHarness = ({ initialValues, selectedExpertCount = 1, validationAttempted = false }) => {
  const [values, setValues] = useState(initialValues);
  const [defaultModelParams, setDefaultModelParams] = useState(true);
  const selectedModel = useMemo(() => ({ parameters }), []);
  const criteria = useMemo(() => [{
    id: "criteria-parent",
    name: "Criteria",
    children: [{ id: "quality-id", name: "Quality", type: "benefit", children: [] }],
  }], []);
  return (
    <>
      <ModelParameters
        selectedModel={selectedModel}
        allData={{ criteria, alternatives: [], addedExperts: Array.from({ length: selectedExpertCount }, (_, index) => `expert-${index + 1}`) }}
        paramValues={values}
        setParamValues={setValues}
        defaultModelParams={defaultModelParams}
        setDefaultModelParams={setDefaultModelParams}
        handleDefaultChange={() => setDefaultModelParams(false)}
        validationAttempted={validationAttempted}
      />
      <output hidden data-testid="model-parameter-values">{JSON.stringify(values)}</output>
    </>
  );
};

describe("ahpSortProfiles model-parameter plugin", () => {
  it("is discovered through the public registry and groups with orderedCategories", () => {
    const entry = resolveParameterFieldEntry(profileParameter);
    expect(entry).toBe(PARAMETER_FIELD_REGISTRY.ahpSortProfiles);
    expect(entry.FieldComponent).toBeTypeOf("function");
    expect(entry.ReadOnlyComponent).toBeTypeOf("function");
    expect(entry.parameterGroup).toMatchObject({
      key: "ahpsort-classification",
      memberStructureKeys: ["orderedCategories", "ahpSortProfiles", "ahpSortGroup"],
    });
    expect(entry.valueDependencyStructureKeys).toEqual(["orderedCategories"]);
  });

  it("creates exactly one limiting profile per adjacent category pair", async () => {
    const user = userEvent.setup();
    render(<FieldHarness />);

    await user.click(screen.getByRole("button", { name: "Limiting profiles" }));
    const value = JSON.parse(screen.getByTestId("ahpsort-value").textContent);
    expect(value).toEqual({
      mode: "limiting",
      profiles: [
        { profileId: expect.any(String), lowerCategoryId: "category-low", upperCategoryId: "category-medium" },
        { profileId: expect.any(String), lowerCategoryId: "category-medium", upperCategoryId: "category-high" },
      ],
    });
    expect(screen.queryByRole("list", { name: "Limiting profiles in preference order" })).not.toBeInTheDocument();
    expect(screen.queryByText("Low → Medium")).not.toBeInTheDocument();
    expect(validateAHPSortProfilesValue(profileParameter, value, contextFor())).toBeNull();
  });

  it("creates one central profile per category and requires an explicit tie policy", async () => {
    const user = userEvent.setup();
    render(<FieldHarness />);

    await user.click(screen.getByRole("button", { name: "Central profiles" }));
    let value = JSON.parse(screen.getByTestId("ahpsort-value").textContent);
    expect(value).toEqual({
      mode: "central",
      profiles: [
        { profileId: expect.any(String), categoryId: "category-low" },
        { profileId: expect.any(String), categoryId: "category-medium" },
        { profileId: expect.any(String), categoryId: "category-high" },
      ],
      tiePolicy: "",
    });
    expect(screen.queryByRole("list", { name: "Central profiles in preference order" })).not.toBeInTheDocument();
    expect(screen.queryByText("Low center")).not.toBeInTheDocument();
    expect(validateAHPSortProfilesValue(profileParameter, value, contextFor()))
      .toMatch(/Choose how equally close/);
    expect(validateAHPSortProfilesValue(profileParameter, { ...value, tiePolicy: "optimistic" }, contextFor())).toBeNull();
    expect(validateAHPSortProfilesValue(profileParameter, { ...value, tiePolicy: "pessimistic" }, contextFor())).toBeNull();
  });

  it("switches methods immediately and creates fresh IDs for changed profile associations", async () => {
    const user = userEvent.setup();
    render(<FieldHarness initialValue={limitingValue} />);
    await user.click(screen.getByRole("button", { name: "Central profiles" }));

    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();
    const changed = JSON.parse(screen.getByTestId("ahpsort-value").textContent);
    expect(changed.mode).toBe("central");
    expect(changed.profiles).toHaveLength(categories.length);
    expect(changed.profiles.map(({ categoryId }) => categoryId))
      .toEqual(categories.map(({ categoryId }) => categoryId));
    expect(changed.profiles.map((profile) => profile.profileId))
      .not.toEqual(limitingValue.profiles.map((profile) => profile.profileId));
    expect(changed.profiles.every((profile) =>
      !limitingValue.profiles.some((oldProfile) => oldProfile.profileId === profile.profileId)
    )).toBe(true);
    expect(changed.tiePolicy).toBe("");

    await user.click(screen.getByRole("button", { name: "Limiting profiles" }));
    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();
    const switchedBack = JSON.parse(screen.getByTestId("ahpsort-value").textContent);
    expect(switchedBack.mode).toBe("limiting");
    expect(switchedBack.profiles).toHaveLength(categories.length - 1);
    expect(Object.hasOwn(switchedBack, "tiePolicy")).toBe(false);
    expect(switchedBack.profiles.every((profile) =>
      !changed.profiles.some((oldProfile) => oldProfile.profileId === profile.profileId)
    )).toBe(true);
  });

  it("updates visible tie controls and profile summaries immediately when the method changes", async () => {
    const user = userEvent.setup();
    render(<ModelParametersHarness initialValues={{ orderedCategories: categories, ahpSortProfiles: limitingValue }} />);
    expect(screen.getByTestId("ahpsort-profile-summary")).toHaveTextContent("2 boundary profiles generated automatically.");
    expect(screen.queryByRole("combobox", { name: "Equal-distance preference" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Central profiles" }));
    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Equal-distance preference" })).toBeInTheDocument();
    expect(screen.getByTestId("ahpsort-profile-summary")).toHaveTextContent("3 central profiles generated automatically.");
    let updated = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(updated.ahpSortProfiles).toMatchObject({ mode: "central", tiePolicy: "" });
    expect(updated.ahpSortProfiles.profiles).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Limiting profiles" }));
    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Equal-distance preference" })).not.toBeInTheDocument();
    expect(screen.getByTestId("ahpsort-profile-summary")).toHaveTextContent("2 boundary profiles generated automatically.");
    updated = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(updated.ahpSortProfiles).toMatchObject({ mode: "limiting", profiles: expect.any(Array) });
    expect(updated.ahpSortProfiles).not.toHaveProperty("tiePolicy");
  });

  it("preserves category/profile IDs on rename and keeps unchanged boundary IDs on add or reorder", () => {
    const renamed = categories.map((category) => category.categoryId === "category-medium"
      ? { ...category, label: "Balanced" }
      : category);
    const afterRename = reconcileAHPSortProfilesAfterCategoryChange({ value: limitingValue, nextCategories: renamed });
    expect(afterRename.profiles).toEqual(limitingValue.profiles);

    const added = [...categories, { categoryId: "category-premium", label: "Premium", order: 3 }];
    const afterAdd = reconcileAHPSortProfilesAfterCategoryChange({ value: limitingValue, nextCategories: added });
    expect(afterAdd.profiles.slice(0, 2)).toEqual(limitingValue.profiles);
    expect(afterAdd.profiles[2]).toMatchObject({
      lowerCategoryId: "category-high",
      upperCategoryId: "category-premium",
      profileId: expect.any(String),
    });
    expect(describeAHPSortCategoryChange({
      value: limitingValue,
      reconciledValue: afterAdd,
      previousContext: contextFor(),
    })).toEqual([]);

    const reordered = [categoriesWithTop[0], categoriesWithTop[1], categoriesWithTop[3], categoriesWithTop[2]]
      .map((category, order) => ({ ...category, order }));
    const afterReorder = reconcileAHPSortProfilesAfterCategoryChange({ value: limitingValueWithTop, nextCategories: reordered });
    expect(afterReorder.profiles).toHaveLength(3);
    expect(afterReorder.profiles[0].profileId).toBe("boundary-low-medium");
    expect(afterReorder.profiles.slice(1).map(({ profileId }) => profileId))
      .not.toEqual(limitingValueWithTop.profiles.slice(1).map(({ profileId }) => profileId));

    const afterRemoval = reconcileAHPSortProfilesAfterCategoryChange({
      value: limitingValue,
      nextCategories: [categories[0], categories[2]],
    });
    expect(afterRemoval.profiles).toHaveLength(1);
    expect(afterRemoval.profiles[0]).toMatchObject({
      lowerCategoryId: "category-low",
      upperCategoryId: "category-high",
    });
    expect(afterRemoval.profiles[0].profileId).not.toBe("boundary-low-medium");
  });

  it("preserves central profiles by category ID through reorder and removes deleted categories", () => {
    const reordered = [categories[2], categories[1], categories[0]]
      .map((category, order) => ({ ...category, order }));
    const afterReorder = reconcileAHPSortProfilesAfterCategoryChange({ value: centralValue, nextCategories: reordered });
    expect(afterReorder.profiles.map(({ profileId }) => profileId))
      .toEqual(["center-high", "center-medium", "center-low"]);
    expect(afterReorder.tiePolicy).toBe("optimistic");

    const withoutMiddle = [categories[0], categories[2]];
    const afterRemoval = reconcileAHPSortProfilesAfterCategoryChange({ value: centralValue, nextCategories: withoutMiddle });
    expect(afterRemoval.profiles.map(({ categoryId }) => categoryId))
      .toEqual(["category-low", "category-high"]);
    expect(afterRemoval.profiles.map(({ profileId }) => profileId))
      .toEqual(["center-low", "center-high"]);
    const warnings = describeAHPSortCategoryChange({
      value: centralValue,
      reconciledValue: afterRemoval,
      previousContext: contextFor(),
    });
    expect(warnings).toContain("Changing categories will remove the central profile for Medium center.");
  });

  it("preserves category-change confirmation and switches profile methods immediately after a reorder", async () => {
    const user = userEvent.setup();
    const initialValues = {
      orderedCategories: categories,
      ahpSortProfiles: limitingValue,
      ahpSortGroup: { tiePolicy: "pessimistic" },
    };
    render(<ModelParametersHarness initialValues={initialValues} />);

    expect(screen.getByText("Profile method")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add category" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Move category 3 up" }));

    expect(screen.getByRole("dialog", { name: "Review this category change" })).toBeInTheDocument();
    expect(screen.getAllByText(/Changing categories will remove the limiting profile for/)).toHaveLength(2);
    expect(JSON.parse(screen.getByTestId("model-parameter-values").textContent)).toEqual(initialValues);

    await user.click(screen.getByRole("button", { name: "Apply change" }));
    const reconciled = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Review this category change" })).not.toBeInTheDocument());
    expect(reconciled.orderedCategories.map(({ categoryId }) => categoryId))
      .toEqual(["category-low", "category-high", "category-medium"]);
    expect(reconciled.ahpSortProfiles.mode).toBe("limiting");
    expect(reconciled.ahpSortProfiles.profiles).toHaveLength(2);
    expect(reconciled.ahpSortProfiles.profiles.map(({ profileId }) => profileId))
      .not.toContain("boundary-low-medium");
    expect(reconciled.ahpSortProfiles.profiles.map(({ profileId }) => profileId))
      .not.toContain("boundary-medium-high");

    const reorderedCategories = reconciled.orderedCategories;
    await user.click(screen.getByRole("button", { name: "Central profiles" }));
    let switched = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(switched.orderedCategories).toEqual(reorderedCategories);
    expect(switched.ahpSortGroup).toEqual(initialValues.ahpSortGroup);
    expect(switched.ahpSortProfiles.profiles.map(({ categoryId }) => categoryId))
      .toEqual(reorderedCategories.map(({ categoryId }) => categoryId));
    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Equal-distance preference" }));
    await user.click(await screen.findByRole("option", { name: "More preferred category" }));
    switched = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(validateAHPSortProfilesValue(
      profileParameter,
      switched.ahpSortProfiles,
      contextFor(reorderedCategories),
    )).toBeNull();
    await user.click(screen.getByRole("button", { name: "Limiting profiles" }));
    switched = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(switched.orderedCategories).toEqual(reorderedCategories);
    expect(switched.ahpSortGroup).toEqual(initialValues.ahpSortGroup);
    expect(validateAHPSortProfilesValue(
      profileParameter,
      switched.ahpSortProfiles,
      contextFor(reorderedCategories),
    )).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();
  });

  it("adds profiles for newly added categories without replacing still-valid boundaries", async () => {
    const user = userEvent.setup();
    render(<ModelParametersHarness initialValues={{ orderedCategories: categories, ahpSortProfiles: limitingValue }} />);
    await user.click(screen.getByRole("button", { name: "Add category" }));

    const reconciled = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(reconciled.ahpSortProfiles.profiles).toHaveLength(3);
    expect(reconciled.ahpSortProfiles.profiles.slice(0, 2)).toEqual(limitingValue.profiles);
    expect(reconciled.ahpSortProfiles.profiles[2]).toMatchObject({
      profileId: expect.any(String),
      lowerCategoryId: "category-high",
      upperCategoryId: expect.any(String),
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const addedCategories = reconciled.orderedCategories;
    await user.click(screen.getByRole("button", { name: "Central profiles" }));
    await user.click(screen.getByRole("combobox", { name: "Equal-distance preference" }));
    await user.click(await screen.findByRole("option", { name: "Less preferred category" }));
    await user.click(screen.getByRole("button", { name: "Limiting profiles" }));
    const switchedBack = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(switchedBack.orderedCategories).toEqual(addedCategories);
    expect(switchedBack.ahpSortProfiles.profiles).toHaveLength(addedCategories.length - 1);
    expect(validateAHPSortProfilesValue(
      profileParameter,
      switchedBack.ahpSortProfiles,
      contextFor(addedCategories),
    )).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Change profile method?" })).not.toBeInTheDocument();
  });

  it("shows only the relevant tie preferences for one expert and multiple experts", async () => {
    const user = userEvent.setup();
    const limiting = { orderedCategories: categories, ahpSortProfiles: limitingValue };
    const { rerender } = render(<ModelParametersHarness key="limiting-one" initialValues={limiting} selectedExpertCount={1} />);
    await user.click(screen.getByRole("button", { name: "Limiting profiles" }));
    expect(screen.queryByRole("combobox", { name: "Equal-vote preference" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Equal-distance preference" })).not.toBeInTheDocument();

    const central = { orderedCategories: categories, ahpSortProfiles: centralValue };
    rerender(<ModelParametersHarness key="central-one" initialValues={central} selectedExpertCount={1} />);
    expect(screen.queryByRole("combobox", { name: "Equal-vote preference" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Equal-distance preference" })).toBeInTheDocument();

    rerender(<ModelParametersHarness key="limiting-multi" initialValues={limiting} selectedExpertCount={2} validationAttempted />);
    expect(screen.getByRole("combobox", { name: "Equal-vote preference" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Equal-distance preference" })).not.toBeInTheDocument();
    expect(screen.getByText("Choose an equal-vote preference for group classification.")).toBeInTheDocument();
  });

  it("places both preferences together for multiple experts with central profiles and preserves their independent values", async () => {
    const user = userEvent.setup();
    const initial = {
      orderedCategories: categories,
      ahpSortProfiles: centralValue,
      ahpSortGroup: { tiePolicy: "optimistic" },
    };
    render(<ModelParametersHarness initialValues={initial} selectedExpertCount={3} />);
    const groupPreference = screen.getByRole("combobox", { name: "Equal-vote preference" });
    const distancePreference = screen.getByRole("combobox", { name: "Equal-distance preference" });
    expect(groupPreference).toHaveTextContent("More preferred category");
    expect(distancePreference).toHaveTextContent("More preferred category");
    expect(screen.getByText("Tie preferences")).toBeInTheDocument();

    await user.click(groupPreference);
    await user.click(await screen.findByRole("option", { name: "Less preferred category" }));
    await user.click(distancePreference);
    await user.click(await screen.findByRole("option", { name: "Less preferred category" }));

    const updated = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(updated.ahpSortGroup).toEqual({ tiePolicy: "pessimistic" });
    expect(updated.ahpSortProfiles).toMatchObject({ mode: "central", tiePolicy: "pessimistic" });
    expect(updated.ahpSortProfiles.profiles).toEqual(centralValue.profiles);
  });

  it("provides accessible, brief help for tie preferences, profile methods, and categories", async () => {
    const user = userEvent.setup();
    render(<ModelParametersHarness initialValues={{
      orderedCategories: categories,
      ahpSortProfiles: centralValue,
      ahpSortGroup: { tiePolicy: "pessimistic" },
    }} selectedExpertCount={2} />);

    for (const label of [
      "Equal-vote preference information",
      "Equal-distance preference information",
      "Profile method information",
      "Categories information",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }

    const helpButton = screen.getByRole("button", { name: "Categories information" });
    await user.hover(helpButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Categories define the names and preference order of the groups.",
    );
    await user.unhover(helpButton);
    helpButton.focus();
    expect(await screen.findByRole("tooltip")).toBeVisible();
  });

  it("updates the generated profile count when categories are added without losing existing profile IDs", async () => {
    const user = userEvent.setup();
    render(<ModelParametersHarness initialValues={{ orderedCategories: categories, ahpSortProfiles: limitingValue }} />);
    expect(screen.getByTestId("ahpsort-profile-summary")).toHaveTextContent("2 boundary profiles generated automatically.");

    await user.click(screen.getByRole("button", { name: "Add category" }));

    expect(screen.getByTestId("ahpsort-profile-summary")).toHaveTextContent("3 boundary profiles generated automatically.");
    const updated = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(updated.ahpSortProfiles.profiles.slice(0, 2)).toEqual(limitingValue.profiles);
    expect(updated.ahpSortProfiles.profiles).toHaveLength(3);
  });

  it("confirms removal before reconciling AHPSort profiles and preserves the remaining boundary ID", async () => {
    const user = userEvent.setup();
    const initialValues = { orderedCategories: categories, ahpSortProfiles: limitingValue };
    render(<ModelParametersHarness initialValues={initialValues} />);
    await user.click(screen.getByRole("button", { name: "Remove category 3" }));

    expect(screen.getByRole("dialog", { name: "Review this category change" })).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("model-parameter-values").textContent)).toEqual(initialValues);
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    const reconciled = JSON.parse(screen.getByTestId("model-parameter-values").textContent);
    expect(reconciled.orderedCategories.map(({ categoryId }) => categoryId))
      .toEqual(["category-low", "category-medium"]);
    expect(reconciled.ahpSortProfiles.profiles).toEqual([limitingValue.profiles[0]]);
    expect(screen.getByTestId("ahpsort-profile-summary")).toHaveTextContent("1 boundary profile generated automatically.");
  });

  it("rejects incomplete, duplicate, out-of-order, and extra profile configurations", () => {
    const context = contextFor();
    expect(validateAHPSortProfilesValue(profileParameter, undefined, context)).toMatch(/Choose a profile method/);
    expect(validateAHPSortProfilesValue(profileParameter, { mode: "unknown", profiles: [] }, context)).toMatch(/Choose limiting/);
    expect(validateAHPSortProfilesValue(profileParameter, { ...limitingValue, tiePolicy: "optimistic" }, context)).toMatch(/do not use/);
    expect(validateAHPSortProfilesValue(profileParameter, { ...limitingValue, profiles: limitingValue.profiles.slice(0, 1) }, context)).toMatch(/exactly one/);
    expect(validateAHPSortProfilesValue(profileParameter, {
      mode: "central",
      tiePolicy: "optimistic",
      profiles: [centralValue.profiles[0], centralValue.profiles[0], centralValue.profiles[2]],
    }, context)).toMatch(/unique identifier|only one profile/);
    expect(validateAHPSortProfilesValue(profileParameter, {
      ...limitingValue,
      profiles: limitingValue.profiles.map((profile) => ({ ...profile, presentationLabel: "Low → Medium" })),
    }, context)).toMatch(/Review the saved profile/);
    expect(validateAHPSortProfilesValue(profileParameter, {
      mode: "limiting",
      profiles: [
        { profileId: "wrong-first-edge", lowerCategoryId: "category-low", upperCategoryId: "category-high" },
        limitingValue.profiles[1],
      ],
    }, context)).toMatch(/neighboring categories/);
    expect(validateAHPSortProfilesValue(
      profileParameter,
      limitingValue,
      contextFor([categories[0], { ...categories[1], order: 2 }, categories[2]])
    )).toMatch(/displayed preference order/);
    expect(validateAHPSortProfilesValue(profileParameter, {
      ...centralValue,
      profiles: centralValue.profiles.slice(0, 2),
    }, context)).toMatch(/exactly one central profile/);
    expect(validateAHPSortProfilesValue(profileParameter, limitingValue, contextFor(categories.slice(0, 1)))
    ).toMatch(/at least two ordered categories/);
  });

  it("normalizes without inventing profile IDs and presents read-only values without IDs", () => {
    const legacyValue = {
      mode: "limiting",
      profiles: [{ profileId: "", lowerCategoryId: "category-low", upperCategoryId: "category-medium" }],
    };
    expect(normalizeAHPSortProfilesValue(profileParameter, legacyValue).profiles[0].profileId).toBe("");
    expect(normalizeAHPSortProfilesValue(profileParameter, legacyValue).profiles[0].profileId).toBe("");

    const ReadOnly = PARAMETER_FIELD_REGISTRY.ahpSortProfiles.ReadOnlyComponent;
    render(<ReadOnly value={centralValue} parameterContext={contextFor()} />);
    expect(screen.getByText("Central profiles")).toBeInTheDocument();
    expect(screen.getByText(/Equal-distance preference: more preferred category/)).toBeInTheDocument();
    expect(screen.getByText("3 central profiles generated automatically.")).toBeInTheDocument();
    expect(screen.queryByText("Low center")).not.toBeInTheDocument();
    expect(screen.queryByText(/profileId|categoryId|center-low|category-low/)).not.toBeInTheDocument();
  });

  it("marks a missing central tie policy for review in read-only settings", () => {
    const ReadOnly = PARAMETER_FIELD_REGISTRY.ahpSortProfiles.ReadOnlyComponent;
    render(<ReadOnly
      value={{ mode: "central", profiles: centralValue.profiles }}
      parameterContext={contextFor()}
    />);
    expect(screen.getByText("Equal-distance preference: needs review")).toBeInTheDocument();
  });
});
