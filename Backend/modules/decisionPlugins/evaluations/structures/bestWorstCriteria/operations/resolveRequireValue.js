import { createBadRequestError } from "../../../../../../utils/common/errors.js";

export const resolveRequireValue = (mode) => {
  if (mode === "draft") {
    return false;
  }

  if (mode === "submit") {
    return true;
  }

  throw createBadRequestError("Unsupported evaluation save mode", {
    field: "mode",
  });
};
