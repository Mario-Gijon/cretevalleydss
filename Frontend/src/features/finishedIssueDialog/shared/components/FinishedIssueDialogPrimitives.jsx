import { Box, Stack, Typography, Avatar } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { GlassPaper } from "../../../../components/StyledComponents/GlassPaper";
import {
  getFinishedIssueDialogAuroraBg,
  getFinishedIssueDialogGlassSx,
} from "../../styles/finishedIssueDialog.styles";

/**
 * Card base de seccion del dialogo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const SectionCard = ({ title, icon, right, children, sx }) => {
  const theme = useTheme();

  return (
    <GlassPaper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: { xs: 1.5, md: 2 },
        ...getFinishedIssueDialogGlassSx(theme),
        ...getFinishedIssueDialogAuroraBg(theme, 0.08),
        position: "relative",
        overflow: "hidden",
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(
            theme.palette.common.white,
            0.1
          )}, transparent 15%)`,
          opacity: 0.22,
        },
        ...(sx || {}),
      }}
    >
      {(title || right) && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25, position: "relative", zIndex: 1 }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            {icon ? (
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {icon}
              </Avatar>
            ) : null}

            {title ? (
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 980, lineHeight: 1, whiteSpace: "nowrap" }}
              >
                {title}
              </Typography>
            ) : null}
          </Stack>

          {right ? <Box sx={{ position: "relative", zIndex: 1 }}>{right}</Box> : null}
        </Stack>
      )}

      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
    </GlassPaper>
  );
};
