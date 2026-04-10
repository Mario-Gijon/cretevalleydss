import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Avatar,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import UndoIcon from "@mui/icons-material/Undo";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { normalizeActiveIssueValue } from "../../utils/activeIssues.filters";
import { getActiveIssuesAuroraBg } from "../../styles/activeIssues.styles";

/**
 * Diálogo para seleccionar expertos antes de asignarles dominios.
 *
 * Mantiene la misma apariencia y comportamiento visual que la versión
 * original embebida en ActiveIssuesPage, pero extraído a la feature.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.open Indica si el diálogo está abierto.
 * @param {Function} props.onClose Cierra el diálogo.
 * @param {Array} props.availableExperts Lista de expertos disponibles.
 * @param {Array} props.expertsToAdd Correos seleccionados actualmente.
 * @param {Function} props.setExpertsToAdd Setter de la selección.
 * @returns {JSX.Element}
 */
const AddExpertsPickerDialog = ({
  open,
  onClose,
  availableExperts = [],
  expertsToAdd = [],
  setExpertsToAdd,
}) => {
  const theme = useTheme();
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchFilter("");
    }
  }, [open]);

  const filteredExperts = useMemo(() => {
    const query = normalizeActiveIssueValue(searchFilter);

    if (!query) {
      return availableExperts;
    }

    return availableExperts.filter((expert) => {
      const name = normalizeActiveIssueValue(expert?.name);
      const email = normalizeActiveIssueValue(expert?.email);
      const university = normalizeActiveIssueValue(expert?.university);

      return (
        name.includes(query) ||
        email.includes(query) ||
        university.includes(query)
      );
    });
  }, [availableExperts, searchFilter]);

  /**
   * Añade o elimina un experto de la selección actual.
   *
   * @param {string} email Correo del experto.
   * @returns {void}
   */
  const toggleExpertSelection = (email) => {
    if (!email) return;

    setExpertsToAdd((prev) =>
      prev.includes(email) ? prev.filter((value) => value !== email) : [...prev, email]
    );
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ elevation: 0 }}
    >
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
          <Stack
            direction="row"
            spacing={1.2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  color: "info.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <PersonAddAlt1Icon />
              </Avatar>

              <Stack spacing={0.15}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                  Add experts
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  Select one or more experts to add to this issue.
                </Typography>
              </Stack>
            </Stack>

            <IconButton
              onClick={onClose}
              sx={{
                border: "1px solid rgba(255,255,255,0.10)",
                bgcolor: alpha(theme.palette.common.white, 0.04),
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ p: 2.1 }}>
        <Stack spacing={1.25}>
          <TextField
            size="small"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search by name, email or university..."
            autoComplete="off"
            color="info"
            sx={{
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

          {expertsToAdd.length > 0 ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap">
              {expertsToAdd.map((email) => (
                <Chip
                  key={email}
                  label={email}
                  onDelete={() =>
                    setExpertsToAdd((prev) => prev.filter((value) => value !== email))
                  }
                  variant="outlined"
                  sx={{
                    borderColor: alpha(theme.palette.common.white, 0.18),
                    color: alpha(theme.palette.common.white, 0.88),
                    bgcolor: alpha(theme.palette.common.white, 0.03),
                    "& .MuiChip-deleteIcon": {
                      color: alpha(theme.palette.common.white, 0.55),
                    },
                    "& .MuiChip-deleteIcon:hover": {
                      color: alpha(theme.palette.common.white, 0.85),
                    },
                  }}
                />
              ))}
            </Stack>
          ) : null}

          <TableContainer
            sx={{
              maxHeight: "52vh",
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
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>
                    University
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 950,
                      bgcolor: "#1a2a2fcf",
                      width: 110,
                      textAlign: "center",
                    }}
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredExperts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        No available experts found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExperts.map((expert) => {
                    const selected = expertsToAdd.includes(expert.email);

                    return (
                      <TableRow
                        key={expert.email}
                        hover
                        sx={{
                          "&:hover": {
                            bgcolor: alpha(theme.palette.info.main, 0.06),
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>
                            {expert.name || "Unknown"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {expert.email || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {expert.university || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          }}
                        >
                          <Tooltip title={selected ? "Unselect expert" : "Select expert"} arrow>
                            <IconButton
                              size="small"
                              onClick={() => toggleExpertSelection(expert.email)}
                              sx={{
                                border: "1px solid rgba(255,255,255,0.10)",
                                bgcolor: alpha(
                                  selected ? theme.palette.warning.main : theme.palette.common.white,
                                  selected ? 0.12 : 0.03
                                ),
                              }}
                            >
                              {selected ? (
                                <UndoIcon fontSize="small" />
                              ) : (
                                <PersonAddAlt1Icon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ opacity: 0.12 }} />

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button onClick={onClose} color="warning" variant="outlined">
              Close
            </Button>

            <Button
              onClick={onClose}
              color="info"
              variant="outlined"
              startIcon={<DoneAllIcon />}
            >
              Use selection
            </Button>
          </Stack>
        </Stack>
      </Box>
    </GlassDialog>
  );
};

export default AddExpertsPickerDialog;