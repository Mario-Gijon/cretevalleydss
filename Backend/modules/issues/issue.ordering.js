import { Issue } from "../../models/Issues.js";
import { Alternative } from "../../models/Alternatives.js";
import { Criterion } from "../../models/Criteria.js";
import { createInternalError } from "../../utils/common/errors.js";





const COLLATOR = new Intl.Collator("es", { sensitivity: "base", numeric: true });

export const compareNameId = (aName, aId, bName, bId) => {
  const nameComparison = COLLATOR.compare(aName, bName);
  if (nameComparison !== 0) return nameComparison;
  return aId.toString().localeCompare(bId.toString());
};

export const sortDocsByNameId = (
  docs,
  getName = (doc) => doc.name,
  getId = (doc) => doc._id
) => {
  const sortedDocs = docs.slice();

  sortedDocs.sort((a, b) => compareNameId(getName(a), getId(a), getName(b), getId(b)));

  return sortedDocs;
};

export const orderDocsByIdList = (
  docs,
  orderIds,
  { getId = (doc) => doc._id, getName = (doc) => doc.name } = {}
) => {
  const docList = docs.slice();
  const normalizedOrderIds = orderIds.map((id) => id.toString());

  if (normalizedOrderIds.length === 0) {
    return sortDocsByNameId(docList, getName, getId);
  }

  const docsById = new Map(docList.map((doc) => [getId(doc).toString(), doc]));
  const usedIds = new Set();
  const orderedDocs = [];

  for (const id of normalizedOrderIds) {
    const doc = docsById.get(id.toString());

    if (doc) {
      orderedDocs.push(doc);
      usedIds.add(id.toString());
    }
  }

  const extraDocs = docList.filter((doc) => !usedIds.has(getId(doc).toString()));
  extraDocs.sort((a, b) => compareNameId(getName(a), getId(a), getName(b), getId(b)));

  return orderedDocs.concat(extraDocs);
};

export const ensureIssueOrdersDb = async ({ issueId, session } = {}) => {
  const issue = await Issue.findById(issueId)
    .select("_id alternativeOrder leafCriteriaOrder")
    .session(session);

  if (!issue) {
    throw createInternalError("Issue not found while ensuring issue orders", {
      field: "issueId",
      details: {
        issueId,
      },
    });
  }

  const needsAlternativeOrder =
    issue.alternativeOrder.length === 0;

  const needsLeafCriteriaOrder =
    issue.leafCriteriaOrder.length === 0;

  if (!needsAlternativeOrder && !needsLeafCriteriaOrder) {
    return issue;
  }

  const [alternatives, leafCriteria] = await Promise.all([
    Alternative.find({ issue: issue._id }).select("_id name").session(session).lean(),
    Criterion.find({ issue: issue._id, isLeaf: true })
      .select("_id name")
      .session(session)
      .lean(),
  ]);

  if (needsAlternativeOrder) {
    issue.alternativeOrder = sortDocsByNameId(alternatives).map((doc) => doc._id);
  }

  if (needsLeafCriteriaOrder) {
    issue.leafCriteriaOrder = sortDocsByNameId(leafCriteria).map((doc) => doc._id);
  }

  await issue.save({ session });

  return issue;
};

export const getOrderedAlternativesDb = async ({
  issueId,
  issueDoc = null,
  session = null,
  select = "_id name",
  lean = true,
} = {}) => {
  const issue =
    issueDoc ||
    (await Issue.findById(issueId)
      .select("_id alternativeOrder")
      .session(session)
      .lean());

  if (!issue) {
    throw createInternalError("Issue not found while ordering alternatives", {
      field: "issueId",
      details: {
        issueId,
      },
    });
  }

  const query = Alternative.find({ issue: issue._id }).select(select).session(session);
  const alternatives = lean ? await query.lean() : await query;

  return orderDocsByIdList(alternatives, issue.alternativeOrder);
};

export const getOrderedLeafCriteriaDb = async ({
  issueId,
  issueDoc = null,
  session = null,
  select = "_id name type isLeaf parentCriterion",
  lean = true,
} = {}) => {
  const issue =
    issueDoc ||
    (await Issue.findById(issueId)
      .select("_id leafCriteriaOrder")
      .session(session)
      .lean());

  if (!issue) {
    throw createInternalError("Issue not found while ordering leaf criteria", {
      field: "issueId",
      details: {
        issueId,
      },
    });
  }

  const query = Criterion.find({ issue: issue._id, isLeaf: true })
    .select(select)
    .session(session);

  const leafCriteria = lean ? await query.lean() : await query;

  return orderDocsByIdList(leafCriteria, issue.leafCriteriaOrder);
};
