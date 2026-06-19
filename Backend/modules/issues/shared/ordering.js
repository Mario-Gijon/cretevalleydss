import { Issue } from "../../../models/Issues.js";
import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const COLLATOR = new Intl.Collator("es", { sensitivity: "base", numeric: true });

export const compareNameId = (aName, aId, bName, bId) => {
  const nameComparison = COLLATOR.compare(aName, bName);
  if (nameComparison !== 0) return nameComparison;
  return aId.toString().localeCompare(bId.toString());
};

export const comparePositionId = (aPosition, aId, bPosition, bId) => {
  if (aPosition !== bPosition) {
    return aPosition - bPosition;
  }

  return aId.toString().localeCompare(bId.toString());
};

export const sortDocsByPositionId = (
  docs,
  getPosition = (doc) => doc.position,
  getId = (doc) => doc._id
) => {
  const sortedDocs = docs.slice();

  sortedDocs.sort((a, b) =>
    comparePositionId(getPosition(a), getId(a), getPosition(b), getId(b))
  );

  return sortedDocs;
};

export const orderDocsByIdList = (
  docs,
  orderIds,
  { getId = (doc) => doc._id } = {}
) => {
  const docList = docs.slice();
  const normalizedOrderIds = orderIds.map((id) => id.toString());

  if (normalizedOrderIds.length === 0) {
    return docList;
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

  return orderedDocs.concat(extraDocs);
};

const loadIssueIdentityOrThrow = async ({
  issueId,
  issueDoc = null,
  session = null,
  action,
}) => {
  const normalizedIssueDocId = toIdString(issueDoc?._id);
  const issue = normalizedIssueDocId
    ? { _id: issueDoc._id }
    : await Issue.findById(issueId).select("_id").session(session).lean();

  if (issue) {
    return issue;
  }

  throw createInternalError(`Issue not found while ${action}`, {
    field: "issueId",
    details: {
      issueId,
    },
  });
};

const appendSelectField = (select, field) => {
  if (typeof select !== "string" || select.trim() === "") {
    return field;
  }

  return select.includes(field) ? select : `${select} ${field}`;
};

const getRequiredPositionOrThrow = ({ doc, issueId, field }) => {
  if (Number.isInteger(doc?.position) && doc.position >= 0) {
    return doc.position;
  }

  throw createInternalError(`${field} is missing a valid position`, {
    field: `${field}.position`,
    details: {
      issueId: toIdString(issueId),
      documentId: toIdString(doc?._id),
    },
  });
};

export const orderCriteriaDocsByTreePosition = (criteriaDocs, { issueId = null } = {}) => {
  const docsById = new Map();
  const childrenByParentId = new Map();
  const rootDocs = [];

  for (const criterion of criteriaDocs) {
    const criterionId = toIdString(criterion?._id);

    if (!criterionId) {
      throw createInternalError("Criterion is missing a valid id while ordering criteria", {
        field: "criteria._id",
        details: {
          issueId: toIdString(issueId),
        },
      });
    }

    docsById.set(criterionId, criterion);
  }

  for (const criterion of criteriaDocs) {
    const parentId = toIdString(criterion?.parentCriterion) || null;

    if (parentId && docsById.has(parentId)) {
      if (!childrenByParentId.has(parentId)) {
        childrenByParentId.set(parentId, []);
      }

      childrenByParentId.get(parentId).push(criterion);
      continue;
    }

    rootDocs.push(criterion);
  }

  const orderedLeafDocs = [];
  const walk = (docs) => {
    const orderedDocs = sortDocsByPositionId(
      docs,
      (doc) => getRequiredPositionOrThrow({ doc, issueId, field: "criterion" }),
      (doc) => doc._id
    );

    for (const criterion of orderedDocs) {
      const criterionId = toIdString(criterion?._id);
      const children = childrenByParentId.get(criterionId) || [];

      if (children.length === 0) {
        if (criterion?.isLeaf !== true) {
          throw createInternalError("Non-leaf criterion is missing child criteria", {
            field: "criterion.children",
            details: {
              issueId: toIdString(issueId),
              criterionId,
            },
          });
        }

        orderedLeafDocs.push(criterion);
        continue;
      }

      walk(children);
    }
  };

  walk(rootDocs);

  return orderedLeafDocs;
};

const loadOrderedLeafCriterionIdsDb = async ({ issueId, session = null }) => {
  const criteria = await Criterion.find({ issue: issueId })
    .select("_id isLeaf parentCriterion position")
    .session(session)
    .lean();

  return orderCriteriaDocsByTreePosition(criteria, { issueId }).map(
    (criterion) => criterion._id
  );
};

export const getOrderedAlternativesDb = async ({
  issueId,
  issueDoc = null,
  session = null,
  select = "_id name",
  lean = true,
} = {}) => {
  const issue = await loadIssueIdentityOrThrow({
    issueId,
    issueDoc,
    session,
    action: "ordering alternatives",
  });

  const query = Alternative.find({ issue: issue._id })
    .select(appendSelectField(select, "position"))
    .sort({ position: 1, _id: 1 })
    .session(session);
  const alternatives = lean ? await query.lean() : await query;

  alternatives.forEach((alternative) => {
    getRequiredPositionOrThrow({
      doc: alternative,
      issueId: issue._id,
      field: "alternative",
    });
  });

  return alternatives;
};

export const getOrderedLeafCriteriaDb = async ({
  issueId,
  issueDoc = null,
  session = null,
  select = "_id name type isLeaf parentCriterion",
  lean = true,
} = {}) => {
  const issue = await loadIssueIdentityOrThrow({
    issueId,
    issueDoc,
    session,
    action: "ordering leaf criteria",
  });

  const orderedLeafCriterionIds = await loadOrderedLeafCriterionIdsDb({
    issueId: issue._id,
    session,
  });

  const query = Criterion.find({ issue: issue._id, isLeaf: true })
    .select(select)
    .session(session);
  const leafCriteria = lean ? await query.lean() : await query;

  return orderDocsByIdList(leafCriteria, orderedLeafCriterionIds);
};
