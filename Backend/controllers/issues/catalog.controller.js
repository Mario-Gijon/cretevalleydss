import {
  getAvailableIssueModelsPayload,
  getConfirmedUsersCatalogPayload,
} from "../../modules/issues/catalog/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const modelsInfo = async (_req, res) => {
  const data = await getAvailableIssueModelsPayload();

  return sendSuccess(res, "Models fetched successfully", data);
};

export const getAllUsers = async (_req, res) => {
  const users = await getConfirmedUsersCatalogPayload();

  return sendSuccess(res, "Users fetched successfully", users);
};
