import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import EmptyState from "../../../components/StyledComponents/EmptyState";

/**
 * Estado vacío para la pantalla de issues finalizados.
 *
 * @returns {JSX.Element}
 */
const FinishedIssuesEmptyState = () => {
  return (
    <EmptyState icon={<TaskAltOutlinedIcon fontSize="large" />} title="No finished issues" description="Resolved issues will appear here." sx={{ mt: 2 }} />
  );
};

export default FinishedIssuesEmptyState;
