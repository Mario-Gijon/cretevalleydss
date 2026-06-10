export const filterModels = (models, showConsensusModels, searchQuery) => {
  return models.filter((model) => {
    const matchesConsensus = showConsensusModels
      ? model.supportsConsensus === true
      : model.supportsConsensus !== true;
    const matchesSearch = model.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesConsensus && matchesSearch;
  });
};
