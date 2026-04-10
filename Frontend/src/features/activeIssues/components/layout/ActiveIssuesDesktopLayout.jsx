import { Box, Paper, Stack } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ActiveIssuesHeader from "../panels/ActiveIssuesHeader";
import TaskCenter from "../panels/TaskCenter"
import { getActiveIssuesPageHeaderAuroraBg, getActiveIssuesPageHeaderGlassSx } from "../../styles/activeIssues.styles";
import IssuesGrid from "../panels/IssuesGrid";
/**
 * Layout de escritorio para la pantalla de issues activos.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssuesDesktopLayout = ({
  filteredIssues,
  overview,
  refreshing,
  handleRefresh,
  query,
  setQuery,
  searchBy,
  setSearchBy,
  sortBy,
  setSortBy,
  filtersMeta,
  taskCenter,
  taskGroupsLegacy,
  tasksCount,
  taskType,
  setTaskType,
  openDetails,
  openDetailsById,
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
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(190deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 45%)`,
            opacity: 0.22,
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "minmax(560px, 1.6fr) minmax(360px, 1fr)",
            gap: 3,
            alignItems: "stretch",
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, height: "100%" }}>
            <ActiveIssuesHeader
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
              filtersMeta={filtersMeta}
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

          <Box sx={{ minWidth: 0, height: "100%" }}>
            <TaskCenter
              variant="rail"
              height="100%"
              minHeight="100%"
              taskGroups={!taskCenter ? taskGroupsLegacy : null}
              tasksCount={tasksCount}
              taskCenter={taskCenter}
              taskType={taskType}
              setTaskType={setTaskType}
              onOpenIssue={openDetails}
              onOpenIssueId={openDetailsById}
            />
          </Box>
        </Box>
      </Paper>

      <IssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 0 }} />
    </Stack>
  );
};

export default ActiveIssuesDesktopLayout;