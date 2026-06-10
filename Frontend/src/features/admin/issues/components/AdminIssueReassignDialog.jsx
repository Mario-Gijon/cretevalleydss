import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { getActiveIssuesAuroraBg } from "../../../activeIssues/styles/activeIssues.styles";
import AdminIssueInfoRow from "./AdminIssueInfoRow";

export default function AdminIssueReassignDialog({
  open,
  issueDetail,
  adminCandidates,
  adminsLoading,
  newAdminId,
  onClose,
  onNewAdminIdChange,
  onReassign,
}) {
  const theme = useTheme();

  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          ...getActiveIssuesAuroraBg(theme, 0.14),
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
            opacity: 0.18,
          },
        }}
      >
        <Box sx={{ p: 2.1, position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: "secondary.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <AdminPanelSettingsIcon />
            </Avatar>

            <Stack spacing={0.15}>
              <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                Reassign issue admin
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Change the creator/admin responsible for this issue.
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ p: 2.1 }}>
        <Stack spacing={1.35}>
          <AdminIssueInfoRow label="Issue" value={issueDetail?.name || "—"} />
          <AdminIssueInfoRow
            label="Current admin"
            value={
              issueDetail?.admin
                ? `${issueDetail.admin.name} (${issueDetail.admin.email})`
                : "—"
            }
          />

          <FormControl fullWidth size="small">
            <Select
              value={newAdminId}
              displayEmpty
              color="info"
              disabled={adminsLoading}
              onChange={(event) => onNewAdminIdChange(event.target.value)}
              sx={{
                borderRadius: 3,
                bgcolor: alpha(theme.palette.common.white, 0.04),
              }}
            >
              <MenuItem value="">Select new admin</MenuItem>
              {adminCandidates.map((admin) => (
                <MenuItem key={admin?.id} value={admin?.id}>
                  {admin?.name} — {admin?.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {adminsLoading ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              Loading admins...
            </Typography>
          ) : null}
        </Stack>

        <Divider sx={{ opacity: 0.12, my: 2 }} />

        <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1} justifyContent="flex-end">
          <Button onClick={onClose} color="warning" variant="outlined">
            Cancel
          </Button>

          <Button onClick={onReassign} color="secondary" variant="outlined">
            Reassign
          </Button>
        </Stack>
      </Box>
    </GlassDialog>
  );
}
