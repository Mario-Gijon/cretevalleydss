import { Paper, Stack, Typography } from "@mui/material";

import { detailCardSx } from "../../adminIssues/adminIssues.utils";

export default function SectionCard({ title, subtitle, children, action }) {
  return (
    <Paper elevation={0} sx={(theme) => ({ ...detailCardSx(theme), p: 1.35 })}>
      <Stack spacing={1.15}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={0.8}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                {subtitle}
              </Typography>
            )}
          </Stack>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
