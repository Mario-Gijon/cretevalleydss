import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildFinishedIssuesOverview } from "../../../src/features/finishedIssues/logic/buildFinishedIssuesOverview.js";
import {
  filterFinishedIssues,
  finishedIssueMatchesSearch,
} from "../../../src/features/finishedIssues/logic/filterFinishedIssues.js";
import { sortFinishedIssues } from "../../../src/features/finishedIssues/logic/sortFinishedIssues.js";
import { useFinishedIssuesListing } from "../../../src/features/finishedIssues/hooks/useFinishedIssuesListing.js";
import { finishedIssuesDashboardFixture } from "../../mocks/fixtures/finishedIssues.fixtures.js";

describe("finished issues listing logic", () => {
  it("returns all finished issues when the query is empty", () => {
    const result = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "",
      searchBy: "all",
    });

    expect(result).toHaveLength(finishedIssuesDashboardFixture.length);
  });

  it("searches by issue name", () => {
    const result = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "budget",
      searchBy: "issue",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Budget Results"]);
  });

  it("searches by model name", () => {
    const result = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "topsis",
      searchBy: "model",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Lab Decision"]);
  });

  it("searches by owner using supported owner fields", () => {
    const result = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "carol",
      searchBy: "owner",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Hiring Outcome"]);
  });

  it("searches alternatives when they are strings or objects", () => {
    const stringResult = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "redwood",
      searchBy: "alternatives",
    });
    const objectResult = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "solar",
      searchBy: "alternatives",
    });

    expect(stringResult.map((issue) => issue.name)).toEqual(["Budget Results"]);
    expect(objectResult.map((issue) => issue.name)).toEqual(["Lab Decision"]);
  });

  it("searches nested criteria", () => {
    const result = filterFinishedIssues({
      finishedIssues: finishedIssuesDashboardFixture,
      query: "maintenance",
      searchBy: "criteria",
    });

    expect(result.map((issue) => issue.name)).toEqual(["Budget Results"]);
  });

  it('searchBy "all" matches across visible finished issue fields', () => {
    expect(
      finishedIssueMatchesSearch(
        finishedIssuesDashboardFixture[1],
        "bob@example.com",
        "all"
      )
    ).toBe(true);
  });

  it("does not crash when optional fields are missing", () => {
    expect(
      filterFinishedIssues({
        finishedIssues: finishedIssuesDashboardFixture,
        query: "hiring",
        searchBy: "all",
      }).map((issue) => issue.name)
    ).toEqual(["Hiring Outcome"]);
  });

  it("sorts by finalization date", () => {
    expect(
      sortFinishedIssues(finishedIssuesDashboardFixture, "finalizationDate").map(
        (issue) => issue.name
      )
    ).toEqual(["Budget Results", "Lab Decision", "Hiring Outcome"]);
  });

  it("sorts by creation date when requested", () => {
    expect(
      sortFinishedIssues(finishedIssuesDashboardFixture, "creationDate").map(
        (issue) => issue.name
      )
    ).toEqual(["Hiring Outcome", "Budget Results", "Lab Decision"]);
  });

  it("falls back to alphabetical sorting by name", () => {
    expect(
      sortFinishedIssues(finishedIssuesDashboardFixture, "name").map(
        (issue) => issue.name
      )
    ).toEqual(["Budget Results", "Hiring Outcome", "Lab Decision"]);
  });

  it("builds the finished issues overview from stable metrics", () => {
    expect(
      buildFinishedIssuesOverview({
        finishedIssues: finishedIssuesDashboardFixture,
        filteredCount: 2,
      })
    ).toEqual({
      total: 3,
      owner: 1,
      withClosure: 2,
      filtered: 2,
    });
  });
});

describe("useFinishedIssuesListing", () => {
  it("exposes the expected initial state", () => {
    const { result } = renderHook(() =>
      useFinishedIssuesListing({
        finishedIssues: finishedIssuesDashboardFixture,
      })
    );

    expect(result.current.query).toBe("");
    expect(result.current.searchBy).toBe("all");
    expect(result.current.sortBy).toBe("finalizationDate");
    expect(result.current.filteredIssues).toHaveLength(3);
    expect(result.current.overview).toEqual({
      total: 3,
      owner: 1,
      withClosure: 2,
      filtered: 3,
    });
  });

  it("updates filtered issues when query, searchBy, and sortBy change", () => {
    const { result } = renderHook(() =>
      useFinishedIssuesListing({
        finishedIssues: finishedIssuesDashboardFixture,
      })
    );

    act(() => {
      result.current.setSearchBy("alternatives");
      result.current.setQuery("solar");
    });

    expect(result.current.filteredIssues.map((issue) => issue.name)).toEqual([
      "Lab Decision",
    ]);

    act(() => {
      result.current.setQuery("");
      result.current.setSearchBy("all");
      result.current.setSortBy("creationDate");
    });

    expect(result.current.filteredIssues.map((issue) => issue.name)).toEqual([
      "Hiring Outcome",
      "Budget Results",
      "Lab Decision",
    ]);
  });

  it("updates overview when the filtered count changes", () => {
    const { result } = renderHook(() =>
      useFinishedIssuesListing({
        finishedIssues: finishedIssuesDashboardFixture,
      })
    );

    act(() => {
      result.current.setSearchBy("issue");
      result.current.setQuery("budget");
    });

    expect(result.current.overview).toEqual({
      total: 3,
      owner: 1,
      withClosure: 2,
      filtered: 1,
    });
  });
});
