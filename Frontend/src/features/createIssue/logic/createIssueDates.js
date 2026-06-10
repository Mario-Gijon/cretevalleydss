import dayjs from "dayjs";

export const getRemainingTime = (closureDate) => {
  if (!closureDate) return "Without closure date";

  const now = dayjs();
  const years = closureDate.diff(now, "year");
  const months = closureDate.diff(now.add(years, "year"), "month");
  const days = closureDate.diff(
    now.add(years, "year").add(months, "month"),
    "day"
  );

  let hours = closureDate.diff(
    now.add(years, "year").add(months, "month").add(days, "day"),
    "hour"
  );

  let message = "Close in ";
  if (years > 0) message += `${years} year${years > 1 ? "s" : ""}, `;
  if (months > 0) message += `${months} month${months > 1 ? "s" : ""}, `;
  if (days > 0) message += `${days} day${days !== 1 ? "s" : ""}, `;
  if (hours > 0) message += `${hours} hour${hours !== 1 ? "s" : ""}`;

  if (days === 0 && hours === 0) {
    message = "Close in less than an hour";
  }

  return message;
};
