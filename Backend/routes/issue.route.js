import { Router } from "express";

import { asyncHandler } from "../middlewares/asyncHandler.js";

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

/**
 * Copia valores de req.params a req.body para mantener compatibilidad
 * con controllers que todavía esperan ids o claves en el body.
 *
 * @param {Object.<string, string>} mapping Mapa bodyKey -> paramKey.
 * @returns {Function}
 */
const mapParamsToBody = (mapping) => (req, _res, next) => {
  req.body = req.body ?? {};

  Object.entries(mapping).forEach(([bodyKey, paramKey]) => {
    req.body[bodyKey] = req.params[paramKey];
  });

  next();
};

router.use(requireToken);

/**
 * @openapi
 * /issues/models:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene el catálogo de modelos disponibles
 *     description: |
 *       Devuelve los modelos de decisión disponibles para crear issues.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Modelos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Models fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get("/models", asyncHandler(modelsInfo));

/**
 * @openapi
 * /issues/users:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene los usuarios disponibles para crear o editar issues
 *     description: |
 *       Devuelve los usuarios confirmados visibles para asignaciones de issues.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuarios obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       university:
 *                         type: string
 *                       email:
 *                         type: string
 *                         format: email
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error interno del servidor
 */
router.get("/users", asyncHandler(getAllUsers));

/**
 * @openapi
 * /issues/expression-domains:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Lista los dominios de expresión visibles para el usuario actual
 *     description: |
 *       Devuelve tanto dominios globales como dominios propios del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dominios obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Expression domains fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error obteniendo dominios
 *   post:
 *     tags:
 *       - Issues
 *     summary: Crea un nuevo dominio de expresión
 *     description: |
 *       Crea un dominio de expresión privado del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             example:
 *               name: Numeric 0-10 custom
 *               type: numeric
 *               numericRange:
 *                 min: 0
 *                 max: 10
 *                 step: 1
 *     responses:
 *       201:
 *         description: Dominio creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Domain Numeric 0-10 custom created successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       409:
 *         description: Ya existe un dominio con el mismo nombre para el usuario
 *       500:
 *         description: Error creando dominio
 */
router
  .route("/expression-domains")
  .get(asyncHandler(getExpressionsDomain))
  .post(asyncHandler(createExpressionDomain));

/**
 * @openapi
 * /issues/expression-domains/{id}:
 *   patch:
 *     tags:
 *       - Issues
 *     summary: Actualiza un dominio de expresión del usuario actual
 *     description: |
 *       Actualiza un dominio privado del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del dominio a actualizar.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updatedDomain
 *             properties:
 *               updatedDomain:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Dominio actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Domain updated successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Dominio no encontrado
 *       500:
 *         description: Error actualizando dominio
 *   delete:
 *     tags:
 *       - Issues
 *     summary: Elimina un dominio de expresión del usuario actual
 *     description: |
 *       Elimina un dominio privado del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del dominio a eliminar.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dominio eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Domain deleted
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Dominio no encontrado
 *       500:
 *         description: Error eliminando dominio
 */
router
  .route("/expression-domains/:id")
  .patch(mapParamsToBody({ id: "id" }), asyncHandler(updateExpressionDomain))
  .delete(mapParamsToBody({ id: "id" }), asyncHandler(removeExpressionDomain));

/**
 * @openapi
 * /issues:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Crea un nuevo issue
 *     description: |
 *       Crea un issue con alternativas, criterios, expertos, snapshots de dominios
 *       y evaluaciones iniciales. Tras la persistencia puede enviar invitaciones por email.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issueInfo
 *             properties:
 *               issueInfo:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: Issue creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Issue Sustainability study created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     issueName:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Datos del issue inválidos
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Alguna entidad referenciada no existe
 *       500:
 *         description: Error creando issue
 */
router.post("/", asyncHandler(createIssue));

/**
 * @openapi
 * /issues/active:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene los issues activos visibles para el usuario actual
 *     description: |
 *       Devuelve la vista principal de issues activos, incluyendo lista de issues,
 *       tareas, task center y metadatos de filtros.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Issues activos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Active issues fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         additionalProperties: true
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         additionalProperties: true
 *                     taskCenter:
 *                       type: object
 *                       nullable: true
 *                       additionalProperties: true
 *                     filtersMeta:
 *                       type: object
 *                       nullable: true
 *                       additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error obteniendo issues activos
 */
router.get("/active", asyncHandler(getAllActiveIssues));

