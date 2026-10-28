import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

import {
  analyzeAHPSortAlternativeProfilesEvaluation,
  updateAlternativeToProfileComparison,
  updateOrientedProfileComparison,
} from "./operations/evaluationPayload.js";
import { resolveAHPSortAlternativeProfilesContext } from "./operations/resolveContext.js";
import {
  AlternativeProfileComparisonsTable,
  ProfileComparisonsTable,
} from "./components/ComparisonTable.jsx";

const AHPSortAlternativeProfilesView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
}) => {
  const [selectedCriterionId, setSelectedCriterionId] = useState("");
  const contextResolution = useMemo(() => {
    try {
      return {
        context: resolveAHPSortAlternativeProfilesContext({ decisionContext }),
        message: "",
      };
    } catch (error) {
      return {
        context: null,
        message: error instanceof Error
          ? error.message
          : "AHPSort I evaluation context is invalid.",
      };
    }
  }, [decisionContext]);
  const context = contextResolution.context;
  const assessment = useMemo(
    () => analyzeAHPSortAlternativeProfilesEvaluation({
      resolvedContext: context,
      evaluation,
    }),
    [context, evaluation]
  );

  if (contextResolution.message) {
    return <Alert severity="error">{contextResolution.message}</Alert>;
  }

  const selectedCriterion = context.criteria.find(({ id }) => id === selectedCriterionId)
    || context.criteria[0];
  const activeCriterionId = selectedCriterion.id;
  const alternativeExpected = context.alternatives.length * context.profiles.length;
  const profileExpected = context.profiles.length * (context.profiles.length - 1) / 2;
  const criterionCompleted =
    (assessment.alternativeByCriterion.get(activeCriterionId) || 0) +
    (assessment.profileByCriterion.get(activeCriterionId) || 0);
  const criterionExpected = alternativeExpected + profileExpected;
  const missing = assessment.totalExpected - assessment.completed;
  const alternativeCompleted = assessment.alternativeByCriterion.get(activeCriterionId) || 0;
  const profileCompleted = assessment.profileByCriterion.get(activeCriterionId) || 0;
  const progress = assessment.totalExpected > 0
    ? assessment.completed / assessment.totalExpected * 100
    : 0;
  const permitEdit = readOnly !== true;

  return (
    <Stack spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
      {collectiveEvaluation !== null && collectiveEvaluation !== undefined ? (
        <Alert severity="info" role="status">
          AHPSort I uses individual evaluations. Collective comparisons are not supported and are not shown.
        </Alert>
      ) : null}

      <Stack spacing={0.55}>
        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
          {context.profileMode === "limiting" ? "Limiting profiles" : "Central profiles"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For each criterion, compare alternatives with each profile and compare every profile pair once.
          Saaty values above 1 favor the first item; fractions favor the second.
        </Typography>
      </Stack>

      <Box aria-label="Evaluation progress" role="group" sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="space-between" sx={{ mb: 0.55 }}>
          <Typography variant="body2" role="status" sx={{ fontWeight: 750 }}>
            {assessment.completed} of {assessment.totalExpected} comparisons complete
          </Typography>
          <Typography variant="body2" color={missing > 0 ? "text.secondary" : "success.light"}>
            {missing > 0
              ? `${missing} remaining`
              : assessment.complete
                ? "All comparisons complete"
                : "Review invalid comparisons"}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label="Overall comparison completion"
          aria-valuenow={assessment.completed}
          aria-valuemax={assessment.totalExpected}
          sx={{ borderRadius: 2, height: 6 }}
        />
        {assessment.invalidCount > 0 ? (
          <Typography variant="caption" color="warning.light" role="alert" sx={{ display: "block", mt: 0.55 }}>
            {assessment.message} These entries do not count toward completion.
          </Typography>
        ) : null}
      </Box>

      <Tabs
        value={activeCriterionId}
        onChange={(_event, value) => setSelectedCriterionId(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Choose a criterion to evaluate"
        sx={{
          minHeight: 42,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          "& .MuiTab-root": { minHeight: 42, minWidth: 110, px: 1.3, textTransform: "none" },
        }}
      >
        {context.criteria.map((criterion) => {
          const complete = (assessment.alternativeByCriterion.get(criterion.id) || 0) +
            (assessment.profileByCriterion.get(criterion.id) || 0);
          return (
            <Tab
              key={criterion.id}
              value={criterion.id}
              label={`${criterion.name} · ${complete}/${criterionExpected}`}
              aria-label={`${criterion.name}, ${complete} of ${criterionExpected} comparisons complete`}
            />
          );
        })}
      </Tabs>

      <Stack spacing={0.45}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {selectedCriterion.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" role="status">
          {criterionCompleted} of {criterionExpected} comparisons complete for this criterion.
        </Typography>
      </Stack>

      <Stack component="section" aria-labelledby="alternative-profile-heading" spacing={0.8} sx={{ minWidth: 0 }}>
        <Box>
          <Typography id="alternative-profile-heading" variant="subtitle2" sx={{ fontWeight: 800 }}>
            Alternatives compared with profiles
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Each cell is alternative versus profile. {alternativeCompleted} of {alternativeExpected} complete
            {assessment.alternativeMissingByCriterion.get(activeCriterionId) > 0
              ? `; ${assessment.alternativeMissingByCriterion.get(activeCriterionId)} still needed for this criterion.`
              : "."}
          </Typography>
        </Box>
        <AlternativeProfileComparisonsTable
          alternatives={context.alternatives}
          profiles={context.profiles}
          criterion={selectedCriterion}
          assessment={assessment}
          readOnly={!permitEdit}
          onChange={({ alternative, profile, value }) => {
            if (!permitEdit) return;
            setEvaluation(updateAlternativeToProfileComparison({
              evaluation,
              criterionId: activeCriterionId,
              alternativeId: alternative.id,
              profileId: profile.profileId,
              value,
            }));
          }}
        />
      </Stack>

      <Stack component="section" aria-labelledby="profile-profile-heading" spacing={0.8} sx={{ minWidth: 0 }}>
        <Box>
          <Typography id="profile-profile-heading" variant="subtitle2" sx={{ fontWeight: 800 }}>
            Profiles compared with each other
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Each unordered pair is stored once; the opposite cell displays its reciprocal. {profileCompleted} of {profileExpected} complete
            {assessment.profileMissingByCriterion.get(activeCriterionId) > 0
              ? `; ${assessment.profileMissingByCriterion.get(activeCriterionId)} still needed for this criterion.`
              : "."}
          </Typography>
        </Box>
        <ProfileComparisonsTable
          profiles={context.profiles}
          criterion={selectedCriterion}
          assessment={assessment}
          readOnly={!permitEdit}
          onChange={({ rowProfile, columnProfile, value }) => {
            if (!permitEdit) return;
            setEvaluation(updateOrientedProfileComparison({
              evaluation,
              context,
              criterionId: activeCriterionId,
              rowProfileId: rowProfile.profileId,
              columnProfileId: columnProfile.profileId,
              value,
            }));
          }}
        />
      </Stack>
    </Stack>
  );
};

export default AHPSortAlternativeProfilesView;
