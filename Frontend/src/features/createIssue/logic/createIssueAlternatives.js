const isAlternativeNameDuplicate = (name, alternatives) => {
  return alternatives.includes(name);
};

export const addAlternative = (
  inputValue,
  alternatives,
  setAlternatives,
  setInputValue,
  setInputError
) => {
  const trimmedValue = inputValue.trim();

  if (!trimmedValue) return;

  if (trimmedValue.length > 35) {
    setInputError("Max 35 characters");
    return;
  }

  if (isAlternativeNameDuplicate(trimmedValue, alternatives)) {
    setInputError("Alternative already exists");
    return;
  }

  setAlternatives((prev) => [...prev, trimmedValue]);
  setInputValue("");
  setInputError("");
};

export const removeAlternative = (item, setAlternatives) => {
  setAlternatives((prev) => prev.filter((i) => i !== item));
};

export const saveEditAlternative = (
  editValue,
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

  if (trimmedValue.length > 35) {
    setEditError("Max 35 characters");
    return;
  }

  if (
    isAlternativeNameDuplicate(trimmedValue, alternatives) &&
    trimmedValue !== editingAlternative
  ) {
    setEditError("Alternative already exists");
    return;
  }

  setAlternatives((prev) =>
    prev.map((alt) => (alt === editingAlternative ? trimmedValue : alt))
  );

  setEditingAlternative(null);
  setEditValue("");
  setEditError(null);
};
