import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelParameters from "../../../../src/features/createIssue/summary/components/ModelParameters.jsx";
import { buildParameterContext } from "../../../../src/features/modelParameters/context/index.js";
import { reconcileModelParameterDependencyChange } from "../../../../src/features/modelParameters/logic/reconcileModelParameterDependencyChange.js";

const selectedModel = {
  parameters: [
    { key: "boundaryProfiles", label: "Boundary profiles", parameterStructureKey: "boundaryProfiles" },
    { key: "categories", label: "Categories", parameterStructureKey: "orderedCategories" },
  ],
};

const criteria = [{
  id: "quality-id",
  name: "Quality",
  type: "benefit",
  children: [],
}];

const initialValues = {
  categories: [
    { categoryId: "a", label: "A", order: 0 },
    { categoryId: "b", label: "B", order: 1 },
    { categoryId: "c", label: "C", order: 2 },
    { categoryId: "d", label: "D", order: 3 },
  ],
  boundaryProfiles: {
    profiles: [
      { profileId: "profile-b", categoryId: "b", valuesByCriterionId: { "quality-id": 2 } },
      { profileId: "profile-c", categoryId: "c", valuesByCriterionId: { "quality-id": 5 } },
      { profileId: "profile-d", categoryId: "d", valuesByCriterionId: { "quality-id": 8 } },
    ],
  },
};

const Harness = ({ validationAttempted = false, initialParamValues = initialValues }) => {
  const [paramValues, setParamValues] = useState(initialParamValues);
  const [defaultModelParams, setDefaultModelParams] = useState(true);
  return (
    <>
      <ModelParameters
        selectedModel={selectedModel}
        allData={{ criteria, alternatives: [] }}
        paramValues={paramValues}
        setParamValues={setParamValues}
        defaultModelParams={defaultModelParams}
        setDefaultModelParams={setDefaultModelParams}
        validationAttempted={validationAttempted}
        handleDefaultChange={() => setDefaultModelParams(false)}
        globalDomains={[{
          id: "quality-domain",
          name: "Quality scale",
          typeKey: "numericContinuous",
          definition: { min: 0, max: 10 },
        }]}
        expressionDomainConfig={{ mode: "global", globalDomainId: "quality-domain" }}
      />
      <output data-testid="parameter-values">{JSON.stringify(paramValues)}</output>
    </>
  );
};

