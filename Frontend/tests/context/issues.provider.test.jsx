import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { IssuesDataProvider } from "../../src/context/issues/issues.provider.jsx";
import { useIssuesDataContext } from "../../src/context/issues/issues.context.js";
import { renderWithProviders } from "../setup/renderWithProviders.jsx";
import { server } from "../mocks/server.js";

const API = "http://localhost:4010";

function IssuesConsumerProbe() {
  const {
    activeIssues,
    taskCenter,
    filtersMeta,
    finishedIssues,
    initialExperts,
    models,
    criteriaWeightingModels,
    globalDomains,
    expressionDomains,
    loading,
    issueCreated,
    setIssueCreated,
  } = useIssuesDataContext();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="active-count">{activeIssues.length}</div>
      <div data-testid="finished-count">{finishedIssues.length}</div>
      <div data-testid="experts-count">{initialExperts.length}</div>
      <div data-testid="models-count">{models.length}</div>
      <div data-testid="criteria-models-count">{criteriaWeightingModels.length}</div>
      <div data-testid="global-domains-count">{globalDomains.length}</div>
      <div data-testid="user-domains-count">{expressionDomains.length}</div>
      <div data-testid="pending-count">{taskCenter?.pending ?? 0}</div>
      <div data-testid="filters-total">{filtersMeta?.total ?? 0}</div>
      <div data-testid="issue-created">{issueCreated}</div>
      <button onClick={() => setIssueCreated(`created-${Date.now()}`)}>
        trigger refresh
      </button>
    </div>
  );
}

describe("IssuesDataProvider", () => {
  it("loads active issues, finished issues, users, models, and domains on mount", async () => {
    renderWithProviders(
      <IssuesDataProvider>
        <IssuesConsumerProbe />
      </IssuesDataProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );

    expect(screen.getByTestId("active-count")).toHaveTextContent("1");
    expect(screen.getByTestId("finished-count")).toHaveTextContent("1");
    expect(screen.getByTestId("experts-count")).toHaveTextContent("2");
    expect(screen.getByTestId("models-count")).toHaveTextContent("1");
    expect(screen.getByTestId("criteria-models-count")).toHaveTextContent("1");
    expect(screen.getByTestId("global-domains-count")).toHaveTextContent("1");
    expect(screen.getByTestId("user-domains-count")).toHaveTextContent("1");
    expect(screen.getByTestId("pending-count")).toHaveTextContent("2");
    expect(screen.getByTestId("filters-total")).toHaveTextContent("1");
  });

  it("clears issue lists when the issue endpoints fail", async () => {
    server.use(
      http.get(`${API}/issues/active`, () =>
        HttpResponse.json({ success: false, data: null }, { status: 500 })
      ),
      http.get(`${API}/issues/finished`, () =>
        HttpResponse.json({ success: false, data: null }, { status: 500 })
      )
    );

    renderWithProviders(
      <IssuesDataProvider>
        <IssuesConsumerProbe />
      </IssuesDataProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );

    expect(screen.getByTestId("active-count")).toHaveTextContent("0");
    expect(screen.getByTestId("finished-count")).toHaveTextContent("0");
    expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    expect(screen.getByTestId("filters-total")).toHaveTextContent("0");
  });

  it("refetches active issues when issueCreated changes", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <IssuesDataProvider>
        <IssuesConsumerProbe />
      </IssuesDataProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("active-count")).toHaveTextContent("1")
    );

    server.use(
      http.get(`${API}/issues/active`, () =>
        HttpResponse.json({
          success: true,
          data: {
            issues: [
              { _id: "issue-1", name: "Budget planning" },
              { _id: "issue-2", name: "Lab expansion" },
            ],
            taskCenter: { pending: 3 },
            filtersMeta: { total: 2 },
          },
        })
      )
    );

    await user.click(screen.getByRole("button", { name: "trigger refresh" }));

    await waitFor(() =>
      expect(screen.getByTestId("active-count")).toHaveTextContent("2")
    );
    expect(screen.getByTestId("pending-count")).toHaveTextContent("3");
    expect(screen.getByTestId("filters-total")).toHaveTextContent("2");
  });
});
