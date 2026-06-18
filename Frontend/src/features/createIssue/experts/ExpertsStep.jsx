import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
  IconButton,
  TextField,
  Stack,
  TableContainer,
  Button,
  Typography,
  Avatar,
  InputAdornment,
  Box,
  Tooltip,
  Drawer,
  Divider,
  Collapse,
  ToggleButton,
  useMediaQuery,
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { alpha, useTheme } from "@mui/material/styles";

import { removeAccents } from "../../../utils/text.utils";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueExpertsBodyCellSx,
  getCreateIssueExpertsCountBadgeSx,
  getCreateIssueExpertsHeadCellSx,
  getCreateIssueExpertsHeaderAvatarSx,
  getCreateIssueExpertsHoverRowSx,
  getCreateIssueExpertsSearchInputSx,
  getCreateIssueExpertsTableContainerSx,
} from "../styles/createIssueStep.styles";
import {
  areExpertWeightsEqual,
  buildEqualExpertWeights,
  modelUsesExpertWeights,
} from "../logic/createIssueExpertWeights";

const EXPERT_WEIGHT_INPUT_DECIMALS = 3;

const formatExpertWeightInputValue = (value) => {
  if (value === "") {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue
    .toFixed(EXPERT_WEIGHT_INPUT_DECIMALS)
    .replace(/\.?0+$/, "");
};

const normalizeExpertWeightInput = (value) => {
  const normalizedValue = value.replace(",", ".").trim();

  if (normalizedValue === "") {
    return "";
  }

  if (!/^\d*\.?\d*$/.test(normalizedValue)) {
    return null;
  }

  const hasDecimalPoint = normalizedValue.includes(".");
  const [rawInteger = "", rawDecimal = ""] = normalizedValue.split(".");
  const integerPart = rawInteger === "" ? "0" : rawInteger;

  if (Number(integerPart) > 1) {
    return null;
  }

  if (rawDecimal.length > EXPERT_WEIGHT_INPUT_DECIMALS) {
    return null;
  }

  const decimalPart = rawDecimal;

  if (Number(integerPart) === 1 && /[1-9]/.test(decimalPart)) {
    return null;
  }

  if (hasDecimalPoint) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
};

const toExpertWeightStateValue = (value) => {
  if (value === "") {
    return "";
  }

  if (value.endsWith(".")) {
    return "";
  }

  return Number(value);
};

const commitExpertWeightInputValue = (value) => {
  if (value === "") {
    return "";
  }

  const trimmedValue = value.endsWith(".") ? value.slice(0, -1) : value;

  if (trimmedValue === "") {
    return "";
  }

  return formatExpertWeightInputValue(trimmedValue);
};

const buildExpertWeightInputValues = (emails, weights, editingEmail, previousInputs) =>
  emails.reduce((accumulator, email) => {
    if (email === editingEmail && previousInputs[email] !== undefined) {
      accumulator[email] = previousInputs[email];
      return accumulator;
    }

    accumulator[email] = formatExpertWeightInputValue(weights[email]);
    return accumulator;
  }, {});

const haveExpertWeightInputsChanged = (left, right) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return true;
  }

  return leftKeys.some((key) => left[key] !== right[key]);
};

const getSelectedExpertsPanelSx = (theme) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  background: `linear-gradient(180deg, ${alpha(theme.palette.info.main, 0.11)} 0%, ${alpha(
    theme.palette.common.white,
    0.02
  )} 42%, ${alpha(theme.palette.common.black, 0.08)} 100%)`,
  boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, 0.16)}`,
  overflow: "hidden",
});

const getSelectedExpertsRailSx = (theme) => ({
  width: 56,
  minWidth: 56,
  minHeight: "52vh",
  alignSelf: "stretch",
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",
  overflow: "hidden",
});

const getSelectedExpertsActionBtnSx = (theme) => ({
  borderRadius: 999,
  px: 1.4,
  py: 0.8,
  fontWeight: 900,
  textTransform: "none",
  borderColor: alpha(theme.palette.common.white, 0.14),
  bgcolor: alpha(theme.palette.common.white, 0.04),
  "&:hover": {
    borderColor: alpha(theme.palette.info.main, 0.3),
    bgcolor: alpha(theme.palette.info.main, 0.11),
  },
});

const getSelectedExpertsListSx = (theme) => ({
  flex: 1,
  minHeight: 0,
  maxHeight: { xs: "50vh", md: "52vh" },
  overflowY: "auto",
  pr: 0.3,
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.common.white, 0.2)} transparent`,
  "&::-webkit-scrollbar": { width: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.common.white, 0.16),
    borderRadius: 999,
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
});

