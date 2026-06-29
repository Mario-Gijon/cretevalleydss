import { http, HttpResponse } from "msw";

import {
  authBootstrapSuccessFixture,
  authLoginSuccessFixture,
  authNotificationsFixture,
} from "./fixtures/auth.fixtures.js";

const API = "http://localhost:4010";

export const authHandlers = [
  http.get(`${API}/auth/me`, () =>
    HttpResponse.json(authBootstrapSuccessFixture)
  ),
  http.get(`${API}/issues/notifications`, () =>
    HttpResponse.json(authNotificationsFixture)
  ),
  http.post(`${API}/auth/login`, () =>
    HttpResponse.json(authLoginSuccessFixture)
  ),
  http.post(`${API}/auth/logout`, () =>
    HttpResponse.json({ success: true, message: "Logged out." })
  ),
  http.get(`${API}/auth/refresh`, () =>
    HttpResponse.json({
      success: true,
      data: { token: "refreshed-token" },
    })
  ),
];
