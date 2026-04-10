import { useMemo } from "react";
import { Stack, Box, Drawer, Divider, Tabs, Tab } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { getNextActionMeta } from "../../../utils/activeIssues.meta";
import { countLeafCriteria } from "../../../../../utils/issues/criteriaTree";
import {
  buildIssueDrawerModelParamsList,
  getIssueDrawerAlternatives,
  getIssueDrawerDeadlineLabel,
  getIssueDrawerFinalWeights,
  getIssueDrawerParticipation,
  getIssueDrawerPermissions,
} from "../../utils/issueDetailsDrawer.utils";
import { IssueDetailsDrawerTabPanel } from "./IssueDetailsDrawer.parts";
import IssueDetailsOverviewTab from "../tabs/IssueDetailsOverviewTab";
import IssueDetailsExpertsTab from "../tabs/IssueDetailsExpertsTab";
import IssueDetailsCriteriaTab from "../tabs/IssueDetailsCriteriaTab";
import IssueDetailsAlternativesTab from "../tabs/IssueDetailsAlternativesTab";
import IssueDetailsTimelineTab from "../tabs/IssueDetailsTimelineTab";
import IssueDetailsDrawerHeader from "../shell/IssueDetailsDrawerHeader";
import IssueDetailsDrawerEmptyState from "../shell/IssueDetailsDrawerEmptyState";
import { buildDrawerTabs } from "../config/IssueDetailsDrawer.tabs.js";

/**
 * Drawer principal de detalles del issue activo.
 *
 * Orquesta el estado derivado del issue seleccionado y
 * delega el render de cada sección en componentes del
 * submódulo drawer para mantener el contenedor ligero.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.open Indica si el drawer está abierto.
 * @param {Function} props.onClose Acción de cierre del drawer.
 * @param {Function} props.onMinimize Acción para minimizar el drawer en móvil.
 * @param {Object|null} props.selectedIssue Issue actualmente seleccionado.
 * @param {boolean} props.isMobile Indica si la vista actual es móvil.
 * @param {number} props.drawerTab Índice de la pestaña activa.
 * @param {Function} props.setDrawerTab Setter de la pestaña activa.
 * @param {Object} props.busy Estado de carga de las acciones del drawer.
 * @param {Function} props.openConfirm Abre el diálogo de confirmación.
 * @param {Function} props.handleLeaveIssue Acción para abandonar el issue.
 * @param {Function} props.handleComputeWeights Acción para computar pesos.
 * @param {Function} props.handleResolveIssue Acción para resolver el issue.
 * @param {Function} props.handleRemoveIssue Acción para eliminar el issue.
 * @param {boolean} props.isEditingExperts Indica si está activa la edición de expertos.
 * @param {Function} props.toggleEditExperts Activa o cancela la edición de expertos.
 * @param {Array} props.expertsToRemove Correos marcados para eliminar.
 * @param {Function} props.markRemoveExpert Marca un experto para eliminar.
 * @param {Array} props.expertsToAdd Correos pendientes de añadir.
 * @param {Function} props.setOpenAddExpertsDialog Abre el diálogo de añadir expertos.
 * @param {Function} props.saveExpertsChanges Guarda los cambios de expertos.
 * @param {Function} props.setIsRatingAlternatives Abre la evaluación de alternativas.
 * @param {Function} props.setIsRatingWeights Abre la evaluación de pesos.
 * @returns {JSX.Element}
 */