const SelectedExpertsPanelContent = ({
  addedExperts,
  expertWeightValidation,
  expertWeightsMode,
  handleDeleteExpert,
  handleResetEqualWeights,
  handleWeightChange,
  handleWeightBlur,
  handleWeightFocus,
  expertWeightInputs,
  selectedCount,
  selectedExpertWeightsSum,
  usesExpertWeights,
  theme,
  onClose,
  onCollapse,
  collapseTooltip,
}) => (
  <Box sx={{ ...getSelectedExpertsPanelSx(theme), height: "100%" }}>
    <Stack spacing={1.2} sx={{ p: 1.35, minHeight: 0, height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack spacing={0.2} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            Selected experts
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
            {selectedCount} selected
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {onCollapse ? (
            <Tooltip title={collapseTooltip} arrow placement="left">
              <IconButton onClick={onCollapse} size="small" sx={{ color: "text.secondary" }}>
                <ChevronRightRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}

          {onClose ? (
            <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </Stack>

      {usesExpertWeights && selectedCount > 0 ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          {selectedExpertWeightsSum !== null ? (
            <Box
              sx={{
                px: 1.05,
                py: 0.55,
                borderRadius: 999,
                border: `1px solid ${alpha(theme.palette[expertWeightValidation.tone].main, 0.28)}`,
                bgcolor: alpha(theme.palette[expertWeightValidation.tone].main, 0.12),
                color: `${expertWeightValidation.tone}.main`,
                fontSize: 12,
                fontWeight: 900,
                alignSelf: { xs: "flex-start", sm: "auto" },
              }}
            >
              Sum: {selectedExpertWeightsSum.toFixed(3)} / 1
            </Box>
          ) : null}

          <ToggleButton
            value="equalWeights"
            selected={expertWeightsMode === "equal"}
            onClick={handleResetEqualWeights}
            size="small"
            color="secondary"
            sx={{
              px: 1.4,
              py: 0.55,
              borderColor:
                expertWeightsMode === "equal"
                  ? "rgba(75, 210, 207, 0.72)"
                  : "rgba(255,255,255,0.16)",
              color: expertWeightsMode === "equal" ? "info.main" : "text.secondary",
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 0.25,
              textTransform: "uppercase",
              "&.Mui-selected": {
                color: "info.main",
                backgroundColor: "rgba(75, 210, 207, 0.10)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "rgba(75, 210, 207, 0.14)",
              },
            }}
          >
            Equal weights
          </ToggleButton>
        </Stack>
      ) : null}

      <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.07) }} />

      {selectedCount > 0 ? (
        <Box sx={getSelectedExpertsListSx(theme)}>
          <Stack spacing={0.75}>
            {addedExperts.map((email) => (
              <Stack
                key={email}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  borderRadius: 2.2,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                  bgcolor: alpha(theme.palette.common.white, 0.02),
                  px: 1,
                  py: 0.8,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 800,
                    color: alpha(theme.palette.common.white, 0.9),
                    wordBreak: "break-word",
                  }}
                >
                  {email}
                </Typography>

                {usesExpertWeights ? (
                  <TextField
                    size="small"
                    type="number"
                    color="secondary"
                    value={expertWeightInputs[email] ?? ""}
                    onFocus={() => handleWeightFocus(email)}
                    onChange={(event) => handleWeightChange(email, event.target.value)}
                    onBlur={(event) => handleWeightBlur(email, event.target.value)}
                    inputProps={{
                      min: 0,
                      max: 1,
                      step: 0.1,
                    }}
                    sx={{
                      width: 82,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.2,
                        bgcolor: alpha(theme.palette.common.white, 0.04),
                      },
                      "& input": {
                        textAlign: "right",
                      },
                    }}
                  />
                ) : null}

                <Tooltip title="Remove expert" arrow placement="top">
                  <IconButton onClick={() => handleDeleteExpert(email)} size="small">
                    <RemoveCircleOutlineIcon color="warning" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 2.8,
            border: `1px dashed ${alpha(theme.palette.common.white, 0.13)}`,
            bgcolor: alpha(theme.palette.common.white, 0.015),
            px: 1.2,
            py: 1.6,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
            No experts selected yet.
          </Typography>
        </Box>
      )}

      {usesExpertWeights && selectedCount > 0 && expertWeightValidation.valid !== true ? (
        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 800 }}>
          {expertWeightValidation.message}
        </Typography>
      ) : null}
    </Stack>
  </Box>
);

