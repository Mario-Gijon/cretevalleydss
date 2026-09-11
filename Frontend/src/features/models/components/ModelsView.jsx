import { useMemo, useState } from "react";
import { Box, CircularProgress, Stack } from "@mui/material";

import EmptyState from "../../../components/StyledComponents/EmptyState";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { filterCatalogModels } from "../logic/modelCatalog";
import ModelCatalogSection from "./ModelCatalogSection";
import ModelDetailsDialog from "./ModelDetailsDialog";
import ModelsPageHeader from "./ModelsPageHeader";

/**
 * Vista educativa del catálogo de modelos disponibles.
 *
 * @returns {JSX.Element}
 */
const ModelsView = () => {
  const { models, criteriaWeightingModels, loading } = useIssuesDataContext();
  const catalogModels = useMemo(() => (Array.isArray(models) ? models : []), [models]);
  const catalogWeightingModels = useMemo(
    () => (Array.isArray(criteriaWeightingModels) ? criteriaWeightingModels : []),
    [criteriaWeightingModels]
  );
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);

  const decisionModels = useMemo(
    () => filterCatalogModels(catalogModels, query),
    [catalogModels, query]
  );
  const weightingModels = useMemo(
    () => filterCatalogModels(catalogWeightingModels, query),
    [catalogWeightingModels, query]
  );

  const hasModels = catalogModels.length > 0 || catalogWeightingModels.length > 0;

  if (loading && !hasModels) {
    return (
      <Box role="status" aria-label="Loading models" sx={{ minHeight: "42vh", display: "grid", placeItems: "center" }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ pb: { xs: 1, md: 2 } }}>
      <ModelsPageHeader query={query} onQueryChange={setQuery} />

      {hasModels ? (
        <>
          <ModelCatalogSection
            title="Decision models"
            description="Methods that help compare alternatives and identify the option that best fits your decision criteria."
            familyLabel="Decision"
            models={decisionModels}
            searchActive={Boolean(query.trim())}
            onOpenModel={(model, familyLabel) => setSelectedModel({ model, familyLabel })}
          />
          <ModelCatalogSection
            title="Criteria weighting methods"
            description="Methods that help express how important each criterion is before alternatives are evaluated."
            familyLabel="Criteria weighting"
            models={weightingModels}
            searchActive={Boolean(query.trim())}
            onOpenModel={(model, familyLabel) => setSelectedModel({ model, familyLabel })}
          />
        </>
      ) : (
        <EmptyState
          title="No models are available yet"
          description="The model catalog will appear here when methods are available to your account."
          sx={{ minHeight: { xs: "34vh", sm: "42vh" } }}
        />
      )}

      <ModelDetailsDialog
        model={selectedModel?.model}
        familyLabel={selectedModel?.familyLabel}
        open={Boolean(selectedModel)}
        onClose={() => setSelectedModel(null)}
      />
    </Stack>
  );
};

export default ModelsView;
