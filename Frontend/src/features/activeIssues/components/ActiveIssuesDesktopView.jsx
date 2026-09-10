import { Box, Divider, Paper, Stack } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ActiveIssuesToolbar from "./ActiveIssuesToolbar";
import { getActiveIssuesPageHeaderAuroraBg, getActiveIssuesPageHeaderGlassSx } from "../styles/activeIssues.styles";
import TaskCenter from "./TaskCenter";
import ActiveIssuesGrid from "./ActiveIssuesGrid";
import ActiveIssuesPagination from "./ActiveIssuesPagination";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import EmptyState from "../../../components/StyledComponents/EmptyState";
/**
 * Layout de escritorio para la pantalla de issues activos.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssuesDesktopView = ({
  filteredIssues,
  noMatchingIssues,
  overview,
  refreshing,
  handleRefresh,
  query,
  setQuery,
  searchBy,
  setSearchBy,
  sortBy,
  setSortBy,
  taskCenter,
  tasksCount,
  taskType,
  setTaskType,
  openDetails,
  openDetailsById,
  page,
  pageCount,
  setPage,
}) => {
  const theme = useTheme();

  return (
    <Stack>
      <Paper
        elevation={0}
        sx={{
          ...getActiveIssuesPageHeaderGlassSx(theme, 0.16),
          ...getActiveIssuesPageHeaderAuroraBg(theme),
          borderRadius: 3,
          p: { xs: 1.6, md: 2.0 },
          height: 235,
          overflow: "hidden",
          position: "relative",
          mb: 1,
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "minmax(560px, 1.6fr) auto minmax(360px, 1fr)",
            gap: 3,
            alignItems: "stretch",
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, height: "100%" }}>
            <ActiveIssuesToolbar
              isLgUp
              overview={overview}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              query={query}
              setQuery={setQuery}
              searchBy={searchBy}
              setSearchBy={setSearchBy}
              sortBy={sortBy}
              setSortBy={setSortBy}
              height="100%"
              paperSx={{
                p: 0,
                height: "100%",
                bgcolor: "transparent",
                backgroundImage: "none",
                boxShadow: "none",
                border: "none",
                backdropFilter: "none",
                overflow: "visible",
                "&:after": { display: "none" },
              }}
            />
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: alpha(theme.palette.common.white, 0.12),
              alignSelf: "stretch",
            }}
          />

          <Box sx={{ minWidth: 0, height: "100%" }}>
            <TaskCenter
              variant="rail"
              height="100%"
              minHeight="100%"
              tasksCount={tasksCount}
              taskCenter={taskCenter}
              taskType={taskType}
              setTaskType={setTaskType}
              onOpenIssueId={openDetailsById}
            />
          </Box>
        </Box>
      </Paper>

      {noMatchingIssues ? (
        <EmptyState
          icon={<SearchOffOutlinedIcon fontSize="large" />}
          title="No matching issues"
          description="Try adjusting your search or filters."
          sx={{ py: { xs: 4, sm: 5 } }}
        />
      ) : (
        <>
          <ActiveIssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 0 }} />
          <ActiveIssuesPagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
          />
        </>
      )}
    </Stack>
  );
};

export default ActiveIssuesDesktopView;
