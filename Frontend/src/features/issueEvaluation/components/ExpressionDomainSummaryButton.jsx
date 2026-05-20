import { useMemo, useState } from "react";
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Popover,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { formatExpressionDomainLabel } from "../utils/expressionDomainDisplay.utils";

const ExpressionDomainSummaryButton = ({ criteria = [] }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const rows = useMemo(
    () =>
      (criteria || [])
        .filter((criterion) => criterion?.isLeaf)
        .map((criterion) => ({
          name: criterion?.name || "-",
          domain: criterion?.expressionDomain || null,
        }))
        .filter((row) => row.domain),
    [criteria]
  );

  if (rows.length === 0) return null;

  const open = Boolean(anchorEl);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<InfoOutlinedIcon fontSize="small" />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          borderColor: alpha(theme.palette.info.main, 0.45),
          color: "info.light",
          "&:hover": {
            borderColor: "info.main",
            backgroundColor: alpha(theme.palette.info.main, 0.12),
          },
        }}
      >
        Expression domains
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            mt: 0.8,
            minWidth: "auto",
            maxWidth: 460,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.92),
            backdropFilter: "blur(8px)",
          },
        }}
      >
        <List dense sx={{ pt: 0, pb: 0.6 }}>
          {rows.map((row) => (
            <ListItem key={row.name} sx={{ py: 0.45 }}>
              <ListItemText
                primary={row.name}
                secondary={formatExpressionDomainLabel(row.domain)}
                primaryTypographyProps={{ fontWeight: 700, variant: "body2" }}
                secondaryTypographyProps={{ variant: "caption", sx: { color: "info.light" } }}
              />
            </ListItem>
          ))}
        </List>
      </Popover>
    </>
  );
};

export default ExpressionDomainSummaryButton;

