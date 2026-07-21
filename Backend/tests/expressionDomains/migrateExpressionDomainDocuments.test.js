import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import {
  buildMigratedExpressionDomainFields,
  buildMigratedIssueExpressionDomainFields,
  getExpressionDomainMigrationProblem,
  getIssueExpressionDomainMigrationProblem,
  migrateExpressionDomainIndexes,
} from "../../modules/expressionDomains/migrateExpressionDomainDocuments.js";

describe("expression-domain migration", () => {
  it("transforms valid legacy global and user ownership while preserving timestamps", () => {
    const userId = new mongoose.Types.ObjectId();
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-02-01T00:00:00.000Z");

    expect(buildMigratedExpressionDomainFields({
      _id: new mongoose.Types.ObjectId(), user: null, isGlobal: true, createdAt,
    }, now)).toEqual({ owner: null, createdAt, updatedAt: createdAt });
    expect(buildMigratedExpressionDomainFields({
      _id: new mongoose.Types.ObjectId(), user: userId, isGlobal: false, createdAt,
    }, now)).toEqual({ owner: userId, createdAt, updatedAt: createdAt });
  });

  it("rejects inconsistent legacy ownership before mutation", () => {
    expect(getExpressionDomainMigrationProblem({
      _id: "bad-global", user: new mongoose.Types.ObjectId(), isGlobal: true,
    })).toMatchObject({ id: "bad-global", reason: "inconsistent legacy ownership fields" });
    expect(getExpressionDomainMigrationProblem({
      _id: "bad-user", user: null, isGlobal: false,
    })).toMatchObject({ id: "bad-user", reason: "inconsistent legacy ownership fields" });
  });

  it("accepts already migrated ownership idempotently", () => {
    const owner = new mongoose.Types.ObjectId();
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const document = { owner, createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt };

    expect(getExpressionDomainMigrationProblem(document)).toBeNull();
    expect(buildMigratedExpressionDomainFields(document)).toEqual({
      owner,
      createdAt: document.createdAt,
      updatedAt,
    });
  });

  it("rejects snapshots without provenance and preserves valid snapshot timestamps", () => {
    expect(getIssueExpressionDomainMigrationProblem({
      _id: "snapshot-1", issue: "issue-1", name: "Missing source", sourceDomain: null,
    })).toEqual({
      id: "snapshot-1",
      issueId: "issue-1",
      name: "Missing source",
      reason: "sourceDomain must be a non-null ObjectId",
    });
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    expect(buildMigratedIssueExpressionDomainFields({
      sourceDomain: new mongoose.Types.ObjectId(), createdAt,
    })).toEqual({ createdAt, updatedAt: createdAt });
  });

  it("replaces only known obsolete indexes and creates the owner indexes idempotently", async () => {
    const indexes = [
      { name: "_id_", key: { _id: 1 } },
      { name: "user_1_name_1", key: { user: 1, name: 1 } },
      { name: "isGlobal_1_name_1", key: { isGlobal: 1, name: 1 } },
    ];
    const collection = {
      indexes: async () => indexes,
      dropIndex: async (name) => {
        const index = indexes.findIndex((entry) => entry.name === name);
        if (index >= 0) indexes.splice(index, 1);
      },
      createIndex: async (key, options) => {
        indexes.push({ name: options.name, key, unique: options.unique, partialFilterExpression: options.partialFilterExpression });
      },
    };

    await migrateExpressionDomainIndexes({ collection });
    await migrateExpressionDomainIndexes({ collection });

    expect(indexes).toEqual(expect.arrayContaining([
      { name: "_id_", key: { _id: 1 } },
      expect.objectContaining({ name: "expression_domain_owner_name_unique", key: { owner: 1, name: 1 } }),
      expect.objectContaining({ name: "expression_domain_global_name_unique", key: { name: 1 } }),
    ]));
    expect(indexes.map((index) => index.name)).not.toContain("user_1_name_1");
    expect(indexes.map((index) => index.name)).not.toContain("isGlobal_1_name_1");
  });
});
