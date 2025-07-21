export const samePageLinkNavigation = (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 || // ignore everything but left-click
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) return false;
  else return true;
}

// Definimos las páginas con label y url
export const pages = [
  { label: "Active issues", url: "/dashboard/active" },
  { label: "Finished issues", url: "/dashboard/finished" },
  { label: "Create issue", url: "/dashboard/create" },
  { label: "Models", url: "/dashboard/models" },
];

// Definición de opciones del usuario en los menús
export const options = ['Account', 'Notifications', 'Settings', 'Logout'];
