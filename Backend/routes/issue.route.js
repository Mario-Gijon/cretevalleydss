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

  saveEvaluations,
  getEvaluations,
  submitEvaluations,
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

// Models
router.get("/getModelsInfo", requireToken, modelsInfo);

// Users
router.get("/getAllUsers", requireToken, getAllUsers);

// Expression domains
router.get("/getExpressionsDomain", requireToken, getExpressionsDomain);
router.post("/createExpressionDomain", requireToken, createExpressionDomain);
router.post("/removeExpressionDomain", requireToken, removeExpressionDomain);
router.post("/updateExpressionDomain", requireToken, updateExpressionDomain);

// Issues
router.post("/createIssue", requireToken, createIssue);
router.get("/getAllActiveIssues", requireToken, getAllActiveIssues);
router.get("/getAllFinishedIssues", requireToken, getAllFinishedIssues);
router.post("/removeIssue", requireToken, removeIssue);
router.post("/getFinishedIssueInfo", requireToken, getFinishedIssueInfo);
router.post("/removeFinishedIssue", requireToken, removeFinishedIssue);
router.post("/leaveIssue", requireToken, leaveIssue);
router.post("/editExperts", requireToken, editExperts);

// Notifications
router.get("/getNotifications", requireToken, getNotifications);
router.post("/markAllNotificationsAsRead", requireToken, markAllNotificationsAsRead);
router.post("/changeInvitationStatus", requireToken, changeInvitationStatus);
router.post("/removeNotificationById", requireToken, removeNotificationById);

// Evaluations (unified public API)
router.post("/evaluations/save", requireToken, saveEvaluations);
router.post("/evaluations/get", requireToken, getEvaluations);
router.post("/evaluations/submit", requireToken, submitEvaluations);
router.post("/resolve", requireToken, resolveIssue);

// Weights - BWM
router.post("/saveBwmWeights", requireToken, saveBwmWeights);
router.post("/getBwmWeights", requireToken, getBwmWeights);
router.post("/sendBwmWeights", requireToken, sendBwmWeights);
router.post("/computeWeights", requireToken, computeWeights);

// Weights - manual
router.post("/saveManualWeights", requireToken, saveManualWeights);
router.post("/getManualWeights", requireToken, getManualWeights);
router.post("/sendManualWeights", requireToken, sendManualWeights);
router.post("/computeManualWeights", requireToken, computeManualWeights);

// Scenarios
router.post("/createIssueScenario", requireToken, createIssueScenario);
router.post("/getIssueScenarios", requireToken, getIssueScenarios);
router.post("/getIssueScenarioById", requireToken, getScenarioById);
router.post("/removeIssueScenario", requireToken, removeScenario);

export default router;