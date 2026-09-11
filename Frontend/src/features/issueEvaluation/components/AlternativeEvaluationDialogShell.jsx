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
  ToggleButton,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";

import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import {
  auroraBg,
  softIconBtnSx,
} from "../styles/alternativeEvaluationDialog.styles.js";
import ExpressionDomainSummaryButton from "./ExpressionDomainSummaryButton";

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
 * @param {Array<Object>} [props.criteria=[]]
 * @param {boolean} [props.showExpressionDomains=false]
 * @param {boolean} [props.showCollectiveControl=false]
 * @param {boolean} [props.collectiveVisible=false]
 * @param {Function|null} [props.onToggleCollective=null]
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
  criteria = [],
  showExpressionDomains = false,
  showCollectiveControl = false,
  collectiveVisible = false,
  onToggleCollective = null,
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
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 1.35, sm: 1.6 }, flexWrap: "wrap", rowGap: 1 }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0, flex: { sm: 1 }, width: { xs: "100%", sm: "auto" } }}
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
                <Typography variant="h6" noWrap title={title}>
                  {title}
                </Typography>

                <Typography
                  variant="caption"
                  noWrap
                  title={subtitle}
                  sx={{ color: "text.secondary", fontWeight: 900 }}
                >
                  {subtitle}
                </Typography>
              </Stack>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "flex-end", sm: "flex-start" } }}
            >
              {showExpressionDomains ? (
                <ExpressionDomainSummaryButton criteria={criteria} />
              ) : null}
              {showCollectiveControl ? (
                <Tooltip
                  title="Show the aggregated evaluation obtained from the participating experts."
                  describeChild
                >
                  <ToggleButton
                    selected={collectiveVisible}
                    onChange={() => onToggleCollective?.()}
                    color="secondary"
                    size="small"
                    sx={{
                      borderRadius: 2.5,
                      fontWeight: 850,
                    }}
                  >
                    {collectiveVisible ? "Hide collective" : "Show collective"}
                  </ToggleButton>
                </Tooltip>
              ) : null}
              <IconButton onClick={onClose} sx={softIconBtnSx(theme)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        <DialogContent sx={contentSx}>{children}</DialogContent>

        {actions ? (
          <DialogActions
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1.25, sm: 1.5 },
              borderTop: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              gap: 1,
              flexWrap: "wrap",
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
