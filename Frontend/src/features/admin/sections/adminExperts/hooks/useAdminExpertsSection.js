import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useSnackbarAlertContext } from "../../../../../context/snackbarAlert/snackbarAlert.context";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
} from "../../../../../services/admin.service";
import { emptyForm, normalize } from "../adminExperts.utils";

/**
 * Gestiona el estado y acciones de la seccion Admin Experts.
 *
 * @returns {object}
 */
export const useAdminExpertsSection = () => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [experts, setExperts] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [form, setForm] = useState(emptyForm);

  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    expert: null,
  });

  const fetchExpertsData = async ({ keepLoading = false } = {}) => {
    try {
      if (keepLoading) setRefreshing(true);
      else setLoading(true);

      const res = await getAllUsers({ includeAdmins: true });

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error fetching users", "error");
        setExperts([]);
        return;
      }

      setExperts(Array.isArray(res?.data?.users) ? res.data.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching users", "error");
      setExperts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpertsData();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredExperts = useMemo(() => {
    const q = normalize(search);

    return (experts || []).filter((expert) => {
      const matchesSearch =
        !q ||
        normalize(expert?.name).includes(q) ||
        normalize(expert?.email).includes(q) ||
        normalize(expert?.university).includes(q) ||
        normalize(expert?.role).includes(q) ||
        normalize(expert?.accountCreation).includes(q);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "confirmed"
            ? Boolean(expert?.accountConfirm)
            : !expert?.accountConfirm;

      return matchesSearch && matchesStatus;
    });
  }, [experts, search, statusFilter]);

  const openCreate = () => {
    setFormMode("create");
    setForm({ ...emptyForm, accountConfirm: true, role: "user" });
    setFormOpen(true);
  };

  const openEdit = (expert) => {
    setFormMode("edit");
    setForm({
      id: expert?.id || "",
      name: expert?.name || "",
      university: expert?.university || "",
      email: expert?.email || "",
      password: "",
      accountConfirm: Boolean(expert?.accountConfirm),
      role: expert?.role || "user",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
  };

  const onChangeForm = (field) => (e) => {
    const value = field === "accountConfirm" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      showSnackbarAlert("Name is required", "error");
      return;
    }

    if (!form.university?.trim()) {
      showSnackbarAlert("University is required", "error");
      return;
    }

    if (!form.email?.trim()) {
      showSnackbarAlert("Email is required", "error");
      return;
    }

    if (formMode === "create" && !form.password?.trim()) {
      showSnackbarAlert("Password is required", "error");
      return;
    }

    setBusy(true);

    try {
      let res;

      if (formMode === "create") {
        res = await createUser({
          name: form.name,
          university: form.university,
          email: form.email,
          password: form.password,
          accountConfirm: form.accountConfirm,
          role: form.role,
        });
      } else {
        res = await updateUser({
          id: form.id,
          name: form.name,
          university: form.university,
          email: form.email,
          password: form.password,
          accountConfirm: form.accountConfirm,
          role: form.role,
        });
      }

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error saving user", "error");
        return;
      }

      showSnackbarAlert(res?.message || "User saved successfully", "success");
      closeForm();
      await fetchExpertsData({ keepLoading: true });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error saving user", "error");
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (expert) => {
    setConfirmDelete({
      open: true,
      expert,
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete?.expert?.id) return;

    setBusy(true);

    try {
      const res = await deleteUser(confirmDelete.expert.id);

      if (!res?.success) {
        showSnackbarAlert(res?.message || "Error deleting user", "error");
        return;
      }

      showSnackbarAlert(res?.message || "User deleted successfully", "success");
      setConfirmDelete({ open: false, expert: null });
      await fetchExpertsData({ keepLoading: true });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error deleting user", "error");
    } finally {
      setBusy(false);
    }
  };


  return {
    theme,
    isMdDown,
    loading,
    refreshing,
    busy,
    experts,
    search,
    statusFilter,
    formOpen,
    formMode,
    form,
    confirmDelete,
    fetchExpertsData,
    filteredExperts,
    openCreate,
    openEdit,
    closeForm,
    onChangeForm,
    handleSave,
    askDelete,
    handleDelete,
    setSearch,
    setStatusFilter,
    setForm,
    setConfirmDelete,
  };
};
