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
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body1" sx={{ color: "text.primary", flexGrow: 1 }}>
        {criterion.name}
      </Typography>

      {/* 🟢 Mostrar chip solo si es raíz */}
      {!isChild && (
        <Chip
          sx={{ p: 0, m: 0 }}
          variant="outlined"
          label={criterion.type === "cost" ? "Cost" : "Benefit"}
          color={criterion.type === "cost" ? "error" : "success"}
          size="small"
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

