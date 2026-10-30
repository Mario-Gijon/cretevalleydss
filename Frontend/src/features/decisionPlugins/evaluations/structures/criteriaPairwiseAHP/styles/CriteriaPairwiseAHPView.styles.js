export const criteriaPairwiseAHPViewSx = {
  container: { minWidth: 0, width: "100%", gap: 1.1 },
  matrixViewport: {
    width: "100%",
    minWidth: 0,
    borderRadius: 1.5,
  },
  empty: { color: "text.secondary", py: 1 },
  caption: { color: "text.secondary", display: "block" },
  status: { color: "text.secondary", fontWeight: 700 },
};

export const collectiveResultSx = {
  container: {
    p: 1.2,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 1.5,
    bgcolor: "rgba(255,255,255,0.018)",
  },
  heading: { fontWeight: 850 },
  subheading: { color: "text.secondary", fontWeight: 800 },
  weightRow: {
    borderBottom: "1px solid rgba(255,255,255,0.055)",
    pb: 0.35,
  },
  criterionName: { color: "text.primary", minWidth: 0, overflowWrap: "anywhere" },
  weight: { color: "secondary.light", fontWeight: 850, whiteSpace: "nowrap" },
  divider: { borderColor: "rgba(255,255,255,0.09)", my: 0.1 },
  expertAccordion: {
    border: "1px solid rgba(255,255,255,0.075)",
    borderRadius: "8px !important",
    bgcolor: "rgba(4, 12, 20, 0.52)",
    "&::before": { display: "none" },
    "& .MuiAccordionSummary-root": { minHeight: 38, px: 1 },
    "& .MuiAccordionSummary-content": { my: 0.55 },
    "& .MuiAccordionDetails-root": { pt: 0, px: 1.2, pb: 1 },
  },
  expertName: { fontWeight: 800, overflowWrap: "anywhere" },
  expertStatus: { color: "text.secondary" },
  diagnosticLine: { color: "text.secondary", mb: 0.25 },
  aggregation: { color: "text.secondary", pt: 0.3 },
};
