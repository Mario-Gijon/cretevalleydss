import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  sortingResultGridSx,
  topsisSortCategoryGroupSx,
  topsisSortCategorySx,
  topsisSortResultGridSx,
} from "./sortingResultGrid.styles.js";
import AHPSortIAlternativeEvidence from "./AHPSortIAlternativeEvidence.jsx";

const isValidCloseness = (value) => typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 1;
const toScalePercent = (value) => `${Number((value * 100).toPrecision(12))}%`;

const formatClosenessInterval = (interval) => {
  if (!interval) return null;
  if (interval.lower === null && isValidCloseness(interval.upper)) {
    return `Closeness < ${interval.upper.toFixed(4)}`;
  }
  if (isValidCloseness(interval.lower) && interval.upper === null) {
    return `Closeness > ${interval.lower.toFixed(4)}`;
  }
  if (isValidCloseness(interval.lower) && isValidCloseness(interval.upper)) {
    return `${interval.lower.toFixed(4)} < Closeness < ${interval.upper.toFixed(4)}`;
  }
  return null;
};

const CategoryHeader = ({ category, showClosenessInterval = true }) => (
  <Box sx={{ minWidth: 0, pr: { md: 1.5 } }}>
    <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
      {category.label}
    </Typography>
    {showClosenessInterval && formatClosenessInterval(category.closenessInterval) && (
      <Typography
        variant="caption"
        aria-label="Closeness interval"
        data-testid="topsis-sort-closeness-interval"
        sx={{ display: "block", mt: 0.35, color: "text.secondary", fontVariantNumeric: "tabular-nums", lineHeight: 1.35, overflowWrap: "anywhere" }}
      >
        {formatClosenessInterval(category.closenessInterval)}
      </Typography>
    )}
  </Box>
);

const TopsisSortAlternativeScale = ({ alternative, interval, theme }) => (
  <Box
    data-testid="topsis-sort-closeness-scale"
    data-closeness={alternative.closeness}
    aria-hidden="true"
    sx={{ position: "relative", height: 12, mx: 0.45, overflow: "visible" }}
  >
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: "1px",
        transform: "translateY(-50%)",
        bgcolor: alpha(theme.palette.secondary.main, 0.34),
      }}
    />
    {[interval?.lower, interval?.upper]
      .filter(isValidCloseness)
      .map((boundary) => (
        <Box
          key={boundary}
          data-testid="topsis-sort-boundary-marker"
          data-boundary-value={boundary}
          aria-hidden="true"
          style={{ left: toScalePercent(boundary) }}
          sx={{
            position: "absolute",
            top: 1,
            height: 10,
            borderLeft: `1px dashed ${alpha(theme.palette.text.secondary, 0.8)}`,
            transform: "translateX(-50%)",
          }}
        />
      ))}
    <Box
      data-testid="topsis-sort-closeness-point"
      data-closeness-value={alternative.closeness}
      aria-hidden="true"
      style={{ left: toScalePercent(alternative.closeness) }}
      sx={{
        position: "absolute",
        top: "50%",
        width: 7,
        height: 7,
        borderRadius: "50%",
        bgcolor: "secondary.main",
        transform: "translate(-50%, -50%)",
      }}
    />
  </Box>
);

const TopsisSortAlternativeRow = ({ alternative, interval, theme }) => {
  const closeness = isValidCloseness(alternative.closeness) ? alternative.closeness : null;
  const closenessLabel = closeness === null ? null : closeness.toFixed(4);
  const accessibleLabel = closenessLabel
    ? `${alternative.name}, Relative closeness ${closenessLabel}`
    : alternative.name;

  return (
    <Box
      component="li"
      aria-label={accessibleLabel}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.55,
        minWidth: 0,
        px: 0.9,
        py: 0.7,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, minWidth: 0 }}>
        <Typography variant="body2" title={alternative.name} sx={{ minWidth: 0, fontWeight: 550, overflowWrap: "anywhere", lineHeight: 1.3 }}>
          {alternative.name}
        </Typography>
        {closenessLabel !== null && (
          <Typography
            variant="body2"
            color="text.secondary"
            aria-label={`Relative closeness ${closenessLabel}`}
            sx={{ flex: "0 0 auto", fontSize: "0.8rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          >
            {closenessLabel}
          </Typography>
        )}
      </Box>
      {closeness !== null && <TopsisSortAlternativeScale alternative={{ ...alternative, closeness }} interval={interval} theme={theme} />}
    </Box>
  );
};

