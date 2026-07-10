import { describe, expect, it } from "vitest";

import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { createUserExpressionDomain } from "../../../modules/expressionDomains/createExpressionDomain.js";
import { deleteIssueCascade } from "../../../modules/issues/lifecycle/deleteIssueCascade.js";
import {
  createConfirmedUser,
  createIssueFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("deleteIssueCascade", () => {
  it("deletes issue expression domain snapshots without deleting live expression domains", async () => {
    const owner = await createConfirmedUser({
      email: "cascade-domain-owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      createdBy: owner._id,
      active: false,
      currentStage: "finished",
      name: "Cascade issue snapshot cleanup",
    });
    const liveDomain = await createUserExpressionDomain({
      userId: owner._id,
      payload: {
        name: "Cascade live domain",
        typeKey: "numericDiscrete",
        definition: {
          min: 1,
          max: 9,
          step: 1,
        },
      },
    });
    const issueSnapshot = await IssueExpressionDomain.create({
      issue: issue._id,
      sourceDomain: liveDomain._id,
      name: liveDomain.name,
      typeKey: liveDomain.typeKey,
      definition: liveDomain.definition,
    });

    await deleteIssueCascade({
      issueId: issue._id,
    });

    expect(await IssueExpressionDomain.findById(issueSnapshot._id)).toBeNull();
    expect(await ExpressionDomain.findById(liveDomain._id).lean()).toMatchObject({
      _id: liveDomain._id,
      user: owner._id,
      name: "Cascade live domain",
    });
  });
});
