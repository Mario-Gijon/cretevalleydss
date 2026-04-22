import { alpha } from "@mui/material/styles";

import { removeAccents } from "../../../../utils/text.utils";
import { getActiveIssuesHeaderGlassSx as glassSxBase } from "../../../activeIssues/styles/activeIssues.styles";

/**
 * Normaliza texto para filtrado.
 *
 * @param {*} value
 * @returns {string}
 */
export const normalize = (value) => {
  return removeAccents(String(value ?? "").toLowerCase().trim());
};

/**
 * Formatea fecha y hora para mostrar en tablas y dialogos.
 *
 * @param {*} value
 * @returns {string}
 */
export const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

/**
 * Resuelve color por tono para chips de estado.
 *
 * @param {object} theme
 * @param {string} tone
 * @returns {string}
 */
export const toneColor = (theme, tone) => {
  if (tone === "success") return theme.palette.success.main;
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "error") return theme.palette.error.main;
  if (tone === "secondary") return theme.palette.secondary.main;
  return theme.palette.info.main;
};

/**
 * Estilo de chips tipo pill en la seccion de experts.
 *
 * @param {object} theme
 * @param {string} tone
 * @returns {object}
 */
export const pillSx = (theme, tone = "info") => {
  const color = toneColor(theme, tone);

  return {
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    bgcolor: alpha(color, 0.1),
    borderColor: alpha(color, 0.25),
    color: "text.secondary",
  };
};

/**
 * Estilo del panel principal de la seccion de experts.
 *
 * @param {object} theme
 * @returns {object}
 */
export const sectionPanelSx = (theme) => ({
  borderRadius: 4,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, 0.2, "crystal"),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.1)}, transparent 55%)`,
    opacity: 0.18,
  },
});

/**
 * Estado inicial del formulario de usuario.
 */
export const emptyForm = {
  id: "",
  name: "",
  university: "",
  email: "",
  password: "",
  accountConfirm: true,
  role: "user",
};
