import { Router } from "express";

import {
  createIssue,
  modelsInfo,
  getAllUsers,
  getAllActiveIssues,
  removeIssue,
  getNotifications,
  markAllNotificationsAsRead,
  changeInvitationStatus,
  removeNotificationById,
  getAllFinishedIssues,
  getFinishedIssueInfo,
  removeFinishedIssue,
  editExperts,
  leaveIssue,
  resolvePairwiseIssue,
  savePairwiseEvaluations,
  getPairwiseEvaluations,
  sendPairwiseEvaluations,
  saveEvaluations,
  getEvaluations,
  sendEvaluations,
  resolveIssue,
  createExpressionDomain,
  getExpressionsDomain,
  removeExpressionDomain,
  updateExpressionDomain,
  saveBwmWeights,
  getBwmWeights,
  sendBwmWeights,
  computeWeights,
  saveManualWeights,
  getManualWeights,
  sendManualWeights,
  computeManualWeights,
  createIssueScenario,
  getIssueScenarios,
  getScenarioById,
  removeScenario,
} from "../controllers/issue.controller.js";

import { requireToken } from "../middlewares/requireToken.js";

const router = Router();

// Obtener información de modelos
router.get("/getModelsInfo", requireToken, modelsInfo);

// Obtener usuarios
router.get("/getAllUsers", requireToken, getAllUsers);

// Obtener dominios de expresión
router.get("/getExpressionsDomain", requireToken, getExpressionsDomain);

// Crear dominio de expresión
router.post("/createExpressionDomain", requireToken, createExpressionDomain);

// Crear issue
router.post("/createIssue", requireToken, createIssue);

// Obtener issues activos
router.get("/getAllActiveIssues", requireToken, getAllActiveIssues);

// Obtener issues finalizados
router.get("/getAllFinishedIssues", requireToken, getAllFinishedIssues);

// Eliminar issue activo
router.post("/removeIssue", requireToken, removeIssue);

// Eliminar dominio de expresión
router.post("/removeExpressionDomain", requireToken, removeExpressionDomain);

// Actualizar dominio de expresión
router.post("/updateExpressionDomain", requireToken, updateExpressionDomain);

// Obtener notificaciones
router.get("/getNotifications", requireToken, getNotifications);

// Marcar todas las notificaciones como leídas
router.post("/markAllNotificationsAsRead", requireToken, markAllNotificationsAsRead);

// Cambiar estado de invitación
router.post("/changeInvitationStatus", requireToken, changeInvitationStatus);

// Eliminar notificación por id
router.post("/removeNotificationById", requireToken, removeNotificationById);

// Obtener información de issue finalizado
router.post("/getFinishedIssueInfo", requireToken, getFinishedIssueInfo);

// Eliminar issue finalizado
router.post("/removeFinishedIssue", requireToken, removeFinishedIssue);

// Salir de un issue
router.post("/leaveIssue", requireToken, leaveIssue);

// Editar expertos del issue
router.post("/editExperts", requireToken, editExperts);

// Guardar evaluaciones pairwise
router.post("/savePairwiseEvaluations", requireToken, savePairwiseEvaluations);

// Obtener evaluaciones pairwise
router.post("/getPairwiseEvaluations", requireToken, getPairwiseEvaluations);

// Enviar evaluaciones pairwise
router.post("/sendPairwiseEvaluations", requireToken, sendPairwiseEvaluations);

// Resolver issue pairwise
router.post("/resolvePairwiseIssue", requireToken, resolvePairwiseIssue);

// Guardar evaluaciones
router.post("/saveEvaluations", requireToken, saveEvaluations);

// Obtener evaluaciones
router.post("/getEvaluations", requireToken, getEvaluations);

// Enviar evaluaciones
router.post("/sendEvaluations", requireToken, sendEvaluations);

// Resolver issue
router.post("/resolveIssue", requireToken, resolveIssue);

// Guardar pesos BWM
router.post("/saveBwmWeights", requireToken, saveBwmWeights);

// Obtener pesos BWM
router.post("/getBwmWeights", requireToken, getBwmWeights);

// Enviar pesos BWM
router.post("/sendBwmWeights", requireToken, sendBwmWeights);

// Computar pesos BWM
router.post("/computeWeights", requireToken, computeWeights);

// Guardar pesos manuales
router.post("/saveManualWeights", requireToken, saveManualWeights);

// Obtener pesos manuales
router.post("/getManualWeights", requireToken, getManualWeights);

// Enviar pesos manuales
router.post("/sendManualWeights", requireToken, sendManualWeights);

// Computar pesos manuales
router.post("/computeManualWeights", requireToken, computeManualWeights);

// Crear escenario de issue
router.post("/createIssueScenario", requireToken, createIssueScenario);

// Obtener escenarios de un issue
router.post("/getIssueScenarios", requireToken, getIssueScenarios);

// Obtener escenario por id
router.post("/getIssueScenarioById", requireToken, getScenarioById);

// Eliminar escenario
router.post("/removeIssueScenario", requireToken, removeScenario);

export default router;