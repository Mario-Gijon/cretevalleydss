import { Stack } from "@mui/material";

import EmptyState from "../components/EmptyState";
import ReviewList from "../components/ReviewList";
import SectionCard from "../components/SectionCard";
import { asArray, count, toTitle, valueToText } from "../utils/modelManifest.formatters";
import { flattenTechnicalDifferences } from "../utils/modelManifest.normalizers";

export default function ReviewTab({ report }) {
  const technicalDifferences = flattenTechnicalDifferences(report);
  const summary = report?.summary || {};
  const warnings = asArray(report?.warnings);
  const hasReviewItems =
    technicalDifferences.length > 0 ||
    count(summary.missingInMongo) > 0 ||
    count(summary.missingInManifest) > 0 ||
    count(summary.notSyncable) > 0 ||
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
              `${item.model} - ${item.field} - Mongo: ${valueToText(item.mongoValue)} - Manifest: ${valueToText(item.manifestValue)}`
            }
          />
          <ReviewList
            title="Missing in Mongo"
            items={summary.missingInMongo}
            renderItem={(item) => `${item?.key || "unknown"} - ${item?.reason || "No reason"}`}
          />
          <ReviewList
            title="Missing in manifest"
            items={summary.missingInManifest}
            renderItem={(item) => `${item?.mongoName || "unknown"} - ${item?.reason || "No reason"}`}
          />
          <ReviewList
            title="Not syncable"
            items={summary.notSyncable}
            renderItem={(item) =>
              `${item?.key || "unknown"} - ${toTitle(item?.role)} - ${toTitle(item?.status)} - ${item?.reason || "No reason"}`
            }
          />
          <ReviewList title="Warnings" items={warnings} renderItem={(item) => item} />
        </Stack>
      )}
    </SectionCard>
  );
}
