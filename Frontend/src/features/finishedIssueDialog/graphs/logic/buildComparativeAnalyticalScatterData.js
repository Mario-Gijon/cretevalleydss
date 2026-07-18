import { alpha } from "@mui/material/styles";
import { collectiveColorFor } from "./analyticalScatterColors.js";

export const buildComparativeAnalyticalScatterData = ({ groups = [], compact = false }) => ({
  datasets: groups.flatMap((group) => [
    {
      id: `experts-${group.representedExecutions.map((execution) => execution.key).join("-")}`,
      label: group.legendLabel === null ? "Experts" : `Experts — ${group.legendLabel || group.groupLabel}`,
      data: group.expertPoints.map((point) => ({ ...point, executionLabel: group.tooltipLabel || group.groupLabel, pointType: "expert" })),
      backgroundColor: alpha(group.color, 0.68),
      borderColor: alpha(group.color, 0.95),
      pointStyle: "circle",
      pointRadius: compact ? 4 : 7,
      pointHoverRadius: compact ? 6 : 10,
    },
    {
      id: `collective-${group.representedExecutions.map((execution) => execution.key).join("-")}`,
      label: group.legendLabel === null ? "Collective" : `Collective — ${group.legendLabel || group.groupLabel}`,
      data: [{ ...group.collectivePoint, executionLabel: group.tooltipLabel || group.groupLabel, pointType: "collective" }],
      backgroundColor: alpha(collectiveColorFor(group.color), 0.98),
      borderColor: alpha(group.color, 0.95),
      borderWidth: 2,
      pointStyle: "rectRot",
      pointRadius: compact ? 5 : 9,
      pointHoverRadius: compact ? 7 : 12,
    },
  ]),
});

export default buildComparativeAnalyticalScatterData;
