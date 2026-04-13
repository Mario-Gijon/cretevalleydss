import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CategoryIcon from "@mui/icons-material/Category";
import {
  getIssueDetailsDrawerPanelSx,
  IssueDetailsDrawerCriterionTree,
} from "../shell/IssueDetailsDrawer.parts";
import { formatIssueDrawerWeight } from "../utils/issueDetailsDrawer.utils";
import ActiveIssuesPill from "../../shared/ActiveIssuesPill";

/**
 * Pestaña Criteria del drawer de detalles del issue.
 *
 * Muestra el árbol de criterios y, cuando existen,
 * los pesos finales visibles para los nodos hoja.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.selectedIssue Issue seleccionado.
 * @param {number} props.criteriaCount Número de criterios hoja.
 * @param {Object} props.finalWeights Pesos finales visibles.
 * @returns {JSX.Element}
 */
const IssueDetailsCriteriaTab = ({
  selectedIssue,
  criteriaCount,
  finalWeights,
}) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.5}>
      <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <CategoryIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Criteria
          </Typography>
          <Box sx={{ flex: 1 }} />
          <ActiveIssuesPill tone="info">{criteriaCount}</ActiveIssuesPill>
        </Stack>

        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          Leaf nodes show final weight (if computed).
        </Typography>

        <Box sx={{ mt: 1.25 }}>
          <IssueDetailsDrawerCriterionTree
            nodes={selectedIssue?.criteria || []}
            finalWeights={finalWeights}
            formatWeight={formatIssueDrawerWeight}
          />
        </Box>
      </Box>
    </Stack>
  );
};

export default IssueDetailsCriteriaTab;