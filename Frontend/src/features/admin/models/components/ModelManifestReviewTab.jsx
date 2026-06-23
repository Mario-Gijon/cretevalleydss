import { Stack } from "@mui/material";

import EmptyState from "../components/EmptyState";
import ReviewList from "../components/ReviewList";
import SectionCard from "../components/SectionCard";
import {
  modelManifestValueToText,
  toModelManifestTitle,
} from "../logic/formatModelManifestDisplay";
import { flattenModelManifestTechnicalDifferences } from "../logic/buildModelManifestRows";

const countItems = (value) => (Array.isArray(value) ? value.length : 0);

export default function ModelManifestReviewTab({ report }) {
  const technicalDifferences = flattenModelManifestTechnicalDifferences(report);
  const summary = report?.summary || {};
  const warnings = Array.isArray(report?.warnings) ? report.warnings : [];
  const hasReviewItems =
    technicalDifferences.length > 0 ||
    countItems(summary.missingInMongo) > 0 ||
    countItems(summary.deletedCandidates) > 0 ||
    countItems(summary.blockedDeletions) > 0 ||
    countItems(summary.notSyncable) > 0 ||
    warnings.length > 0;

  if (!report) {
    return (
      <SectionCard title="Review & Differences">
        <EmptyState>Run a dry-run to load review items.</EmptyState>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Review & Differences"
      subtitle="Review items are based on the latest dry-run. Run dry-run to refresh this comparison."
    >
      {!hasReviewItems ? (
        <EmptyState>No review items detected.</EmptyState>
      ) : (
        <Stack spacing={0.9}>
          <ReviewList
            title="Technical differences"
            items={technicalDifferences}
            renderItem={(item) =>
              `${item.model} - ${item.field} - Mongo: ${modelManifestValueToText(item.mongoValue)} - Manifest: ${modelManifestValueToText(item.manifestValue)}`
            }
          />
          <ReviewList
            title="Missing in Mongo"
            items={summary.missingInMongo}
            renderItem={(item) => `${item?.apiModelKey || "unknown"} - ${item?.reason || "No reason"}`}
          />
          <ReviewList
            title="Will be deleted"
            items={summary.deletedCandidates}
            renderItem={(item) => `${item?.mongoName || "unknown"} - ${item?.reason || "No reason"}`}
          />
          <ReviewList
            title="Protected historical models"
            items={summary.blockedDeletions}
            renderItem={(item) => `${item?.mongoName || "unknown"} - ${item?.reason || "No reason"}`}
          />
          <ReviewList
            title="Not syncable"
            items={summary.notSyncable}
            renderItem={(item) =>
              `${item?.apiModelKey || "unknown"} - ${toModelManifestTitle(item?.modelKind)} - ${item?.reason || "No reason"}`
            }
          />
          <ReviewList title="Warnings" items={warnings} renderItem={(item) => item} />
        </Stack>
      )}
    </SectionCard>
  );
}