export const ExpertsStep = ({
  initialExperts: initialExpertsProp,
  closeAddExpertsDialog = false,
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { initialExperts: contextExperts } = useIssuesDataContext();
  const {
    selectedModel,
    addedExperts,
    setAddedExperts,
    expertWeights,
    setExpertWeights,
    setExpertWeightsCustomized,
    expertWeightValidation,
  } = useCreateIssueContext();
  const [searchFilter, setSearchFilter] = useState("");
  const [desktopPanelExpanded, setDesktopPanelExpanded] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [expertWeightInputs, setExpertWeightInputs] = useState({});
  const editingExpertEmailRef = useRef(null);
  const usesExpertWeights = modelUsesExpertWeights(selectedModel);

  const sourceExperts = useMemo(
    () =>
      Array.isArray(initialExpertsProp)
        ? initialExpertsProp
        : contextExperts || [],
    [contextExperts, initialExpertsProp]
  );

  const availableExperts = useMemo(
    () => sourceExperts.filter((expert) => !addedExperts.includes(expert.email)),
    [addedExperts, sourceExperts]
  );

  const filteredExperts = useMemo(() => {
    const query = removeAccents(searchFilter.toLowerCase().trim());
    if (!query) return availableExperts;

    return availableExperts.filter((expert) => {
      const name = removeAccents((expert.name || "").toLowerCase());
      const email = removeAccents((expert.email || "").toLowerCase());
      const university = removeAccents((expert.university || "").toLowerCase());
      return (
        name.includes(query) ||
        email.includes(query) ||
        university.includes(query)
      );
    });
  }, [availableExperts, searchFilter]);

  const buildExactEqualWeights = () => buildEqualExpertWeights(addedExperts);

  const handleAddExpert = (email) => {
    setAddedExperts((previous) => [...new Set([...(previous || []), email])]);
  };

  const handleDeleteExpert = (email) => {
    setAddedExperts((previous) => previous.filter((value) => value !== email));
  };

  const handleWeightChange = (email, value) => {
    const normalizedValue = normalizeExpertWeightInput(value);

    if (normalizedValue === null) {
      return;
    }

    editingExpertEmailRef.current = email;
    setExpertWeightInputs((previous) => ({
      ...previous,
      [email]: normalizedValue,
    }));
    setExpertWeights((previous) => {
      const nextWeights = {
        ...(previous || {}),
        [email]: toExpertWeightStateValue(normalizedValue),
      };

      if (
        areExpertWeightsEqual({
          expertEmails: addedExperts,
          expertWeights: nextWeights,
        })
      ) {
        setExpertWeightsCustomized(false);
        return buildExactEqualWeights();
      }

      setExpertWeightsCustomized(true);
      return nextWeights;
    });
  };

  const handleWeightFocus = (email) => {
    editingExpertEmailRef.current = email;
  };

  const handleWeightBlur = (email, value) => {
    const normalizedValue = normalizeExpertWeightInput(value);
    const committedValue =
      normalizedValue === null ? expertWeightInputs[email] ?? "" : commitExpertWeightInputValue(normalizedValue);

    editingExpertEmailRef.current = null;
    setExpertWeightInputs((previous) => ({
      ...previous,
      [email]: committedValue,
    }));

    setExpertWeights((previous) => {
      const nextWeights = {
        ...(previous || {}),
        [email]:
          normalizedValue === null
            ? previous[email]
            : toExpertWeightStateValue(committedValue),
      };

      if (
        areExpertWeightsEqual({
          expertEmails: addedExperts,
          expertWeights: nextWeights,
        })
      ) {
        setExpertWeightsCustomized(false);
        return buildExactEqualWeights();
      }

      setExpertWeightsCustomized(true);
      return nextWeights;
    });
  };

  const handleResetEqualWeights = () => {
    const equalWeights = buildExactEqualWeights();

    editingExpertEmailRef.current = null;
    setExpertWeightsCustomized(false);
    setExpertWeightInputs(buildExpertWeightInputValues(addedExperts, equalWeights, null, {}));
    setExpertWeights(equalWeights);
  };

  useEffect(() => {
    if (!usesExpertWeights) {
      if (Object.keys(expertWeightInputs).length > 0) {
        setExpertWeightInputs({});
      }
      editingExpertEmailRef.current = null;
      return;
    }

    const nextInputs = buildExpertWeightInputValues(
      addedExperts,
      expertWeights,
      editingExpertEmailRef.current,
      expertWeightInputs
    );

    if (haveExpertWeightInputsChanged(expertWeightInputs, nextInputs)) {
      setExpertWeightInputs(nextInputs);
    }
  }, [addedExperts, expertWeightInputs, expertWeights, usesExpertWeights]);

  const selectedCount = Array.isArray(addedExperts) ? addedExperts.length : 0;
  const equalWeightsActive = useMemo(
    () =>
      usesExpertWeights &&
      selectedCount > 0 &&
      areExpertWeightsEqual({
        expertEmails: addedExperts,
        expertWeights,
      }),
    [addedExperts, expertWeights, selectedCount, usesExpertWeights]
  );
  const expertWeightsMode = equalWeightsActive ? "equal" : "custom";
  const selectedExpertWeightsSum = useMemo(() => {
    if (!usesExpertWeights || selectedCount === 0) {
      return null;
    }

    let total = 0;

    for (const email of addedExperts) {
      const weight = Number(expertWeights[email]);

      if (!Number.isFinite(weight)) {
        return null;
      }

      total += weight;
    }

    return total;
  }, [addedExperts, expertWeights, selectedCount, usesExpertWeights]);

  const headCellSx = getCreateIssueExpertsHeadCellSx(theme);
  const bodyCellSx = getCreateIssueExpertsBodyCellSx(theme);

  return (
    <Stack spacing={1.6} sx={createIssueStepContainerSx}>
      <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={getCreateIssueExpertsHeaderAvatarSx(theme)}>
            <PeopleAltIcon />
          </Avatar>

          <Stack spacing={0.15} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
              Add experts
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
              {filteredExperts.length} available • {selectedCount} selected
            </Typography>
          </Stack>
        </Stack>

        {selectedCount > 0 ? (
          <Box sx={getCreateIssueExpertsCountBadgeSx(theme)}>{selectedCount}</Box>
        ) : null}
      </Stack>

      <Stack spacing={1.4}>
        <TextField
          label="Search by name, email or university"
          variant="outlined"
          color="info"
          size="small"
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
          autoComplete="off"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" style={{ opacity: 0.75 }} />
              </InputAdornment>
            ),
          }}
          sx={getCreateIssueExpertsSearchInputSx(theme)}
        />

        {!isMdUp ? (
          <Stack direction="row" justifyContent="flex-end">
            <Button
              color="info"
              variant="outlined"
              onClick={() => setMobilePanelOpen(true)}
              sx={getSelectedExpertsActionBtnSx(theme)}
            >
              Selected experts ({selectedCount})
            </Button>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1.4} alignItems="stretch" sx={{ minHeight: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <TableContainer sx={getCreateIssueExpertsTableContainerSx(theme)}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Name</TableCell>
                    <TableCell sx={headCellSx}>Email</TableCell>
                    <TableCell sx={headCellSx}>University</TableCell>
                    <TableCell sx={{ ...headCellSx, width: 72, textAlign: "center" }}>
                      Add
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredExperts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ ...bodyCellSx, py: 3 }}>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                          No experts match this search.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExperts.map((expert) => (
                      <TableRow key={expert.email} hover sx={getCreateIssueExpertsHoverRowSx(theme)}>
                        <TableCell sx={bodyCellSx}>{expert.name}</TableCell>
                        <TableCell sx={bodyCellSx}>{expert.email}</TableCell>
                        <TableCell sx={bodyCellSx}>{expert.university}</TableCell>
                        <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                          <Tooltip title="Add expert" arrow placement="top">
                            <IconButton onClick={() => handleAddExpert(expert.email)} size="small">
                              <AddCircleOutlineIcon color="success" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {isMdUp ? (
            <Box
              sx={{
                width: desktopPanelExpanded ? 380 : 56,
                minWidth: desktopPanelExpanded ? 380 : 56,
                minHeight: 0,
                display: "flex",
                alignSelf: "stretch",
                transition: "width 220ms ease, min-width 220ms ease",
              }}
            >
              <Collapse
                in={desktopPanelExpanded}
                orientation="horizontal"
                timeout={220}
                collapsedSize={0}
                sx={{ height: "100%", display: "flex" }}
              >
                <Box
                  sx={{
                    width: 380,
                    height: "100%",
                    transform: desktopPanelExpanded ? "translateX(0)" : "translateX(14px)",
                    opacity: desktopPanelExpanded ? 1 : 0,
                    transition: "transform 220ms ease, opacity 180ms ease",
                  }}
                >
                  <SelectedExpertsPanelContent
                    addedExperts={addedExperts}
                    expertWeightValidation={expertWeightValidation}
                    expertWeightsMode={expertWeightsMode}
                    handleDeleteExpert={handleDeleteExpert}
                    handleResetEqualWeights={handleResetEqualWeights}
                    handleWeightChange={handleWeightChange}
                    handleWeightFocus={handleWeightFocus}
                    handleWeightBlur={handleWeightBlur}
                    expertWeightInputs={expertWeightInputs}
                    selectedCount={selectedCount}
                    selectedExpertWeightsSum={selectedExpertWeightsSum}
                    usesExpertWeights={usesExpertWeights}
                    theme={theme}
                    onCollapse={() => setDesktopPanelExpanded(false)}
                    collapseTooltip="Collapse panel"
                  />
                </Box>
              </Collapse>

              {!desktopPanelExpanded ? (
                <Box sx={getSelectedExpertsRailSx(theme)}>
                  <Button
                    color="info"
                    onClick={() => setDesktopPanelExpanded(true)}
                    sx={{
                      width: "100%",
                      minWidth: 0,
                      borderRadius: 0,
                      px: 0.6,
                      py: 1.1,
                      color: "text.primary",
                      fontWeight: 900,
                      textTransform: "none",
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      gap: 0.8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 220ms ease, background 180ms ease",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                      },
                    }}
                  >
                    <ChevronLeftRoundedIcon fontSize="small" />
                    Selected experts ({selectedCount})
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Stack>
      </Stack>

      {closeAddExpertsDialog ? (
        <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.25} justifyContent="flex-end">
          <Button
            onClick={closeAddExpertsDialog.closeAddExpertsDialog}
            color="info"
            variant="outlined"
            startIcon={<CancelOutlinedIcon />}
          >
            Cancel
          </Button>

          <Button
            onClick={closeAddExpertsDialog.closeAddExpertsDialog}
            variant="outlined"
            color="success"
            startIcon={<PersonAddAltOutlinedIcon />}
          >
            Add selected
          </Button>
        </Stack>
      ) : null}

      {!isMdUp ? (
        <Drawer
          anchor="bottom"
          open={mobilePanelOpen}
          onClose={() => setMobilePanelOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              borderBottom: "none",
              bgcolor: "#101822",
              background: `linear-gradient(180deg, ${alpha(theme.palette.info.main, 0.13)} 0%, rgba(16, 24, 34, 0.97) 30%)`,
              px: 1,
              pt: 1,
              pb: 1.4,
              maxHeight: "78vh",
            },
          }}
        >
          <SelectedExpertsPanelContent
            addedExperts={addedExperts}
            expertWeightValidation={expertWeightValidation}
            expertWeightsMode={expertWeightsMode}
            handleDeleteExpert={handleDeleteExpert}
            handleResetEqualWeights={handleResetEqualWeights}
            handleWeightChange={handleWeightChange}
            handleWeightFocus={handleWeightFocus}
            handleWeightBlur={handleWeightBlur}
            expertWeightInputs={expertWeightInputs}
            selectedCount={selectedCount}
            selectedExpertWeightsSum={selectedExpertWeightsSum}
            usesExpertWeights={usesExpertWeights}
            theme={theme}
            onClose={() => setMobilePanelOpen(false)}
          />
        </Drawer>
      ) : null}
    </Stack>
  );
};
