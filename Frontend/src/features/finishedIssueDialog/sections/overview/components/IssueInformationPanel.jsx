import { Box, Chip, Stack, Typography } from "@mui/material";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";

import {
  overviewHeroSx,
  overviewInformationIconSx,
  overviewInformationRowSx,
  overviewIssueGridSx,
  overviewIssueRowsSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const InformationRow = ({
  icon,
  label,
  value,
  secondary,
  tone,
  valueNode,
}) => (
  <Box sx={overviewInformationRowSx}>
    <Box sx={overviewInformationIconSx(tone)}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          color: "text.secondary",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {label}
      </Typography>
      {valueNode || (
        <Typography
          noWrap
          title={String(value)}
          sx={{
            mt: 0.15,
            fontSize: 13.5,
            fontWeight: 900,
          }}
        >
          {value}
        </Typography>
      )}
      {secondary ? (
        <Typography
          noWrap
          title={secondary}
          sx={{
            mt: 0.1,
            color: "text.secondary",
            fontSize: 10.8,
            fontWeight: 600,
          }}
        >
          {secondary}
        </Typography>
      ) : null}
    </Box>
  </Box>
);

const IssueIllustration = () => (
  <Box sx={overviewHeroSx} aria-hidden="true">
    <Box
      sx={{
        position: "relative",
        width: 116,
        height: 136,
        display: "grid",
        placeItems: "center",
        borderRadius: 3,
        color: "secondary.light",
        bgcolor: "rgba(21, 112, 150, 0.30)",
        border: "1px solid rgba(86, 219, 225, 0.42)",
        boxShadow:
          "0 18px 42px rgba(0, 170, 215, 0.17), inset 0 1px 0 rgba(255,255,255,0.12)",
        transform: "perspective(500px) rotateY(-12deg) rotateX(4deg)",
      }}
    >
      <DescriptionRoundedIcon sx={{ fontSize: 65, opacity: 0.85 }} />
      <Box
        sx={{
          position: "absolute",
          right: -23,
          bottom: 12,
          width: 58,
          height: 58,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          color: "success.light",
          bgcolor: "rgba(10, 63, 75, 0.94)",
          border: "2px solid rgba(79, 213, 157, 0.72)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
        }}
      >
        <AssignmentTurnedInRoundedIcon sx={{ fontSize: 31 }} />
      </Box>
    </Box>
  </Box>
);

const IssueInformationPanel = ({ data }) => {
  const finished = data.issue.lifecycle?.active === false;

  return (
    <OverviewPanel
      title="Issue information"
      icon={<DescriptionRoundedIcon fontSize="small" />}
    >
      <Box sx={overviewIssueGridSx}>
        <Stack spacing={1}>
          <Box sx={overviewIssueRowsSx}>
            <InformationRow
              icon={<SubjectRoundedIcon fontSize="small" />}
              label="Name"
              value={data.issue.name || "—"}
            />
            <InformationRow
              icon={<PersonRoundedIcon fontSize="small" />}
              label="Owner"
              value={
                data.issue.owner?.name ||
                data.issue.owner?.email ||
                "—"
              }
              secondary={data.issue.owner?.email || null}
            />
            <InformationRow
              icon={<LayersRoundedIcon fontSize="small" />}
              label="Base model"
              value={data.configuration.baseModel.name || "—"}
            />
            <InformationRow
              icon={<CalendarMonthRoundedIcon fontSize="small" />}
              label="Creation date"
              value={formatDate(data.general.creationDate)}
            />
            <InformationRow
              icon={<CheckCircleRoundedIcon fontSize="small" />}
              label="Status"
              tone={finished ? "green" : "cyan"}
              valueNode={
                <Chip
                  size="small"
                  color={finished ? "success" : "secondary"}
                  variant="outlined"
                  icon={
                    finished ? (
                      <CheckCircleRoundedIcon />
                    ) : undefined
                  }
                  label={finished ? "Finished" : "Active"}
                  sx={{
                    mt: 0.25,
                    height: 24,
                    fontSize: 11.5,
                    fontWeight: 900,
                  }}
                />
              }
            />
          </Box>

          <Box
            sx={{
              pt: 1,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Stack direction="row" spacing={0.8} alignItems="flex-start">
              <Box sx={overviewInformationIconSx()}>
                <SubjectRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 11.5,
                    fontWeight: 750,
                  }}
                >
                  Description
                </Typography>
                <Typography
                  sx={{
                    mt: 0.4,
                    color: data.description
                      ? "text.primary"
                      : "text.secondary",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: 13,
                    lineHeight: 1.55,
                    fontWeight: 600,
                  }}
                >
                  {data.description || "No description was provided."}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>

        <IssueIllustration />
      </Box>
    </OverviewPanel>
  );
};

export default IssueInformationPanel;
