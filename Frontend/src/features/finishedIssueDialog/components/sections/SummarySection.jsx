import { Box, Divider, List, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import { CriterionItem } from "../shared/CriterionItem";
import {
  Pill,
  Row,
  SectionCard,
  SummaryAccordionRow,
} from "../shared/FinishedIssueDialogPrimitives";
import ModelParamsView from "./shared/ModelParamsView";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

/**
 * Seccion Summary del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const SummarySection = () => {
  const theme = useTheme();

  const { summarySection } = useFinishedIssueDialogContext();

  const {
    viewIssue,
    selectedModelNameView,
    paramsPretty,
    summaryParamsForViewer,
    summaryResolvedParams,
    leafNames,
    openDescriptionList,
    setOpenDescriptionList,
    openCriteriaList,
    setOpenCriteriaList,
    openAlternativeList,
    setOpenAlternativesList,
    openConsensusInfoList,
    setOpenConsensusInfoList,
    openExpertsList,
    setOpenExpertsList,
    totalExperts,
    participated,
    notAccepted,
  } = summarySection;
  const hasSummaryParams =
    (Array.isArray(summaryParamsForViewer) && summaryParamsForViewer.length > 0) ||
    (summaryResolvedParams &&
      typeof summaryResolvedParams === "object" &&
      Object.keys(summaryResolvedParams).length > 0);
  const shouldShowRaw = Boolean(paramsPretty) && paramsPretty !== "{}";

  return (
    <SectionCard title="Summary" icon={<AssignmentTurnedInIcon fontSize="small" />}>
      <Stack spacing={1.1}>
        <Row label="Name" value={viewIssue?.summary?.name} />
        <Row label="Admin" value={viewIssue?.summary?.admin} />

        <SummaryAccordionRow
          label="Description"
          open={openDescriptionList}
          onToggle={() => setOpenDescriptionList((value) => !value)}
        >
          <Typography variant="body2" sx={{ fontWeight: 850, color: "text.primary" }}>
            {viewIssue?.summary?.description || "—"}
          </Typography>
        </SummaryAccordionRow>

        <Row label="Model" value={selectedModelNameView} />

        {hasSummaryParams ? (
          <SummaryAccordionRow
            label="Model params"
            open={openConsensusInfoList}
            onToggle={() => setOpenConsensusInfoList((value) => !value)}
          >
            <Stack spacing={1}>
              <ModelParamsView
                parameters={summaryParamsForViewer}
                values={summaryResolvedParams}
                leafNames={leafNames}
              />
              {shouldShowRaw ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.25,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.paper, 0.08),
                    border: "1px solid rgba(255,255,255,0.10)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 12,
                    fontWeight: 800,
                    color: alpha("#fff", 0.9),
                  }}
                >
                  {paramsPretty}
                </Box>
              ) : null}
            </Stack>
          </SummaryAccordionRow>
        ) : null}

        {Array.isArray(viewIssue?.summary?.criteria) &&
        viewIssue.summary.criteria.length > 1 ? (
          <SummaryAccordionRow
            label="Criteria"
            open={openCriteriaList}
            onToggle={() => setOpenCriteriaList((value) => !value)}
          >
            <List disablePadding sx={{ py: 0.25 }}>
              {viewIssue.summary.criteria.map((criterion, index) => (
                <CriterionItem key={index} criterion={criterion} isChild={false} />
              ))}
            </List>
          </SummaryAccordionRow>
        ) : (
          <Row label="Criterion" value={viewIssue?.summary?.criteria?.[0]?.name} />
        )}

        <SummaryAccordionRow
          label="Alternatives"
          open={openAlternativeList}
          onToggle={() => setOpenAlternativesList((value) => !value)}
        >
          <Stack spacing={0.5}>
            {(viewIssue?.summary?.alternatives || []).map((alternative, index) => (
              <Typography key={index} variant="body2" sx={{ fontWeight: 850 }}>
                {alternative}
              </Typography>
            ))}
          </Stack>
        </SummaryAccordionRow>

        <SummaryAccordionRow
          label="Experts"
          open={openExpertsList}
          onToggle={() => setOpenExpertsList((value) => !value)}
          right={<Pill tone="info">{totalExperts}</Pill>}
        >
          <Stack spacing={1}>
            <Stack spacing={0.5}>
              {participated.map((expert, index) => (
                <Typography key={index} variant="body2" sx={{ fontWeight: 850 }}>
                  {expert}
                </Typography>
              ))}
            </Stack>

            {notAccepted.length ? (
              <>
                <Divider sx={{ opacity: 0.14 }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 950, color: "text.secondary" }}
                >
                  Not accepted
                </Typography>
                <Stack spacing={0.5}>
                  {notAccepted.map((expert, index) => (
                    <Typography key={index} variant="body2" sx={{ fontWeight: 850 }}>
                      {expert}
                    </Typography>
                  ))}
                </Stack>
              </>
            ) : null}
          </Stack>
        </SummaryAccordionRow>

        <Row label="Creation date" value={viewIssue?.summary?.creationDate} />
        {viewIssue?.summary?.closureDate ? (
          <Row label="Closure date" value={viewIssue.summary.closureDate} />
        ) : null}

        {viewIssue?.summary?.consensusInfo ? (
          <>
            <Divider sx={{ opacity: 0.14 }} />
            <Row
              label="Consensus threshold"
              value={viewIssue.summary.consensusInfo.threshold}
            />
            <Row
              label="Consensus max phases"
              value={viewIssue.summary.consensusInfo.maxPhases}
            />
            <Row
              label="Consensus reached phase"
              value={viewIssue.summary.consensusInfo.consensusReachedPhase ?? "—"}
            />
            <Row
              label="Finalization reason"
              value={viewIssue.summary.consensusInfo.finalizationReason ?? "—"}
            />
            <Row
              label="Final consensus"
              value={viewIssue.summary.consensusInfo.finalConsensusMeasure ?? "—"}
            />
          </>
        ) : null}
      </Stack>
    </SectionCard>
  );
};

export default SummarySection;
