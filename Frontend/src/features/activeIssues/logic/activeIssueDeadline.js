const clamp01 = (value) => {
  return Math.max(0, Math.min(1, value));
};

const parseIssueGridDateDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") return null;

  const [day, month, year] = value.split("-").map((part) => Number(part));

  if (!day || !month || !year) return null;

  const timestamp = new Date(year, month - 1, day).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

/**
 * Calcula el progreso de la fecha limite visible del issue.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {Object|null}
 */
export const computeIssueDeadlineProgress = (issue) => {
  const serverDeadline = issue?.ui?.deadline;

  if (serverDeadline?.hasDeadline && typeof serverDeadline.daysLeft === "number") {
    const end = parseIssueGridDateDDMMYYYY(issue?.closureDate);
    const start = parseIssueGridDateDDMMYYYY(issue?.creationDate);
    const now = Date.now();

    if (end) {
      const fallbackTotal = 1000 * 60 * 60 * 24 * 30;
      const baseStart = start || end - fallbackTotal;
      const total = Math.max(1, end - baseStart);
      const progress = clamp01((now - baseStart) / total);

      return {
        progress,
        daysLeft: serverDeadline.daysLeft,
        label: issue?.closureDate,
      };
    }

    return {
      progress: 0,
      daysLeft: serverDeadline.daysLeft,
      label: issue?.closureDate,
    };
  }

  const end = parseIssueGridDateDDMMYYYY(issue?.closureDate);

  if (!end) return null;

  const start = parseIssueGridDateDDMMYYYY(issue?.creationDate);
  const now = Date.now();
  const fallbackTotal = 1000 * 60 * 60 * 24 * 30;
  const baseStart = start || end - fallbackTotal;
  const total = Math.max(1, end - baseStart);
  const progress = clamp01((now - baseStart) / total);
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  return {
    progress,
    daysLeft,
    label: issue?.closureDate,
  };
};
