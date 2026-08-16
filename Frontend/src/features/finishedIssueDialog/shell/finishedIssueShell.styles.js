export const finishedIssueDialogLayoutSx = {
  width: "100%",
  maxWidth: "none",
};

export const finishedIssueContentFrameSx = {
  width: "100%",
  maxWidth: 2040,
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
  flex: { xs: "0 0 auto", lg: "1 1 360px" },
};

export const finishedIssueHeaderControlsSx = {
  flex: { xs: "0 0 auto", lg: "1 1 520px" },
  width: { xs: "100%", lg: "auto" },
  minWidth: 0,
};

export const finishedIssueHeaderTitleSx = {
  minWidth: 0,
  letterSpacing: "-0.035em",
};

export const finishedIssueHeaderTabsSx = {
  minHeight: 38,
  "& .MuiTab-root": {
    minHeight: 38,
    px: 1.25,
    borderRadius: 1.3,
    textTransform: "none",
  },
};

export const finishedIssueNavigationSx = {
  minHeight: 44,
  "& .MuiTab-root": {
    minHeight: 44,
    px: { xs: 1.1, md: 1.55 },
    gap: 0.65,
    textTransform: "none",
  },
};
