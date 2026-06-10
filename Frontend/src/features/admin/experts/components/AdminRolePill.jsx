import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { pillSx } from "../adminExperts.utils";

/**
 * Chip de rol para una fila de experto.
 *
 * @param {object} props
 * @param {string} props.role
 * @returns {JSX.Element}
 */
const AdminRolePill = ({ role }) => {
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
};

export default AdminRolePill;
