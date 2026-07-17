import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveParameterFieldEntry = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../src/features/decisionPlugins/modelParameters",
  () => ({ resolveParameterFieldEntry })
);

import {
  ParameterFieldHost,
  ParameterReadOnlyHost,
} from "../../../src/features/modelParameters";

describe("model-parameter Decision Plugin host dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveParameterFieldEntry.mockReturnValue({
      FieldComponent: ({ parameter, value, onChange }) => (
        <button type="button" onClick={() => onChange("updated")}>
          {`Edit ${parameter.label}: ${value}`}
        </button>
      ),
      ReadOnlyComponent: ({ parameter, value }) => (
        <output>{`Read ${parameter.label}: ${value}`}</output>
      ),
    });
  });

  it("renders an arbitrary future editable field through the registry entry", () => {
    const parameter = {
      key: "future-parameter",
      label: "Future parameter",
      parameterStructureKey: "futureField",
    };
    const onChange = vi.fn();

    render(
      <ParameterFieldHost
        parameter={parameter}
        value="current"
        onChange={onChange}
        parameterContext={{ issueId: "issue-1" }}
        disabled={false}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Future parameter: current" })
    );

    expect(resolveParameterFieldEntry).toHaveBeenCalledWith(parameter);
    expect(onChange).toHaveBeenCalledWith("updated");
  });

  it("renders the same future field read-only without consumer branching", () => {
    const parameter = {
      key: "future-parameter",
      label: "Future parameter",
      parameterStructureKey: "futureField",
    };

    render(
      <ParameterReadOnlyHost
        parameter={parameter}
        value="stored"
        parameterContext={{ issueId: "issue-1" }}
      />
    );

    expect(screen.getByText("Read Future parameter: stored")).toBeInTheDocument();
    expect(resolveParameterFieldEntry).toHaveBeenCalledWith(parameter);
  });
});
