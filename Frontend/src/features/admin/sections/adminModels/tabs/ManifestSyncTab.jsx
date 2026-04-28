import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import SyncIcon from "@mui/icons-material/Sync";

import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import ReviewList from "../components/ReviewList";
import SectionCard from "../components/SectionCard";
import { count } from "../utils/modelManifest.formatters";
import { flattenTechnicalDifferences } from "../utils/modelManifest.normalizers";

function SyncSummary({ report }) {
  if (!report) return <EmptyState>Run a dry-run to see synchronization readiness.</EmptyState>;

  const manifest = report?.manifest || {};
  const summary = report?.summary || {};
  const technicalDifferences = flattenTechnicalDifferences(report);
  const reviewNeeded =
    count(summary.missingInMongo) +
    count(summary.missingInManifest) +
    technicalDifferences.length;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        },
      }}
    >
      <MetricCard label="Total models" value={manifest.totalModels ?? 0} />
      <MetricCard label="Public issue models" value={manifest.publicIssueModels ?? 0} severity="success" />
      <MetricCard label="Matched with Mongo" value={summary.matched ?? 0} severity="success" />
      <MetricCard
        label="Review needed"
        value={reviewNeeded}
        helper={reviewNeeded > 0 ? "Inspect Review tab" : "No technical differences"}
        severity={reviewNeeded > 0 ? "warning" : "success"}
      />
      <MetricCard label="Not syncable" value={count(summary.notSyncable)} helper="Expected for services" />
    </Box>
  );
}

function SyncResult({ result }) {
  if (!result) return <EmptyState>No synchronization has been executed in this session.</EmptyState>;

  const summary = result?.summary || {};
  const unchangedCount = summary.unchanged ?? count(result.unchanged);
  const updatedCount = summary.updated ?? count(result.updated);

  return (
    <Stack spacing={1.1}>
      {updatedCount === 0 && unchangedCount > 0 && (
        <Alert severity="success" variant="outlined">
          All matched models were already synchronized. No technical changes detected.
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(6, minmax(0, 1fr))",
          },
        }}
      >
        <MetricCard label="Created" value={summary.created ?? count(result.created)} severity="success" />
        <MetricCard
          label="Updated"
          value={updatedCount}
          helper={updatedCount > 0 ? "Technical metadata changed" : "No technical changes"}
          severity={updatedCount > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Unchanged"
          value={unchangedCount}
          helper={unchangedCount > 0 ? "Already synchronized" : "No unchanged models"}
          severity="success"
        />
        <MetricCard label="Skipped" value={summary.skipped ?? count(result.skipped)} severity="warning" />
        <MetricCard label="Stale" value={summary.stale ?? count(result.stale)} severity="warning" />
        <MetricCard
          label="Warnings"
          value={summary.warnings ?? count(result.warnings)}
          severity={count(result.warnings) > 0 ? "warning" : "success"}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <ReviewList
          title="Created"
          items={result.created}
          emptyText="No models created."
          renderItem={(item) => `${item?.apiModelKey || "unknown"} - ${item?.mongoName || "unknown"} - ${item?.mongoId || "no id"}`}
        />
        <ReviewList
          title="Updated"
          items={result.updated}
          emptyText="No technical metadata changed."
          renderItem={(item) =>
            `${item?.apiModelKey || "unknown"} - ${item?.mongoName || "unknown"} - ${(item?.updatedFields || []).join(", ") || "no field changes"}`
          }
        />
        <ReviewList
          title="Unchanged"
          items={result.unchanged}
          emptyText="No unchanged models."
          renderItem={(item) =>
            `${item?.apiModelKey || "unknown"} - ${item?.mongoName || "unknown"} - ${item?.reason || "No technical changes detected"}`
          }
        />
        <ReviewList
          title="Skipped"
          items={result.skipped}
          emptyText="No skipped models."
          renderItem={(item) => `${item?.apiModelKey || "unknown"} - ${item?.reason || "No reason"}`}
        />
        <ReviewList
          title="Stale"
          items={result.stale}
          emptyText="No stale models marked."
          renderItem={(item) =>
            `${item?.apiModelKey || "unknown"} - ${item?.mongoName || "unknown"} - ${item?.reason || "No reason"}`
          }
        />
        <ReviewList
          title="Warnings"
          items={result.warnings}
          emptyText="No warnings."
          renderItem={(item) => item}
        />
      </Box>
    </Stack>
  );
}

export default function ManifestSyncTab({
  report,
  syncResult,
  loadingDryRun,
  loadingSync,
  onRunDryRun,
  onAskSync,
  errorMessage,
}) {
  return (
    <Stack spacing={1.2}>
      <SectionCard
        title="Actions"
        subtitle="Dry-run compares ApiModels manifest with MongoDB without writing changes. Sync applies technical metadata after confirmation."
        action={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8}>
            <LoadingButton
              variant="outlined"
              color="info"
              loading={loadingDryRun}
              startIcon={<RefreshIcon />}
              onClick={onRunDryRun}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              {syncResult ? "Run dry-run again" : "Run dry-run"}
            </LoadingButton>
            <Button
              variant="outlined"
              color="warning"
              disabled={!report || loadingDryRun || loadingSync}
              startIcon={<SyncIcon />}
              onClick={onAskSync}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              Sync from ApiModels
            </Button>
          </Stack>
        )}
      >
        <Stack spacing={0.8}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            The synchronization does not delete models, does not overwrite editorial fields, and only applies technical metadata from ApiModels.
          </Typography>
          {errorMessage && (
            <Alert severity="error" variant="outlined">
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </SectionCard>

      <SectionCard title="Dry-run summary">
        <SyncSummary report={report} />
      </SectionCard>

      <SectionCard title="Sync result">
        <SyncResult result={syncResult} />
      </SectionCard>
    </Stack>
  );
}
