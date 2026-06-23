import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Paper, Stack, Tab, Tabs } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";

import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
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

const TAB_KEY_TO_VALUE = {
  catalog: MODEL_MANIFEST_TABS.CATALOG,
  "manifest-sync": MODEL_MANIFEST_TABS.SYNC,
  review: MODEL_MANIFEST_TABS.REVIEW,
};

const TAB_VALUE_TO_KEY = {
  [MODEL_MANIFEST_TABS.CATALOG]: "catalog",
  [MODEL_MANIFEST_TABS.SYNC]: "manifest-sync",
  [MODEL_MANIFEST_TABS.REVIEW]: "review",
};

const PENDING_SUCCESS_MESSAGE_KEY = "system.pendingSuccessMessage";

export default function ModelManifestSyncPanel() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const [activeTab, setActiveTab] = useState(MODEL_MANIFEST_TABS.CATALOG);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingVisibilityRow, setPendingVisibilityRow] = useState(null);

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

  useEffect(() => {
    const tabKey = String(searchParams.get("tab") || "").trim();
    const resolvedTab =
      Object.prototype.hasOwnProperty.call(TAB_KEY_TO_VALUE, tabKey)
        ? TAB_KEY_TO_VALUE[tabKey]
        : null;

    if (resolvedTab !== null) {
      setActiveTab(resolvedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const currentTabKey = TAB_VALUE_TO_KEY[activeTab] || "catalog";
    const existingTabKey = String(searchParams.get("tab") || "").trim();

    if (existingTabKey === currentTabKey) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", currentTabKey);
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    const rawValue = window.sessionStorage.getItem(PENDING_SUCCESS_MESSAGE_KEY);
    if (!rawValue) return;

    window.sessionStorage.removeItem(PENDING_SUCCESS_MESSAGE_KEY);
    const message = rawValue.trim();
    if (message) {
      showSnackbarAlert(message, "success");
    }
  }, [showSnackbarAlert]);

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
            onAskVisibilityChange={setPendingVisibilityRow}
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

      <ConfirmationDialog
        open={Boolean(pendingVisibilityRow)}
        onClose={() => {
          if (!visibilityBusyId) setPendingVisibilityRow(null);
        }}
        title={
          pendingVisibilityRow?.visibleInIssueCreation !== false
            ? "Disable model?"
            : "Enable model?"
        }
        subtitle={
          pendingVisibilityRow?.implementationStatus === "scaffold" &&
          pendingVisibilityRow?.visibleInIssueCreation === false
            ? "This model is marked as scaffold. It may return MODEL_UNDER_DEVELOPMENT until implemented."
            : "This updates the admin-controlled publication flag for issue creation."
        }
        tone={
          pendingVisibilityRow?.implementationStatus === "scaffold" &&
          pendingVisibilityRow?.visibleInIssueCreation === false
            ? "warning"
            : "info"
        }
        actions={[
          {
            id: "cancel-visibility",
            label: "Cancel",
            onClick: () => setPendingVisibilityRow(null),
            disabled: Boolean(visibilityBusyId),
          },
          {
            id: "confirm-visibility",
            label:
              pendingVisibilityRow?.visibleInIssueCreation !== false
                ? "Disable"
                : "Enable",
            color:
              pendingVisibilityRow?.visibleInIssueCreation !== false
                ? "warning"
                : "success",
            variant: "contained",
            loading: visibilityBusyId === pendingVisibilityRow?.mongoId,
            onClick: async () => {
              const success = await updateVisibility(pendingVisibilityRow);
              if (success) setPendingVisibilityRow(null);
            },
            autoFocus: true,
          },
        ]}
      >
        {pendingVisibilityRow?.implementationStatus === "scaffold" &&
        pendingVisibilityRow?.visibleInIssueCreation === false ? (
          <Alert severity="warning" variant="outlined" sx={{ mt: 1.25 }}>
            This model is marked as scaffold. It may return MODEL_UNDER_DEVELOPMENT until implemented.
          </Alert>
        ) : null}
      </ConfirmationDialog>
    </>
  );
}
