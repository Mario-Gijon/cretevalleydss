import { toRequiredId } from "./serializers.shared.js";

export const serializeAlternatives = ({ alternatives }) =>
  alternatives.map((alternative) => ({
    id: toRequiredId(alternative, "alternative"),
    name: alternative.name,
    description: alternative.description ?? null,
    position: alternative.position,
  }));
