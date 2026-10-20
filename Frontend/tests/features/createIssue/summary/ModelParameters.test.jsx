import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelParameters from "../../../../src/features/createIssue/summary/components/ModelParameters.jsx";

const selectedModel = {
  parameters: [
    { key: "categories", label: "Categories", parameterStructureKey: "orderedCategories" },
    { key: "boundaryProfiles", label: "Boundary profiles", parameterStructureKey: "boundaryProfiles" },
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

    await user.click(screen.getByRole("button", { name: "Move category 4 up" }));

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: "B boundary for Quality" })).toHaveValue(2);
      expect(screen.getByRole("spinbutton", { name: "D boundary for Quality" })).toHaveValue(null);
      expect(screen.getByRole("spinbutton", { name: "C boundary for Quality" })).toHaveValue(null);
    });

    const values = JSON.parse(screen.getByTestId("parameter-values").textContent);
    expect(values.boundaryProfiles.profiles).toEqual([
      { profileId: "profile-b", categoryId: "b", valuesByCriterionId: { "quality-id": 2 } },
      { categoryId: "d", profileId: expect.not.stringMatching(/^profile-d$/), valuesByCriterionId: { "quality-id": "" } },
      { categoryId: "c", profileId: expect.not.stringMatching(/^profile-c$/), valuesByCriterionId: { "quality-id": "" } },
    ]);
  });
});