/**
 * @openapi
 * /issues/finished:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene los issues finalizados visibles para el usuario actual
 *     description: |
 *       Devuelve la lista resumida de issues finalizados visibles para el usuario.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Issues finalizados obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Finished issues fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       creationDate:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       closureDate:
 *                         type: string
 *                         nullable: true
 *                       isAdmin:
 *                         type: boolean
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error obteniendo issues finalizados
 */
router.get("/finished", asyncHandler(getAllFinishedIssues));

/**
 * @openapi
 * /issues/finished/{id}:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene el detalle de un issue finalizado
 *     description: |
 *       Devuelve la información completa del issue finalizado para visualización.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue finalizado.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Issue info sent
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error obteniendo detalle del issue
 *   delete:
 *     tags:
 *       - Issues
 *     summary: Oculta o elimina un issue finalizado para el usuario actual
 *     description: |
 *       Oculta el issue finalizado para el usuario actual o lo elimina
 *       completamente si se cumplen las condiciones de limpieza.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue finalizado.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue finalizado ocultado o eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Issue Sustainability study removed
 *                 data:
 *                   type: object
 *                   properties:
 *                     issueName:
 *                       type: string
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error eliminando issue finalizado
 */
router
  .route("/finished/:id")
  .get(mapParamsToBody({ id: "id" }), asyncHandler(getFinishedIssueInfo))
  .delete(mapParamsToBody({ id: "id" }), asyncHandler(removeFinishedIssue));

/**
 * @openapi
 * /issues/{id}:
 *   delete:
 *     tags:
 *       - Issues
 *     summary: Elimina un issue activo si el usuario actual es su administrador
 *     description: |
 *       Elimina un issue activo y sus dependencias relacionadas.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue activo.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Issue Sustainability study removed
 *                 data:
 *                   type: object
 *                   properties:
 *                     issueName:
 *                       type: string
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error eliminando issue
 */
router.delete("/:id", mapParamsToBody({ id: "id" }), asyncHandler(removeIssue));

/**
 * @openapi
 * /issues/{id}/leave:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Permite a un experto abandonar un issue activo
 *     description: |
 *       Permite al usuario actual abandonar un issue activo en el que participa.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue activo.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue abandonado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: You have left the issue successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     issueName:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue o participación no encontrada
 *       500:
 *         description: Error abandonando issue
 */
router.post("/:id/leave", mapParamsToBody({ id: "id" }), asyncHandler(leaveIssue));

/**
 * @openapi
 * /issues/{id}/experts:
 *   patch:
 *     tags:
 *       - Issues
 *     summary: Edita los expertos de un issue activo
 *     description: |
 *       Añade o expulsa expertos de un issue activo.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue activo.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertsToAdd:
 *                 type: array
 *                 items:
 *                   type: string
 *               expertsToRemove:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Expertos editados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Experts updated successfully.
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error editando expertos
 */
router.patch("/:id/experts", mapParamsToBody({ id: "id" }), asyncHandler(editExperts));

/**
 * @openapi
 * /issues/{id}/invitation-response:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Acepta o rechaza una invitación a un issue
 *     description: |
 *       Cambia el estado de invitación del usuario actual para un issue.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accepted, declined]
 *                 example: accepted
 *     responses:
 *       200:
 *         description: Estado de invitación actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Invitation status updated successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Invitación o issue no encontrado
 *       500:
 *         description: Error actualizando el estado de invitación
 */
router.post(
  "/:id/invitation-response",
  mapParamsToBody({ id: "id" }),
  asyncHandler(changeInvitationStatus)
);

/**
 * @openapi
 * /issues/notifications:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene las notificaciones del usuario actual
 *     description: |
 *       Devuelve las notificaciones visibles del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notifications fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error obteniendo notificaciones
 */
router.get("/notifications", asyncHandler(getNotifications));

/**
 * @openapi
 * /issues/notifications/read-all:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Marca como leídas todas las notificaciones del usuario actual
 *     description: |
 *       Marca como leídas todas las notificaciones no leídas del usuario actual.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones actualizadas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notifications updated successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       500:
 *         description: Error actualizando notificaciones
 */
router.post("/notifications/read-all", asyncHandler(markAllNotificationsAsRead));

/**
 * @openapi
 * /issues/notifications/{notificationId}:
 *   delete:
 *     tags:
 *       - Issues
 *     summary: Elimina una notificación concreta del usuario actual
 *     description: |
 *       Elimina una notificación visible del usuario actual.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         description: Id de la notificación.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notificación eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification removed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notificationId:
 *                       type: string
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Notificación no encontrada
 *       500:
 *         description: Error eliminando notificación
 */
