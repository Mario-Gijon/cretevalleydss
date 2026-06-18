const normalizeFinishedIssueValue = (value) =>
  value == null ? "" : String(value).toLowerCase();

const criteriaContainsQuery = (nodes, query) => {
  if (!query) return true;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;

  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    if (normalizeFinishedIssueValue(node?.name).includes(query)) {
      return true;
    }

    if (Array.isArray(node?.children) && node.children.length > 0) {
      stack.push(...node.children);
    }
  }

  return false;
};

const ownerContainsQuery = (issue, query) => {
  if (!query) return true;

  const candidates = [
    issue?.creator,
    issue?.ownerEmail,
    issue?.ownerName,
    issue?.owner?.email,
    issue?.owner?.name,
    issue?.createdBy?.email,
    issue?.createdBy?.name,
    issue?.owner?.email,
    issue?.owner?.name,
  ];

  return candidates.some((candidate) =>
    normalizeFinishedIssueValue(candidate).includes(query)
  );
};

const alternativesContainsQuery = (issue, query) => {
  if (!query) return true;

  const alternatives = Array.isArray(issue?.alternatives) ? issue.alternatives : [];

  return alternatives.some((alternative) => {
    if (typeof alternative === "string") {
      return normalizeFinishedIssueValue(alternative).includes(query);
    }

    return normalizeFinishedIssueValue(
      alternative?.name || alternative?.title || alternative?.label
    ).includes(query);
  });
};

export const finishedIssueMatchesSearch = (issue, query, searchBy) => {
  const normalizedQuery = normalizeFinishedIssueValue(query).trim();

  if (!normalizedQuery) return true;

  const byIssue = normalizeFinishedIssueValue(issue?.name).includes(normalizedQuery);
  const byModel = normalizeFinishedIssueValue(issue?.model?.name).includes(normalizedQuery);
  const byOwner = ownerContainsQuery(issue, normalizedQuery);
  const byAlternatives = alternativesContainsQuery(issue, normalizedQuery);
  const byCriteria = criteriaContainsQuery(issue?.criteria, normalizedQuery);

  if (searchBy === "issue") return byIssue;
  if (searchBy === "model") return byModel;
  if (searchBy === "owner") return byOwner;
  if (searchBy === "alternatives") return byAlternatives;
  if (searchBy === "criteria") return byCriteria;

  return byIssue || byModel || byOwner || byAlternatives || byCriteria;
};

export const filterFinishedIssues = ({
  finishedIssues,
  query,
  searchBy,
}) => {
  const safeIssues = Array.isArray(finishedIssues) ? finishedIssues : [];

  return safeIssues.filter((issue) =>
    finishedIssueMatchesSearch(issue, query, searchBy)
  );
};
