import { Router } from "express";

import { asyncHandler } from "../middlewares/asyncHandler.js";
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

/**
 * Copia valores de req.params a req.body para mantener compatibilidad
 * con controllers que todavía esperan ids en el body.
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

/**
 * @openapi
 * /admin/experts:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Obtiene el listado de usuarios visibles en el panel admin
 *     description: |
 *       Devuelve el listado de usuarios visibles para administración.
 *       Permite búsqueda por texto y decidir si se incluyen administradores.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         description: Texto de búsqueda libre.
 *         schema:
 *           type: string
 *           example: mario
 *       - in: query
 *         name: includeAdmins
 *         required: false
 *         description: Indica si se incluyen usuarios con rol admin.
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           example: "true"
 *     responses:
 *       200:
 *         description: Listado obtenido correctamente
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
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       500:
 *         description: Error interno del servidor
 *   post:
 *     tags:
 *       - Admin
 *     summary: Crea un usuario desde el panel admin
 *     description: |
 *       Crea un nuevo usuario desde el panel de administración.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mario
 *               university:
 *                 type: string
 *                 example: Universidad de Granada
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mario@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *               accountConfirm:
 *                 type: boolean
 *                 example: true
 *               role:
 *                 type: string
 *                 example: user
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
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
 *                   example: User mario@example.com created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       409:
 *         description: Conflicto por email ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router
  .route("/experts")
  .get(requireToken, requireAdmin, asyncHandler(getAllUsersAdmin))
  .post(requireToken, requireAdmin, asyncHandler(createUserAdmin));

/**
 * @openapi
 * /admin/experts/{id}:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Actualiza un usuario desde el panel admin
 *     description: |
 *       Actualiza un usuario existente desde el panel de administración.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del usuario a actualizar.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mario Gijón
 *               university:
 *                 type: string
 *                 example: Universidad de Granada
 *               email:
 *                 type: string
 *                 format: email
 *                 example: mario@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: newSecret123
 *               accountConfirm:
 *                 type: boolean
 *                 example: true
 *               role:
 *                 type: string
 *                 example: user
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
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
 *                   example: User mario@example.com updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: Conflicto por email ya registrado
 *       500:
 *         description: Error interno del servidor
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Elimina un usuario desde el panel admin
 *     description: |
 *       Elimina un usuario desde el panel de administración.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del usuario a eliminar.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
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
 *                   example: User mario@example.com deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUser:
 *                       type: object
 *                       additionalProperties: true
 *                     summary:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Id de usuario inválido o ausente
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router
  .route("/experts/:id")
  .patch(
    requireToken,
    requireAdmin,
    mapParamsToBody({ id: "id" }),
    asyncHandler(updateUserAdmin)
  )
  .delete(
    requireToken,
    requireAdmin,
    mapParamsToBody({ id: "id" }),
    asyncHandler(deleteUserAdmin)
  );

/**
 * @openapi
 * /admin/issues:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Obtiene el listado de issues para el panel admin
 *     description: |
 *       Devuelve un listado resumido de issues con filtros opcionales.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         description: Texto de búsqueda libre.
 *         schema:
 *           type: string
 *           example: sostenibilidad
 *       - in: query
 *         name: active
 *         required: false
 *         description: Filtro por actividad del issue.
 *         schema:
 *           type: string
 *           example: all
 *       - in: query
 *         name: currentStage
 *         required: false
 *         description: Filtro por etapa actual del workflow.
 *         schema:
 *           type: string
 *           example: alternativeEvaluation
 *       - in: query
 *         name: isConsensus
 *         required: false
 *         description: Filtro por uso de consenso.
 *         schema:
 *           type: string
 *           example: all
 *       - in: query
 *         name: adminId
 *         required: false
 *         description: Filtra por administrador responsable.
 *         schema:
 *           type: string
 *       - in: query
 *         name: modelId
 *         required: false
 *         description: Filtra por modelo de decisión.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listado obtenido correctamente
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
 *                   example: Issues fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       500:
 *         description: Error interno del servidor
 */
router.get("/issues", requireToken, requireAdmin, asyncHandler(getAllIssuesAdmin));