describe("Create Issue model parameter dependency reconciliation", () => {
  it("shows required classification-reference errors only after Create validation is attempted", async () => {
    const user = userEvent.setup();
    const incompleteValues = {
      ...initialValues,
      boundaryProfiles: { profiles: [] },
    };
    const { rerender } = render(<Harness initialParamValues={incompleteValues} />);
    const input = await screen.findByRole("textbox", { name: "Quality reference in A → B" });

    await user.click(input);
    await user.tab();
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/Review the \d+ highlighted reference cells?/)).not.toBeInTheDocument();

    rerender(<Harness initialParamValues={incompleteValues} validationAttempted />);
    expect(input).toBeInvalid();
    expect(screen.getByText(/Review the \d+ highlighted reference cells?/)).toBeInTheDocument();
  });

  it("does not replace dependent profiles when category labels change without changing boundaries", () => {
    const categoriesParameter = selectedModel.parameters.find((item) => item.parameterStructureKey === "orderedCategories");
    const previousContext = buildParameterContext({
      parameterDefinitions: selectedModel.parameters,
      parameterValues: initialValues,
      leafCriteria: criteria,
    });
    const nextCategories = initialValues.categories.map((category) => category.categoryId === "b"
      ? { ...category, label: "Balanced" }
      : category);
    const nextValues = { ...initialValues, categories: nextCategories };
    const nextContext = buildParameterContext({
      parameterDefinitions: selectedModel.parameters,
      parameterValues: nextValues,
      leafCriteria: criteria,
    });

    const reconciled = reconcileModelParameterDependencyChange({
      changedParameter: categoriesParameter,
      parameters: selectedModel.parameters,
      nextValues,
      previousContext,
      nextContext,
    });

    expect(reconciled).toBe(nextValues);
  });

  it("creates a blank reference when a category is added and preserves existing profiles", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByRole("textbox", { name: "Quality reference in D → Category 5" })).toHaveValue("");

    const values = JSON.parse(screen.getByTestId("parameter-values").textContent);
    expect(values.boundaryProfiles.profiles).toEqual([
      ...initialValues.boundaryProfiles.profiles,
      expect.objectContaining({ categoryId: expect.any(String), valuesByCriterionId: { "quality-id": "" } }),
    ]);
    expect(values.boundaryProfiles.profiles.slice(0, 3)).toEqual(initialValues.boundaryProfiles.profiles);
    expect(screen.queryByRole("dialog", { name: "Review this category change" })).not.toBeInTheDocument();
  });

  it("confirms removal before discarding a category boundary, then reconciles automatically", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Remove category 4" }));
    expect(screen.getByRole("dialog", { name: "Review this category change" })).toBeInTheDocument();
    expect(screen.getByText(/Existing values for C → D will be removed because this boundary no longer exists/)).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("parameter-values").textContent)).toEqual(initialValues);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId("parameter-values").textContent)).toEqual(initialValues);
    await user.click(screen.getByRole("button", { name: "Remove category 4" }));
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("parameter-values").textContent).boundaryProfiles.profiles).toEqual([
        initialValues.boundaryProfiles.profiles[0],
        initialValues.boundaryProfiles.profiles[1],
      ]);
    });
    expect(screen.queryByRole("columnheader", { name: "C → D" })).not.toBeInTheDocument();
  });

  it("preserves profiles for unchanged adjacent categories and clears changed boundaries on reorder", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText("Categories").compareDocumentPosition(screen.getByText("Classification references")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Move category 4 up" }));
    expect(screen.getByRole("dialog", { name: "Review this category change" })).toBeInTheDocument();
    expect(screen.getByText(/Existing values for C → D will be reset/)).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("parameter-values").textContent)).toEqual(initialValues);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId("parameter-values").textContent)).toEqual(initialValues);

    await user.click(screen.getByRole("button", { name: "Move category 4 up" }));
    await user.click(screen.getByRole("button", { name: "Apply change" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Quality reference in A → B" })).toHaveValue("2");
      expect(screen.getByRole("textbox", { name: "Quality reference in B → D" })).toHaveValue("");
      expect(screen.getByRole("textbox", { name: "Quality reference in D → C" })).toHaveValue("");
    });

    const values = JSON.parse(screen.getByTestId("parameter-values").textContent);
    expect(values.boundaryProfiles.profiles).toEqual([
      { profileId: "profile-b", categoryId: "b", valuesByCriterionId: { "quality-id": 2 } },
      { categoryId: "d", profileId: "profile-d", valuesByCriterionId: { "quality-id": "" } },
      { categoryId: "c", profileId: "profile-c", valuesByCriterionId: { "quality-id": "" } },
    ]);
  });

  it("updates the boundary header immediately when a category is renamed and preserves its profile values", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const categoryName = screen.getByRole("textbox", { name: "Category 2" });
    await user.clear(categoryName);
    await user.type(categoryName, "Balanced & preferred");

    expect(await screen.findByRole("columnheader", { name: "A → Balanced & preferred" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", {
      name: "Quality reference in Balanced & preferred → C",
    })).toHaveValue("5");

    const saved = JSON.parse(screen.getByTestId("parameter-values").textContent);
    expect(saved.categories.find((category) => category.label === "Balanced & preferred"))
      .toMatchObject({ categoryId: "b", order: 1 });
    expect(saved.boundaryProfiles.profiles.find((profile) => profile.categoryId === "b"))
      .toMatchObject({ profileId: "profile-b", valuesByCriterionId: { "quality-id": 2 } });
  });

  it("does not present required blank boundary settings as valid defaults", () => {
    render(
      <ModelParameters
        selectedModel={{ parameters: [
          { key: "boundaryProfiles", label: "Category boundaries", parameterStructureKey: "boundaryProfiles", required: true },
          { key: "categories", label: "Ordered categories", parameterStructureKey: "orderedCategories", required: true },
        ] }}
        allData={{ criteria, alternatives: [] }}
        paramValues={{}}
        setParamValues={() => {}}
        defaultModelParams
        setDefaultModelParams={() => {}}
        handleDefaultChange={() => {}}
        expressionDomainConfig={{ mode: "global", globalDomainId: "quality-domain" }}
        globalDomains={[{
          id: "quality-domain",
          name: "Quality scale",
          typeKey: "numericContinuous",
          definition: { min: 0, max: 10 },
        }]}
      />
    );

    expect(screen.queryByRole("button", { name: "Default" })).not.toBeInTheDocument();
    expect(screen.queryByText("Complete the required settings before creating this Issue.")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom settings are ready.")).not.toBeInTheDocument();
  });

  it("keeps the default selection available for models with valid existing defaults", () => {
    render(
      <ModelParameters
        selectedModel={{ parameters: [
          { key: "alpha", label: "Alpha", parameterStructureKey: "numberGlobal", default: 0, restrictions: { min: 0, max: 1 } },
        ] }}
        allData={{ criteria, alternatives: [] }}
        paramValues={{}}
        setParamValues={() => {}}
        defaultModelParams
        setDefaultModelParams={() => {}}
        handleDefaultChange={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Default" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Using valid default values.")).not.toBeInTheDocument();
  });

  it("keeps the concise validation prompt after the user attempts to continue", () => {
    render(
      <ModelParameters
        selectedModel={{ parameters: [
          { key: "categories", label: "Categories", parameterStructureKey: "orderedCategories", required: true },
        ] }}
        allData={{ criteria, alternatives: [] }}
        paramValues={{ categories: [{ categoryId: "blank", label: " ", order: 0 }] }}
        setParamValues={() => {}}
        defaultModelParams={false}
        setDefaultModelParams={() => {}}
        handleDefaultChange={() => {}}
        validationAttempted
      />
    );

    expect(screen.getByText("Review the highlighted model settings.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Enter a category name.")).toBeInTheDocument();
  });
});
