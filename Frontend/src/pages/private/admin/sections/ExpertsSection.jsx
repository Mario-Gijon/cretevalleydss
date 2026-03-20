import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Backdrop,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import { auroraBg, glassSx as glassSxBase } from "../../../../components/ActiveIssuesHeader/ActiveIssuesHeader";
import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { removeAccents } from "../../../../utils/createIssueUtils";

import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../../../controllers/adminController";

/* --------------------------------
 * Helpers
 * -------------------------------- */

const normalize = (v) => removeAccents(String(v ?? "").toLowerCase().trim());

const formatDateTime = (value) => {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
};

const toneColor = (theme, tone) => {
  if (tone === "success") return theme.palette.success.main;
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "error") return theme.palette.error.main;
  if (tone === "secondary") return theme.palette.secondary.main;
  return theme.palette.info.main;
};

const pillSx = (theme, tone = "info") => {
  const c = toneColor(theme, tone);
  return {
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    bgcolor: alpha(c, 0.1),
    borderColor: alpha(c, 0.25),
    color: "text.secondary",
  };
};

const sectionPanelSx = (theme) => ({
  borderRadius: 4,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, 0.2, "crystal"),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
    opacity: 0.18,
  },
});

const emptyForm = {
  id: "",
  name: "",
  university: "",
  email: "",
  password: "",
  accountConfirm: true,
  role: "user",
};

function RolePill({ role }) {
  const theme = useTheme();
  const tone = role === "admin" ? "secondary" : "info";
  return (
    <Chip
      label={role || "user"}
      size="small"
      variant="outlined"
      sx={pillSx(theme, tone)}
    />
  );
}

function StatusPill({ confirmed }) {
  const theme = useTheme();
  return (
    <Chip
      label={confirmed ? "Confirmed" : "Pending"}
      size="small"
      variant="outlined"
      sx={pillSx(theme, confirmed ? "success" : "warning")}
    />
  );
}

/* --------------------------------
 * Main section
 * -------------------------------- */

