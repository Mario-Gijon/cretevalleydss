import {
  Alert,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import EvaluationStructureRenderer from "../../../../issueEvaluation/components/EvaluationStructureRenderer";
import {
  evaluationPluginPanelSx,
  evaluationPluginRendererViewportSx,
} from "../evaluations.styles";
import UnsupportedEvaluationStructureAlert from "./UnsupportedEvaluationStructureAlert";

const formatSubmittedAt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const EvaluationPluginPanel = ({
  stageData,
  showCollective,
  fullWidth = false,
}) => {
  if (!stageData.available) return null;
  const shouldRender =
    stageData.renderer?.structureKey &&
    (stageData.hasSelectedExpertSubmission ||
      (showCollective && stageData.canShowCollective));

  return (
    <Box sx={evaluationPluginPanelSx(fullWidth)}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-start" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Typography
              component="h2"
              sx={{ fontSize: 17, fontWeight: 950 }}
            >
              {stageData.title}
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              (read-only)
            </Typography>
            <InfoOutlinedIcon
              sx={{ color: "text.secondary", fontSize: 16 }}
            />
          </Stack>
          <Typography
            sx={{
              mt: 0.25,
              color: "text.secondary",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {stageData.subtitle}
          </Typography>
        </Box>

      </Stack>

      <Typography
        sx={{
          mt: 0.75,
          color: "text.secondary",
          fontSize: 11.5,
          fontWeight: 650,
          textAlign: { xs: "left", md: "right" },
        }}
      >
        Submitted: {formatSubmittedAt(stageData.individual?.submittedAt)}
      </Typography>

      {!stageData.hasSelectedExpertSubmission ? (
        <Alert severity="info" variant="outlined" sx={{ mt: 1, fontSize: 12 }}>
          {stageData.emptySubmissionMessage}
        </Alert>
      ) : null}

      {shouldRender ? (
        <Box sx={evaluationPluginRendererViewportSx}>
          <EvaluationStructureRenderer
            stage={stageData.renderer.stage}
            structureKey={stageData.renderer.structureKey}
            evaluationContext={stageData.renderer.evaluationContext}
            backendPayload={stageData.renderer.backendPayload}
            collectivePayload={
              showCollective
                ? stageData.renderer.collectivePayload
                : null
            }
            readOnly
          />
        </Box>
      ) : stageData.hasSelectedExpertSubmission ? (
        <Box sx={evaluationPluginRendererViewportSx}>
          <UnsupportedEvaluationStructureAlert />
        </Box>
      ) : null}
    </Box>
  );
};

export default EvaluationPluginPanel;
