const newId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `category-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const createOrderedCategory = ({ label = "", order = 0, categoryId = newId() } = {}) => ({
  categoryId,
  label,
  order,
});

export const normalizeOrderedCategoriesValue = (_parameter, value) => {
  const categories = Array.isArray(value)
    ? value.map((category, sourceIndex) => ({ category, sourceIndex }))
    : [];
  categories.sort((left, right) => {
    const leftOrder = Number.isInteger(left.category?.order) ? left.category.order : left.sourceIndex;
    const rightOrder = Number.isInteger(right.category?.order) ? right.category.order : right.sourceIndex;
    return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
  });

  return categories.map(({ category }, order) => ({
    categoryId:
      typeof category?.categoryId === "string" && category.categoryId.trim()
        ? category.categoryId.trim()
        : newId(),
    label: typeof category?.label === "string" ? category.label : "",
    order,
  }));
};

export const validateOrderedCategoriesValue = (_parameter, value) => {
  if (!Array.isArray(value)) return "Categories must be a list.";
  const ids = new Set();
  for (const [index, category] of value.entries()) {
    const id = typeof category?.categoryId === "string" ? category.categoryId.trim() : "";
    if (!id) return `Category ${index + 1} is missing its ID.`;
    if (ids.has(id)) return `Category ID '${id}' is repeated.`;
    ids.add(id);
    if (typeof category?.label !== "string" || !category.label.trim()) {
      return `Enter a label for category ${index + 1}.`;
    }
    if (category.order !== index) {
      return "Category order must be consecutive, starting at zero.";
    }
  }
  return null;
};
