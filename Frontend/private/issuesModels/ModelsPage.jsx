// Importa hooks de React

// Importa componentes de Material UI
import { Stack, Typography, Paper } from "@mui/material";
import { styled } from '@mui/material/styles';

// Importa el componente Masonry para un diseño de columnas
import Masonry from "@mui/lab/Masonry";

// Definir las alturas de las tarjetas de manera estática
const heights = [130, 110, 170, 100, 130, 130, 100, 150, 160, 150, 130, 130,];

const Item = styled(Paper)(({ theme }) => ({
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

// Componente Dashboard
const ModelsPage = () => {
  return (
      <Stack
        direction="column"
        spacing={2}
        sx={{
          justifyContent: "center",
        }}
      >
        <Typography variant="h4">Models</Typography>
        {/* Mapeo de la estructura de Masonry para las tarjetas */}
        <Masonry columns={{ xs: 1, sm: 2, lg: 3, xl: 4 }} spacing={2}>
          {heights.map((height, index) => (
            <Item key={index} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height }}>
              {index + 1}
            </Item>
          ))}
        </Masonry>
      </Stack>

  );
};

export default ModelsPage
