import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

import { getAdminIssuesSectionPanelSx } from "../styles/adminIssues.styles";

export default function AdminIssuesToolbar({
  search,
  activeFilter,
  consensusFilter,
  stageFilter,
  stageOptions,
  refreshing,
  onSearchChange,
  onActiveFilterChange,
  onConsensusFilterChange,
  onStageFilterChange,
  onRefresh,
}) {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={{ ...getAdminIssuesSectionPanelSx(theme), p: 1 }}>
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={1.2}
          alignItems={{ xs: "stretch", xl: "center" }}
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              size="small"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by name, description, model or admin..."
              autoComplete="off"
              color="info"
              sx={{
                minWidth: { xs: "100%", md: 380 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ opacity: 0.72 }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={activeFilter}
                color="info"
                onChange={(event) => onActiveFilterChange(event.target.value)}
                sx={{
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                }}
              >
                <MenuItem value="all">All issues</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="finished">Finished</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 155 }}>
              <Select
                value={consensusFilter}
                color="info"
                onChange={(event) => onConsensusFilterChange(event.target.value)}
                sx={{
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                }}
              >
                <MenuItem value="all">All consensus</MenuItem>
                <MenuItem value="consensus">Consensus</MenuItem>
                <MenuItem value="noConsensus">No consensus</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={stageFilter}
                color="info"
                onChange={(event) => onStageFilterChange(event.target.value)}
                sx={{
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                }}
              >
                <MenuItem value="all">All stages</MenuItem>
                {stageOptions.map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Refresh issues">
              <span>
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<RefreshIcon />}
                  onClick={onRefresh}
                  disabled={refreshing}
                  sx={{ borderRadius: 999, fontWeight: 900 }}
                >
                  Refresh
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}
