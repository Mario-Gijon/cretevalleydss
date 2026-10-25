import { Divider, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import OrderedCategoriesParameterField from "./OrderedCategoriesParameterField.jsx";
import BoundaryProfilesParameterField from "../boundaryProfiles/BoundaryProfilesParameterField.jsx";

export const OrderedClassificationParameterGroup = ({
  parametersByStructureKey,
  valuesByParameterKey,
  errorsByParameterKey,
  onChange,
  inspectDependencyChange,
  disabled,
  showValidation,
  parameterContext,
}) => {
  const categoriesParameter = parametersByStructureKey.orderedCategories;
  const profilesParameter = parametersByStructureKey.boundaryProfiles;

  if (!categoriesParameter || !profilesParameter) return null;

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <OrderedCategoriesParameterField
        parameter={categoriesParameter}
        value={valuesByParameterKey[categoriesParameter.key]}
        onChange={(nextValue) => onChange(categoriesParameter, nextValue)}
        error={errorsByParameterKey[categoriesParameter.key] || ""}
        disabled={disabled}
        showValidation={showValidation}
        inspectDependencyChange={(nextValue) => inspectDependencyChange(categoriesParameter, nextValue)}
      />
      <Divider sx={(theme) => ({ borderColor: alpha(theme.palette.divider, 0.45) })} />
      <BoundaryProfilesParameterField
        parameter={profilesParameter}
        value={valuesByParameterKey[profilesParameter.key]}
        onChange={(nextValue) => onChange(profilesParameter, nextValue)}
        error={errorsByParameterKey[profilesParameter.key] || ""}
        disabled={disabled}
        showValidation={showValidation}
        parameterContext={parameterContext}
      />
    </Stack>
  );
};

export default OrderedClassificationParameterGroup;
