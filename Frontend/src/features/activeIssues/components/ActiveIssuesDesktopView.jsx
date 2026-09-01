import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ActiveIssuesToolbar from "./ActiveIssuesToolbar";
import { getActiveIssuesPageHeaderAuroraBg, getActiveIssuesPageHeaderGlassSx } from "../styles/activeIssues.styles";
import TaskCenter from "./TaskCenter";
import ActiveIssuesGrid from "./ActiveIssuesGrid";
/**
 * Layout de escritorio para la pantalla de issues activos.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssuesDesktopView = ({
  filteredIssues,
  activeIssues = [],
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
          height: "auto",
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
            {[
              { title: "Waiting on others", items: activeIssues.filter((issue) => ["waitingExperts", "pendingInvitations"].includes(issue?.ui?.statusKey)), detail: (issue) => issue.ui.statusLabel || "Waiting for experts" },
              { title: "Upcoming deadlines", items: activeIssues.filter((issue) => issue?.ui?.deadline?.hasDeadline).sort((a, b) => (a.ui.deadline.daysLeft ?? Infinity) - (b.ui.deadline.daysLeft ?? Infinity)).slice(0, 3), detail: (issue) => issue.ui.deadline.iso || "Deadline" },
            ].map((section) => section.items.length ? <Box component="section" key={section.title} sx={{ mt: 2 }}><Typography variant="subtitle1">{section.title}</Typography>{section.items.map((issue) => <Box key={issue.id} onClick={() => openDetails(issue)} sx={{ py: 1, borderTop: "1px solid rgba(255,255,255,0.1)" }}><Typography variant="body2">{issue.name}</Typography><Typography variant="caption" color="text.secondary">{section.detail(issue)}</Typography></Box>)}</Box> : null)}
          </Box>

          <Box sx={{ minWidth: 0, height: "100%" }}>
            <TaskCenter
              variant="panel"
              height="auto"
              minHeight={132}
              tasksCount={tasksCount}
              taskCenter={taskCenter}
              taskType={taskType}
              setTaskType={setTaskType}
              onOpenIssueId={openDetailsById}
            />
          </Box>
        </Box>
      </Paper>

      <ActiveIssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 0 }} />
    </Stack>
  );
};

export default ActiveIssuesDesktopView;
