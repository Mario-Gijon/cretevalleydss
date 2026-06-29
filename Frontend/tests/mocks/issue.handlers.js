import { http, HttpResponse } from "msw";

import {
  activeIssuesFixture,
  expressionDomainsFixture,
  finishedIssuesFixture,
  modelsFixture,
  usersFixture,
} from "./fixtures/issues.fixtures.js";

const API = "http://localhost:4010";

export const issueHandlers = [
  http.get(`${API}/issues/active`, () =>
    HttpResponse.json(activeIssuesFixture)
  ),
  http.get(`${API}/issues/finished`, () =>
    HttpResponse.json(finishedIssuesFixture)
  ),
  http.get(`${API}/issues/users`, () => HttpResponse.json(usersFixture)),
  http.get(`${API}/issues/models`, () => HttpResponse.json(modelsFixture)),
  http.get(`${API}/issues/expression-domains`, () =>
    HttpResponse.json(expressionDomainsFixture)
  ),
];
