import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PARAMETER_FIELD_REGISTRY,
  resolveParameterFieldEntry,
} from "../../../src/features/decisionPlugins/modelParameters";
import {
  normalizeOrderedCategoriesValue,
  validateOrderedCategoriesValue,
} from "../../../src/features/decisionPlugins/modelParameters/fields/orderedCategories/orderedCategoriesValues.js";

const parameter = {
  key: "categories",
  label: "Categories",
  parameterStructureKey: "orderedCategories",
};

const Harness = () => {
  const [value, setValue] = useState([]);
  const Field = PARAMETER_FIELD_REGISTRY.orderedCategories.FieldComponent;
  return <>
    <Field parameter={parameter} value={value} onChange={setValue} />
    <output hidden data-testid="category-values">{JSON.stringify(value)}</output>
  </>;
};

describe("orderedCategories model-parameter plugin", () => {
  it("is discovered with field and read-only components", () => {
    const entry = resolveParameterFieldEntry(parameter);
    expect(entry).toBe(PARAMETER_FIELD_REGISTRY.orderedCategories);
    expect(entry.FieldComponent).toBeTypeOf("function");
    expect(entry.ReadOnlyComponent).toBeTypeOf("function");
    expect(entry.normalizeValue).toBeTypeOf("function");
  });

  it("adds, edits, reorders and removes categories while keeping their IDs stable", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.click(screen.getByRole("button", { name: "Add category" }));
    expect(screen.getByLabelText("Category 1")).toHaveAttribute("placeholder", "Category 1");

    const first = screen.getByLabelText("Category 1");
    const second = screen.getByLabelText("Category 2");
    await user.clear(second);
    await user.type(second, "Shared label");
    await user.clear(first);
    await user.type(first, "Shared label");

    const initialCategories = JSON.parse(screen.getByTestId("category-values").textContent);
    const firstId = initialCategories[0].categoryId;
    const secondId = initialCategories[1].categoryId;

    await user.click(screen.getByRole("button", { name: "Move category 2 up" }));
    const reorderedRows = screen.getAllByRole("listitem");
    expect(reorderedRows[0]).toHaveAttribute("data-testid", "ordered-category-1");
    expect(reorderedRows[1]).toHaveAttribute("data-testid", "ordered-category-2");
    expect(within(reorderedRows[0]).getByLabelText("Category 1")).toHaveValue("Shared label");
    expect(within(reorderedRows[1]).getByLabelText("Category 2")).toHaveValue("Shared label");
    expect(JSON.parse(screen.getByTestId("category-values").textContent).map((category) => category.categoryId))
      .toEqual([secondId, firstId]);

    await user.click(screen.getByRole("button", { name: "Remove category 1" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByLabelText("Category 1")).toHaveValue("Shared label");
  });

  it("keeps the preference direction compact and uses friendly one-based indexes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText("Less preferred → More preferred")).toBeInTheDocument();
    expect(screen.queryByText(/Order starts at 0/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.click(screen.getByRole("button", { name: "Add category" }));
    expect(screen.queryByText("Least preferred")).not.toBeInTheDocument();
    expect(screen.queryByText("Most preferred")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Preference order 1")).toHaveTextContent("1");
    expect(screen.queryByText(/category-[a-z0-9-]+/i)).not.toBeInTheDocument();
    expect(screen.getByRole("list").textContent).not.toMatch(/profileId|categoryId|[0-9a-f]{8}-[0-9a-f-]{27}/i);
  });

  it("retains an accessible keyboard-sortable handle alongside button reordering", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Add category" }));
    await user.click(screen.getByRole("button", { name: "Add category" }));
    const handle = screen.getByRole("button", { name: "Drag category 2 to reorder" });
    expect(handle).toHaveAttribute("tabindex", "0");
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
    expect(screen.getByRole("button", { name: "Move category 2 up" })).toBeEnabled();

    const secondRow = screen.getByTestId("ordered-category-2");
    expect(secondRow.firstElementChild).toBe(handle);
    expect(secondRow.children[1]).toHaveAttribute("aria-label", "Preference order 2");
  });

  it("presents Add category as a full-width dashed card and keeps it actionable", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const addCard = screen.getByTestId("ordered-categories-add");
    expect(addCard).toHaveAccessibleName("Add category");
    expect(addCard).toHaveStyle({
      width: "100%",
      minHeight: "58px",
      borderStyle: "dashed",
      flexDirection: "column",
    });

    await user.click(addCard);
    expect(screen.getByLabelText("Category 1")).toBeInTheDocument();
  });

  it("keeps stored categories readable without exposing IDs or zero-based order", () => {
    const ReadOnly = PARAMETER_FIELD_REGISTRY.orderedCategories.ReadOnlyComponent;
    render(<ReadOnly value={[
      { categoryId: "internal-category-uuid", label: "", order: 0 },
      { categoryId: "next-category-uuid", label: "Preferred", order: 1 },
    ]} />);

    expect(screen.getByText("Saved category")).toBeInTheDocument();
    expect(screen.getByText("Preferred")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(1);
    expect(screen.getAllByText("2")).toHaveLength(1);
    expect(screen.queryByText(/internal-category-uuid|next-category-uuid|Order 0|Order 1/)).not.toBeInTheDocument();
  });

  it("allows zero or one category and validates labels and IDs without requiring a global minimum", () => {
    expect(validateOrderedCategoriesValue(parameter, [])).toBeNull();
    expect(validateOrderedCategoriesValue(parameter, [
      { categoryId: "one", label: "Only", order: 0 },
    ])).toBeNull();
    expect(validateOrderedCategoriesValue(parameter, [
      { categoryId: "one", label: " ", order: 0 },
    ])).toMatch(/Enter a label/);
    expect(validateOrderedCategoriesValue(parameter, [
      { categoryId: "same", label: "A", order: 0 },
      { categoryId: "same", label: "B", order: 1 },
    ])).toMatch(/appears more than once/);
  });

  it("normalizes order indexes while retaining stable category IDs and allowing duplicate labels", () => {
    expect(normalizeOrderedCategoriesValue(parameter, [
      { categoryId: "cat-b", label: "Same", order: 8 },
      { categoryId: "cat-a", label: "Same", order: 2 },
    ])).toEqual([
      { categoryId: "cat-a", label: "Same", order: 0 },
      { categoryId: "cat-b", label: "Same", order: 1 },
    ]);
  });
});
