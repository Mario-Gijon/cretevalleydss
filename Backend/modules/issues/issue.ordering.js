import { Issue } from "../../models/Issues.js";
import { Alternative } from "../../models/Alternatives.js";
import { Criterion } from "../../models/Criteria.js";

const COLLATOR = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/**
 * Convierte un id o documento en string.
 *
 * @param {*} value Valor a convertir.
 * @returns {string}
 */
export const oidStr = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

/**
 * Compara dos documentos por nombre y, en empate, por id.
 *
 * @param {string} aName Nombre A.
 * @param {*} aId Id A.
 * @param {string} bName Nombre B.
 * @param {*} bId Id B.
 * @returns {number}
 */
export const compareNameId = (aName, aId, bName, bId) => {
  const nameComparison = COLLATOR.compare(String(aName || ""), String(bName || ""));
  if (nameComparison !== 0) return nameComparison;
  return String(aId).localeCompare(String(bId));
};

/**
 * Ordena documentos por nombre e id.
 *
 * @param {Array<Object>} docs Lista de documentos.
 * @param {(doc: Object) => string} [getName] Selector de nombre.
 * @param {(doc: Object) => *} [getId] Selector de id.
 * @returns {Array<Object>}
 */
export const sortDocsByNameId = (
  docs,
  getName = (doc) => doc?.name,
  getId = (doc) => doc?._id
) => {
  const sortedDocs = Array.isArray(docs) ? docs.slice() : [];

  sortedDocs.sort((a, b) => compareNameId(getName(a), getId(a), getName(b), getId(b)));

  return sortedDocs;
};

/**
 * Reordena documentos usando una lista de ids.
 *
 * @param {Array<Object>} docs Lista de documentos.
 * @param {Array<*>} orderIds Lista de ids ordenada.
 * @param {{ getId?: Function, getName?: Function }} [options]
 * @returns {Array<Object>}
 */
export const orderDocsByIdList = (
  docs,
  orderIds,
  { getId = (doc) => doc?._id, getName = (doc) => doc?.name } = {}
) => {
  const docList = Array.isArray(docs) ? docs.slice() : [];
  const normalizedOrderIds = Array.isArray(orderIds) ? orderIds.map(String) : [];

  if (normalizedOrderIds.length === 0) {
    return sortDocsByNameId(docList, getName, getId);
  }

  const docsById = new Map(docList.map((doc) => [String(getId(doc)), doc]));
  const usedIds = new Set();
  const orderedDocs = [];

  for (const id of normalizedOrderIds) {
    const doc = docsById.get(String(id));

    if (doc) {
      orderedDocs.push(doc);
      usedIds.add(String(id));
    }
  }

  const extraDocs = docList.filter((doc) => !usedIds.has(String(getId(doc))));
  extraDocs.sort((a, b) => compareNameId(getName(a), getId(a), getName(b), getId(b)));

  return orderedDocs.concat(extraDocs);
};

/**
 * Construye órdenes iniciales de alternativas y criterios hoja.
 *
 * @param {{ alternativesDocs?: Array<Object>, leafCriteriaDocs?: Array<Object> }} params
 * @returns {{ altOrder: Array<*>, leafOrder: Array<*> }}
 */
export const buildIssueOrdersFromDocs = ({ alternativesDocs = [], leafCriteriaDocs = [] }) => {
  const altOrder = sortDocsByNameId(alternativesDocs).map((alternative) => alternative._id);
  const leafOrder = sortDocsByNameId(leafCriteriaDocs).map((criterion) => criterion._id);

  return { altOrder, leafOrder };
};

/**
 * Genera y guarda los órdenes del issue si no existen.
 *
 * @param {{ issueId?: string|Object, session?: import("mongoose").ClientSession|null }} [params]
 * @returns {Promise<Object|null>}
 */
export const ensureIssueOrdersDb = async ({ issueId, session } = {}) => {
  const issue = await Issue.findById(issueId)
    .select("_id alternativeOrder leafCriteriaOrder")
    .session(session || null);

  if (!issue) return null;

  const needsAlternativeOrder =
    !Array.isArray(issue.alternativeOrder) || issue.alternativeOrder.length === 0;

  const needsLeafCriteriaOrder =
    !Array.isArray(issue.leafCriteriaOrder) || issue.leafCriteriaOrder.length === 0;

  if (!needsAlternativeOrder && !needsLeafCriteriaOrder) {
    return issue;
  }

  const [alternatives, leafCriteria] = await Promise.all([
    Alternative.find({ issue: issue._id }).select("_id name").session(session || null).lean(),
    Criterion.find({ issue: issue._id, isLeaf: true })
      .select("_id name")
      .session(session || null)
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

/**
 * Obtiene las alternativas ordenadas de un issue.
 *
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
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
      .session(session || null)
      .lean());

  if (!issue) return [];

  const query = Alternative.find({ issue: issue._id }).select(select).session(session || null);
  const alternatives = lean ? await query.lean() : await query;

  return orderDocsByIdList(alternatives, issue.alternativeOrder);
};

/**
 * Obtiene los criterios hoja ordenados de un issue.
 *
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
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
      .session(session || null)
      .lean());

  if (!issue) return [];

  const query = Criterion.find({ issue: issue._id, isLeaf: true })
    .select(select)
    .session(session || null);

  const leafCriteria = lean ? await query.lean() : await query;

  return orderDocsByIdList(leafCriteria, issue.leafCriteriaOrder);
};