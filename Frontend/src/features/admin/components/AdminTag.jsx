import { Chip } from "@mui/material";

import { getAdminTagSx } from "../styles/admin.styles";

/**
 * Chip compacto de metadatos del dominio admin.
 *
 * @param {object} props
 * @param {string} [props.tone]
 * @param {*} props.children
 * @returns {JSX.Element}
 */
const AdminTag = ({ tone = "info", children }) => {
  return (
    <Chip
      label={children}
      size="small"
      variant="outlined"
      sx={(theme) => getAdminTagSx(theme, tone)}
    />
  );
};

export default AdminTag;
