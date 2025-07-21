import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CircularLoading } from "./components/LoadingProgress/CircularLoading";
import { useAuthContext } from "./context/auth/auth.context";
import { useColorScheme } from '@mui/material';

const AuthForm = lazy(() => import("../public/authForm/AuthForm"));
const LogInForm = lazy(() => import("../public/authForm/login/LogInForm"));
const SignUpForm = lazy(() => import("../public/authForm/signup/SignUpForm"));
const Dashboard = lazy(() => import("../private/dashboard/Dashboard"));
const ActiveIssuesPage = lazy(() => import("../private/activeIssues/ActiveIssuesPage"));
const FinishedIssuesPage = lazy(() => import("../private/finishedIssues/FinishedIssuesPage"));
const CreateIssuePage = lazy(() => import("../private/createIssue/CreateIssuePage"));
/* const ModelsPage = lazy(() => import("../private/issuesModels/ModelsPage")); */

export const App = () => {
  const { loading, isLoggedIn } = useAuthContext();

  const { mode } = useColorScheme();

  /* console.log(import.meta.env.VITE_MODE) */

  // Mostrar el CircularLoading mientras se obtienen los datos del usuario
  if (loading) return <CircularLoading size="5rem" color={mode === "dark" ? "secondary" : "primary"} />;

  return (
    <Router>
      <Suspense fallback={<CircularLoading size="5rem" color={mode === "dark" ? "secondary" : "primary"} />}>
        <Routes>
          {/* Rutas públicas para autenticación */}
          <Route path="/" element={<AuthForm />}>
            <Route
              path="login"
              element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LogInForm />}
            />
            <Route
              path="signup"
              element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <SignUpForm />}
            />
            {/* Redirige cualquier ruta hija bajo active a la ruta principal active */}
            <Route path="login/*" element={<Navigate to="/login" replace />} />
            <Route path="signup/*" element={<Navigate to="/signup" replace />} />
            <Route path="register/*" element={<Navigate to="/signup" replace />} />
            <Route
              path=""
              element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" />}
            />
          </Route>

          {/* Rutas protegidas del dashboard */}
          <Route
            path="/dashboard"
            element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
          >
            {/* Rutas específicas dentro de dashboard */}
            <Route path="active" element={<ActiveIssuesPage />} />
            <Route path="finished" element={<FinishedIssuesPage />} />
            <Route path="create" element={<CreateIssuePage />} />
            {/* <Route path="models" element={<ModelsPage />} /> */}

            {/* Redirige cualquier ruta hija bajo active a la ruta principal active */}
            <Route path="active/*" element={<Navigate to="/dashboard/active" replace />} />
            <Route path="finished/*" element={<Navigate to="/dashboard/finished" replace />} />
            <Route path="create/*" element={<Navigate to="/dashboard/create" replace />} />
            {/* <Route path="models/*" element={<Navigate to="/dashboard/models" replace />} /> */}

            {/* Ruta por defecto cuando no hay una ruta especificada */}
            <Route path="" element={<ActiveIssuesPage />} />
          </Route>


          {/* Ruta comodín */}
          <Route
            path="*"
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </Suspense>
    </Router>
  );
};
