import { useMemo, useState } from "react";
import { Box, Paper, Stack, Tab, Tabs } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { getAdminIssuesSectionPanelSx } from "../issues/styles/adminIssues.styles";
import ModelCatalogTab from "./components/ModelCatalogTab";
import ModelDetailDialog from "./components/ModelDetailDialog";
import ModelManifestReviewTab from "./components/ModelManifestReviewTab";
import ModelManifestSyncTab from "./components/ModelManifestSyncTab";
import useAdminModelCatalog from "./hooks/useAdminModelCatalog";
import useModelManifestActions from "./hooks/useModelManifestActions";
import {
  mergeModelCatalogRowsWithDryRun,
  normalizeModelCatalogRows,
  normalizeModelManifestDryRunRows,
  sortModelManifestRowsByName,
} from "./logic/buildModelManifestRows";

const MODEL_MANIFEST_TABS = {
  CATALOG: 0,
  SYNC: 1,
  REVIEW: 2,
};

export default function ModelManifestSyncPanel() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(MODEL_MANIFEST_TABS.CATALOG);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const { catalogModels, catalogError, loadingCatalog, loadCatalog } = useAdminModelCatalog();

  const {
    dryRunReport,
    syncResult,
    errorMessage,
    loadingDryRun,
    loadingSync,
    visibilityBusyId,
    runDryRun,
    syncManifest,
    updateVisibility,
  } = useModelManifestActions({
    onCatalogShouldRefresh: loadCatalog,
    onAfterSync: () => setActiveTab(MODEL_MANIFEST_TABS.SYNC),
  });

  const dryRunRows = useMemo(
    () => normalizeModelManifestDryRunRows(dryRunReport),
    [dryRunReport]
  );

  const catalogRows = useMemo(
    () => normalizeModelCatalogRows(catalogModels),
    [catalogModels]
  );

  const modelRows = useMemo(() => {
    const rows = mergeModelCatalogRowsWithDryRun(catalogRows, dryRunRows);
    return sortModelManifestRowsByName(rows);
  }, [catalogRows, dryRunRows]);

  const handleConfirmSync = async () => {
    const success = await syncManifest();
    if (success) setIsConfirmDialogOpen(false);
  };

  return (
    <>
      <Stack spacing={1.25}>
        <Paper
          elevation={0}
          sx={{ ...getAdminIssuesSectionPanelSx(theme), px: 1, py: 0.45 }}
        >
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Tabs
              value={activeTab}
              onChange={(_event, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              textColor="secondary"
              indicatorColor="secondary"
              sx={{
                minHeight: 42,
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: 999,
                },
                "& .MuiTab-root": {
                  minHeight: 42,
                  textTransform: "none",
                  fontWeight: 950,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    color: "secondary.main",
                  },
                },
              }}
            >
              <Tab icon={<SearchIcon fontSize="small" />} iconPosition="start" label="Catalog" />
              <Tab icon={<SyncIcon fontSize="small" />} iconPosition="start" label="Manifest Sync" />
              <Tab icon={<WarningAmberIcon fontSize="small" />} iconPosition="start" label="Review" />
            </Tabs>
          </Box>
        </Paper>

        {activeTab === MODEL_MANIFEST_TABS.CATALOG && (
          <ModelCatalogTab
            rows={modelRows}
            report={dryRunReport}
            loadingCatalog={loadingCatalog}
            catalogError={catalogError}
            onViewDetails={setSelectedModel}
            onAskVisibilityChange={updateVisibility}
            visibilityBusyId={visibilityBusyId}
          />
        )}

        {activeTab === MODEL_MANIFEST_TABS.SYNC && (
          <ModelManifestSyncTab
            report={dryRunReport}
            syncResult={syncResult}
            loadingDryRun={loadingDryRun}
            loadingSync={loadingSync}
            onRunDryRun={runDryRun}
            onAskSync={() => setIsConfirmDialogOpen(true)}
            errorMessage={errorMessage}
          />
        )}

        {activeTab === MODEL_MANIFEST_TABS.REVIEW && (
          <ModelManifestReviewTab report={dryRunReport} />
        )}
      </Stack>

      <ModelDetailDialog
        row={selectedModel}
        open={Boolean(selectedModel)}
        onClose={() => setSelectedModel(null)}
      />

      <ConfirmationDialog
        open={isConfirmDialogOpen}
        onClose={() => {
          if (!loadingSync) setIsConfirmDialogOpen(false);
        }}
        title="Synchronize model catalog?"
        subtitle="This action will synchronize technical model metadata from ApiModels into MongoDB. It will not delete models and it will preserve editorial fields such as name, small description, extended description and more info URL."
        tone="warning"
        actions={[
          {
            id: "cancel-sync",
            label: "Cancel",
            onClick: () => setIsConfirmDialogOpen(false),
            disabled: loadingSync,
          },
          {
            id: "confirm-sync",
            label: "Synchronize",
            color: "warning",
            variant: "contained",
            loading: loadingSync,
            onClick: handleConfirmSync,
            autoFocus: true,
          },
        ]}
      />
    </>
  );
}
