import { removeAccents } from "../../../utils/text.utils";

export const normalizeAdminExpertText = (value) => {
  return removeAccents(String(value ?? "").toLowerCase().trim());
};

export const filterAdminExperts = ({ experts, search, statusFilter }) => {
  const query = normalizeAdminExpertText(search);
  const list = Array.isArray(experts) ? experts : [];

  return list.filter((expert) => {
    const matchesSearch =
      !query ||
      normalizeAdminExpertText(expert?.name).includes(query) ||
      normalizeAdminExpertText(expert?.email).includes(query) ||
      normalizeAdminExpertText(expert?.university).includes(query) ||
      normalizeAdminExpertText(expert?.role).includes(query) ||
      normalizeAdminExpertText(expert?.accountCreation).includes(query);

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "confirmed"
          ? Boolean(expert?.accountConfirm)
          : !expert?.accountConfirm;

    return matchesSearch && matchesStatus;
  });
};
