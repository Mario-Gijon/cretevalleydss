// utils/issueOrdering.js
import { Issue } from "../models/Issues.js";
import { Alternative } from "../models/Alternatives.js";
import { Criterion } from "../models/Criteria.js";

const COLLATOR = new Intl.Collator("es", { sensitivity: "base", numeric: true });

export const oidStr = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
};

export const compareNameId = (aName, aId, bName, bId) => {
  const n = COLLATOR.compare(String(aName || ""), String(bName || ""));
  if (n !== 0) return n;
  return String(aId).localeCompare(String(bId));
};

export const sortDocsByNameId = (docs, getName = (d) => d?.name, getId = (d) => d?._id) => {
  const arr = Array.isArray(docs) ? docs.slice() : [];
  arr.sort((a, b) => compareNameId(getName(a), getId(a), getName(b), getId(b)));
  return arr;
};

/**
 * Reordena docs usando una lista de ids (orderIds).
 * - Si orderIds está vacío o no existe => orden alfabético estable (name + _id).
 * - Si faltan ids => añade "extras" al final en orden alfabético estable.
 */
export const orderDocsByIdList = (
  docs,
  orderIds,
  { getId = (d) => d?._id, getName = (d) => d?.name } = {}
) => {
  const list = Array.isArray(docs) ? docs.slice() : [];
  const order = Array.isArray(orderIds) ? orderIds.map(String) : [];

  if (order.length === 0) {
    return sortDocsByNameId(list, getName, getId);
  }

  const byId = new Map(list.map((d) => [String(getId(d)), d]));
  const used = new Set();
  const out = [];

  for (const id of order) {
    const doc = byId.get(String(id));
    if (doc) {
      out.push(doc);
      used.add(String(id));
    }
  }

  const extras = list.filter((d) => !used.has(String(getId(d))));
  extras.sort((a, b) => compareNameId(getName(a), getId(a), getName(b), getId(b)));

  return out.concat(extras);
};

export const buildIssueOrdersFromDocs = ({ alternativesDocs = [], leafCriteriaDocs = [] }) => {
  const altOrder = sortDocsByNameId(alternativesDocs).map((a) => a._id);
  const leafOrder = sortDocsByNameId(leafCriteriaDocs).map((c) => c._id);
  return { altOrder, leafOrder };
};

/**
 * Para issues antiguos (sin orders): los genera y los guarda.
 * Úsalo en endpoints "write" (compute/resolve), NO hace falta en listados.
 */
export const ensureIssueOrdersDb = async ({ issueId, session } = {}) => {
  const issue = await Issue.findById(issueId)
    .select("_id alternativeOrder leafCriteriaOrder")
    .session(session || null);

  if (!issue) return null;

  const needsAlt = !Array.isArray(issue.alternativeOrder) || issue.alternativeOrder.length === 0;
  const needsLeaf = !Array.isArray(issue.leafCriteriaOrder) || issue.leafCriteriaOrder.length === 0;

  if (!needsAlt && !needsLeaf) return issue;

  const [alts, leafs] = await Promise.all([
    Alternative.find({ issue: issue._id }).select("_id name").session(session || null).lean(),
    Criterion.find({ issue: issue._id, isLeaf: true }).select("_id name").session(session || null).lean(),
  ]);

  if (needsAlt) issue.alternativeOrder = sortDocsByNameId(alts).map((d) => d._id);
  if (needsLeaf) issue.leafCriteriaOrder = sortDocsByNameId(leafs).map((d) => d._id);

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
    (await Issue.findById(issueId).select("_id alternativeOrder").session(session || null).lean());

  if (!issue) return [];

  const q = Alternative.find({ issue: issue._id }).select(select).session(session || null);
  const alts = lean ? await q.lean() : await q;

  return orderDocsByIdList(alts, issue.alternativeOrder);
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
    (await Issue.findById(issueId).select("_id leafCriteriaOrder").session(session || null).lean());

  if (!issue) return [];

  const q = Criterion.find({ issue: issue._id, isLeaf: true }).select(select).session(session || null);
  const leafs = lean ? await q.lean() : await q;

  return orderDocsByIdList(leafs, issue.leafCriteriaOrder);
};