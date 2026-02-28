import { Evaluation } from "../models/Evaluations.js";
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";

/** Mapear nombre de modelo -> endpoint */
export const getModelEndpointKey = (modelName = "") => {
  const n = String(modelName).trim().toUpperCase();

  if (n === "TOPSIS") return "topsis";
  if (n === "FUZZY TOPSIS") return "fuzzy_topsis";
  if (n === "BORDA") return "borda";
  if (n === "ARAS") return "aras";

  // Pairwise / consenso
  if (n === "HERRERA-VIEDMA CRP" || n === "HERRERA VIEDMA CRP" || n === "CRP") return "herrera_viedma_crp";

  // si añadís más, aquí.
  return null;
};

/** Detectar domainType del issue (NO mezclar) desde snapshots usados en Evaluations */
export const detectIssueDomainTypeOrThrow = async ({ issueId, expertIds }) => {
  const snapshotIds = await Evaluation.distinct("expressionDomain", {
    issue: issueId,
    expert: { $in: expertIds },
  });

  const snaps = await IssueExpressionDomain.find(
    { _id: { $in: snapshotIds }, issue: issueId },
    "type"
  ).lean();

  const types = new Set(snaps.map((s) => s.type).filter(Boolean));

  if (types.size === 0) {
    const err = new Error("Cannot detect issue domain type (no snapshots found in evaluations).");
    err.status = 400;
    throw err;
  }

  if (types.size > 1) {
    const err = new Error("This issue mixes numeric and linguistic domains. Simulation is disabled for now.");
    err.status = 400;
    throw err;
  }

  return { domainType: Array.from(types)[0], snapshotIdsUsed: snapshotIds };
};

/** Validar pesos según el tipo del parámetro weights del modelo */
export const validateWeightsForTargetModel = ({ targetModel, paramsUsed, criteriaLen }) => {
  const weightsParam = (targetModel?.parameters || []).find((p) => p?.name === "weights");
  if (!weightsParam) return; // modelo no necesita weights explícitos

  const w = paramsUsed?.weights;

  if (w == null) {
    const err = new Error("Target model requires 'weights' but none were provided.");
    err.status = 400;
    throw err;
  }

  // Aceptamos tanto array como (en fuzzy) array de arrays/objects
  if (!Array.isArray(w)) {
    const err = new Error("'weights' must be an array.");
    err.status = 400;
    throw err;
  }

  // matchCriteria -> longitud == #criteria
  if (w.length !== criteriaLen) {
    const err = new Error(`'weights' length must match number of leaf criteria (${criteriaLen}).`);
    err.status = 400;
    throw err;
  }

  if (weightsParam.type === "array") {
    // crisp
    const ok = w.every((x) => typeof x === "number" && Number.isFinite(x));
    if (!ok) {
      const err = new Error("Target model expects crisp numeric weights (array of numbers).");
      err.status = 400;
      throw err;
    }
    return;
  }

  if (weightsParam.type === "fuzzyArray") {
    // fuzzy: cada elemento puede ser [l,m,u] o {l,m,u} o {a,b,c} etc (lo dejamos flexible)
    const ok = w.every((x) => {
      if (Array.isArray(x)) return x.length === 3 && x.every((n) => typeof n === "number" && Number.isFinite(n));
      if (x && typeof x === "object") return true; // flexible (tu API lo normaliza)
      return false;
    });

    if (!ok) {
      const err = new Error("Target model expects fuzzy weights (each weight must be [l,m,u] or an object).");
      err.status = 400;
      throw err;
    }
  }
};

/** Construir matrices AxC (no pairwise), devolviendo también snapshots usados */
export const buildAxCMatrices = async ({ issueId, alternatives, criteria, participations }) => {
  const expertIds = participations.map((p) => p.expert._id);

  const evalDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
  })
    .populate("expressionDomain")
    .lean();

  const map = new Map();
  const snapshotIdsUsed = new Set();

  for (const e of evalDocs) {
    const k = `${String(e.expert)}_${String(e.alternative)}_${String(e.criterion)}`;
    map.set(k, e);
    if (e.expressionDomain?._id) snapshotIdsUsed.add(String(e.expressionDomain._id));
  }

  const expertsOrder = participations.map((p) => p.expert.email);

  const matrices = {};
  for (const p of participations) {
    const email = p.expert.email;
    const m = [];

    for (const alt of alternatives) {
      const row = [];
      for (const crit of criteria) {
        const k = `${String(p.expert._id)}_${String(alt._id)}_${String(crit._id)}`;
        const e = map.get(k);

        if (!e) {
          const err = new Error(`Missing evaluation for expert ${email}, alt ${alt.name}, crit ${crit.name}`);
          err.status = 400;
          throw err;
        }

        let val = e.value ?? null;

        const dom = e.expressionDomain;
        if (dom?.type === "linguistic") {
          const def = (dom.linguisticLabels || []).find((lbl) => lbl.label === val);
          val = def ? def.values : null;
        }

        row.push(val);
      }
      m.push(row);
    }

    matrices[email] = m;
  }

  return { matrices, expertsOrder, snapshotIdsUsed: Array.from(snapshotIdsUsed) };
};

