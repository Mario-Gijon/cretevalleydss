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

import ActiveIssuesPill from "../../../components/shared/ActiveIssuesPill";
import { getIssueDetailsDrawerPanelSx } from "../shell/IssueDetailsDrawer.parts";

/**
 * Pestaña Experts del drawer de detalles del issue.
 *
 * Muestra los expertos agrupados por estado y permite
 * activar el modo edición para añadir o marcar expertos
 * para eliminar.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const IssueDetailsExpertsTab = ({
  selectedIssue,
  isEditingExperts,
  toggleEditExperts,
  expertsToRemove,
  markRemoveExpert,
  expertsToAdd,
  setOpenAddExpertsDialog,
  saveExpertsChanges,
  busy,
}) => {
  const theme = useTheme();

  const expertGroups = [
    { title: "Participated", list: selectedIssue?.participatedExperts || [] },
    {
      title: "Accepted (not evaluated)",
      list: selectedIssue?.acceptedButNotEvaluatedExperts || [],
    },
    { title: "Pending invitations", list: selectedIssue?.pendingExperts || [] },
    { title: "Declined", list: selectedIssue?.notAcceptedExperts || [] },
  ];

  return (
    <Stack spacing={1.5}>
      <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
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
                loading={busy.editExperts}
                onClick={saveExpertsChanges}
              >
                Save
              </LoadingButton>
            </>
          ) : null}
        </Stack>

        <Stack spacing={1.1} sx={{ mt: 1.5 }}>
          {expertGroups.map((block) => (
            <Accordion
              key={block.title}
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
                    {block.title}
                  </Typography>
                  <ActiveIssuesPill tone="info">{block.list.length}</ActiveIssuesPill>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0 }}>
                {block.list.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    —
                  </Typography>
                ) : (
                  <Stack spacing={0.8}>
                    {block.list.map((email) => (
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
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
              Experts to add: {expertsToAdd.length}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
};

export default IssueDetailsExpertsTab;