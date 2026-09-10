import { authSmokeUser } from "./authSmokeUser.js";
import { loginAsUser } from "./loginAsUser.js";

export const loginAsAuthSmokeUser = async (page) => loginAsUser(page, authSmokeUser);
