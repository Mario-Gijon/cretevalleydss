export const cellSx = {
  container: { width: "100%", minWidth: 0, height: "100%", gap: 0.75 },
  value: { minWidth: 0, flex: 1, display: "flex", alignItems: "center" },
  inputBoundary: {
    width: "100%",
    "& .MuiFormControl-root": { width: "100%" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(103, 221, 218, 0.35)",
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(103, 221, 218, 0.65)",
    },
    "& .MuiOutlinedInput-root.Mui-disabled:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
  },
  diagonal: { width: "100%", textAlign: "center", color: "text.secondary", fontWeight: 700 },
  chip: { height: 20, flexShrink: 0, pointerEvents: "none" },
};
