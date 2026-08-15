import { toIdString } from "../../../utils/common/ids.js";

const serializeDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
};

export const snapshotParticipation = (participation) => ({
  participationId: toIdString(participation?._id) || null,
  invitationStatus:
    typeof participation?.invitationStatus === "string"
      ? participation.invitationStatus
      : null,
  evaluationCompleted: participation?.evaluationCompleted === true,
  weightsCompleted: participation?.weightsCompleted === true,
  weight:
    typeof participation?.weight === "number" && Number.isFinite(participation.weight)
      ? participation.weight
      : null,
  entryStage: participation?.entryStage ?? null,
  entryPhase:
    Number.isInteger(participation?.entryPhase) && participation.entryPhase >= 0
      ? participation.entryPhase
      : null,
  joinedAt: serializeDate(participation?.joinedAt),
});
