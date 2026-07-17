import { getCompatReason, isModelCompatible } from "../../../logic/buildFinishedScenarioRuns.js";
import { SCENARIO_DESCRIPTION_MAX } from "../../../logic/scenarioDraft.constants.js";

const asArray = (value) => (Array.isArray(value) ? value : []);
const hasText = (value) => typeof value === "string" && Boolean(value.trim());

export const buildAddModelOptions = (models) =>
  asArray(models).map((model) => {
    const compatible = isModelCompatible(model);

    return {
      id: model?.id,
      name: model?.name,
      compatible,
      reason: getCompatReason(model),
      statusLabel: compatible ? "Enabled" : "Disabled",
      statusColor: compatible ? "success" : "error",
    };
  });

export const buildAddModelSubmitState = ({
  addLoading,
  scenarioName,
  scenarioDescription,
  selectedModelCompatible,
}) => {
  const descriptionLength =
    typeof scenarioDescription === "string" ? scenarioDescription.length : 0;
  const disabled = Boolean(
    addLoading ||
      !hasText(scenarioName) ||
      !hasText(scenarioDescription) ||
      descriptionLength > SCENARIO_DESCRIPTION_MAX ||
      !selectedModelCompatible
  );

  return {
    canSubmit: !disabled,
    descriptionLength,
    disabled,
  };
};
