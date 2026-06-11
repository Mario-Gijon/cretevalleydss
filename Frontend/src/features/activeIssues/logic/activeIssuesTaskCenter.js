/**
 * Convierte la severidad recibida en un tono visual del modulo.
 *
 * @param {string} severity Severidad recibida.
 * @returns {string}
 */
export const resolveTaskCenterToneFromSeverity = (severity) => {
  if (severity === "success") return "success";
  if (severity === "warning") return "warning";
  if (severity === "error") return "error";
  if (severity === "info") return "info";

  return "info";
};

/**
 * Formatea una fecha limite compacta para el task center.
 *
 * @param {Object|null} deadline Informacion de deadline.
 * @returns {string|null}
 */
export const formatTaskCenterDeadlineMini = (deadline) => {
  if (!deadline?.hasDeadline) return null;

  const daysLeft = deadline.daysLeft;

  if (typeof daysLeft !== "number") return null;
  if (daysLeft < 0) return "Expired";
  if (daysLeft === 0) return "Today";

  return `${daysLeft}d`;
};

export const formatTaskCenterDeadlineLabel = (deadline) => {
  if (!deadline?.hasDeadline || !deadline.iso) return null;

  const date = new Date(deadline.iso);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return null;

  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Construye las secciones visibles del task center.
 *
 * @param {Object|null} taskCenter Task center del servidor.
 * @returns {Array}
 */
export const buildTaskCenterSections = (taskCenter) => {
  const serverSections = taskCenter?.sections;

  return (serverSections || [])
    .map((section) => ({
      key: section.key,
      title: section.title,
      tone: resolveTaskCenterToneFromSeverity(section.severity),
      items: section.items,
    }))
    .filter((group) => group.items.length > 0);
};

/**
 * Construye las opciones del selector de tipo de tarea.
 *
 * @param {Array} sections Secciones visibles.
 * @returns {Array}
 */
export const buildTaskCenterOptions = (sections = []) => {
  const baseOption = [{ value: "all", label: "All" }];
  const sectionOptions = sections.map((section) => ({
    value: section.key,
    label: section.title,
  }));

  return [...baseOption, ...sectionOptions];
};

/**
 * Filtra las secciones visibles segun el tipo activo.
 *
 * @param {Array} sections Secciones visibles.
 * @param {string} taskType Tipo de tarea seleccionado.
 * @returns {Array}
 */
export const filterTaskCenterGroups = (sections = [], taskType = "all") => {
  if (taskType === "all") {
    return sections;
  }

  return sections.filter((group) => group.key === taskType);
};

/**
 * Construye la lista lineal usada por la vista rail.
 *
 * @param {Array} groupsFiltered Secciones filtradas.
 * @returns {Array}
 */
export const buildTaskCenterRailItems = (groupsFiltered = []) => {
  const railItems = [];

  for (const group of groupsFiltered) {
    const tone = group.tone;

    for (const item of group.items) {
      railItems.push({
        key: `${group.key}:${item.issueId}`,
        tone,
        groupTitle: group.title,
        issueId: item.issueId,
        issueName: item.issueName,
        stage: item.stage,
        deadline: item.deadline,
      });
    }
  }

  return railItems;
};
