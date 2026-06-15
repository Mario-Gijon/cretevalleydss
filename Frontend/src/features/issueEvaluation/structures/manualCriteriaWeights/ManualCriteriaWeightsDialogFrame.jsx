import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
  inputSx,
  sectionSx,
} from "../../styles/weightEvaluationDialog.styles";

const ManualCriteriaWeightsDialogFrame = ({ children }) => {
  const theme = useTheme();

  return (
    <Stack spacing={2.2} sx={{ maxWidth: 900, mx: "auto" }}>
      <Box sx={sectionSx(theme)}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Rate each criterion between 0 and 1
          </Typography>

          <Box sx={{ ...inputSx(theme), p: 0 }}>{children}</Box>
        </Stack>
      </Box>
    </Stack>
  );
};

export default ManualCriteriaWeightsDialogFrame;
