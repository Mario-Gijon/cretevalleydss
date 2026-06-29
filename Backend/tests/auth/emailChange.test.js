import { describe, expect, it, vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `email-token:${payload.newEmail}`,
    verify: (token) => {
      if (typeof token !== "string" || !token.startsWith("email-token:")) {
        throw new Error("Invalid token");
      }

      return {
        newEmail: token.slice("email-token:".length),
      };
    },
  },
}));

import { User } from "../../models/Users.js";
import {
  confirmAuthenticatedUserEmailChange,
  requestAuthenticatedUserEmailChange,
} from "../../modules/auth/emailChange.js";
import { createConfirmedUser } from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

describe("auth email change module", () => {
  it("requestAuthenticatedUserEmailChange lowercases and trims new email and stores emailTokenConfirm", async () => {
    const user = await createConfirmedUser({
      email: "current@example.com",
    });

    const result = await requestAuthenticatedUserEmailChange({
      userId: user._id,
      newEmail: "  NEW@Example.com  ",
    });

    const updatedUser = await User.findById(user._id);

    expect(result).toEqual({
      message: "Please, check new email for confirmation",
      emailChangeConfirmation: {
        newEmail: "new@example.com",
        token: "email-token:new@example.com",
      },
    });
    expect(updatedUser.emailTokenConfirm).toBe("email-token:new@example.com");
  });

  it("requestAuthenticatedUserEmailChange rejects requesting the same email", async () => {
    const user = await createConfirmedUser({
      email: "same@example.com",
    });

    await expect(
      requestAuthenticatedUserEmailChange({
        userId: user._id,
        newEmail: " SAME@example.com ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "newEmail",
      message: "New email must be different from the current email",
    });
  });

  it("requestAuthenticatedUserEmailChange rejects an email already used by another user", async () => {
    const user = await createConfirmedUser({
      email: "current@example.com",
    });
    await createConfirmedUser({
      email: "taken@example.com",
    });

    await expect(
      requestAuthenticatedUserEmailChange({
        userId: user._id,
        newEmail: "taken@example.com",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      field: "newEmail",
      message: "Email already registered",
    });
  });

  it("requestAuthenticatedUserEmailChange rejects a missing user", async () => {
    await expect(
      requestAuthenticatedUserEmailChange({
        userId: "000000000000000000000001",
        newEmail: "new@example.com",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });
  });

  it("confirmAuthenticatedUserEmailChange updates the user email and clears emailTokenConfirm", async () => {
    const user = await createConfirmedUser({
      email: "current@example.com",
    });

    await requestAuthenticatedUserEmailChange({
      userId: user._id,
      newEmail: "new@example.com",
    });

    const result = await confirmAuthenticatedUserEmailChange({
      token: "email-token:new@example.com",
    });

    const updatedUser = await User.findById(user._id);

    expect(result).toEqual({
      message: "Email changed successfully",
    });
    expect(updatedUser.email).toBe("new@example.com");
    expect(updatedUser.emailTokenConfirm).toBeNull();
  });

  it("confirmAuthenticatedUserEmailChange rejects an invalid or empty token", async () => {
    await expect(
      confirmAuthenticatedUserEmailChange({
        token: "   ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "token",
      message: "Token is required",
    });

    const user = await createConfirmedUser({
      email: "current@example.com",
    });

    await requestAuthenticatedUserEmailChange({
      userId: user._id,
      newEmail: "new@example.com",
    });

    user.emailTokenConfirm = "bad-token";
    await user.save();

    await expect(
      confirmAuthenticatedUserEmailChange({
        token: "bad-token",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "token",
      message: "Invalid email change token",
    });
  });

  it("confirmAuthenticatedUserEmailChange rejects an unknown token", async () => {
    await expect(
      confirmAuthenticatedUserEmailChange({
        token: "email-token:missing@example.com",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "token",
      message: "Email change confirmation not found",
    });
  });

  it("confirmAuthenticatedUserEmailChange rejects when the new email is now used by another user", async () => {
    const user = await createConfirmedUser({
      email: "current@example.com",
    });

    await requestAuthenticatedUserEmailChange({
      userId: user._id,
      newEmail: "new@example.com",
    });

    await createConfirmedUser({
      email: "new@example.com",
    });

    await expect(
      confirmAuthenticatedUserEmailChange({
        token: "email-token:new@example.com",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      field: "email",
      message: "Email already registered",
    });
  });
});
