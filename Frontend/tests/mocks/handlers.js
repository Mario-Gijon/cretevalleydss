import { authHandlers } from "./auth.handlers.js";
import { issueHandlers } from "./issue.handlers.js";

export const handlers = [...authHandlers, ...issueHandlers];
