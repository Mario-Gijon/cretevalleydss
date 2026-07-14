import { Box, Divider, List, Stack, Typography } from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import { CriterionItem } from "./components/CriterionItem";
import {
  Pill,
  Row,
  SectionCard,
  SummaryAccordionRow,
} from "../components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { formatConsensusRoundLabel } from "../logic/formatConsensusRoundLabel";
import { buildFinishedIssueSummaryData } from "../logic/buildFinishedIssueSummaryData";

/**
 * Seccion Summary del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const SummarySection = () => {
  const { summarySection } = useFinishedIssueDialogContext();

  const {
    viewIssue,
    selectedModelNameView,
    openDescriptionList,
    setOpenDescriptionList,
    openCriteriaList,
    setOpenCriteriaList,
    openAlternativeList,
    setOpenAlternativesList,
    openExpertsList,
    setOpenExpertsList,
    totalExperts,
    participated,
    notAccepted,
  } = summarySection;
  const data = buildFinishedIssueSummaryData({
    viewIssue,
    selectedModelName: selectedModelNameView,
    reachedPhaseLabel: viewIssue?.summary?.consensusInfo?.consensusReachedPhase !== undefined
      ? formatConsensusRoundLabel(viewIssue.summary.consensusInfo.consensusReachedPhase)
      : "—",
  });

  return (
    <SectionCard title="Summary" icon={<AssignmentTurnedInIcon fontSize="small" />}>
      <Stack spacing={1.4}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
          <Row label="Name" value={data.general.name} />
          <Row label="Owner" value={data.general.owner} />
          <Row label="Model" value={data.general.model} />
          <Row label="Creation date" value={data.general.creationDate} />
          {data.general.closureDate ? (
            <Row label="Closure date" value={data.general.closureDate} />
          ) : null}
        </Box>

        <SummaryAccordionRow
          label="Description"
          open={openDescriptionList}
          onToggle={() => setOpenDescriptionList((value) => !value)}
        >
          <Typography variant="body2" sx={{ fontWeight: 850, color: "text.primary", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {data.description || "—"}
          </Typography>
        </SummaryAccordionRow>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {data.criteria.length ? (
          <SummaryAccordionRow
            label="Criteria"
            open={openCriteriaList}
            onToggle={() => setOpenCriteriaList((value) => !value)}
          >
            <List disablePadding sx={{ py: 0.25 }}>
              {data.criteria.map((criterion, index) => (
                <CriterionItem key={criterion?.id || criterion?._id || index} criterion={criterion} isChild={false} />
              ))}
            </List>
          </SummaryAccordionRow>
        ) : null}

        <SummaryAccordionRow
          label="Alternatives"
          open={openAlternativeList}
          onToggle={() => setOpenAlternativesList((value) => !value)}
        >
          <Stack spacing={0.5}>
            {data.alternatives.map((alternative, index) => {
              return <Stack key={alternative.id || index} spacing={0.1}><Typography variant="body2" sx={{ fontWeight: 850 }}>{alternative.name}</Typography>{alternative.description ? <Typography variant="caption" color="text.secondary">{alternative.description}</Typography> : null}</Stack>;
            })}
          </Stack>
        </SummaryAccordionRow>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: viewIssue?.summary?.consensusInfo ? "repeat(2, minmax(0, 1fr))" : "1fr" }, gap: 2 }}><SummaryAccordionRow
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

        {viewIssue?.summary?.consensusInfo ? (
          <Box>
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
              value={
                Number.isInteger(viewIssue.summary.consensusInfo.consensusReachedPhase)
                  ? formatConsensusRoundLabel(
                      viewIssue.summary.consensusInfo.consensusReachedPhase
                    )
                  : "—"
              }
            />
            <Row
              label="Finalization reason"
              value={viewIssue.summary.consensusInfo.finalizationReason ?? "—"}
            />
            <Row
              label="Final consensus"
              value={viewIssue.summary.consensusInfo.finalConsensusMeasure ?? "—"}
            />
          </Box>
        ) : null}
        </Box>
      </Stack>
    </SectionCard>
  );
};

export default SummarySection;