router.delete(
  "/notifications/:notificationId",
  mapParamsToBody({ notificationId: "notificationId" }),
  asyncHandler(removeNotificationById)
);

/**
 * @openapi
 * /issues/{id}/evaluations:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene las evaluaciones del usuario actual para un issue
 *     description: |
 *       Devuelve las evaluaciones del usuario actual para el issue indicado.
 *       La forma exacta de la respuesta depende de la estructura de evaluación
 *       del issue, directa o pairwise.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evaluaciones obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Evaluations fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue o evaluaciones no encontradas
 *       500:
 *         description: Error obteniendo evaluaciones
 */
router.get(
  "/:id/evaluations",
  mapParamsToBody({ id: "id" }),
  asyncHandler(getEvaluations)
);

/**
 * @openapi
 * /issues/{id}/evaluations/draft:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Guarda borradores de evaluaciones del usuario actual
 *     description: |
 *       Guarda borradores de evaluaciones para el usuario actual.
 *       La forma del payload depende de la estructura de evaluación
 *       del issue, directa o pairwise.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - evaluations
 *             properties:
 *               evaluations:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Borrador guardado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Evaluations saved successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error guardando evaluaciones
 */
router.post(
  "/:id/evaluations/draft",
  mapParamsToBody({ id: "id" }),
  asyncHandler(saveEvaluations)
);

/**
 * @openapi
 * /issues/{id}/evaluations/submit:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Envía las evaluaciones del usuario actual
 *     description: |
 *       Valida y envía las evaluaciones del usuario actual.
 *       La forma del payload depende de la estructura de evaluación
 *       del issue, directa o pairwise.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - evaluations
 *             properties:
 *               evaluations:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Evaluaciones enviadas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Evaluations submitted successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error enviando evaluaciones
 */
router.post(
  "/:id/evaluations/submit",
  mapParamsToBody({ id: "id" }),
  asyncHandler(submitEvaluations)
);

/**
 * @openapi
 * /issues/{id}/resolve:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Resuelve un issue
 *     description: |
 *       Ejecuta la resolución del issue.
 *       La lógica exacta depende de la estructura de evaluación
 *       y puede implicar resolución directa o pairwise.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forceFinalize:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Issue resuelto correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Issue resolved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     finished:
 *                       type: boolean
 *                     rankedAlternatives:
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error resolviendo issue
 */
router.post("/:id/resolve", mapParamsToBody({ id: "id" }), asyncHandler(resolveIssue));

/**
 * @openapi
 * /issues/{id}/weights/bwm:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene los pesos BWM guardados del usuario actual
 *     description: |
 *       Devuelve los pesos BWM guardados del usuario autenticado para el issue indicado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pesos BWM obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Weights fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bwmData:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue o pesos no encontrados
 *       500:
 *         description: Error obteniendo pesos BWM
 */
router.get("/:id/weights/bwm", mapParamsToBody({ id: "id" }), asyncHandler(getBwmWeights));

/**
 * @openapi
 * /issues/{id}/weights/bwm/draft:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Guarda un borrador de pesos BWM
 *     description: |
 *       Guarda un borrador de pesos BWM del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bwmData
 *             properties:
 *               bwmData:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Borrador BWM guardado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Weights saved successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error guardando pesos BWM
 */
router.post(
  "/:id/weights/bwm/draft",
  mapParamsToBody({ id: "id" }),
  asyncHandler(saveBwmWeights)
);

/**
 * @openapi
 * /issues/{id}/weights/bwm/submit:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Envía los pesos BWM del usuario actual
 *     description: |
 *       Valida y envía los pesos BWM del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bwmData
 *             properties:
 *               bwmData:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Pesos BWM enviados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Weights submitted successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error enviando pesos BWM
 */
router.post(
  "/:id/weights/bwm/submit",
  mapParamsToBody({ id: "id" }),
  asyncHandler(sendBwmWeights)
);

/**
 * @openapi
 * /issues/{id}/weights/bwm/compute:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Calcula los pesos BWM colectivos
 *     description: |
 *       Calcula los pesos BWM colectivos del issue y actualiza su estado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pesos BWM colectivos calculados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Criteria weights for 'Issue name' successfully computed.
 *                 data:
 *                   type: object
 *                   properties:
 *                     finished:
 *                       type: boolean
 *                     weights:
 *                       type: array
 *                       items:
 *                         nullable: true
 *                     criteriaOrder:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error calculando pesos BWM
 */
