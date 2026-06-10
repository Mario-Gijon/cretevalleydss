const EMPTY_ADMIN_EXPERT_FORM = {
  id: "",
  name: "",
  university: "",
  email: "",
  password: "",
  accountConfirm: true,
  role: "user",
};

export const createEmptyAdminExpertForm = () => ({
  ...EMPTY_ADMIN_EXPERT_FORM,
});

export const buildAdminExpertEditForm = (expert) => ({
  id: expert?.id || "",
  name: expert?.name || "",
  university: expert?.university || "",
  email: expert?.email || "",
  password: "",
  accountConfirm: Boolean(expert?.accountConfirm),
  role: expert?.role || "user",
});
