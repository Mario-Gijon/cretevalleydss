import { useEffect, useMemo, useRef } from "react";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
  buildTaskCenterOptions,
  buildTaskCenterRailItems,
  buildTaskCenterSections,
  filterTaskCenterGroups,
} from "./utils/taskCenter.utils";
import TaskCenterRail from "./TaskCenterRail";
import TaskCenterPanel from "./TaskCenterPanel";

/**
 * Contenedor principal del task center.
 *
 * Orquesta el estado derivado, el comportamiento
 * de scroll horizontal y la selección entre las
 * variantes rail y panel.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.taskCenter Task center del servidor.
 * @param {Array} props.taskGroups Fallback legacy de grupos.
 * @param {number|null} props.tasksCount Número total de tareas.
 * @param {string} props.taskType Tipo de tarea seleccionado.
 * @param {Function} props.setTaskType Setter del filtro de tarea.
 * @param {Function} props.onOpenIssueId Abre un issue por id.
 * @param {Function} props.onOpenIssue Abre un issue legacy.
 * @param {number|string} props.height Altura del panel.
 * @param {number} props.minHeight Altura mínima del panel.
 * @param {string} props.variant Variante visual del componente.
 * @returns {JSX.Element}
 */
const TaskCenter = ({
  taskCenter,
  taskGroups,
  tasksCount,
  taskType,
  setTaskType,
  onOpenIssueId,
  onOpenIssue,
  height = 350,
  minHeight = 260,
  variant = "panel",
}) => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  const paperRef = useRef(null);
  const railRef = useRef(null);

  const sections = useMemo(() => {
    return buildTaskCenterSections(taskCenter, taskGroups);
  }, [taskCenter, taskGroups]);

  const total = tasksCount ?? taskCenter?.total ?? 0;

  const options = useMemo(() => {
    return buildTaskCenterOptions(sections);
  }, [sections]);

  const groupsFiltered = useMemo(() => {
    return filterTaskCenterGroups(sections, taskType);
  }, [sections, taskType]);

  const railItems = useMemo(() => {
    return buildTaskCenterRailItems(groupsFiltered);
  }, [groupsFiltered]);

  const resolvedHeight = height === "auto" ? "auto" : height;
  const resolvedMaxHeight = height === "auto" ? "none" : height;

  /**
   * Abre el issue asociado a una tarea según el origen
   * de los datos del task center.
   *
   * @param {Object|null} payload Tarea seleccionada.
   * @returns {void}
   */
  const openItem = (payload) => {
    if (!payload) return;

    if (payload.isServer) {
      if (typeof onOpenIssueId === "function") {
        onOpenIssueId(payload.issueId);
      }
      return;
    }

    if (typeof onOpenIssue === "function") {
      onOpenIssue(payload.raw);
    }
  };

  /**
   * Desplaza horizontalmente el carril de tareas.
   *
   * @param {number} delta Distancia de desplazamiento.
   * @returns {void}
   */
  const scrollRailBy = (delta) => {
    const railElement = railRef.current;

    if (!railElement) return;

    railElement.scrollBy({
      left: delta,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (variant !== "rail") return;

    const root = paperRef.current;
    const rail = railRef.current;

    if (!root || !rail) return;

    const onWheel = (event) => {
      if (!rail.contains(event.target)) return;

      const canScrollX = rail.scrollWidth > rail.clientWidth + 1;
      if (!canScrollX) return;

      const deltaY = event.deltaY || 0;
      const deltaX = event.deltaX || 0;
      const movement =
        Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

      if (movement !== 0) {
        rail.scrollLeft += movement;
        event.preventDefault();
        event.stopPropagation();
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      root.removeEventListener("wheel", onWheel);
    };
  }, [variant]);

  if (variant === "rail") {
    return (
      <TaskCenterRail
        isSmDown={isSmDown}
        paperRef={paperRef}
        railRef={railRef}
        resolvedHeight={resolvedHeight}
        resolvedMaxHeight={resolvedMaxHeight}
        minHeight={minHeight}
        total={total}
        taskType={taskType}
        setTaskType={setTaskType}
        options={options}
        railItems={railItems}
        scrollRailBy={scrollRailBy}
        openItem={openItem}
      />
    );
  }

  return (
    <TaskCenterPanel
      isSmDown={isSmDown}
      resolvedHeight={resolvedHeight}
      resolvedMaxHeight={resolvedMaxHeight}
      minHeight={minHeight}
      total={total}
      taskType={taskType}
      setTaskType={setTaskType}
      options={options}
      groupsFiltered={groupsFiltered}
      openItem={openItem}
    />
  );
};

export default TaskCenter;