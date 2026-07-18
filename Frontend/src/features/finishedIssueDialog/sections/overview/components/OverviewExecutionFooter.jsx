import { useState } from "react";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import { overviewFooterSx } from "../overview.styles";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
};

const FooterItem = ({ icon, label, value }) => (
  <Stack direction="row" spacing={0.65} alignItems="center">
    <Box sx={{ color: "secondary.light", display: "grid" }}>
      {icon}
    </Box>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
        fontWeight: "fontWeightBold",
      }}
    >
      {label}:
    </Typography>
    <Typography
      variant="caption"
      noWrap
      title={String(value)}
      sx={{ fontWeight: "fontWeightBold" }}
    >
      {value}
    </Typography>
  </Stack>
);

const OverviewExecutionFooter = ({ evidence }) => {
  const [copied, setCopied] = useState(false);
  const resultId = evidence.resultId || "—";

  const handleCopy = async () => {
    if (!evidence.resultId || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(String(evidence.resultId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box sx={overviewFooterSx}>
      <FooterItem
        icon={<AccessTimeRoundedIcon fontSize="small" />}
        label="Stored result"
        value={formatDateTime(evidence.storedAt)}
      />
      <FooterItem
        icon={<PersonRoundedIcon fontSize="small" />}
        label="Created by"
        value={evidence.executedBy || "—"}
      />
      <FooterItem
        icon={<LayersRoundedIcon fontSize="small" />}
        label="Execution"
        value={`${evidence.executionMode || "Base"}${
          evidence.phase === null ? "" : ` · Phase ${evidence.phase}`
        }`}
      />

      <Stack
        direction="row"
        spacing={0.7}
        alignItems="center"
        justifyContent={{ xs: "flex-start", lg: "flex-end" }}
        sx={{ minWidth: 0 }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: "fontWeightBold",
          }}
        >
          Result ID
        </Typography>
        <Box
          sx={{
            minWidth: 0,
            maxWidth: 430,
            flex: 1,
            px: 0.9,
            py: 0.55,
            borderRadius: 1.25,
            border: "1px solid rgba(255,255,255,0.08)",
            bgcolor: "rgba(255,255,255,0.02)",
          }}
        >
          <Typography
            noWrap
            title={resultId}
            sx={{
              fontFamily:
                '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
              fontSize: 11,
            }}
          >
            {resultId}
          </Typography>
        </Box>
        <Tooltip title={copied ? "Copied" : "Copy result ID"}>
          <span>
            <IconButton
              size="small"
              aria-label="Copy result ID"
              disabled={!evidence.resultId}
              onClick={handleCopy}
            >
              {copied ? (
                <CheckRoundedIcon
                  sx={{ color: "success.main", fontSize: 18 }}
                />
              ) : (
                <ContentCopyRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default OverviewExecutionFooter;
