/**
 * Indica si el click debe tratarse como navegacion normal dentro de la app.
 *
 * @param {object} event Evento del tab.
 * @returns {boolean}
 */
export const samePageLinkNavigation = (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }

  return true;
};

/**
 * Devuelve las paginas visibles para el rol actual.
 *
 * Conserva la logica actual: garantiza que Admin exista en la coleccion y
 * que, cuando corresponda, se renderice tras Models.
 *
 * @param {object[]} pages Configuracion base de paginas.
 * @param {boolean} isAdmin Indica si el usuario es administrador.
 * @returns {object[]}
 */
export const getNavbarPagesForRole = (pages, isAdmin) => {
  const adminPage = { label: "Admin", url: "/dashboard/admin", path: "/dashboard/admin" };
  const cloned = Array.isArray(pages) ? [...pages] : [];

  const alreadyHasAdmin = cloned.some((page) => page?.label === "Admin");
  if (!alreadyHasAdmin) {
    const modelsIndex = cloned.findIndex((page) => page?.label === "Models");
    if (modelsIndex >= 0) cloned.splice(modelsIndex + 1, 0, adminPage);
    else cloned.push(adminPage);
  }

  return isAdmin ? cloned : cloned.filter((page) => page?.label !== "Admin");
};
