import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";

import { useIssueExpertsFlowContext } from "../context/issueExpertsFlow.context.js";
import { getIssueExpertsPanelSx } from "../styles/issueExperts.styles.js";
import IssueExpertsPill from "./IssueExpertsPill.jsx";
import { buildIssueExpertsGroups } from "../utils/issueExperts.groups.js";

/**
 * Sección principal del flujo de expertos del issue.
 *
 * Agrupa la visualización de expertos por estado y
 * las acciones de edición gestionadas por el feature
 * issueExperts.
 *
 * @returns {JSX.Element|null}
 */
const IssueExpertsSection = () => {
  const theme = useTheme();

  const {
    selectedIssue,
    isEditingExperts,
    toggleEditExperts,
    expertsToRemove,
    markRemoveExpert,
    expertsToAdd,
    setOpenAddExpertsDialog,
    saveExpertsChanges,
  } = useIssueExpertsFlowContext();

  if (!selectedIssue) {
    return null;
  }

  const expertGroups = buildIssueExpertsGroups(selectedIssue);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ ...getIssueExpertsPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <PeopleAltIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Experts
          </Typography>

          <Box sx={{ flex: 1 }} />

          <LoadingButton
            variant="outlined"
            color="secondary"
            startIcon={<EditOutlinedIcon />}
            onClick={toggleEditExperts}
          >
            {isEditingExperts ? "Cancel edit" : "Edit"}
          </LoadingButton>

          {isEditingExperts ? (
            <>
              <LoadingButton
                variant="outlined"
                color="info"
                startIcon={<PersonAddAlt1Icon />}
                onClick={() => setOpenAddExpertsDialog(true)}
              >
                Add
              </LoadingButton>

              <LoadingButton
                variant="outlined"
                color="warning"
                onClick={saveExpertsChanges}
              >
                Save
              </LoadingButton>
            </>
          ) : null}
        </Stack>

        <Stack spacing={1.1} sx={{ mt: 1.5 }}>
          {expertGroups.map((group) => (
            <Accordion
              key={group.key}
              disableGutters
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", width: "100%" }}
                >
                  <Typography sx={{ fontWeight: 950, flex: 1 }}>
                    {group.title}
                  </Typography>

                  <IssueExpertsPill tone="info">
                    {group.list.length}
                  </IssueExpertsPill>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0 }}>
                {group.list.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    —
                  </Typography>
                ) : (
                  <Stack spacing={0.8}>
                    {group.list.map((email) => (
                      <Stack
                        key={email}
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {email}
                        </Typography>

                        {isEditingExperts ? (
                          <LoadingButton
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<PersonRemoveAlt1Icon />}
                            onClick={() => markRemoveExpert(email)}
                            disabled={expertsToRemove.includes(email)}
                          >
                            {expertsToRemove.includes(email) ? "Marked" : "Remove"}
                          </LoadingButton>
                        ) : null}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        {Array.isArray(expertsToAdd) && expertsToAdd.length > 0 ? (
          <Box
            sx={{
              mt: 1.25,
              p: 1,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.info.main, 0.08),
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 900 }}
              >
                Experts to add: {expertsToAdd.length}
              </Typography>

              {expertsToAdd.map((email) => (
                <IssueExpertsPill key={email} tone="info">
                  {email}
                </IssueExpertsPill>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
};

export default IssueExpertsSection;