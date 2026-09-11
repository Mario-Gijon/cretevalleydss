import { CardActionArea, Paper, Stack, Typography } from "@mui/material";

import { getModelDescription, getModelDisplayName } from "../logic/modelCatalog";
import { getModelCardSx } from "../styles/models.styles";

/**
 * Tarjeta interactiva de un modelo del catálogo educativo.
 *
 * @param {object} props Propiedades del componente.
 * @returns {JSX.Element}
 */
const ModelCard = ({ model, onOpen }) => {
  const name = getModelDisplayName(model);
  const description = getModelDescription(model);

  return (
    <Paper elevation={0} sx={(theme) => getModelCardSx(theme)}>
      <CardActionArea
        onClick={() => onOpen(model)}
        aria-label={`Learn about ${name}`}
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          textAlign: "left",
          "&.Mui-focusVisible": {
            outline: "2px solid rgba(69, 197, 197, 0.7)",
            outlineOffset: "-2px",
          },
        }}
      >
        <Stack spacing={1.15} sx={{ width: "100%", minHeight: 168, p: { xs: 1.5, sm: 1.75 } }}>
          <Stack spacing={0.55} sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="h3" variant="h6" sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>
              {name}
            </Typography>
            {description ? (
              <Typography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
                {description}
              </Typography>
            ) : null}
          </Stack>

          <Typography variant="body2" sx={{ color: "secondary.main", fontWeight: 850 }}>
            Learn more
          </Typography>
        </Stack>
      </CardActionArea>
    </Paper>
  );
};

export default ModelCard;
