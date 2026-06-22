import { useState } from "react";
import {
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Typography,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

const formatCriterionWeightLabel = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (Array.isArray(value) && value.every((entry) => Number.isFinite(entry))) {
    return `[${value
      .map((entry) =>
        Number(entry).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      )
      .join(", ")}]`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if (typeof value.label === "string" && value.label.trim()) {
      return value.label;
    }

    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return formatCriterionWeightLabel(value.value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

/**
 * Item recursivo para visualizar arbol de criterios en el summary.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const CriterionItem = ({ criterion, depth = 0, isChild = false }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = Array.isArray(criterion.children) && criterion.children.length > 0;

  const handleToggle = () => setOpen((value) => !value);
  const indent = depth ? depth * 0.75 : 0;

  const content = (
    <Stack direction="row" spacing={1} alignItems="center" width="100%" sx={{ minWidth: 0 }}>
      <Typography
        variant="body2"
        sx={{ color: "text.primary", fontWeight: 850, flexGrow: 1, minWidth: 0 }}
      >
        {criterion.name}
      </Typography>

      {!isChild && criterion.type ? (
        <Chip
          variant="outlined"
          label={criterion.type === "cost" ? "Cost" : "Benefit"}
          color={criterion.type === "cost" ? "error" : "success"}
          size="small"
        />
      ) : null}

      {criterion.isLeaf && criterion.weight != null ? (
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={formatCriterionWeightLabel(criterion.weight)}
        />
      ) : null}

      {hasChildren ? (open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />) : null}
    </Stack>
  );

  return (
    <>
      {hasChildren ? (
        <ListItemButton
          disableGutters
          onClick={handleToggle}
          sx={{
            px: 0,
            py: 0.35,
            pl: indent,
          }}
        >
          {content}
        </ListItemButton>
      ) : (
        <ListItem
          disableGutters
          sx={{
            px: 0,
            py: 0.35,
            pl: indent,
          }}
        >
          {content}
        </ListItem>
      )}

      {hasChildren ? (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding>
            {criterion.children.map((child, index) => (
              <CriterionItem key={index} criterion={child} depth={depth + 1} isChild />
            ))}
          </List>
        </Collapse>
      ) : null}
    </>
  );
};

export default CriterionItem;
