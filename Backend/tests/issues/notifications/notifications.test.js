import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `signed-token:${payload?.uid ?? "unknown"}`,
    verify: () => authState.currentPayload,
  },
}));

import app from "../../../app.js";
import { Notification } from "../../../models/Notifications.js";
import {
  getNotificationsPayload,
} from "../../../modules/issues/notifications/getNotificationsPayload.js";
import { markAllNotificationsAsRead } from "../../../modules/issues/notifications/markNotificationsAsRead.js";
import { removeNotificationForUser } from "../../../modules/issues/notifications/removeNotificationForUser.js";
import {
  createConfirmedUser,
  createIssueFixture,
  createNotificationFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

describe("notifications module", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("getNotificationsPayload returns notifications for the authenticated user only, newest first, with invitation payload fields", async () => {
    const user = await createConfirmedUser({
      email: "owner@example.com",
    });
    const otherUser = await createConfirmedUser({
      email: "other@example.com",
    });
    const pendingIssue = await createIssueFixture({
      ownerId: user._id,
      name: "Pending issue",
    });
    const acceptedIssue = await createIssueFixture({
      ownerId: user._id,
      name: "Accepted issue",
    });
    const declinedIssue = await createIssueFixture({
      ownerId: user._id,
      name: "Declined issue",
    });

    await createParticipationFixture({
      issueId: acceptedIssue._id,
      expertId: user._id,
      invitationStatus: "accepted",
    });
    await createParticipationFixture({
      issueId: declinedIssue._id,
      expertId: user._id,
      invitationStatus: "declined",
    });

    const pendingNotification = await createNotificationFixture({
      expertId: user._id,
      issueId: pendingIssue._id,
      message: "Pending invitation",
      read: false,
      createdAt: new Date("2025-01-01T10:00:00.000Z"),
    });
    await createNotificationFixture({
      expertId: user._id,
      issueId: acceptedIssue._id,
      message: "Accepted invitation",
      read: true,
      createdAt: new Date("2025-01-01T11:00:00.000Z"),
    });
    await createNotificationFixture({
      expertId: user._id,
      issueId: declinedIssue._id,
      message: "Declined invitation",
      read: false,
      createdAt: new Date("2025-01-01T12:00:00.000Z"),
    });
    await createNotificationFixture({
      expertId: otherUser._id,
      issueId: declinedIssue._id,
      message: "Other user's notification",
      createdAt: new Date("2025-01-01T13:00:00.000Z"),
    });

    const result = await getNotificationsPayload({
      userId: user._id,
    });

    expect(result.notifications).toHaveLength(3);
    expect(result.notifications.map((notification) => notification.issueName)).toEqual([
      "Declined issue",
      "Accepted issue",
      "Pending issue",
    ]);
    expect(result.notifications[2]).toMatchObject({
      _id: pendingNotification._id.toString(),
      header: "Invitation",
      message: "Pending invitation",
      userEmail: "owner@example.com",
      issueName: "Pending issue",
      issueId: pendingIssue._id.toString(),
      requiresAction: true,
      read: false,
      responseStatus: false,
    });
    expect(result.notifications[0].responseStatus).toBe("Invitation declined");
    expect(result.notifications[1].responseStatus).toBe("Invitation accepted");
  });

  it("getNotificationsPayload returns false responseStatus when there is no participation", async () => {
    const user = await createConfirmedUser({
      email: "solo@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: user._id,
      name: "No participation issue",
    });

    await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
      message: "No participation",
    });

    const result = await getNotificationsPayload({
      userId: user._id,
    });

    expect(result.notifications[0].responseStatus).toBe(false);
  });

  it("markAllNotificationsAsRead marks only the authenticated user's unread notifications", async () => {
    const user = await createConfirmedUser();
    const otherUser = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: user._id,
    });

    const unreadUserNotification = await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
      read: false,
    });
    const readUserNotification = await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
      read: true,
    });
    const otherUserNotification = await createNotificationFixture({
      expertId: otherUser._id,
      issueId: issue._id,
      read: false,
    });

    const result = await markAllNotificationsAsRead({
      userId: user._id,
    });

    const updatedUnreadUserNotification = await Notification.findById(
      unreadUserNotification._id
    ).lean();
    const updatedReadUserNotification = await Notification.findById(
      readUserNotification._id
    ).lean();
    const updatedOtherUserNotification = await Notification.findById(
      otherUserNotification._id
    ).lean();

    expect(result).toEqual({
      message: "Notifications marked as read",
    });
    expect(updatedUnreadUserNotification.read).toBe(true);
    expect(updatedReadUserNotification.read).toBe(true);
    expect(updatedOtherUserNotification.read).toBe(false);
  });

  it("removeNotificationForUser deletes an owned notification", async () => {
    const user = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: user._id,
    });
    const notification = await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
    });

    const result = await removeNotificationForUser({
      notificationId: notification._id,
      userId: user._id,
    });

    expect(result).toEqual({
      message: "Notification removed successfully",
    });
    expect(await Notification.findById(notification._id)).toBeNull();
  });

  it("removeNotificationForUser rejects a missing notification id", async () => {
    const user = await createConfirmedUser();

    await expect(
      removeNotificationForUser({
        notificationId: "",
        userId: user._id,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "notificationId",
      message: "Notification id is required",
    });
  });

  it("removeNotificationForUser rejects deleting another user's notification", async () => {
    const user = await createConfirmedUser();
    const otherUser = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: user._id,
    });
    const notification = await createNotificationFixture({
      expertId: otherUser._id,
      issueId: issue._id,
    });

    await expect(
      removeNotificationForUser({
        notificationId: notification._id,
        userId: user._id,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Notification not found",
    });
  });

  it("removeNotificationForUser rejects an unknown notification", async () => {
    const user = await createConfirmedUser();

    await expect(
      removeNotificationForUser({
        notificationId: "000000000000000000000001",
        userId: user._id,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Notification not found",
    });
  });
});

describe("notifications API contracts", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("authenticated GET /api/issues/notifications returns the notifications payload", async () => {
    const user = await createConfirmedUser({
      email: "notify@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: user._id,
      name: "Notification issue",
    });

    await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
      message: "Notification payload",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/notifications")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Notifications fetched successfully",
      data: {
        notifications: expect.any(Array),
      },
    });
    expect(response.body.data.notifications).toHaveLength(1);
    expect(response.body.data.notifications[0]).toMatchObject({
      message: "Notification payload",
      issueName: "Notification issue",
      userEmail: "notify@example.com",
    });
  });

  it("authenticated POST /api/issues/notifications/read-all marks notifications as read", async () => {
    const user = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: user._id,
    });
    const notification = await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
      read: false,
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .post("/api/issues/notifications/read-all")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Notifications marked as read",
      data: null,
    });
    expect((await Notification.findById(notification._id)).read).toBe(true);
  });

  it("authenticated DELETE /api/issues/notifications/:notificationId removes an owned notification", async () => {
    const user = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: user._id,
    });
    const notification = await createNotificationFixture({
      expertId: user._id,
      issueId: issue._id,
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .delete(`/api/issues/notifications/${notification._id}`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Notification removed successfully",
      data: {
        notificationId: notification._id.toString(),
      },
    });
    expect(await Notification.findById(notification._id)).toBeNull();
  });

  it("user cannot delete another user's notification", async () => {
    const user = await createConfirmedUser();
    const otherUser = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: user._id,
    });
    const notification = await createNotificationFixture({
      expertId: otherUser._id,
      issueId: issue._id,
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .delete(`/api/issues/notifications/${notification._id}`)
      .set(getAuthHeader())
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Notification not found",
    });
  });
});