const IssueDetailsDrawer = ({
  open,
  onClose,
  onMinimize,
  selectedIssue,
  isMobile,
  drawerTab,
  setDrawerTab,
  busy,
  openConfirm,
  handleLeaveIssue,
  handleComputeWeights,
  handleResolveIssue,
  handleRemoveIssue,
  isEditingExperts,
  toggleEditExperts,
  expertsToRemove,
  markRemoveExpert,
  expertsToAdd,
  setOpenAddExpertsDialog,
  saveExpertsChanges,
  setIsRatingAlternatives,
  setIsRatingWeights,
}) => {
  const theme = useTheme();

  const {
    totalExperts,
    pendingExperts,
    participatedExperts,
    notEvaluatedExperts,
    declinedExperts,
  } = useMemo(() => {
    return getIssueDrawerParticipation(selectedIssue);
  }, [selectedIssue]);

  const drawerAction = useMemo(() => {
    return selectedIssue ? getNextActionMeta(selectedIssue) : null;
  }, [selectedIssue]);

  const DrawerActionIcon = drawerAction?.icon || null;

  const alternatives = useMemo(() => {
    return getIssueDrawerAlternatives(selectedIssue);
  }, [selectedIssue]);

  const criteriaCount = useMemo(() => {
    return countLeafCriteria(selectedIssue?.criteria || []);
  }, [selectedIssue?.criteria]);

  const deadlineLabel = useMemo(() => {
    return getIssueDrawerDeadlineLabel(selectedIssue);
  }, [selectedIssue]);

  const drawerTabs = useMemo(() => {
    return buildDrawerTabs(selectedIssue);
  }, [selectedIssue]);

  const finalWeights = useMemo(() => {
    return getIssueDrawerFinalWeights(selectedIssue);
  }, [selectedIssue]);

  const modelParamsList = useMemo(() => {
    return buildIssueDrawerModelParamsList(selectedIssue);
  }, [selectedIssue]);

  const permissions = useMemo(() => {
    return getIssueDrawerPermissions(selectedIssue);
  }, [selectedIssue]);

  const cEvalA = permissions.canEvaluateAlternatives;
  const cEvalW = permissions.canEvaluateWeights;
  const cComputeW = permissions.canComputeWeights;
  const cResolve = permissions.canResolveIssue;

  const overviewProps = {
    selectedIssue,
    drawerAction,
    DrawerActionIcon,
    deadlineLabel,
    modelParamsList,
    totalExperts,
    pendingExperts,
    participatedExperts,
    notEvaluatedExperts,
    declinedExperts,
    cEvalA,
    cEvalW,
    cComputeW,
    cResolve,
    busy,
    openConfirm,
    handleLeaveIssue,
    handleComputeWeights,
    handleResolveIssue,
    handleRemoveIssue,
    setIsRatingAlternatives,
    setIsRatingWeights,
    isMobile,
    onMinimize,
  };

  const expertsTabProps = {
    selectedIssue,
    isEditingExperts,
    toggleEditExperts,
    expertsToRemove,
    markRemoveExpert,
    expertsToAdd,
    setOpenAddExpertsDialog,
    saveExpertsChanges,
    busy,
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 580, md: 720 },
          borderTopLeftRadius: { xs: 0, sm: 24 },
          borderBottomLeftRadius: { xs: 0, sm: 24 },
          overflow: "hidden",
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: "blur(14px)",
        },
        elevation: 0,
      }}
    >
      {!selectedIssue ? (
        <IssueDetailsDrawerEmptyState onClose={onClose} />
      ) : (
        <Stack sx={{ height: "100%" }}>
          <IssueDetailsDrawerHeader
            selectedIssue={selectedIssue}
            alternativesCount={alternatives.length}
            criteriaCount={criteriaCount}
            totalExperts={totalExperts}
            deadlineLabel={deadlineLabel}
            onClose={onClose}
          />

          <Divider sx={{ opacity: 0.18 }} />

          <Box sx={{ px: 2, pt: 1 }}>
            <Tabs
              value={drawerTab}
              onChange={(_, value) => setDrawerTab(value)}
              textColor="secondary"
              indicatorColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": { fontWeight: 950, minHeight: 42 },
                minHeight: 42,
              }}
            >
              {drawerTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <Tab
                    key={tab.key}
                    label={tab.label}
                    icon={<Icon fontSize="small" />}
                    iconPosition="start"
                    sx={{ textTransform: "none" }}
                  />
                );
              })}
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pt: 2, pb: 2 }}>
            <IssueDetailsDrawerTabPanel value={drawerTab} index={0}>
              <IssueDetailsOverviewTab {...overviewProps} />
            </IssueDetailsDrawerTabPanel>

            <IssueDetailsDrawerTabPanel value={drawerTab} index={1}>
              <IssueDetailsAlternativesTab alternatives={alternatives} />
            </IssueDetailsDrawerTabPanel>

            <IssueDetailsDrawerTabPanel value={drawerTab} index={2}>
              <IssueDetailsCriteriaTab
                selectedIssue={selectedIssue}
                criteriaCount={criteriaCount}
                finalWeights={finalWeights}
              />
            </IssueDetailsDrawerTabPanel>

            <IssueDetailsDrawerTabPanel value={drawerTab} index={3}>
              <IssueDetailsTimelineTab
                selectedIssue={selectedIssue}
                deadlineLabel={deadlineLabel}
              />
            </IssueDetailsDrawerTabPanel>

            {selectedIssue.isAdmin ? (
              <IssueDetailsDrawerTabPanel value={drawerTab} index={4}>
                <IssueDetailsExpertsTab {...expertsTabProps} />
              </IssueDetailsDrawerTabPanel>
            ) : null}
          </Box>

          <Divider sx={{ opacity: 0.18 }} />
        </Stack>
      )}
    </Drawer>
  );
};

export default IssueDetailsDrawer;