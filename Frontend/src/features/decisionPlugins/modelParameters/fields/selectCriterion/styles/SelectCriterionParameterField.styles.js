const FIELD_HEIGHT = 36;

export const selectCriterionParameterFieldSx = {
  label: {
    display: "block",
    color: "text.secondary",
    fontWeight: 700,
    whiteSpace: "normal",
    lineHeight: 1,
    textAlign: "center",
  },
  title: {
    color: "text.primary",
    fontWeight: 800,
    mb: 0.5,
  },
  input: {
    width: 128,
    "& .MuiOutlinedInput-root": { height: FIELD_HEIGHT },
    "& .MuiSelect-select": { py: 0, display: "flex", alignItems: "center" },
  },
  grid: (rowCount) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${rowCount}, max-content)`,
    columnGap: 1,
    rowGap: 0.75,
    alignItems: "start",
    width: "fit-content",
    maxWidth: "100%",
    overflowX: "auto",
  }),
};
