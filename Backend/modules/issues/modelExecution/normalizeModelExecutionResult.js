import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import {
  normalizeResultStructureOrThrow,
} from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";

export const normalizeModelExecutionResult = ({
  result,
  messages = {},
  options = {},
}) =>
  normalizeResultStructureOrThrow({
    ...resolveResultStructureMetadata(),
    result,
    messages,
    options,
  });
