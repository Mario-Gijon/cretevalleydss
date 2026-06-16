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
  Chip,
  Button,
  Typography,
  Avatar,
  InputAdornment,
  Box,
  Tooltip,
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
  createIssueStepContainerSx,
  getCreateIssueExpertsBodyCellSx,
  getCreateIssueExpertsChipSx,
  getCreateIssueExpertsCountBadgeSx,
  getCreateIssueExpertsHeadCellSx,
  getCreateIssueExpertsHeaderAvatarSx,
  getCreateIssueExpertsHoverRowSx,
  getCreateIssueExpertsSearchInputSx,
  getCreateIssueExpertsTableContainerSx,
} from "../styles/createIssueStep.styles";

export const ExpertsStep = ({
  initialExperts: initialExpertsProp,
  closeAddExpertsDialog = false,
}) => {
  const theme = useTheme();
  const { initialExperts: contextExperts } = useIssuesDataContext();
  const { addedExperts, setAddedExperts } = useCreateIssueContext();
  const [searchFilter, setSearchFilter] = useState("");

  const sourceExperts = Array.isArray(initialExpertsProp)
    ? initialExpertsProp
    : contextExperts || [];

  const experts = sourceExperts.filter(
    (expert) => !addedExperts.includes(expert.email)
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

      {selectedCount > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {addedExperts.map((email) => (
            <Chip
              key={email}
              variant="outlined"
              label={email}
              onDelete={() => handleDeleteExpert(email)}
              sx={getCreateIssueExpertsChipSx(theme)}
            />
          ))}
        </Stack>
      ) : null}

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
