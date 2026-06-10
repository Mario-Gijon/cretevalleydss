import { Box, Backdrop, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { FinishedIssueDialog } from "../../finishedIssueDialog/components/FinishedIssueDialog";
import FinishedIssuesHeader from "./FinishedIssuesHeader";
import FinishedIssuesCards from "./FinishedIssuesCards";
import FinishedIssueRemoveDialog from "./FinishedIssueRemoveDialog";
import FinishedIssuesEmptyState from "./FinishedIssuesEmptyState";
import { useFinishedIssuesView } from "../hooks/useFinishedIssuesView";

/**
 * Pantalla del feature de issues finalizados.
 *
 * Orquesta hooks y subcomponentes de presentación,
 * manteniendo la funcionalidad existente sin cambios.
 *
 * @returns {JSX.Element}
 */
const FinishedIssuesView = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:900px)");
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const {
    loading,
    finishedIssues,
    selectedIssue,
    openFinishedIssueDialog,
    openRemoveConfirmDialog,
    removeLoading,
    refreshing,
    query,
    searchBy,
    sortBy,
    filteredIssues,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setOpenRemoveConfirmDialog,
    openDetails,
    closeDetails,
    handleRefresh,
    handleRemove,
  } = useFinishedIssuesView();

  if (loading) {
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  if (!finishedIssues || finishedIssues.length === 0) {
    return <FinishedIssuesEmptyState />;
  }

  return (
    <>
      <Backdrop open={removeLoading} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={50} height="50vh" />
      </Backdrop>

      <Box p={{xs: 1, sm:0}}>
        {isLgUp ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(560px, 1fr)",
              gridTemplateRows: "auto auto",
              gridTemplateAreas: `
                "header"
                "issues"
              `,
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box sx={{ gridArea: "header", minWidth: 0 }}>
              <FinishedIssuesHeader
                overview={overview}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                query={query}
                setQuery={setQuery}
                searchBy={searchBy}
                setSearchBy={setSearchBy}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </Box>

            <Box sx={{ gridArea: "issues", minWidth: 0, width: "100%" }}>
              <FinishedIssuesCards
                issues={filteredIssues}
                isLgUp={isLgUp}
                isMobile={isMobile}
                onOpenDetails={openDetails}
              />
            </Box>
          </Box>
        ) : (
          <>
            <FinishedIssuesHeader
              overview={overview}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              query={query}
              setQuery={setQuery}
              searchBy={searchBy}
              setSearchBy={setSearchBy}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            <Box sx={{ mt: 2 }}>
              <FinishedIssuesCards
                issues={filteredIssues}
                isLgUp={isLgUp}
                isMobile={isMobile}
                onOpenDetails={openDetails}
              />
            </Box>
          </>
        )}
      </Box>

      {selectedIssue ? (
        <FinishedIssueDialog
          selectedIssue={selectedIssue}
          openFinishedIssueDialog={openFinishedIssueDialog}
          handleCloseFinishedIssueDialog={closeDetails}
          handleRemoveFinishedIssue={() => setOpenRemoveConfirmDialog(true)}
          setOpenRemoveConfirmDialog={setOpenRemoveConfirmDialog}
        />
      ) : null}

      <FinishedIssueRemoveDialog
        open={openRemoveConfirmDialog}
        removeLoading={removeLoading}
        onClose={() => setOpenRemoveConfirmDialog(false)}
        onConfirm={handleRemove}
      />
    </>
  );
};

export default FinishedIssuesView;
