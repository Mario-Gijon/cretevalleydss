// Importa el enrutador de Express para definir rutas.
import { Router } from 'express'

import { createIssue, modelsInfo, getAllUsers, getAllActiveIssues, removeIssue, getNotifications, markAllNotificationsAsRead, changeInvitationStatus, removeNotificationById, getAllFinishedIssues, getFinishedIssueInfo, removeFinishedIssue, editExperts, leaveIssue, resolvePairwiseIssue, savePairwiseEvaluations, getPairwiseEvaluations, sendPairwiseEvaluations, saveEvaluations, getEvaluations, sendEvaluations, resolveIssue, createExpressionDomain, getExpressionsDomain, removeExpressionDomain, updateExpressionDomain } from '../controllers/issue.controller.js'

// Importa el middleware para verificar el token de acceso.
import { requireToken } from '../middlewares/requireToken.js'

// Crea una instancia del enrutador de Express.
const router = Router()

// Define la ruta GET para obtener información de modelos.
// Ejecuta el controlador `modelsInfo`.
router.get("/getModelsInfo", requireToken, modelsInfo)

router.get("/getAllUsers", requireToken, getAllUsers)

router.get("/getExpressionsDomain", requireToken, getExpressionsDomain)

router.post("/createExpressionDomain", requireToken, createExpressionDomain)

router.post("/createIssue", requireToken, createIssue)

router.get("/getAllActiveIssues", requireToken, getAllActiveIssues)

router.get("/getAllFinishedIssues", requireToken, getAllFinishedIssues)

router.post("/removeIssue", requireToken, removeIssue)

router.post("/removeExpressionDomain", requireToken, removeExpressionDomain)

router.post("/updateExpressionDomain", requireToken, updateExpressionDomain)

router.get("/getNotifications", requireToken, getNotifications)

router.post("/markAllNotificationsAsRead", requireToken, markAllNotificationsAsRead)

router.post("/changeInvitationStatus", requireToken, changeInvitationStatus)

router.post("/removeNotificationById", requireToken, removeNotificationById)

router.post("/getFinishedIssueInfo", requireToken, getFinishedIssueInfo)

router.post("/removeFinishedIssue", requireToken, removeFinishedIssue)

router.post("/leaveIssue", requireToken, leaveIssue)

router.post("/editExperts", requireToken, editExperts)

// PAIRWISE
router.post("/savePairwiseEvaluations", requireToken, savePairwiseEvaluations)
router.post("/getPairwiseEvaluations", requireToken, getPairwiseEvaluations)
router.post("/sendPairwiseEvaluations", requireToken, sendPairwiseEvaluations)
router.post("/resolvePairwiseIssue", requireToken, resolvePairwiseIssue)

// NO PAIRWISE
router.post("/saveEvaluations", requireToken, saveEvaluations)
router.post("/getEvaluations", requireToken, getEvaluations)
router.post("/sendEvaluations", requireToken, sendEvaluations)
router.post("/resolveIssue", requireToken, resolveIssue)






// Exporta el enrutador para que pueda ser utilizado en otros módulos.
export default router
