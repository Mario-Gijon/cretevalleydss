import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";

import {
  overviewCriterionRowSx,
  overviewCriterionSurfaceSx,
} from "../overview.styles";

const formatWeight = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(4)).toString();
  }

  if (Array.isArray(value) && value.every(Number.isFinite)) {
    return `[${value
      .map((entry) => Number(entry.toFixed(3)))
      .join(", ")}]`;
  }

  if (typeof value === "string" && value.trim()) return value;

  if (value && typeof value === "object") {
    if (typeof value.label === "string" && value.label.trim()) {
      return value.label;
    }

    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return formatWeight(value.value);
    }
  }

  return null;
};

const CriteriaTreeNode = ({ criterion, depth = 0 }) => {
  const [open, setOpen] = useState(true);
  const children = Array.isArray(criterion.children)
    ? criterion.children
    : [];
  const hasChildren = children.length > 0;
  const weightLabel = formatWeight(criterion.weight);
  const typeLabel =
    criterion.type === "cost"
      ? "Cost"
      : criterion.type === "benefit"
        ? "Benefit"
        : null;

  return (
    <Box sx={overviewCriterionRowSx(depth, hasChildren)}>
      <Box className="criterion-surface" sx={overviewCriterionSurfaceSx}>
        {hasChildren ? (
          <IconButton
            size="small"
            aria-label={
              open
                ? `Collapse ${criterion.name}`
                : `Expand ${criterion.name}`
            }
            onClick={() => setOpen((current) => !current)}
            sx={{
              width: 25,
              height: 25,
              color: "secondary.light",
            }}
          >
            {open ? (
              <ExpandLessRoundedIcon fontSize="small" />
            ) : (
              <ExpandMoreRoundedIcon fontSize="small" />
            )}
          </IconButton>
        ) : (
          <RadioButtonUncheckedRoundedIcon
            sx={{
              ml: 0.45,
              mr: 0.45,
              color: "secondary.light",
              fontSize: 14,
            }}
          />
        )}

        <Box sx={{ minWidth: 120, flex: 1 }}>
          <Stack direction="row" spacing={0.55} alignItems="center">
            {hasChildren ? (
              <AccountTreeRoundedIcon
                sx={{ color: "secondary.light", fontSize: 16 }}
              />
            ) : null}
            <Typography
              variant="body2"
              noWrap
              title={criterion.name}
              sx={{
                minWidth: 0,
                fontWeight: hasChildren ? "fontWeightBold" : "fontWeightMedium",
              }}
            >
              {criterion.name}
            </Typography>
          </Stack>
          {criterion.description ? (
            <Typography
              variant="caption"
              noWrap
              title={criterion.description}
              sx={{
                mt: 0.1,
                color: "text.secondary",
              }}
            >
              {criterion.description}
            </Typography>
          ) : null}
        </Box>

        <Stack
          direction="row"
          spacing={0.45}
          useFlexGap
          flexWrap="wrap"
          justifyContent="flex-end"
        >
          {typeLabel ? (
            <Chip
              size="small"
              variant="outlined"
              color={criterion.type === "cost" ? "error" : "success"}
              label={typeLabel}
              sx={{ height: 23, fontWeight: "fontWeightBold" }}
            />
          ) : null}

          {weightLabel ? (
            <Chip
              size="small"
              variant="outlined"
              color="secondary"
              label={`Weight ${weightLabel}`}
              sx={{ height: 23, fontWeight: "fontWeightBold" }}
            />
          ) : null}

          {criterion.expressionDomain?.name ? (
            <Chip
              size="small"
              variant="outlined"
              label={criterion.expressionDomain.name}
              title={`Expression domain: ${criterion.expressionDomain.name}`}
              sx={{ height: 23, fontWeight: "fontWeightMedium" }}
            />
          ) : null}

          {hasChildren ? (
            <Chip
              size="small"
              variant="outlined"
              label={`${children.length} ${
                children.length === 1 ? "child" : "children"
              }`}
              sx={{ height: 23, fontWeight: "fontWeightMedium" }}
            />
          ) : null}
        </Stack>
      </Box>

      {hasChildren ? (
        <Collapse in={open} timeout="auto">
          <Box sx={{ pt: 0.65 }}>
            {children.map((child) => (
              <CriteriaTreeNode
                key={child.id}
                criterion={child}
                depth={depth + 1}
              />
            ))}
          </Box>
        </Collapse>
      ) : null}
    </Box>
  );
};

export default CriteriaTreeNode;
