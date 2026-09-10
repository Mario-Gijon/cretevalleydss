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
import ActiveIssuesToolbar from "./ActiveIssuesToolbar";
import ActiveIssuesPill from "./ActiveIssuesPill";
import { getActiveIssuesTasksAccordionGlassSx } from "../styles/activeIssues.styles";
import TaskCenter from "./TaskCenter";
import ActiveIssuesGrid from "./ActiveIssuesGrid";
import ActiveIssuesPagination from "./ActiveIssuesPagination";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import EmptyState from "../../../components/StyledComponents/EmptyState";

/**
 * Layout responsive para tablet y móvil en la pantalla
 * de issues activos.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ActiveIssuesMobileView = ({
  isMobile,
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
    <>
      <ActiveIssuesToolbar
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
      />

      {!isMobile ? (
        <Box sx={{ mt: 2 }}>
          <TaskCenter
            variant="rail"
            tasksCount={tasksCount}
            taskCenter={taskCenter}
            taskType={taskType}
            setTaskType={setTaskType}
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
              tasksCount={tasksCount}
              taskType={taskType}
              setTaskType={setTaskType}
              onOpenIssueId={openDetailsById}
              height="auto"
              minHeight={260}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {noMatchingIssues ? (
        <EmptyState
          icon={<SearchOffOutlinedIcon fontSize="large" />}
          title="No matching issues"
          description="Try adjusting your search or filters."
          sx={{ py: { xs: 4, sm: 5 }, mt: 2 }}
        />
      ) : (
        <>
          <ActiveIssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 2 }} />
          <ActiveIssuesPagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
};

export default ActiveIssuesMobileView;