const TopsisSortDashboardResult = ({ result, theme }) => (
  <Box role="list" aria-label="Final sorting by category" data-testid="topsis-sort-category-list" sx={topsisSortResultGridSx}>
    {result.categories.map((category) => {
      const alternatives = category.alternatives
        .map((alternative, index) => ({ alternative, index }))
        .sort((left, right) => {
          const leftClosenessValid = isValidCloseness(left.alternative.closeness);
          const rightClosenessValid = isValidCloseness(right.alternative.closeness);
          if (leftClosenessValid && rightClosenessValid && left.alternative.closeness !== right.alternative.closeness) {
            return right.alternative.closeness - left.alternative.closeness;
          }
          if (leftClosenessValid !== rightClosenessValid) return leftClosenessValid ? -1 : 1;
          return left.index - right.index;
        })
        .map(({ alternative }) => alternative);
      return (
        <Box
          key={category.id}
          component="section"
          role="listitem"
          aria-label={category.label}
          data-testid="topsis-sort-category"
          sx={{ ...topsisSortCategorySx, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.42)}` }}
        >
          <CategoryHeader category={category} showClosenessInterval={false} />
          {alternatives.length ? (
            <Box component="ul" aria-label={`${category.label} alternatives`} data-testid="topsis-sort-category-body" sx={topsisSortCategoryGroupSx}>
              {alternatives.map((alternative) => (
                <TopsisSortAlternativeRow key={alternative.id} alternative={alternative} interval={category.closenessInterval} theme={theme} />
              ))}
            </Box>
          ) : (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.65}
              aria-label="No alternatives in this category"
              data-testid="topsis-sort-empty-category"
              sx={{ minWidth: 0, alignSelf: { md: "center" }, py: 0.3, color: "text.secondary" }}
            >
              <InboxOutlinedIcon
                aria-hidden="true"
                data-testid="topsis-sort-empty-category-icon"
                sx={{ flex: "0 0 auto", fontSize: 17, color: (theme) => alpha(theme.palette.secondary.light, 0.68) }}
              />
              <Typography variant="body2" sx={{ minWidth: 0, fontSize: "0.8rem", lineHeight: 1.35 }}>
                No alternatives in this category
              </Typography>
            </Stack>
          )}
        </Box>
      );
    })}
  </Box>
);

const groupOutcomeText = (classification) => {
  const category = classification?.category?.label || "the assigned category";
  const participants = classification?.participantCount || 0;
  if (!classification?.voteValid) return "The saved category is shown; vote details need review.";
  if (classification.aggregationStatus === "unanimous") {
    return `All ${participants} experts assigned this alternative to ${category}.`;
  }
  if (classification.aggregationStatus === "tied_plurality") {
    const tiedLabels = classification.tiedCategoryLabels;
    const tied = tiedLabels.length < 2
      ? tiedLabels[0] || "Categories"
      : `${tiedLabels.slice(0, -1).join(", ")} and ${tiedLabels.at(-1)}`;
    const preference = classification.tiePolicy === "optimistic" ? "more preferred" : "less preferred";
    return `${tied} tied with the most votes among ${participants} experts. The ${preference} category, ${category}, was selected.`;
  }
  const selectedVote = classification.votes.find((vote) => vote.label === category)?.count ?? 0;
  if (classification.isAbsoluteMajority) {
    return `${category} received an absolute majority: ${selectedVote} of ${participants} votes.`;
  }
  return `${category} received the most votes (plurality): ${selectedVote} of ${participants}. No category had an absolute majority.`;
};

const AHPSortIGroupDashboardResult = ({ result, theme }) => {
  const evidence = result.ahpSortIGroup;
  return (
    <>
      <Box role="list" aria-label="Final sorting by category" data-testid="ahpsort-i-group-category-list" sx={sortingResultGridSx}>
        {result.categories.map((category) => (
          <Box
            key={category.id}
            component="section"
            role="listitem"
            aria-label={`${category.label}: ${category.alternatives.length} ${category.alternatives.length === 1 ? "alternative" : "alternatives"}`}
            data-testid="ahpsort-i-group-category"
            sx={{ minWidth: 0, p: { xs: 1.1, sm: 1.3 }, borderRadius: 2, border: `1px solid ${alpha(theme.palette.secondary.light, 0.18)}`, bgcolor: alpha(theme.palette.common.white, 0.025) }}
          >
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, mb: 0.75, minWidth: 0 }}>
              <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, overflowWrap: "anywhere" }}>{category.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {category.alternatives.length} {category.alternatives.length === 1 ? "alternative" : "alternatives"}
              </Typography>
            </Box>
            {category.alternatives.length ? (
              <Stack component="ul" spacing={1} sx={{ listStyle: "none", p: 0, m: 0, minWidth: 0 }}>
                {category.alternatives.map((alternative) => {
                  const classification = evidence?.alternativesById?.[alternative.id];
                  return (
                    <Box component="li" key={alternative.id} data-testid="ahpsort-i-group-alternative" sx={{ minWidth: 0, py: 0.55, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.35)}`, "&:last-of-type": { borderBottom: 0 } }}>
                      <Typography variant="body2" title={alternative.name} sx={{ fontWeight: 650, overflowWrap: "anywhere" }}>{alternative.name}</Typography>
                      {classification?.voteValid ? (
                        <>
                          <Typography variant="caption" data-testid="ahpsort-i-group-votes" sx={{ display: "block", mt: 0.3, color: "text.secondary", overflowWrap: "anywhere", fontVariantNumeric: "tabular-nums" }}>
                            {classification.votes.map(({ label, count }) => `${label}: ${count}`).join(" · ")}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", lineHeight: 1.45 }}>
                            {groupOutcomeText(classification)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" role="note" sx={{ display: "block", mt: 0.3, color: "warning.light", lineHeight: 1.45 }}>
                          {groupOutcomeText(classification)}
                        </Typography>
                      )}
                      <Box component="details" data-testid="ahpsort-i-individual-classifications" sx={{ mt: 0.5, minWidth: 0, "& > summary": { width: "fit-content", maxWidth: "100%", cursor: "pointer", color: "secondary.light", fontSize: "0.8rem", overflowWrap: "anywhere" } }}>
                        <Box component="summary">Individual expert classifications</Box>
                        <Stack spacing={1} sx={{ pt: 0.7, minWidth: 0 }}>
                          {(classification?.individualClassifications || []).map((individual) => (
                            <Box key={individual.id} data-testid="ahpsort-i-individual-classification" sx={{ minWidth: 0, pl: 0.9, borderLeft: `1px solid ${alpha(theme.palette.secondary.light, 0.3)}` }}>
                              <Typography variant="caption" component="div" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                                {individual.name} · {individual.category?.label || "Classification unavailable"}
                              </Typography>
                              {individual.evidence ? (
                                <AHPSortIAlternativeEvidence evidence={individual.evidence} />
                              ) : (
                                <Typography variant="caption" color="text.secondary" component="div">
                                  Individual AHP evidence is unavailable for this classification.
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No alternatives assigned.</Typography>
            )}
          </Box>
        ))}
      </Box>
      {evidence?.status !== "available" && evidence?.unavailableReason ? (
        <Typography
          variant="caption"
          role="alert"
          data-testid="ahpsort-i-group-integrity-warning"
          sx={{ display: "block", mt: 0.75, color: "warning.light", lineHeight: 1.45 }}
        >
          {evidence.unavailableReason}
        </Typography>
      ) : null}
    </>
  );
};

const StandardSortingDashboardResult = ({ result, theme }) => {
  const isAHPSortI = result.displayMode === "ahp-sort-i";
  const evidenceUnavailable = isAHPSortI && result.ahpSortI?.status !== "available";
  return (
    <>
      <Box role="list" aria-label="Final sorting by category" sx={sortingResultGridSx}>
        {result.categories.map((category) => (
          <Box
            key={category.id}
            role="listitem"
            aria-label={`${category.label}: ${category.alternatives.length} ${category.alternatives.length === 1 ? "alternative" : "alternatives"}`}
            sx={{ minWidth: 0, p: { xs: 1.15, sm: 1.35 }, borderRadius: 2, border: "1px solid rgba(85, 199, 216, 0.18)", bgcolor: alpha(theme.palette.common.white, 0.025) }}
          >
            <CategoryHeader category={category} theme={theme} />
            {category.alternatives.length ? (
              <Stack component="ul" spacing={0.65} sx={{ listStyle: "none", p: 0, m: 0 }}>
                {category.alternatives.map((alternative) => {
                  const ahpEvidence = isAHPSortI
                    ? result.ahpSortI?.alternativesById?.[alternative.id]
                    : null;
                  return (
                    <Stack component="li" key={alternative.id} direction="row" spacing={0.8} alignItems="flex-start" sx={{ minWidth: 0 }}>
                      <Box aria-hidden="true" sx={{ width: 5, height: 5, flex: "0 0 5px", mt: "7px", borderRadius: "50%", bgcolor: "secondary.light" }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" title={alternative.name} sx={{ minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.45 }}>
                          {alternative.name}
                        </Typography>
                        {ahpEvidence && <AHPSortIAlternativeEvidence evidence={ahpEvidence} showUnavailableMessage={!evidenceUnavailable} />}
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No alternatives assigned.</Typography>
            )}
          </Box>
        ))}
      </Box>
      {evidenceUnavailable && result.ahpSortI?.unavailableReason && (
        <Typography
          variant="caption"
          role={result.ahpSortI.status === "integrity_warning" ? "alert" : "note"}
          data-testid={`ahp-sort-i-${result.ahpSortI.status}`}
          sx={{ display: "block", mt: 0.75, color: result.ahpSortI.status === "integrity_warning" ? "warning.light" : "text.secondary", lineHeight: 1.45 }}
        >
          {result.ahpSortI.unavailableReason}
        </Typography>
      )}
    </>
  );
};

const SortingDashboardResult = ({ result }) => {
  const theme = useTheme();
  return result.displayMode === "topsis-sort"
    ? <TopsisSortDashboardResult result={result} theme={theme} />
    : result.displayMode === "ahp-sort-i-group"
      ? <AHPSortIGroupDashboardResult result={result} theme={theme} />
    : <StandardSortingDashboardResult result={result} theme={theme} />;
};

export default SortingDashboardResult;
