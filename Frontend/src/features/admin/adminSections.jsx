import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PsychologyIcon from "@mui/icons-material/Psychology";
import BugReportIcon from "@mui/icons-material/BugReport";
import AssessmentIcon from "@mui/icons-material/Assessment";

/**
 * Metadatos de secciones del dominio Admin.
 */
export const ADMIN_SECTIONS = [
  {
    key: "experts",
    title: "Experts",
    desc: "Directory, invitations and domain assignments.",
    tone: "success",
    icon: <PeopleAltIcon />,
    group: "Operations",
  },
  {
    key: "issues",
    title: "Issues",
    desc: "Create, monitor and manage decision problems.",
    tone: "warning",
    icon: <AssignmentIcon />,
    group: "Operations",
  },
  {
    key: "models",
    title: "Models",
    desc: "Manage decision models and their parameters.",
    tone: "info",
    icon: <PsychologyIcon />,
    group: "Operations",
  },
  {
    key: "reports",
    title: "Reports",
    desc: "Usage and activity summaries.",
    tone: "info",
    icon: <AssessmentIcon />,
    group: "Monitoring",
  },
  {
    key: "logs",
    title: "Logs",
    desc: "System events, errors and audit trail.",
    tone: "warning",
    icon: <BugReportIcon />,
    group: "Monitoring",
  },
];

/**
 * Busca una seccion de admin por clave.
 *
 * @param {string} sectionKey
 * @returns {object|null}
 */
export const findAdminSectionByKey = (sectionKey) => {
  return ADMIN_SECTIONS.find((section) => section.key === sectionKey) || null;
};
