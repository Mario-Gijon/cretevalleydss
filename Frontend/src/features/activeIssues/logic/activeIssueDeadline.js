import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const parseIssueGridDateDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = dayjs(value, "DD-MM-YYYY", true);

  return date.isValid() ? date.startOf("day") : null;
};

/**
 * Calcula el progreso de la fecha limite visible del issue.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {Object|null}
 */
export const computeIssueDeadlineProgress = (issue, currentDate = dayjs()) => {
  const serverDeadline = issue?.ui?.deadline;

  if (!serverDeadline?.hasDeadline) {
    return null;
  }

  const end = parseIssueGridDateDDMMYYYY(issue.closureDate);
  const start = parseIssueGridDateDDMMYYYY(issue.creationDate);

  if (!end) {
    return {
      progress: 0,
      label: issue.closureDate,
    };
  }

  const today = dayjs(currentDate).startOf("day");
  const totalCalendarDays = start ? end.diff(start, "day") : 0;
  const elapsedCalendarDays = start ? today.diff(start, "day") : 0;
  const progress =
    totalCalendarDays > 0
      ? clampPercent((elapsedCalendarDays / totalCalendarDays) * 100)
      : today.isAfter(end, "day") || today.isSame(end, "day")
        ? 100
        : 0;

  return {
    progress,
    label: issue.closureDate,
  };
};
