export const authUserFixture = {
  _id: "user-1",
  name: "Alice Analyst",
  email: "alice@example.com",
  university: "Crete Valley",
  accountCreation: "2026-06-01T00:00:00.000Z",
  role: "admin",
  isAdmin: true,
};

export const authBootstrapSuccessFixture = {
  success: true,
  message: "Authenticated user fetched.",
  data: {
    user: authUserFixture,
  },
};

export const authLoginSuccessFixture = {
  success: true,
  message: "Login successful.",
  data: {
    token: "token-123",
    user: authUserFixture,
  },
};

export const authNotificationsFixture = {
  success: true,
  message: "Notifications fetched.",
  data: {
    notifications: [
      { _id: "notif-1", title: "Issue assigned" },
      { _id: "notif-2", title: "Issue updated" },
    ],
  },
};
