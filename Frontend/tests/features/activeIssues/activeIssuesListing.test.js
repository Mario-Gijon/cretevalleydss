import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildActiveIssuesOverview,
  buildFilteredActiveIssues,
} from "../../../src/features/activeIssues/logic/activeIssuesListing.js";
import { useActiveIssuesListing } from "../../../src/features/activeIssues/hooks/useActiveIssuesListing.js";
import { activeIssuesDashboardFixture } from "../../mocks/fixtures/issues.fixtures.js";

describe("active issues listing logic", () => {
  it("returns all active issues when the query is empty", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "",
      searchBy: "all",
      sortBy: "creationDate",
    });

    expect(result).toHaveLength(activeIssuesDashboardFixture.length);
  });

  it("searches by issue name", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "budget",
      searchBy: "issue",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Budget Planning"]);
  });

  it("searches by model name", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "topsis",
      searchBy: "model",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Campus Labs"]);
  });

  it("searches by owner", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "alice",
      searchBy: "owner",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Budget Planning"]);
  });

  it("searches by alternatives", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "cedar",
      searchBy: "alternatives",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Budget Planning"]);
  });

  it("searches by nested criteria", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "research",
      searchBy: "criteria",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Hiring Committee"]);
  });

  it('searchBy "all" matches across issue, model, owner, alternatives, and criteria', () => {
    const ownerMatch = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "carol",
      searchBy: "all",
      sortBy: "creationDate",
    });
    const alternativeMatch = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "solar",
      searchBy: "all",
      sortBy: "creationDate",
    });
    const criteriaMatch = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "maintenance",
      searchBy: "all",
      sortBy: "creationDate",
    });

    expect(ownerMatch.map((issue) => issue.name)).toEqual(["Hiring Committee"]);
    expect(alternativeMatch.map((issue) => issue.name)).toEqual(["Campus Labs"]);
    expect(criteriaMatch.map((issue) => issue.name)).toEqual(["Budget Planning"]);
  });

  it("sorts by creation date using createdAt and falling back to creationDate", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "",
      searchBy: "all",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual([
      "Dorm Upgrade",
      "Budget Planning",
      "Campus Labs",
      "Hiring Committee",
    ]);
  });

  it("sorts by deadline date with valid deadlines first and undated issues by name", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "",
      searchBy: "all",
      sortBy: "deadlineDate",
    });

    expect(result.map((issue) => issue.name)).toEqual([
      "Hiring Committee",
      "Budget Planning",
      "Campus Labs",
      "Dorm Upgrade",
    ]);
  });

  it("sorts alphabetically by name by default", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "",
      searchBy: "all",
      sortBy: "name",
    });

    expect(result.map((issue) => issue.name)).toEqual([
      "Budget Planning",
      "Campus Labs",
      "Dorm Upgrade",
      "Hiring Committee",
    ]);
  });

  it("builds the active issues overview counts", () => {
    expect(
      buildActiveIssuesOverview({
        activeIssues: activeIssuesDashboardFixture,
        tasksCount: 5,
      })
    ).toEqual({
      total: 4,
      tasks: 5,
      owner: 2,
      readyResolve: 1,
    });
  });

  it("does not crash on missing optional fields", () => {
    const result = buildFilteredActiveIssues({
      activeIssues: activeIssuesDashboardFixture,
      query: "dorm",
      searchBy: "all",
      sortBy: "creationDate",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Dorm Upgrade"]);
  });
});

describe("useActiveIssuesListing", () => {
  it("exposes the expected initial state", () => {
    const { result } = renderHook(() =>
      useActiveIssuesListing({
        activeIssues: activeIssuesDashboardFixture,
        taskCenter: { total: 5 },
      })
    );

    expect(result.current.query).toBe("");
    expect(result.current.searchBy).toBe("all");
    expect(result.current.sortBy).toBe("creationDate");
    expect(result.current.taskType).toBe("all");
    expect(result.current.tasksCount).toBe(5);
    expect(result.current.overview).toEqual({
      total: 4,
      tasks: 5,
      owner: 2,
      readyResolve: 1,
    });
  });

  it("updates filtered issues when query, searchBy, and sortBy change", () => {
    const { result } = renderHook(() =>
      useActiveIssuesListing({
        activeIssues: activeIssuesDashboardFixture,
        taskCenter: { total: 5 },
      })
    );

    act(() => {
      result.current.setSearchBy("criteria");
      result.current.setQuery("research");
    });

    expect(result.current.filteredIssues.map((issue) => issue.name)).toEqual([
      "Hiring Committee",
    ]);

    act(() => {
      result.current.setQuery("");
      result.current.setSearchBy("all");
      result.current.setSortBy("deadlineDate");
    });

    expect(result.current.filteredIssues.map((issue) => issue.name)).toEqual([
      "Hiring Committee",
      "Budget Planning",
      "Campus Labs",
      "Dorm Upgrade",
    ]);
  });

  it("updates overview when inputs change via rerender", () => {
    const { result, rerender } = renderHook(
      ({ activeIssues, taskCenter }) =>
        useActiveIssuesListing({
          activeIssues,
          taskCenter,
        }),
      {
        initialProps: {
          activeIssues: activeIssuesDashboardFixture,
          taskCenter: { total: 5 },
        },
      }
    );

    rerender({
      activeIssues: activeIssuesDashboardFixture.slice(0, 2),
      taskCenter: { total: 1 },
    });

    expect(result.current.tasksCount).toBe(1);
    expect(result.current.overview).toEqual({
      total: 2,
      tasks: 1,
      owner: 1,
      readyResolve: 1,
    });
  });
});
