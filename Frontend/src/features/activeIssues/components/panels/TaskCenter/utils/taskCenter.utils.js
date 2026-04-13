/**
 * Convierte la severidad recibida en un tono visual del módulo.
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
 * Formatea una fecha límite compacta para el task center.
 *
 * @param {Object|null} deadline Información de deadline.
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

/**
 * Construye las secciones visibles del task center,
 * priorizando la respuesta del servidor y usando
 * el fallback legacy si hace falta.
 *
 * @param {Object|null} taskCenter Task center del servidor.
 * @param {Array} taskGroups Fallback legacy.
 * @returns {Array}
 */
export const buildTaskCenterSections = (taskCenter, taskGroups = []) => {
  const serverSections = taskCenter?.sections;

  if (Array.isArray(serverSections) && serverSections.length > 0) {
    return serverSections
      .map((section) => ({
        key: section.key,
        title: section.title,
        tone: resolveTaskCenterToneFromSeverity(section.severity),
        items: Array.isArray(section.items) ? section.items : [],
        isServer: true,
      }))
      .filter((section) => section.items.length > 0);
  }

  const legacyGroups = Array.isArray(taskGroups) ? taskGroups : [];

  return legacyGroups
    .map((group) => ({
      ...group,
      isServer: false,
    }))
    .filter((group) => (group.items || []).length > 0);
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
 * Filtra las secciones visibles según el tipo activo.
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
    const tone = group.tone || "info";
    const isServer = Boolean(group.isServer);

    for (const item of group.items || []) {
      if (isServer) {
        railItems.push({
          key: `${group.key}:${item.issueId}`,
          isServer: true,
          tone,
          groupTitle: group.title,
          issueId: item.issueId,
          issueName: item.issueName,
          stage: item.stage,
          deadline: item.deadline,
          raw: item,
        });

        continue;
      }

      railItems.push({
        key: `${group.key}:${item.id}`,
        isServer: false,
        tone,
        groupTitle: group.title,
        issueId: item.id,
        issueName: item.name,
        stage: item.currentStage,
        deadline: item.ui?.deadline || null,
        raw: item,
      });
    }
  }

  return railItems;
};