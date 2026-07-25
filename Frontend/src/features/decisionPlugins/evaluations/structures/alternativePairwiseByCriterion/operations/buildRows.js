export const buildRows = ({ alternatives, evaluation }) =>
  alternatives.map((rowAlternative) => ({
    id: rowAlternative.id,
    alternativeLabel: rowAlternative.name,
    ...evaluation[rowAlternative.id],
  }));
