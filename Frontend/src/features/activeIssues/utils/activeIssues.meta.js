import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalculateIcon from "@mui/icons-material/Calculate";
import GavelIcon from "@mui/icons-material/Gavel";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

/**
 * Resuelve la paleta visual usada por los tonos del módulo.
 *
 * @param {string} tone Tono visual.
 * @returns {Object}
 */
export const resolveActiveIssuesToneColor = (tone) => {
  if (tone === "success") return { dot: "#2e7d32", text: "success.main" };
  if (tone === "warning") return { dot: "#ed6c02", text: "warning.main" };
  if (tone === "error") return { dot: "#d32f2f", text: "error.main" };

  return { dot: "#0288d1", text: "info.main" };
};

/**
 * Convierte una clave camelCase en una etiqueta legible.
 *
 * @param {string} value Valor a transformar.
 * @returns {string}
 */
const toTitleCase = (value) => {
  return (value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
};

/**
 * Devuelve la etiqueta legible de una fase del issue.
 *
 * @param {string} stage Fase actual.
 * @returns {string}
 */
export const stageLabel = (stage) => {
  const map = {
    criteriaWeighting: "Criteria weighting",
    weightsFinished: "Weights finished",
    alternativeEvaluation: "Alternative evaluation",
    finished: "Finished",
  };

  return map[stage] || toTitleCase(stage) || "—";
};

/**
 * Mapea las claves del servidor al formato usado por la UI.
 *
 * @param {string} key Clave recibida del servidor.
 * @returns {string|null}
 */
const mapServerStatusKey = (key) => {
  if (!key) return null;

  const normalizedKey = String(key);

  if (normalizedKey === "resolveIssue") return "resolve";
  if (normalizedKey === "computeWeights") return "computeW";
  if (normalizedKey === "evaluateWeights") return "evalW";
  if (normalizedKey === "evaluateAlternatives") return "evalA";
  if (normalizedKey === "waitingAdmin") return "waitingAdmin";
  if (normalizedKey === "waitingExperts") return "waitingExperts";
  if (normalizedKey === "pendingInvitations") return "waitingExperts";
  if (normalizedKey === "finished") return "finished";

  return normalizedKey;
};

/**
 * Resuelve el tono visual principal de una acción.
 *
 * @param {string} rawKey Clave original del servidor.
 * @param {Object} issue Issue evaluado.
 * @returns {string}
 */
const toneFromServerRawKey = (rawKey, issue) => {
  const key = String(rawKey || "");

  if (key === "evaluateWeights" || key === "evaluateAlternatives") return "info";
  if (key === "waitingAdmin" || key === "waitingExperts") return "success";
  if (key === "computeWeights" || key === "resolveIssue") return "warning";
  if (key === "finished" || issue?.currentStage === "finished") return "success";

  return "success";
};

/**
 * Devuelve la meta visual de la siguiente acción del issue.
 *
 * Prioriza la información enviada por el servidor y usa
 * flags locales cuando todavía no existe meta enriquecida.
 *
 * @param {Object} issue Issue a evaluar.
 * @returns {Object}
 */
export const getNextActionMeta = (issue) => {
  const serverKeyRaw = issue?.ui?.statusKey || issue?.nextAction?.key;
  const serverKey = mapServerStatusKey(serverKeyRaw);
  const serverTitle = issue?.ui?.statusLabel || issue?.nextAction?.label;
  const tone = toneFromServerRawKey(serverKeyRaw, issue);

  const serverMap = {
    waitingAdmin: {
      key: "waitingAdmin",
      title:
        serverTitle ||
        (issue?.currentStage === "weightsFinished"
          ? "Waiting for admin to compute weights"
          : "Waiting for admin to resolve"),
      tone,
      icon: HourglassBottomIcon,
    },
    evalW: {
      key: "evalW",
      title: serverTitle || "Evaluate criteria weights",
      tone,
      icon: FactCheckIcon,
    },
    computeW: {
      key: "computeW",
      title: serverTitle || "Compute weights",
      tone,
      icon: CalculateIcon,
    },
    evalA: {
      key: "evalA",
      title: serverTitle || "Evaluate alternatives",
      tone,
      icon: FactCheckIcon,
    },
    resolve: {
      key: "resolve",
      title: serverTitle || "Resolve issue",
      tone,
      icon: GavelIcon,
    },
    finished: {
      key: "finished",
      title: serverTitle || "Finished",
      tone: "success",
      icon: AssignmentTurnedInIcon,
    },
    waitingExperts: {
      key: "waitingExperts",
      title: serverTitle || "Waiting experts",
      tone,
      icon: HourglassBottomIcon,
    },
  };

  if (serverKey && serverMap[serverKey]) {
    return serverMap[serverKey];
  }

  const flags = issue?.statusFlags || {};

  if (flags.waitingAdmin) return serverMap.waitingAdmin;
  if (flags.canEvaluateWeights) return serverMap.evalW;
  if (flags.canComputeWeights) return serverMap.computeW;
  if (flags.canEvaluateAlternatives) return serverMap.evalA;
  if (flags.canResolveIssue) return serverMap.resolve;
  if (issue?.currentStage === "finished") return serverMap.finished;

  return serverMap.waitingExperts;
};