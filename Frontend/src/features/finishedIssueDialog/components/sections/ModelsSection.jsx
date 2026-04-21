import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";
import LayersIcon from "@mui/icons-material/Layers";
import ScienceIcon from "@mui/icons-material/Science";

import ModelParamsView from "./shared/ModelParamsView";
import {
  Pill,
  SectionCard,
  SummaryAccordionRow,
} from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import ModelsSectionAddDialog from "./ModelsSectionAddDialog";

/**
 * Seccion Models del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const ModelsSection = () => {
  const theme = useTheme();

  const { modelsSection } = useFinishedIssueDialogContext();

  const {
    selectedRunKey,
    handleRemoveSelectedRun,
    handleSelectRun,
    runs,
    runsLoading,
    viewIssue,
    getRunId,
    getRunLabel,
    openParamsViewer,
    setOpenParamsViewer,
    baseModelName,
    selectedRunModelName,
    domainType,
    baseParamsForViewer,
    baseResolved,
    leafNames,
    selectedRunLabel,
    selectedParamsForViewer,
    selectedResolved,
    addDialog,
  } = modelsSection;

  return (
    <>
      <SectionCard
        title="Models"
        icon={<ScienceIcon fontSize="small" />}
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            {selectedRunKey !== "base" ? (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={handleRemoveSelectedRun}
                sx={{ borderColor: "rgba(255,255,255,0.16)" }}
              >
                Remove
              </Button>
            ) : null}

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={addDialog.openAddDialog}
              startIcon={<AddIcon />}
              sx={{ borderColor: "rgba(255,255,255,0.16)" }}
            >
              Add model
            </Button>
          </Stack>
        }
      >
        <Stack spacing={1.4}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Chip
              icon={<LayersIcon />}
              label="Base"
              clickable
              onClick={() => handleSelectRun("base")}
              color="secondary"
              variant={selectedRunKey === "base" ? "filled" : "outlined"}
              sx={{
                fontWeight: 950,
                borderColor: "rgba(255,255,255,0.18)",
                bgcolor:
                  selectedRunKey === "base"
                    ? alpha(theme.palette.secondary.main, 0.8)
                    : "transparent",
              }}
            />

            {runs.map((run) => {
              const id = getRunId(run);
              if (!id) return null;

              const label = getRunLabel(run);
              const selected = selectedRunKey === id;

              return (
                <Chip
                  key={id}
                  icon={<TuneIcon />}
                  label={label}
                  clickable
                  onClick={() => handleSelectRun(id)}
                  color="secondary"
                  variant={selected ? "filled" : "outlined"}
                  sx={{
                    fontWeight: 950,
                    borderColor: "rgba(255,255,255,0.18)",
                    bgcolor: selected
                      ? alpha(theme.palette.secondary.main, 0.8)
                      : "transparent",
                    maxWidth: 320,
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                />
              );
            })}
          </Stack>

          {runsLoading ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              Loading models…
            </Typography>
          ) : null}

          {selectedRunKey !== "base" && !viewIssue ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              This model run is not available yet.
            </Typography>
          ) : null}

          <Divider sx={{ opacity: 0.14 }} />

          <SummaryAccordionRow
            label="Parameters"
            open={openParamsViewer}
            onToggle={() => setOpenParamsViewer((value) => !value)}
            right={
              <Stack direction="row" spacing={1} alignItems="center">
                <Pill tone="secondary">
                  Method: {selectedRunKey === "base" ? baseModelName : selectedRunModelName}
                </Pill>
                <Pill tone="info">{domainType ? `Domain: ${domainType}` : "domain: —"}</Pill>
                {selectedRunKey === "base" ? (
                  <Pill tone="success">base</Pill>
                ) : (
                  <Pill tone="secondary">simulation</Pill>
                )}
              </Stack>
            }
          >
            <Stack spacing={1.25}>
              {selectedRunKey === "base" ? (
                viewIssue ? (
                  <ModelParamsView
                    title="Base"
                    modelName={baseModelName}
                    parameters={baseParamsForViewer}
                    values={baseResolved}
                    leafNames={leafNames}
                  />
                ) : (
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.background.paper, 0.08),
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary" }}>
                      This simulation is not available yet.
                    </Typography>
                  </Box>
                )
              ) : (
                <ModelParamsView
                  title={selectedRunLabel || "Simulation"}
                  modelName={selectedRunModelName}
                  parameters={selectedParamsForViewer}
                  values={selectedResolved}
                  leafNames={leafNames}
                />
              )}
            </Stack>
          </SummaryAccordionRow>
        </Stack>
      </SectionCard>

      <ModelsSectionAddDialog />
    </>
  );
};

export default ModelsSection;
