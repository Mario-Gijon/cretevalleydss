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
  getModelCatalogAdmin,
  updateModelCatalogVisibilityAdmin,
  getModelManifestDryRunAdmin,
  syncModelManifestAdmin,
} from "../controllers/admin.controller.js";

import { requireToken } from "../middlewares/requireToken.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router = Router();

router
  .route("/experts")
  .get(requireToken, requireAdmin, asyncHandler(getAllUsersAdmin))
  .post(requireToken, requireAdmin, asyncHandler(createUserAdmin));

router.get(
  "/models/catalog",
  requireToken,
  requireAdmin,
  asyncHandler(getModelCatalogAdmin)
);

router.patch(
  "/models/:id/catalog-visibility",
  requireToken,
  requireAdmin,
  asyncHandler(updateModelCatalogVisibilityAdmin)
);

router.get(
  "/models/manifest/dry-run",
  requireToken,
  requireAdmin,
  asyncHandler(getModelManifestDryRunAdmin)
);

router.post(
  "/models/manifest/sync",
  requireToken,
  requireAdmin,
  asyncHandler(syncModelManifestAdmin)
);

router
  .route("/experts/:id")
  .patch(requireToken, requireAdmin, asyncHandler(updateUserAdmin))
  .delete(requireToken, requireAdmin, asyncHandler(deleteUserAdmin));

router.get("/issues", requireToken, requireAdmin, asyncHandler(getAllIssuesAdmin));

router
  .route("/issues/:id")
  .get(requireToken, requireAdmin, asyncHandler(getIssueAdminById))
  .delete(requireToken, requireAdmin, asyncHandler(removeIssueAdmin));

router.get(
  "/issues/:id/experts/progress",
  requireToken,
  requireAdmin,
  asyncHandler(getIssueExpertsProgressAdmin)
);

router.get(
  "/issues/:issueId/experts/:expertId/evaluations",
  requireToken,
  requireAdmin,
  asyncHandler(getIssueExpertEvaluationsAdmin)
);

router.get(
  "/issues/:issueId/experts/:expertId/weights",
  requireToken,
  requireAdmin,
  asyncHandler(getIssueExpertWeightsAdmin)
);

router.patch(
  "/issues/:id/admin",
  requireToken,
  requireAdmin,
  asyncHandler(reassignIssueAdminAdmin)
);

router.patch(
  "/issues/:id/experts",
  requireToken,
  requireAdmin,
  asyncHandler(editIssueExpertsAdmin)
);

router.post(
  "/issues/:id/weights/compute",
  requireToken,
  requireAdmin,
  asyncHandler(computeIssueWeightsAdmin)
);

router.post(
  "/issues/:id/resolve",
  requireToken,
  requireAdmin,
  asyncHandler(resolveIssueAdmin)
);

export default router;
