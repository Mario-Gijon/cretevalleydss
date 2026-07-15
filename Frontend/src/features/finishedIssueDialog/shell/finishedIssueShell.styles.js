export const finishedIssueDialogLayoutSx = { width: "100%", maxWidth: "none" };
export const finishedIssueHeaderSx = { px: { xs: 1.5, md: 2.25 }, pt: { xs: 1.25, md: 1.5 }, pb: 1, position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid rgba(103, 221, 218, 0.15)", boxShadow: "0 9px 28px rgba(0,0,0,0.14)", backdropFilter: "blur(12px)" };
export const finishedIssueHeaderChipSx = (failed) => ({ maxWidth: { xs: "100%", sm: 290 }, minHeight: 30, fontWeight: 800, borderColor: failed ? "rgba(243, 104, 104, 0.55)" : undefined, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } });
export const finishedIssueHeaderTabsSx = { minHeight: 37, "& .MuiTab-root": { minHeight: 37, px: 1.15, borderRadius: 1.2, textTransform: "none", fontWeight: 850 } };
