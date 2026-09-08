import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

import AppStatusChip from "../../../../components/StyledComponents/AppStatusChip";

/**
 * Chip de estado de confirmacion para una fila de experto.
 *
 * @param {object} props
 * @param {boolean} props.confirmed
 * @returns {JSX.Element}
 */
const AdminStatusPill = ({ confirmed }) => {
  return (
    <AppStatusChip
      label={confirmed ? "Confirmed" : "Pending"}
      tone={confirmed ? "success" : "warning"}
      icon={confirmed ? <CheckCircleOutlineIcon /> : <ScheduleOutlinedIcon />}
    />
  );
};

export default AdminStatusPill;
