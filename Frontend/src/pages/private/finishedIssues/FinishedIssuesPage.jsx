import { useEffect } from "react";
import { FinishedIssuesView } from "../../../features/finishedIssues";

/**
 * Wrapper de ruta para mantener la URL actual de issues finalizados.
 *
 * @returns {JSX.Element}
 */
const FinishedIssuesPage = () => {
  useEffect(() => {
    document.body.classList.add("finished-issue-route");
    return () => document.body.classList.remove("finished-issue-route");
  }, []);

  return <FinishedIssuesView />;
};

export default FinishedIssuesPage;
