import { Box, Divider, FormControl, InputLabel, MenuItem, Select, Stack, ToggleButton } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import UnsupportedEvaluationStructureAlert from "../shared/UnsupportedEvaluationStructureAlert";

/**
 * Ratings section of the finished issue dialog.
 *
 * Manages:
 * - Expert selector
 * - Criterion selector (if applicable)
 * - Show collective toggle
 * - Renders the registered Matrix component for the evaluation structure
 *
 * @returns {JSX.Element}
 */
const RatingsSection = () => {
  const theme = useTheme();

  const { ratingsSection } = useFinishedIssueDialogContext();

  const {
    viewIssue,
    selectedExpert,
    setSelectedExpert,
    selectedCriterion,
    setSelectedCriterion,
    expertList,
    criterionList,
    showCriterionSelector,
    showCollective,
    setShowCollective,
    canShowCollective,
    evaluations,
    collectiveEvaluations,
    leafNames,
    Matrix,
    unsupportedEvaluationStructure,
  } = ratingsSection;

  if (unsupportedEvaluationStructure) {
    return (
      <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
        <UnsupportedEvaluationStructureAlert />
      </SectionCard>
    );
  }

  if (!Matrix) {
    return null;
  }

  return (
    <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: "100%" }}
        >
          <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
            <InputLabel color="info">Expert</InputLabel>
            <Select
              value={selectedExpert}
              label="Expert"
              color="info"
              onChange={(event) => {
                const value = event.target.value;
                setSelectedExpert(value);

                // Reset criterion when expert changes
                const newCriteria = criterionList;
                setSelectedCriterion(newCriteria[0] || "");
              }}
            >
              {expertList.map((expert) => (
                <MenuItem key={expert} value={expert}>
                  {expert}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showCriterionSelector ? (
            <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
              <InputLabel color="info">Criterion</InputLabel>
              <Select
                value={selectedCriterion}
                label="Criterion"
                color="info"
                onChange={(event) => setSelectedCriterion(event.target.value)}
              >
                {criterionList.map((criterion) => (
                  <MenuItem key={criterion} value={criterion}>
                    {criterion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <Box sx={{ flex: 1 }} />

          {canShowCollective ? (
            <ToggleButton
              selected={showCollective}
              onChange={() => setShowCollective((value) => !value)}
              color="secondary"
              sx={{
                borderRadius: 3,
                borderColor: "rgba(255,255,255,0.14)",
                bgcolor: alpha(theme.palette.background.paper, 0.06),
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.14),
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                },
              }}
            >
              {showCollective ? "Hide collective" : "Show collective"}
            </ToggleButton>
          ) : null}
        </Stack>

        <Divider sx={{ opacity: 0.14 }} />

        <Matrix
          alternatives={viewIssue?.summary?.alternatives || []}
          criteria={leafNames || []}
          evaluations={evaluations}
          setEvaluations={() => {}}
          collectiveEvaluations={collectiveEvaluations || {}}
          permitEdit={false}
        />
      </Stack>
    </SectionCard>
  );
};

export default RatingsSection;
