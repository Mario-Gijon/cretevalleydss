/** Shared scrollbar treatment for Finished Issue surfaces and viewports. */
export const finishedIssueScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(73, 190, 210, 0.62) rgba(3, 12, 20, 0.42)",
  "&::-webkit-scrollbar": { width: 7, height: 7 },
  "&::-webkit-scrollbar-track": { background: "rgba(3, 12, 20, 0.42)", borderRadius: 99 },
  "&::-webkit-scrollbar-thumb": { background: "rgba(73, 190, 210, 0.62)", borderRadius: 99, border: "2px solid rgba(3, 12, 20, 0.42)" },
  "&::-webkit-scrollbar-thumb:hover": { background: "rgba(91, 210, 220, 0.82)" },
};
