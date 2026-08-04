const FIELD_HEIGHT = 36;

export const numberCriterionParameterFieldSx = {
  label: {
    display: "block",
    color: "text.secondary",
    fontWeight: 700,
    whiteSpace: "normal",
    lineHeight: 1,
    textAlign: "center",
  },
  input: {
    width: 96,
    "& .MuiOutlinedInput-root": { height: FIELD_HEIGHT },
    "& input": { py: 0 },
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
