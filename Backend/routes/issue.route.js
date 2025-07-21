// Importa el enrutador de Express para definir rutas.
import { Router } from 'express'

import { createIssue, modelsInfo, getAllUsers, getAllActiveIssues, removeIssue, getNotifications, markAllNotificationsAsRead, changeInvitationStatus, removeNotificationById, saveEvaluations, getEvaluations, sendEvaluations, resolveIssue, getAllFinishedIssues, getFinishedIssueInfo, removeFinishedIssue, editExperts } from '../controllers/issue.controller.js'

// Importa el middleware para verificar el token de acceso.
import { requireToken } from '../middlewares/requireToken.js'

// Crea una instancia del enrutador de Express.
const router = Router()

// Define la ruta GET para obtener información de modelos.
// Ejecuta el controlador `modelsInfo`.
router.get("/getModelsInfo", requireToken, modelsInfo)

router.get("/getAllUsers", requireToken, getAllUsers)

router.post("/createIssue", requireToken, createIssue)

router.get("/getAllActiveIssues", requireToken, getAllActiveIssues)

router.get("/getAllFinishedIssues", requireToken, getAllFinishedIssues)

router.post("/removeIssue", requireToken, removeIssue)

router.get("/getNotifications", requireToken, getNotifications)

router.post("/markAllNotificationsAsRead", requireToken, markAllNotificationsAsRead)

router.post("/changeInvitationStatus", requireToken, changeInvitationStatus)

router.post("/removeNotificationById", requireToken, removeNotificationById)

router.post("/saveEvaluations", requireToken, saveEvaluations)

router.post("/getEvaluations", requireToken, getEvaluations)

router.post("/sendEvaluations", requireToken, sendEvaluations)

router.post("/resolveIssue", requireToken, resolveIssue)

router.post("/getFinishedIssueInfo", requireToken, getFinishedIssueInfo)

router.post("/removeFinishedIssue", requireToken, removeFinishedIssue)

router.post("/editExperts", requireToken, editExperts)









// Exporta el enrutador para que pueda ser utilizado en otros módulos.
export default router
