import { useState } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  Collapse,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const CriterionItem = ({ criterion, level = 2, isChild = false }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = criterion.children && criterion.children.length > 0;

  const handleToggle = () => setOpen(!open);

  const Content = (
    <Stack direction="row" spacing={1} alignItems="center" width="100%">
      <Typography variant="body1" sx={{ color: "text.primary", flexGrow: 1 }}>
        {criterion.name}
      </Typography>

      {/* CHIP TIPO COST / BENEFIT SOLO PARA RAÍCES */}
      {!isChild && criterion.type && (
        <Chip
          variant="outlined"
          label={criterion.type === "cost" ? "Cost" : "Benefit"}
          color={criterion.type === "cost" ? "error" : "success"}
          size="small"
        />
      )}

      
      {criterion.isLeaf && criterion.weight != null && (
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={Number(criterion.weight).toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}
        />
      )}


      {hasChildren && (open ? <ExpandLess /> : <ExpandMore />)}
    </Stack>
  );

  return (
    <>
      {hasChildren && !isChild ? (
        <ListItemButton sx={{ ml: level }} onClick={handleToggle}>
          {Content}
        </ListItemButton>
      ) : (
        <ListItem sx={{ ml: level }}>{Content}</ListItem>
      )}

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding>
            {criterion.children.map((child, index) => (
              <CriterionItem
                key={index}
                criterion={child}
                level={level + 2}
                isChild={true}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};


