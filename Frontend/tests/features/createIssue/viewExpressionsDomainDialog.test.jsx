import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ViewExpressionsDomainDialog } from "../../../src/features/createIssue/expressionDomains/components/ViewExpressionsDomainDialog.jsx";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

const globalDomainFixture = {
  _id: "global-domain-1",
  name: "Global numeric domain",
  isGlobal: true,
  user: null,
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
  },
};

const userDomainFixture = {
  _id: "user-domain-1",
  name: "My discrete domain",
  isGlobal: false,
  user: "user-1",
  typeKey: "numericDiscrete",
  definition: {
    min: 1,
    max: 5,
    step: 1,
  },
};

describe("ViewExpressionsDomainDialog", () => {
  it("shows global and user domains while only exposing edit and delete for user domains", async () => {
    const handleOpenEdit = vi.fn();
    const handleDelete = vi.fn();

    renderWithProviders(
      <ViewExpressionsDomainDialog
        open
        onClose={vi.fn()}
        handleOpenEdit={handleOpenEdit}
        handleDelete={handleDelete}
      />,
      {
        issuesValue: {
          globalDomains: [globalDomainFixture],
          expressionDomains: [userDomainFixture],
        },
      }
    );

    expect(await screen.findByText("Manage domain expressions")).toBeInTheDocument();
    expect(screen.getByText("Global numeric domain")).toBeInTheDocument();
    expect(screen.getByText("My discrete domain")).toBeInTheDocument();
    expect(screen.queryByText(/Family:/)).not.toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
  });

  it("does not auto-close when only global domains are available", async () => {
    const onClose = vi.fn();

    renderWithProviders(
      <ViewExpressionsDomainDialog
        open
        onClose={onClose}
        handleOpenEdit={vi.fn()}
        handleDelete={vi.fn()}
      />,
      {
        issuesValue: {
          globalDomains: [globalDomainFixture],
          expressionDomains: [],
        },
      }
    );

    expect(await screen.findByText("Global numeric domain")).toBeInTheDocument();

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
