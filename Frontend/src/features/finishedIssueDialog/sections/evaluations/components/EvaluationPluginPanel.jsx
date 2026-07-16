import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import EvaluationStructureRenderer from "../../../../issueEvaluation/components/EvaluationStructureRenderer";
import {
  evaluationPluginPanelSx,
  evaluationPluginRendererViewportSx,
  evaluationsExpertControlSx,
} from "../evaluations.styles";
import UnsupportedEvaluationStructureAlert from "./UnsupportedEvaluationStructureAlert";

const formatSubmittedAt = (value) => {
  if (!value) return "Not submitted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const EvaluationPluginPanel = ({
  stageData,
  selectedExpertId,
  onSelectExpert,
  showCollective,
  fullWidth = false,
}) => {
  if (!stageData.available) return null;
  const expertLabelId = `finished-issue-${stageData.stage}-expert-label`;

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

        <Stack
          direction="row"
          spacing={0.8}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
        >
          <FormControl size="small" sx={evaluationsExpertControlSx}>
            <InputLabel id={expertLabelId}>Expert</InputLabel>
            <Select
              id={`finished-issue-${stageData.stage}-expert`}
              labelId={expertLabelId}
              value={selectedExpertId ?? ""}
              label="Expert"
              onChange={(event) => onSelectExpert(event.target.value)}
            >
              {stageData.expertOptions.map((expert) => (
                <MenuItem key={expert.id} value={expert.id}>
                  {expert.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {stageData.individual?.completed ? (
            <Chip
              size="small"
              variant="outlined"
              color="success"
              icon={<CheckCircleRoundedIcon />}
              label="Submitted"
              sx={{ height: 32, fontWeight: 850 }}
            />
          ) : null}
        </Stack>
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

      <Box sx={evaluationPluginRendererViewportSx}>
        {stageData.renderer?.structureKey ? (
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
        ) : (
          <UnsupportedEvaluationStructureAlert />
        )}
      </Box>
    </Box>
  );
};

export default EvaluationPluginPanel;
