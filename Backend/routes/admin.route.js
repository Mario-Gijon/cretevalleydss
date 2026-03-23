import { Router } from "express";
import {
  getAllUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getAllIssuesAdmin,
  getIssueExpertsProgressAdmin,
  getIssueExpertEvaluationsAdmin,
  getIssueExpertWeightsAdmin,
  reassignIssueAdminAdmin,
  getIssueAdminById,
  editIssueExpertsAdmin,
  computeIssueWeightsAdmin,
  resolveIssueAdmin,
  removeIssueAdmin,
} from "../controllers/admin.controller.js";

import { requireToken } from "../middlewares/requireToken.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

// Obtener todos los expertos
router.get("/getAllExperts", requireToken, requireAdmin, getAllUsersAdmin);

// Crear experto
router.post("/createExpert", requireToken, requireAdmin, createUserAdmin);

// Actualizar experto
router.post("/updateExpert", requireToken, requireAdmin, updateUserAdmin);

// Eliminar experto
router.post("/deleteExpert", requireToken, requireAdmin, deleteUserAdmin);

// Obtener todos los issues
router.get("/getAllIssues", requireToken, requireAdmin, getAllIssuesAdmin);

// Obtener un issue por id
router.get("/getIssue/:id", requireToken, requireAdmin, getIssueAdminById);

// Obtener progreso de expertos en un issue
router.get(
  "/getIssueExpertsProgress/:id",
  requireToken,
  requireAdmin,
  getIssueExpertsProgressAdmin
);

// Obtener evaluaciones de un experto en un issue
router.get(
  "/getIssueExpertEvaluations/:issueId/:expertId",
  requireToken,
  requireAdmin,
  getIssueExpertEvaluationsAdmin
);

// Obtener pesos de un experto en un issue
router.get(
  "/getIssueExpertWeights/:issueId/:expertId",
  requireToken,
  requireAdmin,
  getIssueExpertWeightsAdmin
);

// Reasignar administrador responsable del issue
router.post(
  "/reassignIssueAdmin",
  requireToken,
  requireAdmin,
  reassignIssueAdminAdmin
);

// Editar expertos del issue
router.post("/issues/edit-experts", requireToken, requireAdmin, editIssueExpertsAdmin);

// Computar pesos del issue
router.post("/issues/compute-weights", requireToken, requireAdmin, computeIssueWeightsAdmin);

// Resolver issue
router.post("/issues/resolve", requireToken, requireAdmin, resolveIssueAdmin);

// Eliminar issue
router.post("/issues/remove", requireToken, requireAdmin, removeIssueAdmin);

export default router;