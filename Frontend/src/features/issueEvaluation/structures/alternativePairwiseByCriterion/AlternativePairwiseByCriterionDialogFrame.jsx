import { Box, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { sectionSx } from "../../styles/alternativeEvaluationDialog.styles";

const AlternativePairwiseByCriterionDialogFrame = ({ children }) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.25} sx={{ maxWidth: 1200, mx: "auto" }}>
      <Box
        sx={{
          ...sectionSx(theme),
          p: { xs: 1, sm: 1.5 },
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Stack>
  );
};

export default AlternativePairwiseByCriterionDialogFrame;
