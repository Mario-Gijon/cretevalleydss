const FIELD_HEIGHT = 36;

export const numberGlobalParameterFieldSx = {
  label: {
    height: FIELD_HEIGHT,
    display: "flex",
    alignItems: "center",
    fontWeight: 750,
    whiteSpace: "nowrap",
    lineHeight: 1,
  },
  input: {
    width: 96,
    "& .MuiOutlinedInput-root": {
      height: FIELD_HEIGHT,
    },
    "& input": {
      py: 0,
    },
  },
};
