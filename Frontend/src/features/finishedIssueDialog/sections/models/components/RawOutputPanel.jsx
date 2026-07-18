import { useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack, Typography } from "@mui/material";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { rawOutputPreSx, rawOutputShellSx } from "../models.styles.js";

const safePretty = (rawOutput) => {
  if (rawOutput === null || rawOutput === undefined) return null;
  if (typeof rawOutput === "string") {
    try { return JSON.stringify(JSON.parse(rawOutput), null, 2); } catch { return rawOutput; }
  }
  try { return JSON.stringify(rawOutput, null, 2); } catch { return String(rawOutput); }
};

const RawOutputPanel = ({ rawOutput }) => {
  const [expanded, setExpanded] = useState(false);
  const text = useMemo(() => safePretty(rawOutput), [rawOutput]);
  const copy = async () => {
    if (!text || !navigator.clipboard) return;
    try { await navigator.clipboard.writeText(text); } catch { /* Clipboard failures do not affect the workspace. */ }
  };

  return <Accordion expanded={expanded} onChange={(_, next) => setExpanded(next)} disableGutters sx={rawOutputShellSx}>
    <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
      <Stack direction="row" spacing={0.8} alignItems="center"><CodeRoundedIcon sx={{ color: "secondary.light" }} /><Box><Typography variant="subtitle1" sx={{ fontWeight: "fontWeightBold" }}>Raw output</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Complete technical output returned by this execution.</Typography></Box></Stack>
    </AccordionSummary>
    <AccordionDetails>
      {text ? <><Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.8 }}><Button size="small" color="secondary" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={copy}>Copy JSON</Button></Stack><Box component="pre" sx={rawOutputPreSx}>{text}</Box></> : <Typography variant="body2" color="text.secondary">No raw output is available.</Typography>}
    </AccordionDetails>
  </Accordion>;
};

export default RawOutputPanel;
