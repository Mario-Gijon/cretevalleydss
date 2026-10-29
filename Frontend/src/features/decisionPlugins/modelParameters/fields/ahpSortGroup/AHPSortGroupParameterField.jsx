import AHPSortTiePreferenceField from "../ahpSortProfiles/AHPSortTiePreferenceField.jsx";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const AHPSortGroupParameterField = ({
  value,
  onChange,
  error = "",
  disabled = false,
  showValidation = false,
  parameterContext,
}) => {
  const selectedExpertCount = Number.isInteger(parameterContext?.selectedExpertCount)
    ? parameterContext.selectedExpertCount
    : 0;
  const tiePolicy = isPlainObject(value) ? value.tiePolicy ?? "" : "";
  if (selectedExpertCount < 2) return null;

  return (
    <AHPSortTiePreferenceField
      label="Equal-vote preference"
      info="Choose which category wins when multiple categories receive the same highest number of expert votes."
      value={tiePolicy}
      onChange={(nextPolicy) => onChange(nextPolicy ? { tiePolicy: nextPolicy } : undefined)}
      error={error}
      showValidation={showValidation}
      disabled={disabled}
    />
  );
};

export default AHPSortGroupParameterField;
