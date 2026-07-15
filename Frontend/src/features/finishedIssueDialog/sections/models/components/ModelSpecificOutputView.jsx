import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DataObjectIcon from "@mui/icons-material/DataObject";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";

const ModelSpecificOutputView = ({ rawOutput, rawOutputPretty, modelExecution }) => {
  const theme = useTheme();
  const hasOutput = rawOutput !== null && rawOutput !== undefined && (typeof rawOutput !== "object" || Array.isArray(rawOutput) || Object.keys(rawOutput).length > 0);
  if (!hasOutput) return <SectionCard title="Model-specific output" icon={<DataObjectIcon fontSize="small" />}><Typography variant="body2" color="text.secondary">No model-specific output is available for this execution.</Typography></SectionCard>;
  return <SectionCard title="Model-specific output" icon={<DataObjectIcon fontSize="small" />}><Stack spacing={1.2}><Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>Raw output returned by ApiModels for this execution.</Typography>{modelExecution ? <Stack spacing={0.45}>{[["Model", modelExecution.modelName], ["Key", modelExecution.modelKey], ["Executed", modelExecution.executedAt]].filter(([, value]) => value).map(([label, value]) => <Stack key={label} direction="row" spacing={0.9}><Typography variant="caption" sx={{ fontWeight: 950, color: "text.secondary" }}>{label}:</Typography><Typography variant="caption" sx={{ fontWeight: 850, color: "text.primary", wordBreak: "break-word" }}>{value}</Typography></Stack>)}</Stack> : null}<Accordion disableGutters elevation={0} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.06), border: "1px solid rgba(255,255,255,0.12)", borderRadius: 2.25, "&:before": { display: "none" }, overflow: "hidden" }}><AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } }}><Typography variant="body2" sx={{ fontWeight: 900 }}>Raw JSON</Typography></AccordionSummary><AccordionDetails sx={{ pt: 0, pb: 1.1 }}><Box component="pre" sx={{ m: 0, p: 1.25, borderRadius: 2, bgcolor: alpha(theme.palette.common.black, 0.26), border: "1px solid rgba(255,255,255,0.10)", maxHeight: 320, overflow: "auto", whiteSpace: "pre", wordBreak: "normal", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.45, color: alpha(theme.palette.common.white, 0.92) }}>{rawOutputPretty}</Box></AccordionDetails></Accordion></Stack></SectionCard>;
};

export default ModelSpecificOutputView;
