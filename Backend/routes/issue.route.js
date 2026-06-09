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

router.use(requireToken);

router.get("/models", asyncHandler(modelsInfo));

router.get("/users", asyncHandler(getAllUsers));

router
  .route("/expression-domains")
  .get(asyncHandler(getExpressionsDomain))
  .post(asyncHandler(createExpressionDomain));

router
  .route("/expression-domains/:id")
  .patch(asyncHandler(updateExpressionDomain))
  .delete(asyncHandler(removeExpressionDomain));

router.post("/", asyncHandler(createIssue));

router.get("/active", asyncHandler(getAllActiveIssues));

router.get("/finished", asyncHandler(getAllFinishedIssues));

router
  .route("/finished/:id")
  .get(asyncHandler(getFinishedIssueInfo))
  .delete(asyncHandler(removeFinishedIssue));

router.delete("/:id", asyncHandler(removeIssue));

router.post("/:id/leave", asyncHandler(leaveIssue));

router.patch("/:id/experts", asyncHandler(editExperts));

router.post(
  "/:id/invitation-response",
  asyncHandler(changeInvitationStatus)
);

router.get("/notifications", asyncHandler(getNotifications));

router.post("/notifications/read-all", asyncHandler(markAllNotificationsAsRead));

router.delete(
  "/notifications/:notificationId",
  asyncHandler(removeNotificationById)
);

router.post("/:id/evaluations/:stage/send", asyncHandler(saveIssueEvaluationByStage));
router.post("/:id/evaluations/:stage/submit", asyncHandler(submitIssueEvaluationByStage));
router.post("/:id/evaluations/:stage/compute", asyncHandler(computeEvaluationStage));
router.get("/:id/evaluations/:stage", asyncHandler(getIssueEvaluationByStage));

router
  .route("/:id/scenarios")
  .get(asyncHandler(getIssueScenarios))
  .post(asyncHandler(createIssueScenario));

router
  .route("/scenarios/:scenarioId")
  .get(asyncHandler(getScenarioById))
  .delete(asyncHandler(removeScenario));

export default router;
