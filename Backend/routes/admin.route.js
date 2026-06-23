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
  reassignIssueOwnerAdmin,
  getIssueAdminById,
  editIssueExpertsAdmin,
  computeIssueWeightsAdmin,
  resolveIssueAdmin,
  removeIssueAdmin,
  getModelCatalogAdmin,
  getModelForgeCatalogAdmin,
  getModelForgeAssetsAdmin,
  previewModelForgeModelPackageAdmin,
  applyModelForgeModelPackageAdmin,
  deleteModelForgeAssetAdmin,
  restartBackendAdmin,
  getDecisionModelsServiceHealthAdmin,
  reloadDecisionModelsServiceAdmin,
  getCurrentModelManifestAdmin,
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

router.get(
  "/model-forge/catalog",
  requireToken,
  requireAdmin,
  asyncHandler(getModelForgeCatalogAdmin)
);

router.get(
  "/model-forge/assets",
  requireToken,
  requireAdmin,
  asyncHandler(getModelForgeAssetsAdmin)
);

router.post(
  "/model-forge/model-package/preview",
  requireToken,
  requireAdmin,
  asyncHandler(previewModelForgeModelPackageAdmin)
);

router.post(
  "/model-forge/model-package/apply",
  requireToken,
  requireAdmin,
  asyncHandler(applyModelForgeModelPackageAdmin)
);

router.delete(
  "/model-forge/assets/:kind/:key",
  requireToken,
  requireAdmin,
  asyncHandler(deleteModelForgeAssetAdmin)
);

router.post(
  "/system/restart-backend",
  requireToken,
  requireAdmin,
  asyncHandler(restartBackendAdmin)
);

router.get(
  "/decision-models-service/health",
  requireToken,
  requireAdmin,
  asyncHandler(getDecisionModelsServiceHealthAdmin)
);

router.post(
  "/decision-models-service/reload",
  requireToken,
  requireAdmin,
  asyncHandler(reloadDecisionModelsServiceAdmin)
);

router.get(
  "/model-manifest/current",
  requireToken,
  requireAdmin,
  asyncHandler(getCurrentModelManifestAdmin)
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
  "/issues/:id/owner",
  requireToken,
  requireAdmin,
  asyncHandler(reassignIssueOwnerAdmin)
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
