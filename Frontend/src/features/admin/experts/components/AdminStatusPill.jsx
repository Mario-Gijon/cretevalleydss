import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { getAdminExpertPillSx } from "../styles/adminExperts.styles";

/**
 * Chip de estado de confirmacion para una fila de experto.
 *
 * @param {object} props
 * @param {boolean} props.confirmed
 * @returns {JSX.Element}
 */
const AdminStatusPill = ({ confirmed }) => {
  const theme = useTheme();

  return (
    <Chip
      label={confirmed ? "Confirmed" : "Pending"}
      size="small"
      variant="outlined"
      sx={getAdminExpertPillSx(theme, confirmed ? "success" : "warning")}
    />
  );
};

export default AdminStatusPill;
