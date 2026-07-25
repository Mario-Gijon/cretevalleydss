import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  Box,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { softIconBtnSx } from "../../../shared/evaluationStructure.styles";
import {
  buildCriterionToggleGroupSx,
  criterionSelectorSx,
} from "./CriterionSelector.styles";

const CriterionSelector = ({
  criteria = [],
  currentIndex = 0,
  onSelectCriterion,
  onPreviousCriterion,
  onNextCriterion,
}) => {
  const theme = useTheme();
  const hasMultipleCriteria = criteria.length > 1;
  const safeCurrentIndex = Math.max(
    0,
    Math.min(currentIndex, Math.max(0, criteria.length - 1))
  );
  const currentCriterion = criteria[safeCurrentIndex] || null;
  const currentTypeLabel = String(
    currentCriterion?.expressionDomain?.typeKey || ""
  );

  return (
    <Stack spacing={0.9} sx={criterionSelectorSx.container}>
      {hasMultipleCriteria ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={criterionSelectorSx.navigation}
        >
          <Box sx={criterionSelectorSx.toggleViewport}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={safeCurrentIndex}
              onChange={(_, value) => {
                if (typeof value === "number" && value >= 0) {
                  onSelectCriterion(value);
                }
              }}
              sx={buildCriterionToggleGroupSx(theme)}
            >
              {criteria.map((criterion, index) => (
                <ToggleButton key={criterion.id} value={index}>
                  {criterion.name || `Criterion ${index + 1}`}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <IconButton
            size="small"
            sx={softIconBtnSx(theme)}
            disabled={safeCurrentIndex <= 0}
            onClick={onPreviousCriterion}
          >
            <ArrowBackIosIcon fontSize="inherit" />
          </IconButton>
          <Typography variant="caption" sx={criterionSelectorSx.position}>
            {`${safeCurrentIndex + 1}/${criteria.length}`}
          </Typography>
          <IconButton
            size="small"
            sx={softIconBtnSx(theme)}
            disabled={safeCurrentIndex >= criteria.length - 1}
            onClick={onNextCriterion}
          >
            <ArrowForwardIosIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      ) : null}
      <Stack
        direction="row"
        spacing={0.8}
        alignItems="center"
        flexWrap="wrap"
      >
        <Typography variant="subtitle2" sx={criterionSelectorSx.name}>
          {currentCriterion?.name}
        </Typography>
        {currentTypeLabel ? (
          <Typography variant="caption" sx={criterionSelectorSx.type}>
            {currentTypeLabel}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
};

export default CriterionSelector;
