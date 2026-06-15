import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { sectionSx } from "../../styles/alternativeEvaluationDialog.styles";

const AlternativeCriteriaMatrixDialogFrame = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        ...sectionSx(theme),
        maxWidth: 1400,
        mx: "auto",
        p: { xs: 1, sm: 1.5 },
      }}
    >
      {children}
    </Box>
  );
};

export default AlternativeCriteriaMatrixDialogFrame;
