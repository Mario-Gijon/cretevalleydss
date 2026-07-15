import {
  toIsoOrNull,
  toRequiredId,
} from "./serializers.shared.js";

export const serializeParticipants = ({ participations }) =>
  participations
    .map((participation) => ({
      id: toRequiredId(participation, "participation"),
      expert: {
        id: toRequiredId(participation.expert, "participant expert"),
        name: participation.expert?.name ?? null,
        email: participation.expert?.email ?? null,
        university: participation.expert?.university ?? null,
      },
      invitationStatus: participation.invitationStatus,
      evaluationCompleted: participation.evaluationCompleted === true,
      weightsCompleted: participation.weightsCompleted === true,
      currentWeight: participation.weight ?? null,
      entryStage: participation.entryStage ?? null,
      entryPhase: participation.entryPhase ?? null,
      joinedAt: toIsoOrNull(participation.joinedAt),
      createdAt: toIsoOrNull(participation.createdAt),
      updatedAt: toIsoOrNull(participation.updatedAt),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
