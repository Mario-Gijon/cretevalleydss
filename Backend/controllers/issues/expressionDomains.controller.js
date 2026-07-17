import {
  createExpressionDomainWorkflow,
  getExpressionDomainsPayload,
  removeUserExpressionDomain,
  updateExpressionDomainWorkflow,
} from "../../modules/expressionDomains/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const getExpressionsDomain = async (req, res) => {
  const data = await getExpressionDomainsPayload({
    userId: req.uid,
  });

  return sendSuccess(res, "Expression domains fetched successfully", data);
};

export const createExpressionDomain = async (req, res) => {
  const newDomain = await createExpressionDomainWorkflow({
    userId: req.uid,
    payload: req.body,
  });

  return sendSuccess(
    res,
    `Domain ${newDomain.name} created successfully`,
    newDomain,
    201
  );
};

export const removeExpressionDomain = async (req, res) => {
  const id = req.params.id;

  await removeUserExpressionDomain({
    domainId: id,
    userId: req.uid,
  });

  return sendSuccess(res, "Domain deleted", { id });
};

export const updateExpressionDomain = async (req, res) => {
  return updateExpressionDomainWorkflow({
    domainId: req.params.id,
    userId: req.uid,
    updatedDomain: req.body.updatedDomain,
    beforeSessionCleanup: (updated) =>
      sendSuccess(res, "Domain updated successfully", updated),
  });
};
