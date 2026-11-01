import {
  Box,
  Stack,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";

import { EvaluationStructureRenderer } from "../../../../issueEvaluation/rendering";
import {
  evaluationPluginEmptyPanelSx,
  evaluationPluginPanelSx,
  evaluationPluginRendererViewportSx,
  evaluationPluginEmptyStateSx,
} from "../evaluations.styles";
import UnsupportedEvaluationStructureAlert from "./UnsupportedEvaluationStructureAlert";
import AHPSortICollectiveAssignments from "./AHPSortICollectiveAssignments.jsx";
import AHPSortICriteriaWeightSummary from "./AHPSortICriteriaWeightSummary.jsx";

const formatSubmittedAt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const resolveEmptyStateContent = ({
  stage,
  expertName,
  consensusEnabled,
  showCollective,
  collectiveResolutionStatus,
}) => {
  const titleStageName =
    stage === "criteriaWeighting"
      ? "criteria weighting"
      : "alternative evaluation";
  const bodyStageName =
    stage === "criteriaWeighting"
      ? "criteria-weighting"
      : "alternative-evaluation";
  if (showCollective) {
    if (stage === "alternativeEvaluation" && collectiveResolutionStatus === "pending") {
      return {
        title: "Collective alternative evaluation is being prepared",
        description: "The finished result is saved. The collective matrix will appear when its analysis evidence has been persisted.",
        Icon: GroupsOutlinedIcon,
      };
    }
    if (stage === "alternativeEvaluation" && collectiveResolutionStatus === "unavailable") {
      return {
        title: `No collective ${titleStageName} available`,
        description: "No persisted collective matrix is available for this finished issue.",
        Icon: GroupsOutlinedIcon,
      };
    }
    return {
      title: `No collective ${titleStageName} available`,
      description: `No collective ${titleStageName} is available for this ${consensusEnabled ? "round" : "stage"}.`,
      Icon: GroupsOutlinedIcon,
    };
  }

  const subject = expertName || "The selected expert";
  return {
    title: `No ${titleStageName} submitted`,
    description: consensusEnabled
      ? `${subject} did not participate in this ${bodyStageName} round.`
      : `${subject} did not participate in the ${bodyStageName} stage for this issue.`,
    Icon: AssignmentOutlinedIcon,
  };
};

const EvaluationEmptyState = ({ content }) => {
  const { Icon } = content;

  return (
    <Box role="status" sx={evaluationPluginEmptyStateSx}>
      <Icon aria-hidden="true" sx={{ color: "info.light", fontSize: 42, mb: 0.2 }} />
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 800 }}>
        {content.title}
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 440, color: "text.secondary" }}>
        {content.description}
      </Typography>
    </Box>
  );
};

const EvaluationPluginPanel = ({
  stageData,
  modelApiKey,
  expertEmail,
  showCollective,
  expertName,
  consensusEnabled,
}) => {
  if (!stageData.available) return null;
  const isAHPSortI = modelApiKey === "ahp_sort_i";
  const isAHPSortICriteriaWeighting = isAHPSortI && stageData.stage === "criteriaWeighting";
  const isAHPSortIAlternativeEvaluation = isAHPSortI && stageData.stage === "alternativeEvaluation";
  const hasAHPSortIIndividualEvaluation = isAHPSortI && stageData.hasUsableIndividualEvaluation;
  const hasAHPSortIGroupAssignment = isAHPSortIAlternativeEvaluation &&
    stageData.collectiveGroupPresentation?.status === "available";
  const hasActiveViewData = showCollective
    ? isAHPSortI
      ? hasAHPSortIIndividualEvaluation || hasAHPSortIGroupAssignment
      : stageData.hasUsableCollectiveEvaluation
    : stageData.hasUsableIndividualEvaluation;
  const shouldRender = Boolean(stageData.renderer?.structureKey) &&
    (isAHPSortI ? stageData.hasUsableIndividualEvaluation : hasActiveViewData);
  const title = stageData.title;
  const subtitle = stageData.subtitle;
  const submittedAt = stageData.individual?.submittedAt;
  const hasExpertSubmissionTimestamp = Boolean(submittedAt);
  const selectedExpertId = stageData.individual?.expertId ?? null;
  const collectivePayload = stageData.hasUsableCollectiveEvaluation
    ? stageData.collective?.payload
    : null;
  const criteria = stageData.renderer?.decisionContext?.leafCriteria || [];
  const emptyState = resolveEmptyStateContent({
    stage: stageData.stage,
    expertName,
    consensusEnabled,
    showCollective,
  });

  return (
    <Box
      sx={[
        evaluationPluginPanelSx,
        !hasActiveViewData ? evaluationPluginEmptyPanelSx : {},
      ]}
      data-testid={`evaluation-stage-panel-${stageData.stage}`}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.7} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <Typography variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            (read-only)
          </Typography>
          <InfoOutlinedIcon sx={{ color: "text.secondary", fontSize: 16, flexShrink: 0 }} />
        </Stack>
        <Typography variant="body2"
          sx={{
            mt: 0.25,
            color: "text.secondary",
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      {hasExpertSubmissionTimestamp ? (
        <Typography variant="caption"
          sx={{
            mt: 0.75,
            color: "text.secondary",
            textAlign: { xs: "left", md: "right" },
          }}
        >
          Submitted: {formatSubmittedAt(submittedAt)}
        </Typography>
      ) : null}

      {!hasActiveViewData ? <EvaluationEmptyState content={emptyState} /> : null}

      {isAHPSortICriteriaWeighting ? (
        <AHPSortICriteriaWeightSummary
          criteria={criteria}
          collectiveEvaluation={collectivePayload}
          selectedExpertEmail={expertEmail}
          selectedExpertId={selectedExpertId}
          showCollective={showCollective}
        />
      ) : null}

      {shouldRender ? (
        <Box sx={evaluationPluginRendererViewportSx}>
          <EvaluationStructureRenderer
            stage={stageData.renderer.stage}
            structureKey={stageData.renderer.structureKey}
            decisionContext={stageData.renderer.decisionContext}
            evaluation={showCollective && !stageData.hasUsableIndividualEvaluation && !isAHPSortI
              ? stageData.renderer.collectiveEvaluation
              : stageData.renderer.evaluation}
            collectiveEvaluation={isAHPSortI
              ? null
              : showCollective
                ? stageData.renderer.collectiveEvaluation
                : null}
            readOnly
          />
        </Box>
      ) : !showCollective && stageData.hasUsableIndividualEvaluation ? (
        <Box sx={evaluationPluginRendererViewportSx}>
          <UnsupportedEvaluationStructureAlert />
        </Box>
      ) : null}

      {showCollective && isAHPSortIAlternativeEvaluation ? (
        <AHPSortICollectiveAssignments
          presentation={stageData.collectiveGroupPresentation}
          selectedExpertId={selectedExpertId}
        />
      ) : null}
    </Box>
  );
};

export default EvaluationPluginPanel;
