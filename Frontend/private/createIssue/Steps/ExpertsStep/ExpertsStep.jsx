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
import { alpha, useTheme } from "@mui/material/styles";

import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";

import { removeAccents } from "../../../../src/utils/createIssueUtils";
import { useIssuesDataContext } from "../../../../src/context/issues/issues.context";

export const ExpertsStep = ({ addedExperts, setAddedExperts, closeAddExpertsDialog = false }) => {
  const theme = useTheme();
  const { initialExperts } = useIssuesDataContext();
  const [searchFilter, setSearchFilter] = useState("");

  const experts = initialExperts.filter((expert) => !addedExperts.includes(expert.email));

  const filteredExperts = useMemo(() => {
    const q = removeAccents(searchFilter.toLowerCase().trim());
    if (!q) return experts;

    return experts.filter((expert) => {
      const name = removeAccents((expert.name || "").toLowerCase());
      const email = removeAccents((expert.email || "").toLowerCase());
      const uni = removeAccents((expert.university || "").toLowerCase());
      return name.includes(q) || email.includes(q) || uni.includes(q);
    });
  }, [experts, searchFilter]);

  const handleAddExpert = (email) => setAddedExperts((prev) => [...prev, email]);
  const handleDeleteExpert = (email) => setAddedExperts((prev) => prev.filter((e) => e !== email));
  const selectedCount = Array.isArray(addedExperts) ? addedExperts.length : 0;

  const headCellSx = {
    fontWeight: 950,
    color: alpha(theme.palette.common.white, 0.82),
    borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
    bgcolor: alpha(theme.palette.common.white, 0.04),
    py: 1.05,
  };

  const bodyCellSx = {
    color: alpha(theme.palette.common.white, 0.90),
    fontWeight: 850,
    borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
    py: 1.05,
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: alpha(theme.palette.common.white, 0.04),
      borderRadius: 3,
    },
  };

  return (
    <Stack spacing={1.6} sx={{ width: "100%", maxWidth: 1250, mx: "auto", minHeight: 0 }}>
      {/* Header (sin caja) */}
      <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: alpha(theme.palette.info.main, 0.12),
              color: "info.main",
              border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            }}
          >
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
          <Box
            sx={{
              px: 1.1,
              py: 0.55,
              borderRadius: 999,
              bgcolor: alpha(theme.palette.info.main, 0.10),
              color: "info.main",
              fontSize: 12,
              fontWeight: 950,
              border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
            }}
          >
            {selectedCount}
          </Box>
        ) : null}
      </Stack>

      {/* Search */}
      <TextField
        label="Search by name, email or university"
        variant="outlined"
        color="info"
        size="small"
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        autoComplete="off"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" style={{ opacity: 0.75 }} />
            </InputAdornment>
          ),
        }}
        sx={inputSx}
      />

      {/* Chips */}
      {selectedCount > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {addedExperts.map((email) => (
            <Chip
              key={email}
              variant="outlined"
              label={email}
              onDelete={() => handleDeleteExpert(email)}
              sx={{
                borderColor: alpha(theme.palette.common.white, 0.18),
                color: alpha(theme.palette.common.white, 0.88),
                bgcolor: alpha(theme.palette.common.white, 0.03),
                "& .MuiChip-deleteIcon": { color: alpha(theme.palette.common.white, 0.55) },
                "& .MuiChip-deleteIcon:hover": { color: alpha(theme.palette.common.white, 0.85) },
              }}
            />
          ))}
        </Stack>
      ) : null}

      {/* Table (superficie principal) */}
      <TableContainer
        sx={{
          maxHeight: "52vh",
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
          bgcolor: alpha(theme.palette.common.white, 0.02),
          overflow: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
          "&::-webkit-scrollbar": { width: 8, height: 8 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(theme.palette.common.white, 0.16),
            borderRadius: 999,
            border: `2px solid transparent`,
            backgroundClip: "content-box",
          },
          "&::-webkit-scrollbar-thumb:hover": { backgroundColor: alpha(theme.palette.common.white, 0.24) },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Name</TableCell>
              <TableCell sx={headCellSx}>Email</TableCell>
              <TableCell sx={headCellSx}>University</TableCell>
              <TableCell sx={{ ...headCellSx, width: 72, textAlign: "center" }}>Add</TableCell>
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
                <TableRow
                  key={expert.email}
                  hover
                  sx={{ "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.08) } }}
                >
                  <TableCell sx={bodyCellSx}>{expert.name}</TableCell>
                  <TableCell sx={bodyCellSx}>{expert.email}</TableCell>
                  <TableCell sx={bodyCellSx}>{expert.university}</TableCell>
                  <TableCell sx={{ ...bodyCellSx, textAlign: "center" }}>
                    <Tooltip title="Add expert" arrow placement="top">
                      <IconButton onClick={() => handleAddExpert(expert.email)} size="small">
                        <AddCircleIcon color="success" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer actions si aplica */}
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
