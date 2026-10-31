import { useMemo, useState } from "react";
import {
  Alert,
  Box,
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
  const permitEdit = readOnly !== true;

  return (
    <Stack spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
      {collectiveEvaluation !== null && collectiveEvaluation !== undefined ? (
        <Alert severity="info" role="status">
          AHPSort I uses individual evaluations. Collective comparisons are not supported and are not shown.
        </Alert>
      ) : null}

      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
        {context.profileMode === "limiting" ? "Limiting profiles" : "Central profiles"}
      </Typography>
      {assessment.invalidCount > 0 ? (
        <Alert severity="warning" role="alert" sx={{ py: 0 }}>
          {assessment.message}
        </Alert>
      ) : null}

      <Tabs
        value={activeCriterionId}
        onChange={(_event, value) => setSelectedCriterionId(value)}
        variant="scrollable"
        textColor="secondary"
        indicatorColor="secondary"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Choose a criterion to evaluate"
        sx={{
          minHeight: 42,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          "& .MuiTab-root": {
            minHeight: 42,
            minWidth: { xs: 0, sm: 110 },
            maxWidth: { xs: "calc(50vw - 30px)", sm: 360 },
            px: 1.3,
            textTransform: "none",
            whiteSpace: "normal",
            overflowWrap: "anywhere",
          },
          "& .MuiTabs-scrollButtons.Mui-disabled": { display: "none" },
        }}
      >
        {context.criteria.map((criterion) => {
          return (
            <Tab
              key={criterion.id}
              value={criterion.id}
              label={criterion.name}
            />
          );
        })}
      </Tabs>

      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        {selectedCriterion.name}
      </Typography>

      <Stack component="section" aria-labelledby="alternative-profile-heading" spacing={0.8} sx={{ minWidth: 0 }}>
        <Box>
          <Typography id="alternative-profile-heading" variant="subtitle2" sx={{ fontWeight: 800 }}>
            Alternative comparisons
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

      {context.profiles.length > 1 ? (
        <Stack component="section" aria-labelledby="profile-profile-heading" spacing={0.8} sx={{ minWidth: 0 }}>
          <Typography id="profile-profile-heading" variant="subtitle2" sx={{ fontWeight: 800 }}>
            Profile comparisons
          </Typography>
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
      ) : null}
    </Stack>
  );
};

export default AHPSortAlternativeProfilesView;
