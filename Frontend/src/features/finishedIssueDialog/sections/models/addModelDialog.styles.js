export const addModelDialogPaperSx = {
  opacity: 1,
  borderRadius: 3,
  border: "1px solid rgba(83, 198, 214, 0.22)",
  backgroundColor: "#07131f",
  backgroundImage:
    "linear-gradient(145deg, #0a1d2a 0%, #07131f 45%, #06101a 100%)",
};

export const addModelDialogTitleSx = {
  px: 3,
  pt: 2.5,
  pb: 1.5,
  fontWeight: 950,
};

export const addModelDialogContentSx = {
  px: 3,
  pt: "12px !important",
};

export const addModelDialogFieldsSx = {
  pt: 0.75,
};

export const addModelDialogActionsSx = {
  px: 3,
  pb: 2.5,
};

export const addModelOptionSx = {
  width: "100%",
  minWidth: 0,
};

export const addModelParameterColorScopeSx = (theme) => ({
  "& .MuiInputLabel-root.Mui-focused:not(.Mui-error)": {
    color: theme.palette.secondary.main,
  },
  "& .MuiOutlinedInput-root.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.secondary.main,
  },
  "& .MuiInput-underline:not(.Mui-disabled):after, & .MuiFilledInput-underline:not(.Mui-disabled):after": {
    borderBottomColor: theme.palette.secondary.main,
  },
  "& .MuiSelect-icon:not(.Mui-disabled)": {
    color: theme.palette.secondary.main,
  },
  "& .MuiSlider-root:not(.Mui-disabled), & .MuiCheckbox-root:not(.Mui-disabled), & .MuiRadio-root:not(.Mui-disabled), & .MuiSwitch-switchBase:not(.Mui-disabled).Mui-checked": {
    color: theme.palette.secondary.main,
  },
});
