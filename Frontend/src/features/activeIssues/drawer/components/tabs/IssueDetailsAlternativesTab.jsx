import { Box, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ViewListIcon from "@mui/icons-material/ViewList";
import ActiveIssuesPill from "../../../components/shared/ActiveIssuesPill";
import { getIssueDetailsDrawerPanelSx } from "../shell/IssueDetailsDrawer.parts";

/**
 * Pestaña Alternatives del drawer de detalles del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Array} props.alternatives Lista de alternativas.
 * @returns {JSX.Element}
 */
const IssueDetailsAlternativesTab = ({ alternatives = [] }) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.5}>
      <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <ViewListIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Alternatives
          </Typography>
          <Box sx={{ flex: 1 }} />
          <ActiveIssuesPill tone="info">{alternatives.length}</ActiveIssuesPill>
        </Stack>

        {alternatives.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No alternatives defined.
          </Typography>
        ) : (
          <List disablePadding sx={{ mt: 0.25 }}>
            {alternatives.map((alternative, index) => {
              const name =
                typeof alternative === "string"
                  ? alternative
                  : alternative?.name || alternative?.title || `Alternative ${index + 1}`;

              return (
                <ListItem
                  key={`${name}_${index}`}
                  sx={{
                    borderRadius: 3,
                    mb: 0.75,
                    bgcolor: alpha(theme.palette.text.primary, 0.02),
                    "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
                  }}
                >
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 950 }}>{name}</Typography>}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Stack>
  );
};

export default IssueDetailsAlternativesTab;