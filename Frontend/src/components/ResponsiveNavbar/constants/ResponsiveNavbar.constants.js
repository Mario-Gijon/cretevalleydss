import { notificationsMenuLabel } from "../../../features/notifications/utils/notifications.utils";

export const navbarPages = [
  { label: "Active", url: "/dashboard/active", path: "/dashboard/active" },
  { label: "Finished", url: "/dashboard/finished", path: "/dashboard/finished" },
  { label: "Create", url: "/dashboard/create", path: "/dashboard/create" },
  {
    label: "Models",
    url: "/dashboard/models",
    path: "/dashboard/models",
    disabled: true,
    disabledMsg: "Models page is not available yet",
  },
  { label: "Admin", url: "/dashboard/admin", path: "/dashboard/admin", adminOnly: true },
];

export const notificationsUserMenuOption = notificationsMenuLabel;

export const userMenuOptions = [
  "Account",
  notificationsUserMenuOption,
  "Settings",
  "Logout",
];
