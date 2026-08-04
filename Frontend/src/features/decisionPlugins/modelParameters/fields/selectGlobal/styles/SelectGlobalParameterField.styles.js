const FIELD_HEIGHT = 36;

export const selectGlobalParameterFieldSx = {
  label: { height: FIELD_HEIGHT, display: "flex", alignItems: "center", color: "text.secondary", fontWeight: 750, whiteSpace: "nowrap", lineHeight: 1 },
  input: { minWidth: 128, "& .MuiOutlinedInput-root": { height: FIELD_HEIGHT }, "& .MuiSelect-select": { py: 0, display: "flex", alignItems: "center" } },
};