/** Construir matrices AxA (pairwise) -> expert -> criterionName -> matrix */
export const buildPairwiseMatrices = async ({ issueId, alternatives, criteria, participations }) => {
  const expertIds = participations.map((p) => p.expert._id);

  const evalDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: { $ne: null },
  })
    .populate("expressionDomain")
    .lean();

  const map = new Map();
  const snapshotIdsUsed = new Set();

  for (const e of evalDocs) {
    const k = `${String(e.expert)}_${String(e.criterion)}_${String(e.alternative)}_${String(e.comparedAlternative)}`;
    map.set(k, e);
    if (e.expressionDomain?._id) snapshotIdsUsed.add(String(e.expressionDomain._id));
  }

  const expertsOrder = participations.map((p) => p.expert.email);

  const altIndex = new Map(alternatives.map((a, i) => [String(a._id), i]));

  const matrices = {};
  for (const p of participations) {
    const email = p.expert.email;
    matrices[email] = {};

    for (const crit of criteria) {
      const n = alternatives.length;
      const mat = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0.5 : null))
      );

      for (const alt of alternatives) {
        for (const cmp of alternatives) {
          if (String(alt._id) === String(cmp._id)) continue;

          const k = `${String(p.expert._id)}_${String(crit._id)}_${String(alt._id)}_${String(cmp._id)}`;
          const e = map.get(k);
          if (!e) continue;

          const i = altIndex.get(String(alt._id));
          const j = altIndex.get(String(cmp._id));
          if (i == null || j == null) continue;

          // pairwise en tu sistema es numeric, pero lo dejamos general
          mat[i][j] = e.value ?? null;
        }
      }

      // sanity: no null fuera diagonal
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          if (mat[i][j] == null) {
            const err = new Error(`Incomplete pairwise matrix for expert ${email}, criterion ${crit.name}`);
            err.status = 400;
            throw err;
          }
        }
      }

      matrices[email][crit.name] = mat;
    }
  }

  return { matrices, expertsOrder, snapshotIdsUsed: Array.from(snapshotIdsUsed) };
};

