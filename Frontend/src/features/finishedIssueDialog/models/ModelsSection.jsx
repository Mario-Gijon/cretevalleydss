import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ScienceIcon from "@mui/icons-material/Science";

import ModelParamsView from "./components/ModelParamsView";
import {
  Pill,
  SectionCard,
  SummaryAccordionRow,
} from "../shared/components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { buildParameterContext } from "../../modelParameters/logic/buildModelParameterContext";

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
    runsLoading,
    viewIssue,
    openParamsViewer,
    setOpenParamsViewer,
    baseModelName,
    selectedRunModelName,
    domainType,
    baseParamsForViewer,
    baseResolved,
    criteriaTree,
    leafCriteria,
    selectedRunLabel,
    selectedParamsForViewer,
    selectedResolved,
  } = modelsSection;
  const parameterContext = buildParameterContext({
    model: selectedRunKey === "base"
      ? {
          id: viewIssue?.modelParams?.base?.modelId || null,
          name: baseModelName,
          apiModelKey: null,
        }
      : {
          id: null,
          name: selectedRunModelName,
          apiModelKey: null,
        },
    criteriaTree: Array.isArray(criteriaTree) ? criteriaTree : [],
    leafCriteria: Array.isArray(leafCriteria) ? leafCriteria : [],
    alternatives: [],
  });

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

          </Stack>
        }
      >
        <Stack spacing={1.4}>
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
                    parameterContext={parameterContext}
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
                  parameterContext={parameterContext}
                />
              )}
            </Stack>
          </SummaryAccordionRow>
        </Stack>
      </SectionCard>

    </>
  );
};

export default ModelsSection;
