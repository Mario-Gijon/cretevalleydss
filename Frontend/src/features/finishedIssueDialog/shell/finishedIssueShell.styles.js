export const finishedIssueDialogLayoutSx = {
  width: "100%",
  maxWidth: "none",
};

export const finishedIssueContentFrameSx = {
  width: "100%",
  maxWidth: 1920,
  mx: "auto",
  minWidth: 0,
};

export const finishedIssueHeaderSx = {
  px: { xs: 1.5, md: 2.25 },
  pt: { xs: 1.35, md: 1.75 },
  pb: 0,
  position: "sticky",
  top: 0,
  zIndex: 10,
  borderBottom: "1px solid rgba(103, 221, 218, 0.15)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.17)",
  backdropFilter: "blur(14px)",
};

export const finishedIssueHeaderIdentitySx = {
  minWidth: 0,
  flex: "1 1 360px",
};

export const finishedIssueHeaderTitleSx = {
  minWidth: 0,
  fontSize: { xs: 24, sm: 28, lg: 32 },
  lineHeight: 1.08,
  fontWeight: 950,
  letterSpacing: "-0.035em",
};

export const finishedIssueHeaderChipSx = (failed) => ({
  maxWidth: { xs: "100%", sm: 300 },
  minHeight: 34,
  borderRadius: 1.45,
  fontSize: 12.5,
  fontWeight: 850,
  borderColor: failed ? "rgba(243, 104, 104, 0.55)" : undefined,
  "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
});

export const finishedIssueHeaderTabsSx = {
  minHeight: 38,
  "& .MuiTab-root": {
    minHeight: 38,
    px: 1.25,
    borderRadius: 1.3,
    textTransform: "none",
    fontSize: 13,
    fontWeight: 850,
  },
};

export const finishedIssueNavigationSx = {
  minHeight: 44,
  "& .MuiTab-root": {
    minHeight: 44,
    px: { xs: 1.1, md: 1.55 },
    gap: 0.65,
    textTransform: "none",
    fontSize: { xs: 12.5, md: 14 },
    fontWeight: 900,
  },
};
