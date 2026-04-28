import { useMemo, useState } from "react";
import { Box, Paper, Stack, Tab, Tabs } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import { sectionPanelSx } from "../adminIssues/adminIssues.utils";
import ModelDetailDialog from "./components/ModelDetailDialog";
import useAdminModelCatalog from "./hooks/useAdminModelCatalog";
import useModelManifestActions from "./hooks/useModelManifestActions";
import CatalogTab from "./tabs/CatalogTab";
import ManifestSyncTab from "./tabs/ManifestSyncTab";
import ReviewTab from "./tabs/ReviewTab";
import { TABS } from "./utils/modelManifest.constants";
import {
  enrichCatalogRowsWithDryRun,
  normalizeRowsFromCatalog,
  normalizeRowsFromDryRun,
  sortModelRowsByName,
} from "./utils/modelManifest.normalizers";

export default function ModelManifestSyncPanel() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(TABS.CATALOG);
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
    onAfterSync: () => setActiveTab(TABS.SYNC),
  });

  const dryRunRows = useMemo(() => normalizeRowsFromDryRun(dryRunReport), [dryRunReport]);

  const catalogRows = useMemo(() => normalizeRowsFromCatalog(catalogModels), [catalogModels]);

  const modelRows = useMemo(() => {
    const rows = enrichCatalogRowsWithDryRun(catalogRows, dryRunRows);
    return sortModelRowsByName(rows);
  }, [catalogRows, dryRunRows]);

  const handleConfirmSync = async () => {
    const success = await syncManifest();
    if (success) setIsConfirmDialogOpen(false);
  };

  return (
    <>
      <Stack spacing={1.25}>
        <Paper elevation={0} sx={{ ...sectionPanelSx(theme), px: 1, py: 0.45 }}>
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

        {activeTab === TABS.CATALOG && (
          <CatalogTab
            rows={modelRows}
            report={dryRunReport}
            loadingCatalog={loadingCatalog}
            catalogError={catalogError}
            onViewDetails={setSelectedModel}
            onAskVisibilityChange={updateVisibility}
            visibilityBusyId={visibilityBusyId}
          />
        )}

        {activeTab === TABS.SYNC && (
          <ManifestSyncTab
            report={dryRunReport}
            syncResult={syncResult}
            loadingDryRun={loadingDryRun}
            loadingSync={loadingSync}
            onRunDryRun={runDryRun}
            onAskSync={() => setIsConfirmDialogOpen(true)}
            errorMessage={errorMessage}
          />
        )}

        {activeTab === TABS.REVIEW && <ReviewTab report={dryRunReport} />}
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