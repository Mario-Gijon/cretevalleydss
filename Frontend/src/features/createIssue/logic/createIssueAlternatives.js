import { buildCreateIssueAlternativeId } from "./createIssueAlternativeIds";

export const CREATE_ISSUE_ALTERNATIVE_NAME_MAX_LENGTH = 60;
export const CREATE_ISSUE_ALTERNATIVE_DESCRIPTION_MAX_LENGTH = 500;

const isAlternativeNameDuplicate = (name, alternatives, excludedId = null) =>
  alternatives.some((alternative) =>
    alternative.id !== excludedId && alternative.name === name
  );

export const addAlternative = (
  inputValue,
  inputDescription,
  alternatives,
  setAlternatives,
  setInputValue,
  setInputError,
  setInputDescription
) => {
  const trimmedValue = inputValue.trim();

  if (!trimmedValue) return;

  if (trimmedValue.length > CREATE_ISSUE_ALTERNATIVE_NAME_MAX_LENGTH) {
    setInputError(`Max ${CREATE_ISSUE_ALTERNATIVE_NAME_MAX_LENGTH} characters`);
    return;
  }

  if (inputDescription.length > CREATE_ISSUE_ALTERNATIVE_DESCRIPTION_MAX_LENGTH) {
    setInputError(`Description max ${CREATE_ISSUE_ALTERNATIVE_DESCRIPTION_MAX_LENGTH} characters`);
    return;
  }
  if (isAlternativeNameDuplicate(trimmedValue, alternatives)) {
    setInputError("Alternative already exists");
    return;
  }

  setAlternatives((prev) => [...prev, {
    id: buildCreateIssueAlternativeId(),
    name: trimmedValue,
    description: inputDescription,
  }]);
  setInputValue("");
  setInputDescription("");
  setInputError("");
};

export const removeAlternative = (id, setAlternatives) => {
  setAlternatives((prev) => prev.filter((item) => item.id !== id));
};

export const saveEditAlternative = (
  editValue,
  editDescription,
  editingAlternative,
  alternatives,
  setAlternatives,
  setEditingAlternative,
  setEditValue,
  setEditError
) => {
  const trimmedValue = editValue.trim();

  if (!trimmedValue) {
    setEditError("Alternative cannot be empty");
    return;
  }

  if (trimmedValue.length > CREATE_ISSUE_ALTERNATIVE_NAME_MAX_LENGTH) {
    setEditError(`Max ${CREATE_ISSUE_ALTERNATIVE_NAME_MAX_LENGTH} characters`);
    return;
  }

  if (
    isAlternativeNameDuplicate(trimmedValue, alternatives, editingAlternative.id)
  ) {
    setEditError("Alternative already exists");
    return;
  }

  if (editDescription.length > CREATE_ISSUE_ALTERNATIVE_DESCRIPTION_MAX_LENGTH) {
    setEditError(`Description max ${CREATE_ISSUE_ALTERNATIVE_DESCRIPTION_MAX_LENGTH} characters`);
    return;
  }
  setAlternatives((prev) => prev.map((alternative) =>
    alternative.id === editingAlternative.id
      ? { ...alternative, name: trimmedValue, description: editDescription }
      : alternative
  ));

  setEditingAlternative(null);
  setEditValue("");
  setEditError(null);
};
