import { Box, Stack, Typography } from "@mui/material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ViewInArRoundedIcon from "@mui/icons-material/ViewInArRounded";

import {
  overviewAlternativeRowSx,
  overviewInformationIconSx,
  overviewScrollableListSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";

const AlternativesPanel = ({ alternatives }) => (
  <OverviewPanel
    title="Alternatives"
    icon={<CategoryOutlinedIcon fontSize="small" />}
    count={alternatives.length}
  >
    {alternatives.length ? (
      <Stack data-testid="overview-alternatives-list" spacing={0.75} sx={overviewScrollableListSx}>
        {alternatives.map((alternative, index) => (
          <Box key={alternative.id} sx={overviewAlternativeRowSx}>
            <Box sx={overviewInformationIconSx()}>
              <ViewInArRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                title={alternative.name}
                sx={{ fontSize: 13.5, fontWeight: 900 }}
              >
                {alternative.name}
              </Typography>
              {alternative.description ? (
                <Typography
                  title={alternative.description}
                  sx={{
                    mt: 0.15,
                    color: "text.secondary",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontSize: 11.5,
                    lineHeight: 1.4,
                  }}
                >
                  {alternative.description}
                </Typography>
              ) : null}
            </Box>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {alternative.position ?? index + 1}
            </Typography>
          </Box>
        ))}
      </Stack>
    ) : (
      <Typography color="text.secondary">
        No alternatives are available.
      </Typography>
    )}
  </OverviewPanel>
);

export default AlternativesPanel;
