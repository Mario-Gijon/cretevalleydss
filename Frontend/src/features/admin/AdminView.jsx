import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AdminHome from "./components/AdminHome";
import AdminSectionShell from "./components/AdminSectionShell";
import AdminExpertsSection from "./experts/AdminExpertsSection";
import AdminIssuesSection from "./issues/AdminIssuesSection";
import AdminModelForgeSection from "./modelForge/AdminModelForgeSection";
import AdminModelsSection from "./models/AdminModelsSection";
import AdminReportsSection from "./reports/AdminReportsSection";
import AdminLogsSection from "./logs/AdminLogsSection";

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
        path="model-forge"
        element={(
          <AdminSectionShell sectionKey="model-forge">
            <AdminModelForgeSection />
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
