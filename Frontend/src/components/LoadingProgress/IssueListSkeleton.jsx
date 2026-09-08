import { Box, Paper, Skeleton, Stack } from "@mui/material";

const placeholderSx = {
  bgcolor: "rgba(255,255,255,0.08)",
};

/**
 * Lightweight page-level placeholder for the Active and Finished Issues lists.
 *
 * @returns {JSX.Element}
 */
const IssueListSkeleton = () => {
  return (
    <Stack
      role="status"
      aria-label="Loading issues"
      data-testid="issue-list-skeleton"
      spacing={2}
      sx={{
        minHeight: { xs: 420, sm: 500, lg: 590 },
        p: { xs: 1, sm: 0 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Skeleton data-testid="issue-list-skeleton-item" variant="rounded" height={52} width="min(100%, 280px)" sx={placeholderSx} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Skeleton data-testid="issue-list-skeleton-item" variant="rounded" height={42} width={42} sx={placeholderSx} />
          <Skeleton data-testid="issue-list-skeleton-item" variant="rounded" height={42} width={150} sx={placeholderSx} />
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
          gap: 1,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} data-testid="issue-list-skeleton-item" variant="rounded" height={74} sx={placeholderSx} />
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              minHeight: { xs: 112, sm: 136 },
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Stack spacing={1.25}>
              <Skeleton data-testid="issue-list-skeleton-item" variant="rounded" height={24} width="72%" sx={placeholderSx} />
              <Skeleton data-testid="issue-list-skeleton-item" variant="rounded" height={16} width="92%" sx={placeholderSx} />
              <Skeleton data-testid="issue-list-skeleton-item" variant="rounded" height={16} width="58%" sx={placeholderSx} />
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
};

export default IssueListSkeleton;