/** Normalizar resultados a un shape común tipo Consensus */
export const normalizeScenarioResults = ({
  targetModelName,
  apiResults,
  alternatives,
  criteria,
  expertsOrder,
}) => {
  const modelName = String(targetModelName || "").trim().toUpperCase();
  const altNames = alternatives.map((a) => a.name);

  // ======= CRP (pairwise) =======
  if (modelName === "HERRERA VIEDMA CRP") {
    const {
      alternatives_rankings = [],
      cm = null,
      collective_evaluations = {},
      plots_graphic = null,
      collective_scores = [],
    } = apiResults || {};

    const rankedWithScores = alternatives_rankings.map((idx) => ({
      name: altNames[idx],
      score: collective_scores?.[idx] ?? null,
    }));

    const collectiveScoresByName = Object.fromEntries(
      altNames.map((n, i) => [n, collective_scores?.[i] ?? null])
    );

    // collectiveEvaluations para UI (como tú guardas en pairwise)
    const transformedCollectiveEvaluations = {};
    for (const crit of criteria) {
      const mat = collective_evaluations?.[crit.name];
      if (!mat) continue;

      const transformed = mat.map((row, rIdx) => {
        const obj = { id: altNames[rIdx] };
        row.forEach((v, cIdx) => {
          obj[altNames[cIdx]] = v;
        });
        return obj;
      });

      transformedCollectiveEvaluations[crit.name] = transformed;
    }

    // plots_graphic: map expert_points[] -> email
    let plotsGraphicWithEmails = null;
    if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
      const expertPointsMap = {};
      expertsOrder.forEach((email, i) => {
        expertPointsMap[email] = plots_graphic.expert_points[i] ?? null;
      });
      plotsGraphicWithEmails = {
        expert_points: expertPointsMap,
        collective_point: plots_graphic.collective_point ?? null,
      };
    }

    const details = {
      cm,
      rankedAlternatives: rankedWithScores,
      collective_scores: collectiveScoresByName,
      collective_ranking: rankedWithScores.map((r) => r.name),
      ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
    };

    return {
      details,
      collectiveEvaluations: transformedCollectiveEvaluations,
    };
  }

  // ======= TOPSIS / ARAS / BORDA / FUZZY TOPSIS =======
  const {
    collective_ranking = [],
    collective_scores = [],
    collective_matrix = null,
    plots_graphic = null,
    cm = null,
  } = apiResults || {};

  const rankedWithScores = collective_ranking.map((idx) => ({
    name: altNames[idx],
    score: collective_scores?.[idx] ?? null,
  }));

  const collectiveScoresByName = Object.fromEntries(
    altNames.map((n, i) => [n, collective_scores?.[i] ?? null])
  );

  // collectiveEvaluations forma AxC (como tu resolveIssue)
  const collectiveEvaluations = {};
  if (Array.isArray(collective_matrix)) {
    collective_matrix.forEach((row, altIdx) => {
      const altName = altNames[altIdx];
      collectiveEvaluations[altName] = {};
      row.forEach((val, critIdx) => {
        const critName = criteria[critIdx]?.name ?? `C${critIdx + 1}`;
        collectiveEvaluations[altName][critName] = { value: val };
      });
    });
  }

  // plots_graphic opcional
  let plotsGraphicWithEmails = null;
  if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
    const expertPointsMap = {};
    expertsOrder.forEach((email, i) => {
      expertPointsMap[email] = plots_graphic.expert_points[i] ?? null;
    });
    plotsGraphicWithEmails = {
      expert_points: expertPointsMap,
      collective_point: plots_graphic.collective_point ?? null,
    };
  }

  const details = {
    cm,
    rankedAlternatives: rankedWithScores,
    collective_scores: collectiveScoresByName,
    collective_ranking: rankedWithScores.map((r) => r.name),
    ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
  };

  return { details, collectiveEvaluations };
};

const toNum = (x) => (Number.isFinite(Number(x)) ? Number(x) : null);

const pickMid = (w) => {
  if (Array.isArray(w) && w.length === 3) return toNum(w[1]);
  if (w && typeof w === "object") return toNum(w.m ?? w.mid ?? w.value);
  return toNum(w);
};

const toTriple = (w) => {
  if (Array.isArray(w) && w.length === 3) return w.map(toNum);
  if (w && typeof w === "object") return [toNum(w.l), toNum(w.m), toNum(w.u)];
  const n = toNum(w);
  return [n, n, n];
};

const normalizeCrisp = (arr) => {
  const s = arr.reduce((a,b)=>a+b,0);
  if (!s) return arr;
  return arr.map((x)=>x/s);
};

const normalizeFuzzyByMid = (triples) => {
  const mids = triples.map((t)=>t?.[1]).filter(Number.isFinite);
  const s = mids.reduce((a,b)=>a+b,0);
  if (!s) return triples;
  const k = 1 / s;
  return triples.map(([l,m,u]) => [l*k, m*k, u*k]);
};

export const coerceWeightsForModel = ({ baseWeights, weightsParam, leafCount }) => {
  const L = Number(leafCount) || (Array.isArray(baseWeights) ? baseWeights.length : 1);

  if (weightsParam.type === "array") {
    const crisp = Array.from({ length: L }, (_, i) => pickMid(baseWeights?.[i]));
    if (crisp.some((x) => !Number.isFinite(x))) throw new Error("Invalid base weights");
    return normalizeCrisp(crisp);
  }

  if (weightsParam.type === "fuzzyArray") {
    const triples = Array.from({ length: L }, (_, i) => toTriple(baseWeights?.[i]));
    if (triples.some((t) => t.some((x) => !Number.isFinite(x)))) throw new Error("Invalid base fuzzy weights");
    return normalizeFuzzyByMid(triples);
  }

  // fallback: deja tal cual
  return baseWeights;
};