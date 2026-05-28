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

const mapParamsToBody = (mapping) => (req, _res, next) => {
  req.body = req.body ?? {};

  Object.entries(mapping).forEach(([bodyKey, paramKey]) => {
    req.body[bodyKey] = req.params[paramKey];
  });

  next();
};

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

router.get("/issues", requireToken, requireAdmin, asyncHandler(getAllIssuesAdmin));

router
  .route("/issues/:id")
  .get(requireToken, requireAdmin, asyncHandler(getIssueAdminById))
  .delete(
    requireToken,
    requireAdmin,
    mapParamsToBody({ issueId: "id" }),
    asyncHandler(removeIssueAdmin)
  );

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
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(reassignIssueAdminAdmin)
);

router.patch(
  "/issues/:id/experts",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(editIssueExpertsAdmin)
);

router.post(
  "/issues/:id/weights/compute",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(computeIssueWeightsAdmin)
);

router.post(
  "/issues/:id/resolve",
  requireToken,
  requireAdmin,
  mapParamsToBody({ issueId: "id" }),
  asyncHandler(resolveIssueAdmin)
);

export default router;
