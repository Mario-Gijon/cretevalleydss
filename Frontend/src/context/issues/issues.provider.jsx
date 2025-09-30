// Importa los hooks useState y useEffect de React
import { useState, useEffect } from "react";
// Importa la librería PropTypes para la validación de tipos
import { IssuesDataContext } from "./issues.context.js";
import { getAllActiveIssues, getAllFinishedIssues, getAllUsers, getExpressionsDomain, getModelsInfo } from "../../controllers/issueController.js";

export const IssuesDataProvider = ({ children }) => {
  const [initialExperts, setInitialExperts] = useState([]);
  const [models, setModels] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [finishedIssues, setFinishedIssues] = useState([]);
  const [globalDomains, setGlobalDomains] = useState([]);
  const [expressionDomains, setExpressionDomains] = useState([]); // solo del usuario
  const [loading, setLoading] = useState(true);
  const [issueCreated, setIssueCreated] = useState("");

  // Función para obtener los problemas activos
  const fetchActiveIssues = async () => {
    setLoading(true);  // Establece loading a true antes de obtener los problemas activos
    const initActiveIssuesData = await getAllActiveIssues(); // Petición para obtener los problemas activos
    setActiveIssues(initActiveIssuesData.issues); // Establecer los problemas activos
    setLoading(false);  // Establecer loading a false cuando los datos se han cargado
  };

  const getAllIssues = async () => {
    setLoading(true);  // Establece loading a true antes de obtener los problemas activos
    const initActiveIssuesData = await getAllActiveIssues(); // Petición para obtener los problemas activos
    setActiveIssues(initActiveIssuesData.issues); // Establecer los problemas activos
    const initFinishedIssuesData = await getAllFinishedIssues(); // Petición para obtener los problemas activos
    setFinishedIssues(initFinishedIssuesData.issues); // Establecer los problemas activos
    setLoading(false);  // Establecer loading a false cuando los datos se han cargado
  };

  // Función para obtener los problemas activos
  const fetchFinishedIssues = async () => {
    setLoading(true);  // Establece loading a true antes de obtener los problemas activos
    const initFinishedIssuesData = await getAllFinishedIssues(); // Petición para obtener los problemas activos
    setFinishedIssues(initFinishedIssuesData.issues); // Establecer los problemas activos
    setLoading(false);  // Establecer loading a false cuando los datos se han cargado
  };

  // Usar useEffect para cargar los problemas activos al inicio
  useEffect(() => {
    /* fetchActiveIssues();  // Se ejecuta al inicio para cargar los problemas activos
    fetchFinishedIssues();  // Se ejecuta al inicio para cargar los problemas activos */
    getAllIssues();  // Se ejecuta al inicio para cargar los problemas activos
    const fetchData = async () => {
      const initExpertsData = await getAllUsers();
      const initModelsData = await getModelsInfo();
      const { globals, userDomains } = await getExpressionsDomain();
      setInitialExperts(initExpertsData);
      setModels(initModelsData);
      setGlobalDomains(globals || []);
      setExpressionDomains(userDomains || []);
    };
    fetchData();  // Este efecto carga los expertos y modelos
  }, []);  // Este solo se ejecuta una vez, al montar el componente

  // Usar otro useEffect para recargar los problemas activos cuando se cree un nuevo problema
  useEffect(() => {
    if (issueCreated) {
      fetchActiveIssues();  // Recargar los problemas activos cuando se cree un nuevo problema
    }
  }, [issueCreated]);  // Este efecto se ejecuta cuando issueCreated cambia

  return (
    <IssuesDataContext.Provider
      value={{
        initialExperts,
        models,
        globalDomains,
        expressionDomains,
        setExpressionDomains,
        loading,
        setLoading,
        setIssueCreated,
        issueCreated,
        activeIssues,
        finishedIssues,
        setActiveIssues,
        setFinishedIssues,
        fetchActiveIssues,
        fetchFinishedIssues
      }}
    >
      {children}
    </IssuesDataContext.Provider>

  );
};