import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IssueListSkeleton from "../../../src/components/LoadingProgress/IssueListSkeleton.jsx";

describe("IssueListSkeleton", () => {
  it("renders a stable page-level loading structure", () => {
    render(<IssueListSkeleton />);

    expect(screen.getByRole("status", { name: "Loading issues" })).toBeInTheDocument();
    expect(screen.getByTestId("issue-list-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("issue-list-skeleton-item")).toHaveLength(19);
  });
});
