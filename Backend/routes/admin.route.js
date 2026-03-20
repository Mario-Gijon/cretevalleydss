// Importa el enrutador de Express para definir rutas.
import { Router } from "express";

// Importa los controladores de admin.
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

// Importa middlewares de seguridad.
import { requireToken } from "../middlewares/requireToken.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

// Crea una instancia del enrutador de Express.
const router = Router();

// =========================
// Users / experts
// =========================

// GET: obtener todos los expertos
router.get("/getAllExperts", requireToken, requireAdmin, getAllUsersAdmin);

// POST: crear experto
router.post("/createExpert", requireToken, requireAdmin, createUserAdmin);

// POST: actualizar experto
router.post("/updateExpert", requireToken, requireAdmin, updateUserAdmin);

// POST: borrar experto en cascada
router.post("/deleteExpert", requireToken, requireAdmin, deleteUserAdmin);

// =========================
// Issues
// =========================

router.get("/getAllIssues", requireToken, requireAdmin, getAllIssuesAdmin);
router.get("/getIssue/:id", requireToken, requireAdmin, getIssueAdminById);
router.get("/getIssueExpertsProgress/:id", requireToken, requireAdmin, getIssueExpertsProgressAdmin);
router.get("/getIssueExpertEvaluations/:issueId/:expertId", requireToken, requireAdmin, getIssueExpertEvaluationsAdmin);
router.get("/getIssueExpertWeights/:issueId/:expertId", requireToken, requireAdmin, getIssueExpertWeightsAdmin);

// Cambiar admin/creador responsable del issue
router.post("/reassignIssueAdmin", requireToken, requireAdmin, reassignIssueAdminAdmin);

// Admin actuando como creador del issue
router.post("/issues/edit-experts", requireToken, requireAdmin, editIssueExpertsAdmin);
router.post("/issues/compute-weights", requireToken, requireAdmin, computeIssueWeightsAdmin);
router.post("/issues/resolve", requireToken, requireAdmin, resolveIssueAdmin);
router.post("/issues/remove", requireToken, requireAdmin, removeIssueAdmin);

// Exporta el router.
export default router;