export default function ExpertsSection() {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [experts, setExperts] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [form, setForm] = useState(emptyForm);

  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    expert: null,
  });

  const fetchExpertsData = async ({ keepLoading = false } = {}) => {
    try {
      if (keepLoading) setRefreshing(true);
      else setLoading(true);

      const res = await getAllUsers({ includeAdmins: true });

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error fetching users", "error");
        setExperts([]);
        return;
      }

      setExperts(Array.isArray(res.users) ? res.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching users", "error");
      setExperts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpertsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredExperts = useMemo(() => {
    const q = normalize(search);

    return (experts || []).filter((expert) => {
      const matchesSearch =
        !q ||
        normalize(expert?.name).includes(q) ||
        normalize(expert?.email).includes(q) ||
        normalize(expert?.university).includes(q) ||
        normalize(expert?.role).includes(q) ||
        normalize(expert?.accountCreation).includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "confirmed"
            ? Boolean(expert?.accountConfirm)
            : !expert?.accountConfirm;

      return matchesSearch && matchesStatus;
    });
  }, [experts, search, statusFilter]);

  const openCreate = () => {
    setFormMode("create");
    setForm({ ...emptyForm, accountConfirm: true, role: "user" });
    setFormOpen(true);
  };

  const openEdit = (expert) => {
    setFormMode("edit");
    setForm({
      id: expert?.id || "",
      name: expert?.name || "",
      university: expert?.university || "",
      email: expert?.email || "",
      password: "",
      accountConfirm: Boolean(expert?.accountConfirm),
      role: expert?.role || "user",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
  };

  const onChangeForm = (field) => (e) => {
    const value = field === "accountConfirm" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      showSnackbarAlert("Name is required", "error");
      return;
    }

    if (!form.university?.trim()) {
      showSnackbarAlert("University is required", "error");
      return;
    }

    if (!form.email?.trim()) {
      showSnackbarAlert("Email is required", "error");
      return;
    }

    if (formMode === "create" && !form.password?.trim()) {
      showSnackbarAlert("Password is required", "error");
      return;
    }

    setBusy(true);

    try {
      let res;

      if (formMode === "create") {
        res = await createUser({
          name: form.name,
          university: form.university,
          email: form.email,
          password: form.password,
          accountConfirm: form.accountConfirm,
          role: form.role,
        });
      } else {
        res = await updateUser({
          id: form.id,
          name: form.name,
          university: form.university,
          email: form.email,
          password: form.password,
          accountConfirm: form.accountConfirm,
          role: form.role,
        });
      }

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error saving user", "error");
        return;
      }

      showSnackbarAlert(res.msg || "User saved successfully", "success");
      closeForm();
      await fetchExpertsData({ keepLoading: true });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error saving user", "error");
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (expert) => {
    setConfirmDelete({
      open: true,
      expert,
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete?.expert?.id) return;

    setBusy(true);

    try {
      const res = await deleteUser(confirmDelete.expert.id);

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error deleting user", "error");
        return;
      }

      showSnackbarAlert(res.msg || "User deleted successfully", "success");
      setConfirmDelete({ open: false, expert: null });
      await fetchExpertsData({ keepLoading: true });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error deleting user", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <CircularLoading color="secondary" size={44} height="28vh" />;
  }

  return (
    <>
      <Backdrop open={busy} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={46} height="50vh" />
      </Backdrop>

      <Stack spacing={1}>
        <Paper elevation={0} sx={{ ...sectionPanelSx(theme), p: 1 }}>
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Stack
              direction={{ xs: "column", xl: "row" }}
              spacing={1.2}
              alignItems={{ xs: "stretch", xl: "center" }}
              justifyContent="space-between"
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <TextField
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, university..."
                  autoComplete="off"
                  color="info"
                  sx={{
                    minWidth: { xs: "100%", md: 420 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ opacity: 0.72 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={statusFilter}
                    color="info"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    }}
                  >
                    <MenuItem value="all">All statuses</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>

                <Tooltip title="Refresh users">
                  <span>
                    <Button
                      variant="outlined"
                      color="info"
                      startIcon={<RefreshIcon />}
                      onClick={() => fetchExpertsData({ keepLoading: true })}
                      disabled={refreshing}
                      sx={{ borderRadius: 999, fontWeight: 900 }}
                    >
                      Refresh
                    </Button>
                  </span>
                </Tooltip>

                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={openCreate}
                  sx={{ borderRadius: 999, fontWeight: 950 }}
                >
                  New user
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ backgroundColor: "transparent" }}>
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <TableContainer
              sx={{
                maxHeight: "64vh",
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                bgcolor: alpha(theme.palette.common.white, 0.02),
                overflow: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
                "&::-webkit-scrollbar": { width: 8, height: 8 },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: alpha(theme.palette.common.white, 0.16),
                  borderRadius: 999,
                  border: "2px solid transparent",
                  backgroundClip: "content-box",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: alpha(theme.palette.common.white, 0.24),
                },
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      "User",
                      "Email",
                      "University",
                      "Role",
                      "Status",
                      "Created",
                      "Active",
                      "Finished",
                      "Domains",
                      "Own issues",
                      "Actions",
                    ].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          fontWeight: 950,
                          color: alpha(theme.palette.common.white, 0.84),
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                          bgcolor: "#1a2a2fcf",
                          py: 1.1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredExperts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        sx={{
                          py: 4,
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Stack spacing={0.6} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                            No users found
                          </Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            Try another search or create a new user.
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExperts.map((expert) => {
                      const ownIssues = expert?.stats?.ownedIssues?.total || 0;
                      const blockDelete = ownIssues > 0;

                      return (
                        <TableRow key={expert.id}>
                          <TableCell
                            sx={{
                              borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                              py: 1.15,
                              minWidth: 220,
                            }}
                          >
                            <Stack direction="row" spacing={1.1} alignItems="center">
                              <Avatar
                                sx={{
                                  width: 38,
                                  height: 38,
                                  bgcolor:
                                    expert?.role === "admin"
                                      ? alpha(theme.palette.secondary.main, 0.14)
                                      : alpha(theme.palette.info.main, 0.12),
                                  color: expert?.role === "admin" ? "secondary.main" : "info.main",
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  fontWeight: 950,
                                }}
                              >
                                {expert?.role === "admin"
                                  ? <AdminPanelSettingsIcon fontSize="small" />
                                  : String(expert?.name || "?").slice(0, 1).toUpperCase()}
                              </Avatar>

                              <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 950,
                                    color: alpha(theme.palette.common.white, 0.92),
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {expert?.name || "Unnamed user"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "text.secondary", fontWeight: 850 }}
                                >
                                  ID: {expert?.id}
                                </Typography>
                              </Stack>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, whiteSpace: "nowrap" }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <MailOutlineIcon sx={{ fontSize: 16, opacity: 0.72 }} />
                              <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                {expert?.email || "—"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, whiteSpace: "nowrap" }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <SchoolOutlinedIcon sx={{ fontSize: 16, opacity: 0.72 }} />
                              <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                {expert?.university || "—"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <RolePill role={expert?.role} />
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <StatusPill confirmed={expert?.accountConfirm} />
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, minWidth: 180 }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <AccessTimeOutlinedIcon sx={{ fontSize: 16, opacity: 0.72 }} />
                              <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                {formatDateTime(expert?.accountCreation)}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell align="center" sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <Chip
                              label={expert?.stats?.activeIssues || 0}
                              size="small"
                              variant="outlined"
                              sx={pillSx(theme, (expert?.stats?.activeIssues || 0) > 0 ? "warning" : "info")}
                            />
                          </TableCell>

                          <TableCell align="center" sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <Chip
                              label={expert?.stats?.finishedIssues || 0}
                              size="small"
                              variant="outlined"
                              sx={pillSx(theme, "info")}
                            />
                          </TableCell>

                          <TableCell align="center" sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <Chip
                              label={expert?.stats?.domainsOwned || 0}
                              size="small"
                              variant="outlined"
                              sx={pillSx(theme, (expert?.stats?.domainsOwned || 0) > 0 ? "success" : "info")}
                            />
                          </TableCell>

                          <TableCell align="center" sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <Chip
                              label={ownIssues}
                              size="small"
                              variant="outlined"
                              sx={pillSx(theme, ownIssues > 0 ? "error" : "secondary")}
                            />
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, whiteSpace: "nowrap" }}>
                            <Stack direction="row" spacing={0.4} alignItems="center">
                              <Tooltip title="Edit user" arrow placement="top">
                                <IconButton
                                  size="small"
                                  onClick={() => openEdit(expert)}
                                  sx={{
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    bgcolor: alpha(theme.palette.common.white, 0.03),
                                  }}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip
                                title={
                                  blockDelete
                                    ? "This user owns issues and cannot be deleted"
                                    : "Delete user"
                                }
                                arrow
                                placement="top"
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={blockDelete}
                                    onClick={() => askDelete(expert)}
                                    sx={{
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      bgcolor: alpha(theme.palette.common.white, 0.03),
                                    }}
                                  >
                                    <DeleteOutlineIcon
                                      fontSize="small"
                                      color={blockDelete ? "disabled" : "error"}
                                    />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {isMdDown ? (
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 1, color: "text.secondary", fontWeight: 850 }}
              >
                Scroll horizontally to view all columns.
              </Typography>
            ) : null}
          </Box>
        </Paper>
      </Stack>

      <GlassDialog
        open={formOpen}
        onClose={busy ? undefined : closeForm}
        maxWidth="sm"
        fullWidth
      >
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            ...auroraBg(theme, 0.16),
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
                  bgcolor: alpha(form.role === "admin" ? theme.palette.secondary.main : theme.palette.info.main, 0.12),
                  color: form.role === "admin" ? "secondary.main" : "info.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {form.role === "admin" ? <AdminPanelSettingsIcon /> : (formMode === "create" ? <AddCircleOutlineIcon /> : <EditOutlinedIcon />)}
              </Avatar>

              <Stack spacing={0.15}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                  {formMode === "create" ? "Create user" : "Edit user"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  {formMode === "create"
                    ? "Add a new user account to the platform."
                    : "Update user information, account state and permissions."}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ p: 2.1 }}>
          <Stack spacing={1.35}>
            <TextField
              label="Name"
              value={form.name}
              onChange={onChangeForm("name")}
              fullWidth
              color="info"
              autoComplete="off"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                },
              }}
            />

            <TextField
              label="University"
              value={form.university}
              onChange={onChangeForm("university")}
              fullWidth
              autoComplete="off"
              color="info"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                },
              }}
            />

            <TextField
              label="Email"
              value={form.email}
              onChange={onChangeForm("email")}
              fullWidth
              autoComplete="off"
              color="info"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                },
              }}
            />

            <TextField
              label={formMode === "create" ? "Password" : "New password (optional)"}
              type="password"
              value={form.password}
              onChange={onChangeForm("password")}
              fullWidth
              color="info"
              autoComplete="new-password"
              helperText={
                formMode === "create"
                  ? "Minimum 6 characters."
                  : "Leave empty to keep the current password."
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                },
              }}
            />

            {form.role !== "admin" ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.accountConfirm)}
                    onChange={onChangeForm("accountConfirm")}
                    color="success"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                    Account confirmed
                  </Typography>
                }
              />
            ) : (
              <FormControlLabel
                control={<Switch checked disabled color="secondary" />}
                label={
                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                    Admin accounts are always confirmed
                  </Typography>
                }
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={form.role === "admin"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.checked ? "admin" : "user",
                    }))
                  }
                  color="secondary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 850 }}>
                  Admin account
                </Typography>
              }
            />
          </Stack>

          <Divider sx={{ opacity: 0.12, my: 2 }} />

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button
              onClick={closeForm}
              color="warning"
              variant="outlined"
              startIcon={<CancelOutlinedIcon />}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              color="info"
              variant="outlined"
              startIcon={<SaveOutlinedIcon />}
            >
              {formMode === "create" ? "Create user" : "Save changes"}
            </Button>
          </Stack>
        </Box>
      </GlassDialog>

      <GlassDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, expert: null })}
        maxWidth="xs"
        fullWidth
      >
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            ...auroraBg(theme, 0.14),
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
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                  color: "error.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <WarningAmberRoundedIcon />
              </Avatar>

              <Stack spacing={0.1}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                  Delete user
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  This action can affect active and finished issues.
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ p: 2.1 }}>
          <Stack spacing={1.2}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              You are about to delete:
            </Typography>

            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                p: 1.25,
                bgcolor: alpha(theme.palette.common.white, 0.04),
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Stack spacing={0.35}>
                <Typography sx={{ fontWeight: 950 }}>
                  {confirmDelete.expert?.name || "Unknown user"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  {confirmDelete.expert?.email || "—"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  {confirmDelete.expert?.university || "—"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  Role: {confirmDelete.expert?.role || "user"}
                </Typography>
              </Stack>
            </Paper>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip
                label={`Active: ${confirmDelete.expert?.stats?.activeIssues || 0}`}
                size="small"
                variant="outlined"
                sx={pillSx(theme, "warning")}
              />
              <Chip
                label={`Finished: ${confirmDelete.expert?.stats?.finishedIssues || 0}`}
                size="small"
                variant="outlined"
                sx={pillSx(theme, "info")}
              />
              <Chip
                label={`Domains: ${confirmDelete.expert?.stats?.domainsOwned || 0}`}
                size="small"
                variant="outlined"
                sx={pillSx(theme, "success")}
              />
            </Stack>

            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              The user account will be removed in cascade.
            </Typography>
          </Stack>

          <Divider sx={{ opacity: 0.12, my: 2 }} />

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button
              onClick={() => setConfirmDelete({ open: false, expert: null })}
              color="info"
              variant="outlined"
              startIcon={<CancelOutlinedIcon />}
            >
              Cancel
            </Button>

            <Button
              onClick={handleDelete}
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
            >
              Delete user
            </Button>
          </Stack>
        </Box>
      </GlassDialog>
    </>
  );
}