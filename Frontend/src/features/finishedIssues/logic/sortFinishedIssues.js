const parseIssueDateDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") return 0;

  const parts = value.includes("-") ? value.split("-") : value.split("/");
  const [dd, mm, yyyy] = parts.map((part) => Number(part));

  if (!dd || !mm || !yyyy) return 0;

  return new Date(yyyy, mm - 1, dd).getTime();
};

export const sortFinishedIssues = (issues, sortBy) => {
  const list = [...issues];

  const compareByName = (a, b) => a.name.localeCompare(b.name);

  const creationTimestamp = (issue) => {
    const fromCreatedAt = new Date(issue.createdAt).getTime();
    if (Number.isFinite(fromCreatedAt) && fromCreatedAt > 0) {
      return fromCreatedAt;
    }

    return parseIssueDateDDMMYYYY(issue.creationDate);
  };

  const finalizationTimestamp = (issue) => {
    const fromFinishedAt = new Date(issue.finishedAt).getTime();
    if (Number.isFinite(fromFinishedAt) && fromFinishedAt > 0) {
      return fromFinishedAt;
    }

    return 0;
  };

  if (sortBy === "creationDate") {
    return list.sort((a, b) => {
      const diff = creationTimestamp(b) - creationTimestamp(a);
      if (diff !== 0) return diff;
      return compareByName(a, b);
    });
  }

  if (sortBy === "finalizationDate") {
    const withFinishedAt = [];
    const withoutFinishedAt = [];

    list.forEach((issue) => {
      const timestamp = finalizationTimestamp(issue);
      if (timestamp > 0) {
        const updatedAt = new Date(issue.updatedAt).getTime();
        withFinishedAt.push({
          issue,
          timestamp,
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
        });
        return;
      }
      withoutFinishedAt.push(issue);
    });

    withFinishedAt.sort((a, b) => {
      const diff = b.timestamp - a.timestamp;
      if (diff !== 0) return diff;
      const updatedDiff = b.updatedAt - a.updatedAt;
      if (updatedDiff !== 0) return updatedDiff;
      return compareByName(a.issue, b.issue);
    });

    withoutFinishedAt.sort(compareByName);

    return [
      ...withFinishedAt.map((entry) => entry.issue),
      ...withoutFinishedAt,
    ];
  }

  return list.sort(compareByName);
};
