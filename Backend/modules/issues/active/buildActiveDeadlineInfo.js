import dayjs from "dayjs";

export const buildDeadlineInfo = (closureDate) => {
  if (!closureDate) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const parsedDate = dayjs(closureDate, "DD-MM-YYYY", true);
  if (!parsedDate.isValid()) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const daysLeft = parsedDate
    .startOf("day")
    .diff(dayjs().startOf("day"), "day");

  return {
    hasDeadline: true,
    daysLeft,
    overdue: daysLeft < 0,
    iso: parsedDate.toISOString(),
  };
};
