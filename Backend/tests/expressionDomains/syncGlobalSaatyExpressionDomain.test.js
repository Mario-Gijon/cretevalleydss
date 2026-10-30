import { describe, expect, it, vi } from "vitest";

import { syncGlobalSaatyExpressionDomain } from "../../modules/expressionDomains/syncGlobalSaatyExpressionDomain.js";

const makeModel = ({ existing, writeResult = { upsertedCount: 0, modifiedCount: 1 } }) => {
  const query = { lean: () => ({ exec: async () => existing }) };
  return {
    updateOne: vi.fn(async () => writeResult),
    findOne: vi.fn(() => query),
  };
};

describe("syncGlobalSaatyExpressionDomain", () => {
  it("upserts only the fixed global Saaty domain and preserves its identity", async () => {
    const persisted = {
      _id: "stable-global-domain-id",
      owner: null,
      name: "AHP Saaty Scale",
      typeKey: "numericSaaty",
      definition: { scale: "saaty-fundamental-1-9" },
    };
    const model = makeModel({ existing: persisted });

    const result = await syncGlobalSaatyExpressionDomain({ model });

    expect(model.updateOne).toHaveBeenCalledWith(
      { owner: null, name: "AHP Saaty Scale" },
      {
        $set: { typeKey: "numericSaaty", definition: { scale: "saaty-fundamental-1-9" } },
        $setOnInsert: { name: "AHP Saaty Scale", owner: null },
      },
      { upsert: true },
    );
    expect(model.findOne).toHaveBeenCalledExactlyOnceWith({ owner: null, name: "AHP Saaty Scale" });
    expect(result.domain._id).toBe("stable-global-domain-id");
    expect(result.created).toBe(false);
    expect(result.modified).toBe(true);
  });

  it("is idempotent when the canonical domain already exists", async () => {
    const model = makeModel({
      existing: {
        _id: "stable-global-domain-id",
        owner: null,
        name: "AHP Saaty Scale",
        typeKey: "numericSaaty",
        definition: { scale: "saaty-fundamental-1-9" },
      },
      writeResult: { upsertedCount: 0, modifiedCount: 0 },
    });

    const result = await syncGlobalSaatyExpressionDomain({ model });

    expect(result.domain._id).toBe("stable-global-domain-id");
    expect(result.created).toBe(false);
    expect(result.modified).toBe(false);
  });

  it("reports a new domain without touching any other global names", async () => {
    const model = makeModel({
      existing: { _id: "new-domain-id", name: "AHP Saaty Scale", owner: null },
      writeResult: { upsertedCount: 1, modifiedCount: 0 },
    });
    const result = await syncGlobalSaatyExpressionDomain({ model });
    expect(model.updateOne).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(true);
    expect(result.domain._id).toBe("new-domain-id");
  });
});
