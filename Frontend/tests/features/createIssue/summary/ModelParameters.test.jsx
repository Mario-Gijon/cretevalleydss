import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelParameters from "../../../../src/features/createIssue/summary/components/ModelParameters.jsx";

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

const Harness = () => {
  const [paramValues, setParamValues] = useState(initialValues);
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
      expect(screen.getByRole("spinbutton", { name: "Quality reference in A → B" })).toHaveValue(2);
      expect(screen.getByRole("spinbutton", { name: "Quality reference in B → D" })).toHaveValue(null);
      expect(screen.getByRole("spinbutton", { name: "Quality reference in D → C" })).toHaveValue(null);
    });

    const values = JSON.parse(screen.getByTestId("parameter-values").textContent);
    expect(values.boundaryProfiles.profiles).toEqual([
      { profileId: "profile-b", categoryId: "b", valuesByCriterionId: { "quality-id": 2 } },
      { categoryId: "d", profileId: "profile-d", valuesByCriterionId: { "quality-id": "" } },
      { categoryId: "c", profileId: "profile-c", valuesByCriterionId: { "quality-id": "" } },
    ]);
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
    expect(screen.getByText("Complete the required settings before creating this Issue.")).toBeInTheDocument();
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
    expect(screen.getByText("Using valid default values.")).toBeInTheDocument();
  });
});
