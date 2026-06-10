import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { getAdminIssuePillSx } from "../styles/adminIssues.styles";

/**
 * Chip de metadatos para la seccion de admin issues.
 *
 * @param {object} props
 * @param {string} [props.tone]
 * @param {*} props.children
 * @returns {JSX.Element}
 */
const AdminIssueMetaChip = ({ tone = "info", children }) => {
  const theme = useTheme();

  return (
    <Chip
      label={children}
      size="small"
      variant="outlined"
      sx={getAdminIssuePillSx(theme, tone)}
    />
  );
};

export default AdminIssueMetaChip;