router.post(
  "/:id/weights/bwm/compute",
  mapParamsToBody({ id: "id" }),
  asyncHandler(computeWeights)
);

/**
 * @openapi
 * /issues/{id}/weights/manual:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene los pesos manuales guardados del usuario actual
 *     description: |
 *       Devuelve los pesos manuales guardados del usuario autenticado para el issue indicado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pesos manuales obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Manual weights fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     manualWeights:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue o pesos no encontrados
 *       500:
 *         description: Error obteniendo pesos manuales
 */
router.get(
  "/:id/weights/manual",
  mapParamsToBody({ id: "id" }),
  asyncHandler(getManualWeights)
);

/**
 * @openapi
 * /issues/{id}/weights/manual/draft:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Guarda un borrador de pesos manuales
 *     description: |
 *       Guarda un borrador de pesos manuales del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - manualWeights
 *             properties:
 *               manualWeights:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Borrador manual guardado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Manual weights saved successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error guardando pesos manuales
 */
router.post(
  "/:id/weights/manual/draft",
  mapParamsToBody({ id: "id" }),
  asyncHandler(saveManualWeights)
);

/**
 * @openapi
 * /issues/{id}/weights/manual/submit:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Envía los pesos manuales del usuario actual
 *     description: |
 *       Valida y envía los pesos manuales del usuario autenticado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - manualWeights
 *             properties:
 *               manualWeights:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Pesos manuales enviados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Manual weights submitted successfully
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error enviando pesos manuales
 */
router.post(
  "/:id/weights/manual/submit",
  mapParamsToBody({ id: "id" }),
  asyncHandler(sendManualWeights)
);

/**
 * @openapi
 * /issues/{id}/weights/manual/compute:
 *   post:
 *     tags:
 *       - Issues
 *     summary: Calcula los pesos manuales colectivos
 *     description: |
 *       Calcula los pesos manuales colectivos del issue y actualiza su estado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pesos manuales colectivos calculados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Criteria weights computed
 *                 data:
 *                   type: object
 *                   properties:
 *                     finished:
 *                       type: boolean
 *                     weights:
 *                       type: array
 *                       items:
 *                         nullable: true
 *                     criteriaOrder:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error calculando pesos manuales
 */
router.post(
  "/:id/weights/manual/compute",
  mapParamsToBody({ id: "id" }),
  asyncHandler(computeManualWeights)
);

/**
 * @openapi
 * /issues/{id}/scenarios:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Lista los escenarios creados para un issue
 *     description: |
 *       Devuelve los escenarios asociados al issue.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escenarios obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scenarios fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error listando escenarios
 *   post:
 *     tags:
 *       - Issues
 *     summary: Crea un escenario de simulación para un issue
 *     description: |
 *       Crea un escenario de simulación asociado al issue.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scenarioName:
 *                 type: string
 *                 example: Sensitivity test
 *               targetModelName:
 *                 type: string
 *                 example: TOPSIS
 *               targetModelId:
 *                 type: string
 *                 nullable: true
 *               paramOverrides:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: Escenario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scenario created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     scenarioId:
 *                       type: string
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Issue o modelo no encontrado
 *       500:
 *         description: Error creando escenario
 */
router
  .route("/:id/scenarios")
  .get(mapParamsToBody({ issueId: "id" }), asyncHandler(getIssueScenarios))
  .post(mapParamsToBody({ issueId: "id" }), asyncHandler(createIssueScenario));

/**
 * @openapi
 * /issues/scenarios/{scenarioId}:
 *   get:
 *     tags:
 *       - Issues
 *     summary: Obtiene un escenario por su id
 *     description: |
 *       Devuelve el detalle de un escenario concreto.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         description: Id del escenario.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escenario obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scenario fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Escenario no encontrado
 *       500:
 *         description: Error obteniendo escenario
 *   delete:
 *     tags:
 *       - Issues
 *     summary: Elimina un escenario
 *     description: |
 *       Elimina un escenario si el usuario actual es su creador
 *       o administrador del issue asociado.
 *       Requiere un access token válido.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         description: Id del escenario.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escenario eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Scenario deleted
 *                 data:
 *                   type: object
 *                   properties:
 *                     scenarioId:
 *                       type: string
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       404:
 *         description: Escenario no encontrado
 *       500:
 *         description: Error eliminando escenario
 */
router
  .route("/scenarios/:scenarioId")
  .get(mapParamsToBody({ scenarioId: "scenarioId" }), asyncHandler(getScenarioById))
  .delete(mapParamsToBody({ scenarioId: "scenarioId" }), asyncHandler(removeScenario));

export default router;