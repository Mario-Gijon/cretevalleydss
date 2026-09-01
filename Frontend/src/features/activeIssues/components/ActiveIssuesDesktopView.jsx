import { Box } from "@mui/material";

import ActiveIssuesToolbar from "./ActiveIssuesToolbar";
import TaskCenter from "./TaskCenter";
import ActiveIssuesGrid from "./ActiveIssuesGrid";

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
  modelFilter,
  modelOptions,
  setModelFilter,
  sortBy,
  setSortBy,
  taskCenter,
  tasksCount,
  taskType,
  setTaskType,
  openDetails,
  openDetailsById,
}) => {
  const waitingIssues = activeIssues.filter((issue) =>
    ["waitingExperts", "pendingInvitations"].includes(issue?.ui?.statusKey)
  );
  const deadlineIssues = activeIssues
    .filter((issue) => issue?.ui?.deadline?.hasDeadline)
    .sort(
      (a, b) =>
        (a.ui.deadline.daysLeft ?? Number.POSITIVE_INFINITY) -
        (b.ui.deadline.daysLeft ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, 3);

  return (
    <Box
      className="active-issues-desktop-layout"
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          lg: "minmax(0, 3fr) minmax(280px, 1fr)",
        },
        gap: 2,
        alignItems: "start",
      }}
    >
      <Box component="main" className="active-issues-main-column" sx={{ minWidth: 0 }}>
        <ActiveIssuesToolbar
          isLgUp
          overview={overview}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          query={query}
          setQuery={setQuery}
          searchBy={searchBy}
          setSearchBy={setSearchBy}
          modelFilter={modelFilter}
          modelOptions={modelOptions}
          setModelFilter={setModelFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          height="auto"
          paperSx={{ height: "auto" }}
        />
        <ActiveIssuesGrid
          issues={filteredIssues}
          onOpenIssue={openDetails}
          sx={{ mt: 1.5 }}
        />
      </Box>

      <Box
        component="aside"
        className="active-issues-sidebar"
        sx={{ minWidth: 0, pt: { lg: 0 }, pl: { lg: 2 }, borderLeft: { lg: "1px solid rgba(76,201,211,0.14)" } }}
      >
        <TaskCenter
          variant="panel"
          height="auto"
          minHeight={132}
          tasksCount={tasksCount}
          taskCenter={taskCenter}
          taskType={taskType}
          setTaskType={setTaskType}
          onOpenIssueId={openDetailsById}
          supplementalSections={[
            {
              key: "waiting-on-others",
              title: "Waiting on others",
              items: waitingIssues,
              detail: (issue) => issue.ui.statusLabel || "Waiting for experts",
            },
            {
              key: "upcoming-deadlines",
              title: "Upcoming deadlines",
              items: deadlineIssues,
              detail: (issue) => issue.ui.deadline.iso || "Deadline",
            },
          ]}
        />
      </Box>
    </Box>
  );
};

export default ActiveIssuesDesktopView;