/**
 * @openapi
 * /admin/issues/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Obtiene el detalle completo de un issue
 *     description: |
 *       Devuelve el detalle completo de un issue para administración.
 *       Requiere access token válido y rol admin.
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
 *                   example: Issue detail fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error interno del servidor
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Elimina un issue activo desde el panel admin
 *     description: |
 *       Elimina un issue activo reutilizando el flow de lifecycle del dominio.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id del issue a eliminar.
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
 *         description: Id inválido o datos insuficientes
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router
  .route("/issues/:id")
  .get(requireToken, requireAdmin, asyncHandler(getIssueAdminById))
  .delete(
    requireToken,
    requireAdmin,
    mapParamsToBody({ issueId: "id" }),
    asyncHandler(removeIssueAdmin)
  );

/**
 * @openapi
 * /admin/issues/{id}/experts/progress:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Obtiene el progreso de expertos en un issue
 *     description: |
 *       Devuelve una vista resumida del progreso de los expertos en un issue.
 *       Requiere access token válido y rol admin.
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
 *         description: Progreso obtenido correctamente
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
 *                   example: Issue experts progress fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/issues/:id/experts/progress",
  requireToken,
  requireAdmin,
  asyncHandler(getIssueExpertsProgressAdmin)
);

/**
 * @openapi
 * /admin/issues/{issueId}/experts/{expertId}/evaluations:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Obtiene las evaluaciones de un experto en un issue
 *     description: |
 *       Devuelve las evaluaciones de un experto en modo solo lectura.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *       - in: path
 *         name: expertId
 *         required: true
 *         description: Id del experto.
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
 *                   example: Expert evaluations fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue o experto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/issues/:issueId/experts/:expertId/evaluations",
  requireToken,
  requireAdmin,
  asyncHandler(getIssueExpertEvaluationsAdmin)
);

/**
 * @openapi
 * /admin/issues/{issueId}/experts/{expertId}/weights:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Obtiene los pesos de un experto en un issue
 *     description: |
 *       Devuelve los pesos de un experto en modo solo lectura.
 *       Requiere access token válido y rol admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         description: Id del issue.
 *         schema:
 *           type: string
 *       - in: path
 *         name: expertId
 *         required: true
 *         description: Id del experto.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pesos obtenidos correctamente
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
 *                   example: Expert weights fetched successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue o experto no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/issues/:issueId/experts/:expertId/weights",
  requireToken,
  requireAdmin,
  asyncHandler(getIssueExpertWeightsAdmin)
);

/**
 * @openapi
 * /admin/issues/{id}/admin:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Reasigna el administrador de un issue
 *     description: |
 *       Cambia el usuario administrador responsable de un issue.
 *       Requiere access token válido y rol admin.
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
 *               - newAdminId
 *             properties:
 *               newAdminId:
 *                 type: string
 *                 example: 661b3d9f7c7f0f8a4a123456
 *     responses:
 *       200:
 *         description: Administrador reasignado correctamente
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
 *                   example: Issue Sustainability study reassigned to admin@example.com successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     issue:
 *                       type: object
 *                       additionalProperties: true
 *                     admin:
 *                       type: object
 *                       additionalProperties: true
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue o usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch(
  "/issues/:id/admin",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(reassignIssueAdminAdmin)
);

/**
 * @openapi
 * /admin/issues/{id}/experts:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Edita los expertos de un issue
 *     description: |
 *       Permite añadir o expulsar expertos de un issue reutilizando
 *       el flow de dominio de issues.
 *       Requiere access token válido y rol admin.
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
 *                   example: Experts updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     issueName:
 *                       type: string
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: Access token ausente, expirado o inválido
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch(
  "/issues/:id/experts",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(editIssueExpertsAdmin)
);

/**
 * @openapi
 * /admin/issues/{id}/weights/compute:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Computa los pesos colectivos de un issue
 *     description: |
 *       Ejecuta el cálculo de pesos colectivos reutilizando los flows
 *       del dominio de issues. El resultado exacto depende del weighting mode
 *       del issue.
 *       Requiere access token válido y rol admin.
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
 *         description: Pesos computados correctamente
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
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  "/issues/:id/weights/compute",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(computeIssueWeightsAdmin)
);

/**
 * @openapi
 * /admin/issues/{id}/resolve:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Resuelve un issue
 *     description: |
 *       Ejecuta la resolución de un issue reutilizando los flows del dominio.
 *       Puede usar resolución directa o pairwise según la estructura de evaluación.
 *       Requiere access token válido y rol admin.
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
 *       403:
 *         description: Usuario autenticado sin permisos de administrador
 *       404:
 *         description: Issue no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  "/issues/:id/resolve",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(resolveIssueAdmin)
);

export default router;