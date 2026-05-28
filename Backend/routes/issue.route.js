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
  saveIssueEvaluationByStage,
  getIssueEvaluationByStage,
  submitIssueEvaluationByStage,
  computeEvaluationStage,
  createExpressionDomain,
  getExpressionsDomain,
  removeExpressionDomain,
  updateExpressionDomain,
  createIssueScenario,
  getIssueScenarios,
  getScenarioById,
  removeScenario,
} from "../controllers/issue.controller.js";

import { requireToken } from "../middlewares/requireToken.js";

const router = Router();

const mapParamsToBody = (mapping) => (req, _res, next) => {
  req.body = req.body ?? {};

  Object.entries(mapping).forEach(([bodyKey, paramKey]) => {
    req.body[bodyKey] = req.params[paramKey];
  });

  next();
};

router.use(requireToken);

router.get("/models", asyncHandler(modelsInfo));

router.get("/users", asyncHandler(getAllUsers));

router
  .route("/expression-domains")
  .get(asyncHandler(getExpressionsDomain))
  .post(asyncHandler(createExpressionDomain));

router
  .route("/expression-domains/:id")
  .patch(mapParamsToBody({ id: "id" }), asyncHandler(updateExpressionDomain))
  .delete(mapParamsToBody({ id: "id" }), asyncHandler(removeExpressionDomain));

router.post("/", asyncHandler(createIssue));

router.get("/active", asyncHandler(getAllActiveIssues));

router.get("/finished", asyncHandler(getAllFinishedIssues));

router
  .route("/finished/:id")
  .get(mapParamsToBody({ id: "id" }), asyncHandler(getFinishedIssueInfo))
  .delete(mapParamsToBody({ id: "id" }), asyncHandler(removeFinishedIssue));

router.delete("/:id", mapParamsToBody({ id: "id" }), asyncHandler(removeIssue));

router.post("/:id/leave", mapParamsToBody({ id: "id" }), asyncHandler(leaveIssue));

router.patch("/:id/experts", mapParamsToBody({ id: "id" }), asyncHandler(editExperts));

router.post(
  "/:id/invitation-response",
  mapParamsToBody({ id: "id" }),
  asyncHandler(changeInvitationStatus)
);

router.get("/notifications", asyncHandler(getNotifications));

router.post("/notifications/read-all", asyncHandler(markAllNotificationsAsRead));

router.delete(
  "/notifications/:notificationId",
  mapParamsToBody({ notificationId: "notificationId" }),
  asyncHandler(removeNotificationById)
);

router.post("/:id/evaluations/:stage/send", asyncHandler(saveIssueEvaluationByStage));
router.post("/:id/evaluations/:stage/submit", asyncHandler(submitIssueEvaluationByStage));
router.post("/:id/evaluations/:stage/compute", asyncHandler(computeEvaluationStage));
router.get("/:id/evaluations/:stage", asyncHandler(getIssueEvaluationByStage));

router
  .route("/:id/scenarios")
  .get(mapParamsToBody({ issueId: "id" }), asyncHandler(getIssueScenarios))
  .post(mapParamsToBody({ issueId: "id" }), asyncHandler(createIssueScenario));

router
  .route("/scenarios/:scenarioId")
  .get(mapParamsToBody({ scenarioId: "scenarioId" }), asyncHandler(getScenarioById))
  .delete(mapParamsToBody({ scenarioId: "scenarioId" }), asyncHandler(removeScenario));

export default router;
