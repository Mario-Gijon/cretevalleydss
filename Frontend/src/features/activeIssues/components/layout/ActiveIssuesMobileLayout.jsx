import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ActiveIssuesHeader from "../panels/ActiveIssuesHeader"
import ActiveIssuesPill from "../shared/ActiveIssuesPill";
import { getActiveIssuesTasksAccordionGlassSx } from "../../styles/activeIssues.styles";
import TaskCenter from "../panels/TaskCenter/TaskCenter";
import IssuesGrid from "../panels/IssueGrid/IssuesGrid";

/**
 * Layout responsive para tablet y móvil en la pantalla
 * de issues activos.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssuesMobileLayout = ({
  isMobile,
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
    <>
      <ActiveIssuesHeader
        isLgUp={false}
        overview={overview}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        query={query}
        setQuery={setQuery}
        searchBy={searchBy}
        setSearchBy={setSearchBy}
        sortBy={sortBy}
        setSortBy={setSortBy}
        height="auto"
        filtersMeta={filtersMeta}
      />

      {!isMobile ? (
        <Box sx={{ mt: 2 }}>
          <TaskCenter
            variant="rail"
            taskGroups={!taskCenter ? taskGroupsLegacy : null}
            tasksCount={tasksCount}
            taskCenter={taskCenter}
            taskType={taskType}
            setTaskType={setTaskType}
            onOpenIssue={openDetails}
            onOpenIssueId={openDetailsById}
            height="auto"
            minHeight={132}
          />
        </Box>
      ) : (
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            ...getActiveIssuesTasksAccordionGlassSx(theme, 0.16),
            mt: 2,
            borderRadius: 5,
            overflow: "hidden",
            position: "relative",
            "&:before": { display: "none" },
            "&:after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 40%)`,
              opacity: 0.18,
            },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
                Tasks
              </Typography>
              <ActiveIssuesPill tone={tasksCount ? "warning" : "success"}>
                {tasksCount}
              </ActiveIssuesPill>
            </Stack>
          </AccordionSummary>

          <AccordionDetails>
            <TaskCenter
              variant="panel"
              taskCenter={taskCenter}
              taskGroups={!taskCenter ? taskGroupsLegacy : null}
              tasksCount={tasksCount}
              taskType={taskType}
              setTaskType={setTaskType}
              onOpenIssue={openDetails}
              onOpenIssueId={openDetailsById}
              height="auto"
              minHeight={260}
            />
          </AccordionDetails>
        </Accordion>
      )}

      <IssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 2 }} />
    </>
  );
};

export default ActiveIssuesMobileLayout;