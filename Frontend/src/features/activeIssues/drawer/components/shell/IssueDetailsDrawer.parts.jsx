import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/**
 * Devuelve el borde translúcido usado en el header del drawer.
 *
 * @returns {Object}
 */
// eslint-disable-next-line react-refresh/only-export-components
export const getIssueDetailsDrawerCrystalBorder = () => {
  return { border: "1px solid rgba(117, 199, 209, 0.8)" };
};

/**
 * Devuelve el estilo base de los paneles internos del drawer.
 *
 * @param {Object} theme Tema actual.
 * @param {Object} options Opciones visuales.
 * @param {number} options.bg Intensidad del fondo.
 * @returns {Object}
 */
// eslint-disable-next-line react-refresh/only-export-components
export const getIssueDetailsDrawerPanelSx = (
  theme,
  { bg = 0.10 } = {}
) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.background.paper, bg),
  boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
  border: "1px solid rgba(255,255,255,0.1)",
});

/**
 * Fila clave/valor usada en paneles de información.
 *
 * @param {Object} props Props del componente.
 * @param {string} props.k Etiqueta izquierda.
 * @param {*} props.v Valor mostrado.
 * @returns {JSX.Element}
 */
export const IssueDetailsDrawerKeyValueRow = ({ k, v }) => {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontWeight: 950, minWidth: 150 }}
      >
        {k}
      </Typography>

      <Typography
        variant="body2"
        sx={{ fontWeight: 850, wordBreak: "break-word" }}
      >
        {v ?? "—"}
      </Typography>
    </Stack>
  );
};

/**
 * Contenedor simple para renderizar el contenido
 * de una tab concreta del drawer.
 *
 * @param {Object} props Props del componente.
 * @param {number} props.value Índice activo.
 * @param {number} props.index Índice del panel.
 * @param {*} props.children Contenido interno.
 * @returns {JSX.Element|null}
 */
export const IssueDetailsDrawerTabPanel = ({
  value,
  index,
  children,
}) => {
  if (value !== index) {
    return null;
  }

  return <Box sx={{ minHeight: 0 }}>{children}</Box>;
};

/**
 * Badge visual para el tipo de criterio.
 *
 * @param {Object} props Props del componente.
 * @param {string} props.type Tipo del criterio.
 * @returns {JSX.Element|null}
 */
export const IssueDetailsDrawerCriteriaTypeBadge = ({ type }) => {
  const theme = useTheme();

  if (!type) {
    return null;
  }

  const isBenefit = String(type).toLowerCase() === "benefit";
  const bg = isBenefit
    ? alpha(theme.palette.success.main, 0.12)
    : alpha(theme.palette.warning.main, 0.12);
  const borderColor = isBenefit
    ? alpha(theme.palette.success.main, 0.22)
    : alpha(theme.palette.warning.main, 0.22);
  const color = isBenefit ? "success.main" : "warning.main";

  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 999,
        bgcolor: bg,
        border: "1px solid",
        borderColor,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 950, color }}>
        {isBenefit ? "benefit" : "cost"}
      </Typography>
    </Box>
  );
};

/**
 * Árbol de criterios mostrado en la pestaña de criterios.
 *
 * @param {Object} props Props del componente.
 * @param {Array} props.nodes Nodos del árbol.
 * @param {Object} props.finalWeights Pesos finales por criterio.
 * @param {Function} props.formatWeight Formateador de pesos.
 * @param {number} props.depth Profundidad actual.
 * @returns {JSX.Element}
 */
export const IssueDetailsDrawerCriterionTree = ({
  nodes = [],
  finalWeights = {},
  formatWeight,
  depth = 0,
}) => {
  const theme = useTheme();

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No criteria
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {nodes.map((node, index) => {
        const children = Array.isArray(node?.children) ? node.children : [];
        const hasChildren = children.length > 0;
        const isRoot = depth === 0;
        const showType = isRoot;

        const leafWeightRaw = !hasChildren ? finalWeights?.[node?.name] : null;
        const leafWeight =
          leafWeightRaw != null && typeof formatWeight === "function"
            ? formatWeight(leafWeightRaw)
            : null;

        if (!hasChildren) {
          return (
            <Box
              key={`${node?.name || "crit"}_${index}`}
              sx={{
                ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }),
                px: 1.5,
                py: 1.1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                bgcolor: alpha(theme.palette.text.primary, 0.02),
                "&:hover": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.08),
                },
              }}
            >
              <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 980,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {node?.name}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: 900 }}
                >
                  leaf
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {showType ? (
                  <IssueDetailsDrawerCriteriaTypeBadge type={node?.type} />
                ) : null}

                {leafWeight ? (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.35,
                      borderRadius: 999,
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 980, color: "text.secondary" }}
                    >
                      {leafWeight}
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          );
        }

        return (
          <Accordion
            key={`${node?.name || "crit"}_${index}`}
            disableGutters
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: alpha(theme.palette.background.paper, 0.10),
              boxShadow: `0 12px 30px ${alpha(
                theme.palette.common.black,
                0.05
              )}`,
              border: "1px solid rgba(255,255,255,0.1)",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", width: "100%" }}
              >
                <Typography variant="body2" sx={{ fontWeight: 980, flex: 1 }}>
                  {node?.name}
                </Typography>

                {showType ? (
                  <IssueDetailsDrawerCriteriaTypeBadge type={node?.type} />
                ) : null}

                <Box
                  sx={{
                    px: 0.9,
                    py: 0.2,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 900 }}
                  >
                    {children.length > 1
                      ? `${children.length} children`
                      : "1 child"}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <IssueDetailsDrawerCriterionTree
                nodes={children}
                finalWeights={finalWeights}
                formatWeight={formatWeight}
                depth={depth + 1}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
};