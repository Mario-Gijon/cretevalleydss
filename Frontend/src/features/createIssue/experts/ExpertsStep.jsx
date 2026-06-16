import { useMemo, useState } from "react";
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
  Alert,
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import { useTheme } from "@mui/material/styles";

import { removeAccents } from "../../../utils/text.utils";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  buildEqualExpertWeights,
  calculateExpertWeightSum,
  formatExpertWeightDisplay,
  normalizeExpertWeightValue,
} from "../logic/createIssueExpertWeights";
import {
  createIssueStepContainerSx,
  getCreateIssueExpertsBodyCellSx,
  getCreateIssueExpertsCountBadgeSx,
  getCreateIssueExpertsHeadCellSx,
  getCreateIssueExpertsHeaderAvatarSx,
  getCreateIssueExpertsHoverRowSx,
  getCreateIssueExpertsSelectedListSx,
  getCreateIssueExpertsSelectedRowSx,
  getCreateIssueExpertsSearchInputSx,
  getCreateIssueExpertsTableContainerSx,
} from "../styles/createIssueStep.styles";

export const ExpertsStep = ({
  initialExperts: initialExpertsProp,
  closeAddExpertsDialog = false,
}) => {
  const theme = useTheme();
  const { initialExperts: contextExperts } = useIssuesDataContext();
  const {
    addedExperts,
    setAddedExperts,
    selectedModel,
    paramValues,
    setParamValues,
    selectedExperts,
    expertWeightsValidationMessage,
  } = useCreateIssueContext();
  const [searchFilter, setSearchFilter] = useState("");

  const sourceExperts = Array.isArray(initialExpertsProp)
    ? initialExpertsProp
    : contextExperts || [];

  const experts = sourceExperts.filter(
    (expert) => !addedExperts.includes(expert.email)
  );
  const usesExpertWeights = selectedModel?.usesExpertWeights === true;
  const selectedExpertIds = selectedExperts
    .map((expert) => String(expert?.id || "").trim())
    .filter(Boolean);
  const selectedExpertWeights = paramValues?.expertWeights || {};
  const shouldShowWeightColumn = usesExpertWeights && selectedExperts.length > 1;
  const expertWeightSum = calculateExpertWeightSum(
    selectedExpertWeights,
    selectedExpertIds
  );

  const filteredExperts = useMemo(() => {
    const query = removeAccents(searchFilter.toLowerCase().trim());
    if (!query) return experts;

    return experts.filter((expert) => {
      const name = removeAccents((expert.name || "").toLowerCase());
      const email = removeAccents((expert.email || "").toLowerCase());
      const university = removeAccents((expert.university || "").toLowerCase());
      return (
        name.includes(query) ||
        email.includes(query) ||
        university.includes(query)
      );
    });
  }, [experts, searchFilter]);

  const handleAddExpert = (email) => {
    setAddedExperts((previous) => [...new Set([...(previous || []), email])]);
  };

  const handleDeleteExpert = (email) => {
    setAddedExperts((previous) => previous.filter((value) => value !== email));
  };
  const handleEqualWeights = () => {
    setParamValues((previous) => ({
      ...(previous || {}),
      expertWeights: buildEqualExpertWeights(selectedExpertIds),
    }));
  };
  const handleExpertWeightChange = (expertId, nextValue) => {
    setParamValues((previous) => ({
      ...(previous || {}),
      expertWeights: {
        ...((previous && previous.expertWeights) || {}),
        [expertId]: normalizeExpertWeightValue(nextValue),
      },
    }));
  };

  const selectedCount = Array.isArray(addedExperts) ? addedExperts.length : 0;

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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1fr) 300px",
            lg: "minmax(0, 1fr) 330px",
          },
          gridTemplateAreas: {
            xs: `"selected" "available"`,
            md: `"available selected"`,
          },
          gap: 1.5,
          alignItems: "start",
        }}
      >
        <Stack spacing={1.2} sx={{ gridArea: "available", minWidth: 0 }}>
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
                      <TableCell sx={{ ...bodyCellSx, maxWidth: 220 }}>
                        <Typography
                          variant="body2"
                          sx={{ color: "inherit", fontWeight: "inherit" }}
                          noWrap
                          title={expert.university}
                        >
                          {expert.university}
                        </Typography>
                      </TableCell>
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
        </Stack>

        <Stack
          spacing={1}
          sx={{
            gridArea: "selected",
            minWidth: 0,
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.08)",
            bgcolor: "rgba(255,255,255,0.02)",
            px: 1.25,
            py: 1.15,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.15}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                Selected experts
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
                {selectedCount} selected
              </Typography>
            </Stack>

            {shouldShowWeightColumn ? (
              <Button size="small" variant="outlined" color="info" onClick={handleEqualWeights}>
                Equal weights
              </Button>
            ) : null}
          </Stack>

          {selectedCount === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              No experts selected yet.
            </Typography>
          ) : (
            <Box sx={getCreateIssueExpertsSelectedListSx(theme)}>
              <Stack spacing={0.75}>
                {selectedExperts.map((expert) => {
                  const expertId = String(expert?.id || "").trim();

                  return (
                    <Stack
                      key={expert?.email || expertId}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={getCreateIssueExpertsSelectedRowSx(theme)}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 900, color: "text.primary" }}
                          noWrap
                        >
                          {expert?.name || "Unknown"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontWeight: 700 }}
                          noWrap
                        >
                          {expert?.email || "—"}
                        </Typography>
                      </Box>

                      {shouldShowWeightColumn ? (
                        <TextField
                          size="small"
                          type="number"
                          value={formatExpertWeightDisplay(selectedExpertWeights?.[expertId])}
                          onChange={(event) =>
                            handleExpertWeightChange(expertId, event.target.value)
                          }
                          inputProps={{
                            min: 0,
                            max: 1,
                            step: 0.001,
                          }}
                          sx={{
                            width: 112,
                            flexShrink: 0,
                            "& .MuiOutlinedInput-root": {
                              bgcolor: "rgba(255,255,255,0.03)",
                            },
                          }}
                        />
                      ) : null}

                      <Tooltip title="Remove expert" arrow placement="top">
                        <IconButton
                          onClick={() => handleDeleteExpert(expert.email)}
                          size="small"
                          sx={{ flexShrink: 0 }}
                        >
                          <CancelOutlinedIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}

          {usesExpertWeights && selectedExperts.length === 1 ? (
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
              Single expert uses an implicit weight of {formatExpertWeightDisplay(1)}.
            </Typography>
          ) : null}

          {shouldShowWeightColumn ? (
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
              Sum: {formatExpertWeightDisplay(expertWeightSum) || "0.000"}
            </Typography>
          ) : null}

          {usesExpertWeights && expertWeightsValidationMessage ? (
            <Alert severity="warning">{expertWeightsValidationMessage}</Alert>
          ) : null}
        </Stack>
      </Box>

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
    </Stack>
  );
};
