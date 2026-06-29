import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { prepareIssueCreation } from "../../../modules/issues/creation/createIssue.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
  persistPreparedIssueCreationInTransaction,
  prepareAndPersistIssueCreation,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("issue creation integration", () => {
  it("creates a normalized issue with alternatives, criteria, domain snapshots, participations, and notifications", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel({
      apiModelKey: "/solve-issue/",
      apiEndpoint: {
        method: "POST",
        path: "//decision-models/execute//",
      },
    });
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
      isGlobal: false,
      type: "numeric",
      numericRange: {
        min: 1,
        max: 9,
        step: 1,
      },
    });

    const issueInfo = buildCreateIssueInfo({
      selectedModelId: model._id,
      globalDomainId: domain._id,
      addedExperts: [expert.email],
      alternatives: ["  Alpha  ", "Beta"],
      criteria: [
        {
          name: " Root criterion ",
          type: "group",
          children: [
            {
              name: " Leaf criterion ",
              type: "benefit",
              children: [],
            },
          ],
        },
      ],
    });

    const { prepared, persisted } = await prepareAndPersistIssueCreation({
      issueInfo,
      ownerUserId: owner._id,
    });

    expect(persisted).toEqual({
      issueName: "Example issue",
      emailsToSend: [
        {
          expertEmail: "expert@example.com",
          issueName: "Example issue",
          issueDescription: "Example description",
          ownerEmail: "owner@example.com",
        },
      ],
    });
    expect(prepared.apiModelKey).toBe("solve-issue");
    expect(prepared.apiEndpoint.path).toBe("/decision-models/execute");

    const issues = await Issue.find().lean();
    const alternatives = await Alternative.find().sort({ position: 1 }).lean();
    const criteria = await Criterion.find().sort({ position: 1 }).lean();
    const domainSnapshots = await IssueExpressionDomain.find().lean();
    const participations = await Participation.find().lean();
    const notifications = await Notification.find().lean();

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ownerId: owner._id,
      createdBy: owner._id,
      model: model._id,
      name: "Example issue",
      description: "Example description",
      apiModelKey: "solve-issue",
      apiEndpoint: {
        method: "POST",
        path: "/decision-models/execute",
      },
      evaluationStructureKey: "alternativeCriteriaMatrix",
      active: true,
    });

    expect(alternatives.map((item) => item.name)).toEqual(["Alpha", "Beta"]);
    expect(alternatives.map((item) => item.position)).toEqual([0, 1]);

    expect(criteria).toHaveLength(2);
    const rootCriterion = criteria.find((item) => item.parentCriterion === null);
    const leafCriterion = criteria.find((item) => item.parentCriterion !== null);
    expect(rootCriterion).toMatchObject({
      name: "Root criterion",
      isLeaf: false,
      position: 0,
    });
    expect(leafCriterion).toMatchObject({
      name: "Leaf criterion",
      isLeaf: true,
      parentCriterion: rootCriterion._id,
      position: 0,
    });

    expect(domainSnapshots).toHaveLength(1);
    expect(domainSnapshots[0]).toMatchObject({
      issue: issues[0]._id,
      sourceDomain: domain._id,
      type: "numeric",
      numericRange: {
        min: 1,
        max: 9,
        step: 1,
      },
    });
    expect(String(leafCriterion.expressionDomain)).toBe(
      String(domainSnapshots[0]._id)
    );

    expect(participations).toHaveLength(1);
    expect(participations[0]).toMatchObject({
      issue: issues[0]._id,
      expert: expert._id,
      invitationStatus: "pending",
      evaluationCompleted: false,
      weightsCompleted: true,
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      expert: expert._id,
      issue: issues[0]._id,
      type: "invitation",
      requiresAction: true,
      read: false,
    });
    expect(notifications[0].message).toContain("Owner User");
    expect(notifications[0].message).toContain("Example issue");
  });

  it("rejects a duplicate issue name", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel();
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
    });
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: model._id,
      globalDomainId: domain._id,
      addedExperts: [expert.email],
    });

    await prepareAndPersistIssueCreation({
      issueInfo,
      ownerUserId: owner._id,
    });

    await expect(
      prepareIssueCreation({
        issueInfo,
        ownerUserId: owner._id,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      field: "issueName",
      message: "Issue name already exists",
    });
  });

  it("rejects multiple leaf criteria for a model that is not multi-criteria", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel({
      isMultiCriteria: false,
    });
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
    });
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: model._id,
      globalDomainId: domain._id,
      addedExperts: [expert.email],
      criteria: [
        {
          name: "Group",
          type: "group",
          children: [
            {
              name: "Cost",
              type: "cost",
              children: [],
            },
            {
              name: "Benefit",
              type: "benefit",
              children: [],
            },
          ],
        },
      ],
    });

    await expect(
      prepareIssueCreation({
        issueInfo,
        ownerUserId: owner._id,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "criteria",
      message: "Selected model does not support multiple criteria",
    });
  });

  it("rejects an inaccessible expression domain", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const otherUser = await createConfirmedUser({
      email: "other@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel();
    const foreignDomain = await createExpressionDomainFixture({
      userId: otherUser._id,
    });
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: model._id,
      globalDomainId: foreignDomain._id,
      addedExperts: [expert.email],
    });

    await expect(
      prepareIssueCreation({
        issueInfo,
        ownerUserId: owner._id,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "expressionDomainConfig",
    });
  });

  it("rejects an expression domain incompatible with the model supported domains", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel({
      supportedDomains: {
        numeric: {
          continuous: true,
          discrete: false,
        },
        linguistic: [],
      },
    });
    const discreteDomain = await createExpressionDomainFixture({
      userId: owner._id,
      numericRange: {
        min: 0,
        max: 10,
        step: 1,
      },
    });
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: model._id,
      globalDomainId: discreteDomain._id,
      addedExperts: [expert.email],
    });

    await expect(
      prepareIssueCreation({
        issueInfo,
        ownerUserId: owner._id,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "expressionDomainConfig",
      message:
        "Some assigned expression domains are not compatible with the selected model",
    });
  });
});
