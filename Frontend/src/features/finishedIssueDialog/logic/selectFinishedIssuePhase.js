import { selectAlternativePhaseResults } from "./selectFinishedIssueExecution.js";

export const getAlternativePhases = (payload) =>
  selectAlternativePhaseResults(payload).map((result) => result.phase);

export const getLatestAlternativePhase = (payload) => getAlternativePhases(payload).at(-1) ?? null;

export default getAlternativePhases;
