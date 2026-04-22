import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { pillSx } from "../adminIssues.utils";

/**
 * Chip de metadatos para la seccion de admin issues.
 *
 * @param {object} props
 * @param {string} [props.tone]
 * @param {*} props.children
 * @returns {JSX.Element}
 */
const AdminMetaChip = ({ tone = "info", children }) => {
  const theme = useTheme();

  return (
    <Chip
      label={children}
      size="small"
      variant="outlined"
      sx={pillSx(theme, tone)}
    />
  );
};

export default AdminMetaChip;
