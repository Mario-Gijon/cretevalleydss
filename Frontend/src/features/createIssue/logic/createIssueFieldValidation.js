export const validateIssueName = (issueName, setIssueNameError) => {
  if (issueName.length > 35) {
    setIssueNameError("Max 35 characters");
    return false;
  }

  if (!issueName) {
    setIssueNameError("Cannot be empty");
    return false;
  }

  if (issueName.length < 3) {
    setIssueNameError("Must contain min 3 characters");
    return false;
  }

  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(issueName)) {
    setIssueNameError("Must contain at least one letter");
    return false;
  }

  setIssueNameError(false);
  return true;
};

export const validateIssueDescription = (
  issueDescription,
  setIssueDescriptionError
) => {
  if (issueDescription.length > 80) {
    setIssueDescriptionError("Max 80 characters");
    return false;
  }

  if (!issueDescription) {
    setIssueDescriptionError("Cannot be empty");
    return false;
  }

  if ((issueDescription.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length < 5) {
    setIssueDescriptionError("Must contain at least 5 letters");
    return false;
  }

  setIssueDescriptionError(false);
  return true;
};
