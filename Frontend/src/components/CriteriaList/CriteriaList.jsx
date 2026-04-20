import { useState } from "react";
import { List, ListItem, ListItemButton, Collapse, Typography, Chip, Stack } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

export const CriterionItem = ({ criterion, depth = 0, isChild = false }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = Array.isArray(criterion.children) && criterion.children.length > 0;

  const handleToggle = () => setOpen((v) => !v);

  const indent = depth ? depth * 0.75 : 0;                              

  const Content = (
    <Stack direction="row" spacing={1} alignItems="center" width="100%" sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 850, flexGrow: 1, minWidth: 0 }}>
        {criterion.name}
      </Typography>

      {                                        }
      {!isChild && criterion.type ? (
        <Chip
          variant="outlined"
          label={criterion.type === "cost" ? "Cost" : "Benefit"}
          color={criterion.type === "cost" ? "error" : "success"}
          size="small"
        />
      ) : null}

      {                       }
      {criterion.isLeaf && criterion.weight != null ? (
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={Number(criterion.weight).toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
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
          {Content}
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
          {Content}
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
