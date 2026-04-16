import {
  Stack,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Backdrop,
  Avatar,
  Box,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";

import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import {
  auroraBg,
  softIconBtnSx,
} from "../../styles/alternativeEvaluationDialog.styles.js";

/**
 * Shell compartido para los diálogos de evaluación de alternativas.
 *
 * Centraliza la estructura visual común: backdrop de carga, cabecera,
 * contenido principal y barra de acciones inferior.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.fullScreen=false]
 * @param {"xs"|"sm"|"md"|"lg"|"xl"} [props.maxWidth="lg"]
 * @param {React.ElementType} props.icon
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode|null} [props.actions=null]
 * @param {Object} [props.contentSx]
 * @returns {JSX.Element}
 */
const AlternativeEvaluationDialogShell = ({
  open,
  onClose,
  loading = false,
  fullScreen = false,
  maxWidth = "lg",
  icon: Icon,
  title,
  subtitle,
  children,
  actions = null,
  contentSx = {},
}) => {
  const theme = useTheme();

  return (
    <>
      {loading && (
        <Backdrop open={loading} sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      )}

      <GlassDialog
        open={open}
        onClose={onClose}
        fullScreen={fullScreen}
        fullWidth
        maxWidth={maxWidth}
        PaperProps={{ elevation: 0 }}
      >
        <Box
          sx={{
            ...auroraBg(theme, 0.18),
            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.6 }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  color: "info.main",
                  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                }}
              >
                {Icon ? <Icon /> : null}
              </Avatar>

              <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                  {title}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: 900 }}
                >
                  {subtitle}
                </Typography>
              </Stack>
            </Stack>

            <IconButton onClick={onClose} sx={softIconBtnSx(theme)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        <DialogContent sx={contentSx}>{children}</DialogContent>

        {actions ? (
          <DialogActions
            sx={{
              px: 2,
              py: 1.5,
              borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              gap: 1,
            }}
          >
            {actions}
          </DialogActions>
        ) : null}
      </GlassDialog>
    </>
  );
};

export default AlternativeEvaluationDialogShell;