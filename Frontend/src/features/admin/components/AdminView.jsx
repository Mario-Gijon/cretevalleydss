import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AdminHome from "./AdminHome";
import AdminSectionShell from "./AdminSectionShell";
import AdminExpertsSection from "../sections/adminExperts/AdminExpertsSection";
import AdminIssuesSection from "../sections/adminIssues/AdminIssuesSection";
import AdminModelsSection from "../sections/adminModels/AdminModelsSection";
import AdminReportsSection from "../sections/adminReports/AdminReportsSection";
import AdminLogsSection from "../sections/adminLogs/AdminLogsSection";

/**
 * Vista principal del dominio Admin con routing interno de secciones.
 *
 * @returns {JSX.Element}
 */
const AdminView = () => {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route index element={<AdminHome />} />

      <Route
        path="experts"
        element={(
          <AdminSectionShell sectionKey="experts">
            <AdminExpertsSection />
          </AdminSectionShell>
        )}
      />
      <Route
        path="issues"
        element={(
          <AdminSectionShell sectionKey="issues">
            <AdminIssuesSection />
          </AdminSectionShell>
        )}
      />
      <Route
        path="models"
        element={(
          <AdminSectionShell sectionKey="models">
            <AdminModelsSection />
          </AdminSectionShell>
        )}
      />
      <Route
        path="reports"
        element={(
          <AdminSectionShell sectionKey="reports">
            <AdminReportsSection />
          </AdminSectionShell>
        )}
      />
      <Route
        path="logs"
        element={(
          <AdminSectionShell sectionKey="logs">
            <AdminLogsSection />
          </AdminSectionShell>
        )}
      />

      <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
    </Routes>
  );
};

export default AdminView;
