import { Box, Stack, Typography } from "@mui/material";

import ModelCard from "./ModelCard";

/**
 * Sección de una familia del catálogo educativo.
 *
 * @param {object} props Propiedades del componente.
 * @returns {JSX.Element}
 */
const ModelCatalogSection = ({ title, description, familyLabel, models, searchActive, onOpenModel }) => {
  const headingId = `${familyLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-models-heading`;
  const emptyMessage = searchActive
    ? `No ${title.toLocaleLowerCase()} match your search.`
    : `No ${title.toLocaleLowerCase()} are available yet.`;

  return (
    <Stack component="section" spacing={1.35} aria-labelledby={headingId}>
      <Stack spacing={0.25}>
        <Typography id={headingId} component="h2" variant="h5" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 780 }}>
          {description}
        </Typography>
      </Stack>

      {models.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
            gap: { xs: 1.1, sm: 1.35, md: 1.5 },
          }}
        >
          {models.map((model, index) => (
            <ModelCard
              key={model?.id || model?._id || model?.apiModelKey || model?.name || model?.displayName || index}
              model={model}
              familyLabel={familyLabel}
              onOpen={() => onOpenModel(model, familyLabel)}
            />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
          {emptyMessage}
        </Typography>
      )}
    </Stack>
  );
};

export default ModelCatalogSection;
