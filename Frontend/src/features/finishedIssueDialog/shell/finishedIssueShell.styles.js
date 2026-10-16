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

export const finishedIssueHeaderControlsSx = {
  flexShrink: 0,
};

export const finishedIssueTabsAccentSx = {
  "& .MuiTabs-indicator": {
    height: 3,
    borderRadius: 999,
    backgroundColor: "secondary.main",
  },
  "& .MuiTab-root.Mui-selected": {
    color: "secondary.main",
  },
};

export const finishedIssueHeaderTabsSx = {
  ...finishedIssueTabsAccentSx,
  minHeight: 38,
  "& .MuiTab-root": {
    minHeight: 38,
    px: 1.25,
    borderRadius: 1.3,
    textTransform: "none",
  },
};
