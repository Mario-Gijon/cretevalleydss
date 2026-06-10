import { Alert, Box, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import ModelCards from "../components/ModelCards";
import ModelsTable from "../components/ModelsTable";
import SectionCard from "../components/SectionCard";
import { flattenModelManifestTechnicalDifferences } from "../logic/buildModelManifestRows";
import { getModelManifestSyncState } from "../logic/getModelManifestSeverity";

const REVIEW_SYNC_STATES = [
  "Has differences",
  "Missing in Mongo",
  "Missing in manifest",
  "Stale",
];

export default function ModelCatalogTab({
  rows,
  report,
  loadingCatalog,
  catalogError,
  onViewDetails,
  onAskVisibilityChange,
  visibilityBusyId,
}) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const technicalDifferences = flattenModelManifestTechnicalDifferences(report);
  const reviewNeeded = rows.filter((row) =>
    REVIEW_SYNC_STATES.includes(getModelManifestSyncState(row))
  ).length;

  return (
    <Stack spacing={1.2}>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        <MetricCard label="Catalog rows" value={rows.length} helper="Persisted in MongoDB" />
        <MetricCard
          label="Synced"
          value={rows.filter((row) => getModelManifestSyncState(row) === "Synced").length}
          helper="Manifest metadata applied"
          severity="success"
        />
        <MetricCard
          label="Available"
          value={rows.filter((row) => getModelManifestSyncState(row) === "Available").length}
          helper="Persisted without manifest sync"
        />
        <MetricCard
          label="Review needed"
          value={reviewNeeded}
          helper={reviewNeeded > 0 ? "Needs admin review" : "Clear"}
          severity={reviewNeeded > 0 ? "warning" : "success"}
        />
      </Box>

      <SectionCard
        title="Model Catalog"
        subtitle="Models shown here are loaded from MongoDB. They persist after synchronization."
      >
        {loadingCatalog ? (
          <EmptyState>Loading model catalog from MongoDB...</EmptyState>
        ) : catalogError ? (
          <Alert severity="error" variant="outlined">
            {catalogError}
          </Alert>
        ) : rows.length === 0 ? (
          <EmptyState>
            No models found in MongoDB. Run Manifest Sync to import technical metadata from ApiModels.
          </EmptyState>
        ) : isNarrow ? (
          <ModelCards
            rows={rows}
            onViewDetails={onViewDetails}
            onAskVisibilityChange={onAskVisibilityChange}
            visibilityBusyId={visibilityBusyId}
          />
        ) : (
          <ModelsTable
            rows={rows}
            onViewDetails={onViewDetails}
            onAskVisibilityChange={onAskVisibilityChange}
            visibilityBusyId={visibilityBusyId}
          />
        )}
      </SectionCard>

      {technicalDifferences.length > 0 && (
        <Alert severity="warning" variant="outlined">
          Latest dry-run found technical differences. Open Review to inspect them.
        </Alert>
      )}
    </Stack>
  );
}
