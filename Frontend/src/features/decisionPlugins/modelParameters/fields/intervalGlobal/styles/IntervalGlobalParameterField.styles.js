const FIELD_HEIGHT = 36;

export const intervalGlobalParameterFieldSx = {
  label: { height: FIELD_HEIGHT, display: "flex", alignItems: "center", color: "text.secondary", fontWeight: 750, whiteSpace: "nowrap", lineHeight: 1 },
  bracket: { height: FIELD_HEIGHT, display: "flex", alignItems: "center", color: "text.secondary", fontWeight: 750, lineHeight: 1 },
  input: { width: 72, "& .MuiOutlinedInput-root": { height: FIELD_HEIGHT }, "& input": { py: 0 } },
};
