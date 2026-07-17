import {
  sendEmailChangeConfirmation,
  sendVerificationEmail,
} from "../../services/email.service.js";
import { runManualTransaction } from "../../utils/common/mongoose.js";
import {
  confirmAccount,
  createSignupAccount,
  deleteAuthenticatedUserAccount,
} from "./account.js";
import {
  confirmAuthenticatedUserEmailChange,
  requestAuthenticatedUserEmailChange,
} from "./emailChange.js";
import {
  updateAuthenticatedUserName,
  updateAuthenticatedUserPassword,
  updateAuthenticatedUserUniversity,
} from "./profile.js";

const runCommittedAuthMutationWithSideEffect = ({
  mutation,
  afterCommit,
  beforeSessionCleanup,
}) =>
  runManualTransaction(mutation, {
    onSuccessBeforeCleanup: async (result) => {
      await afterCommit(result);
      return beforeSessionCleanup
        ? beforeSessionCleanup(result)
        : result;
    },
  });

export const updateAuthenticatedPassword = ({
  userId,
  newPassword,
  repeatNewPassword,
  beforeSessionCleanup,
}) =>
  runManualTransaction((session) =>
    updateAuthenticatedUserPassword({
      userId,
      newPassword,
      repeatNewPassword,
      session,
    }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );

export const updateAuthenticatedUniversity = ({
  userId,
  newUniversity,
  beforeSessionCleanup,
}) =>
  runManualTransaction((session) =>
    updateAuthenticatedUserUniversity({
      userId,
      newUniversity,
      session,
    }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );

export const updateAuthenticatedName = ({
  userId,
  newName,
  beforeSessionCleanup,
}) =>
  runManualTransaction((session) =>
    updateAuthenticatedUserName({
      userId,
      newName,
      session,
    }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );

export const requestAuthenticatedEmailChange = async ({
  userId,
  newEmail,
  beforeSessionCleanup,
}) => {
  return runCommittedAuthMutationWithSideEffect({
    mutation: (session) =>
      requestAuthenticatedUserEmailChange({
        userId,
        newEmail,
        session,
      }),
    afterCommit: (result) =>
      sendEmailChangeConfirmation(result.emailChangeConfirmation),
    beforeSessionCleanup,
  });
};

export const confirmAuthenticatedEmailChange = ({
  token,
  beforeSessionCleanup,
  onErrorBeforeSessionCleanup,
}) =>
  runManualTransaction((session) =>
    confirmAuthenticatedUserEmailChange({
      token,
      session,
    }),
    {
      onSuccessBeforeCleanup: beforeSessionCleanup,
      onErrorBeforeCleanup: onErrorBeforeSessionCleanup,
    }
  );

export const signupAccount = async ({ payload, beforeSessionCleanup }) => {
  return runCommittedAuthMutationWithSideEffect({
    mutation: (session) =>
      createSignupAccount({
        payload,
        session,
      }),
    afterCommit: (result) => sendVerificationEmail(result.verificationEmail),
    beforeSessionCleanup,
  });
};

export const confirmSignupAccount = ({
  token,
  beforeSessionCleanup,
  onErrorBeforeSessionCleanup,
}) =>
  runManualTransaction((session) =>
    confirmAccount({
      token,
      session,
    }),
    {
      onSuccessBeforeCleanup: beforeSessionCleanup,
      onErrorBeforeCleanup: onErrorBeforeSessionCleanup,
    }
  );

export const deleteAuthenticatedAccount = ({
  userId,
  beforeSessionCleanup,
}) =>
  runManualTransaction((session) =>
    deleteAuthenticatedUserAccount({
      userId,
      session,
    }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );
