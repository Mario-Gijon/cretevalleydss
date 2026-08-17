import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { Participation } from "../../models/Participations.js";
import { getAdminUsersListPayload } from "../../modules/admin/users/getAdminUsersList.js";
import {
  createConfirmedUser,
  createIssueFixture,
  createParticipationFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const listedUser = (payload, user) => payload.users.find((entry) => entry.id === String(user._id));

describe("getAdminUsersListPayload", () => {
  it("keeps normal populated participation statistics unchanged", async () => {
    const admin = await createConfirmedUser({ role: "admin" });
    const expert = await createConfirmedUser({ name: "Active expert" });
    const active = await createIssueFixture({ ownerId: admin._id, active: true });
    const finished = await createIssueFixture({ ownerId: admin._id, active: false, currentStage: "finished" });
    await createParticipationFixture({ issueId: active._id, expertId: expert._id });
    await createParticipationFixture({ issueId: finished._id, expertId: expert._id });

    const payload = await getAdminUsersListPayload({ adminUserId: admin._id });
    expect(listedUser(payload, expert).stats).toMatchObject({ activeIssues: 1, finishedIssues: 1 });
  });

  it("keeps a user visible and ignores a participation whose issue no longer exists", async () => {
    const admin = await createConfirmedUser({ role: "admin" });
    const expert = await createConfirmedUser({ name: "Historical expert" });
    await Participation.create({
      issue: new mongoose.Types.ObjectId(),
      expert: expert._id,
      invitationStatus: "accepted",
    });

    const payload = await getAdminUsersListPayload({ adminUserId: admin._id });
    expect(listedUser(payload, expert)).toMatchObject({ id: String(expert._id), stats: { activeIssues: 0, finishedIssues: 0 } });
  });

  it("retains valid statistics and other users when valid and orphaned participations are mixed", async () => {
    const admin = await createConfirmedUser({ role: "admin" });
    const mixed = await createConfirmedUser({ name: "Mixed expert" });
    const unaffected = await createConfirmedUser({ name: "Unaffected expert" });
    const finished = await createIssueFixture({ ownerId: admin._id, active: false, currentStage: "finished" });
    await createParticipationFixture({ issueId: finished._id, expertId: mixed._id });
    await Participation.create({ issue: new mongoose.Types.ObjectId(), expert: mixed._id, invitationStatus: "accepted" });

    const payload = await getAdminUsersListPayload({ adminUserId: admin._id });
    expect(listedUser(payload, mixed).stats).toMatchObject({ activeIssues: 0, finishedIssues: 1 });
    expect(listedUser(payload, unaffected)).toMatchObject({ id: String(unaffected._id), stats: { activeIssues: 0, finishedIssues: 0 } });
  });
});
