import { Chip, List, ListItem, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

/**
 * Seccion Ranking del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const RankingSection = () => {
  const theme = useTheme();
  const { rankingSection } = useFinishedIssueDialogContext();
  const { viewIssue, ranking, lastIndex, formatScore, isScenarioSelected } = rankingSection;

  return (
    <SectionCard title="Results ranking" icon={<AssignmentTurnedInIcon fontSize="small" />}>
      {!viewIssue?.alternativesRankings ? (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          Ranking not available.
        </Typography>
      ) : ranking.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          {isScenarioSelected
            ? "No ranking output is available for this scenario."
            : "Ranking not available."}
        </Typography>
      ) : (
        <List sx={{ width: "100%" }} disablePadding>
          {ranking.map((item, index) => (
            <ListItem key={item.name} sx={{ px: 0, py: 0.9 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
                spacing={2}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 980, opacity: 0.9 }}>
                    {index + 1}.
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 980,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </Typography>
                </Stack>

                <Chip
                  label={formatScore(item.score)}
                  variant="outlined"
                  color={
                    index === 0 ? "success" : index === lastIndex ? "error" : "secondary"
                  }
                  sx={{
                    fontWeight: 950,
                    borderColor: "rgba(255,255,255,0.18)",
                    bgcolor: alpha(theme.palette.background.paper, 0.08),
                  }}
                />
              </Stack>
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  );
};

export default RankingSection;
