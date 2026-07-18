import { Box, Chip, Stack, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  overviewConfigRowSx,
  overviewDomainListSx,
  overviewDomainSx,
  overviewInformationIconSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";

const ConfigRow = ({ icon, label, value, tone }) => (
  <Box sx={overviewConfigRowSx}>
    <Box sx={overviewInformationIconSx(tone)}>{icon}</Box>
    <Typography
      variant="caption"
      sx={{
        color: "text.secondary",
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      title={String(value)}
      sx={{
        minWidth: 0,
        overflowWrap: "anywhere",
        fontWeight: "fontWeightBold",
      }}
    >
      {value}
    </Typography>
  </Box>
);

const ConfigurationDomainsPanel = ({ configuration }) => {
  const weightingValue = configuration.criteriaWeighting.required
    ? configuration.criteriaWeighting.modelName ||
      configuration.criteriaWeighting.sourceLabel ||
      configuration.criteriaWeighting.structureLabel
    : "Not required";

  return (
    <OverviewPanel
      title="Configuration & domains"
      icon={<SettingsRoundedIcon fontSize="small" />}
      count={`${configuration.domainCount} ${configuration.domainCount === 1 ? "domain" : "domains"}`}
    >
      <Stack spacing={1}>
        <Box>
          <ConfigRow
            icon={<LayersRoundedIcon fontSize="small" />}
            label="Model"
            value={configuration.baseModel.name || "—"}
          />
          <ConfigRow
            icon={<ShieldOutlinedIcon fontSize="small" />}
            label="Consensus"
            value={configuration.consensus.enabled ? "Enabled" : "Disabled"}
            tone={configuration.consensus.enabled ? "green" : "cyan"}
          />
          <ConfigRow
            icon={<HubRoundedIcon fontSize="small" />}
            label="Alternative evaluation"
            value={
              configuration.alternativeEvaluation.structureLabel || "—"
            }
          />
          <ConfigRow
            icon={<TuneRoundedIcon fontSize="small" />}
            label="Criteria weighting"
            value={weightingValue || "—"}
          />
          <ConfigRow
            icon={<AccountTreeRoundedIcon fontSize="small" />}
            label="Domain assignments"
            value={`${configuration.assignedDomainCriteriaCount} criteria`}
          />
        </Box>

        {configuration.domains.length ? (
          <Stack data-testid="overview-domain-list" spacing={0.65} sx={overviewDomainListSx}>
            {configuration.domains.map((domain) => (
              <Box key={domain.id} sx={overviewDomainSx}>
                <Stack
                  direction="row"
                  spacing={0.55}
                  alignItems="center"
                  useFlexGap
                  flexWrap="wrap"
                >
                  <Typography variant="body2" sx={{ fontWeight: "fontWeightBold" }}>
                    {domain.name}
                  </Typography>
                  {domain.typeLabel && domain.typeLabel !== "—" ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      color="secondary"
                      label={domain.typeLabel}
                      sx={{ height: 22 }}
                    />
                  ) : null}
                </Stack>

                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.35,
                    color: "text.secondary",
                    lineHeight: 1.4,
                  }}
                >
                  {domain.criterionNames.length
                    ? domain.criterionNames.join(", ")
                    : "No criteria assigned"}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No expression-domain snapshots are available.
          </Typography>
        )}
      </Stack>
    </OverviewPanel>
  );
};

export default ConfigurationDomainsPanel;
