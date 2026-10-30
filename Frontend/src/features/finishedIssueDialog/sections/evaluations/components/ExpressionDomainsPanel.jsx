import { useState } from "react";
import {
  Box,
  ButtonBase,
  Chip,
  Collapse,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { ExpressionDomainPreview } from "../../../../createIssue/expressionDomains/components/ExpressionDomainPreview.jsx";
import {
  evaluationsPanelHeaderSx,
  evaluationsPanelSx,
  expressionDomainCardSx,
  expressionDomainCriteriaListSx,
  expressionDomainGridSx,
} from "../evaluations.styles";

const ExpressionDomainCard = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const criteriaListId = `expression-domain-criteria-${String(item.domainId)}`;
  const countLabel = `${item.criteriaCount} ${item.criteriaCount === 1 ? "criterion" : "criteria"}`;

  return (
    <Box sx={expressionDomainCardSx}>
      <Typography variant="body2" sx={{ fontWeight: "fontWeightBold", minWidth: 0, overflowWrap: "anywhere" }}>
        {item.domainName}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
        {item.domainDisplayMeta?.descriptor || item.domainTypeLabel || "—"}
      </Typography>

      <Box sx={{ mt: 0.85, minWidth: 0 }}>
        <ExpressionDomainPreview domain={item.domain} />
      </Box>

      <ButtonBase
        component="button"
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? criteriaListId : undefined}
        onClick={() => setExpanded((previous) => !previous)}
        sx={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          gap: 1,
          mt: 0.85,
          px: 0.3,
          py: 0.35,
          borderRadius: 1,
          color: "secondary.light",
          textAlign: "left",
          "&:hover": { bgcolor: "rgba(83,198,214,0.06)" },
          "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.light" },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Used by {countLabel}
        </Typography>
        <ExpandMoreRoundedIcon
          aria-hidden="true"
          sx={{
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        />
      </ButtonBase>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          id={criteriaListId}
          component="ul"
          sx={expressionDomainCriteriaListSx()}
        >
          {item.criteria.map((criterion, index) => (
            <li key={criterion.id ?? `${criterion.name}-${index}`}>
              <Typography component="span" variant="body2">
                {criterion.name}
              </Typography>
            </li>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

const ExpressionDomainsPanel = ({ domains }) => (
  <Box sx={evaluationsPanelSx}>
    <Box sx={evaluationsPanelHeaderSx}>
      <TuneRoundedIcon sx={{ color: "secondary.light", fontSize: 21 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2">
          Expression domains
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Domains shared by the leaf criteria that use them.
        </Typography>
      </Box>
      <Chip
        size="small"
        variant="outlined"
        color="secondary"
        label={domains.length}
        sx={{ ml: "auto", height: 24, fontWeight: 850 }}
      />
    </Box>

    {domains.length ? (
      <Box
        sx={expressionDomainGridSx(domains.length)}
        aria-label="Expression domains"
      >
        {domains.map((item) => (
          <ExpressionDomainCard key={item.domainId} item={item} />
        ))}
      </Box>
    ) : (
      <Typography variant="body2" color="text.secondary">
        No expression domains are assigned to leaf criteria.
      </Typography>
    )}
  </Box>
);

export default ExpressionDomainsPanel;
