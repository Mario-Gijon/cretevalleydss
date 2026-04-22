import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { pillSx } from "../adminExperts.utils";

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
      sx={pillSx(theme, confirmed ? "success" : "warning")}
    />
  );
};

export default AdminStatusPill;
