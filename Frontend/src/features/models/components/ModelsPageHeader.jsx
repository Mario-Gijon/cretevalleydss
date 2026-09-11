import { Avatar, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import SearchIcon from "@mui/icons-material/Search";

import { getModelsHeaderSx } from "../styles/models.styles";

/**
 * Cabecera y búsqueda del catálogo educativo de modelos.
 *
 * @param {object} props Propiedades del componente.
 * @returns {JSX.Element}
 */
const ModelsPageHeader = ({ query, onQueryChange }) => {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={{ ...getModelsHeaderSx(theme), borderRadius: 3, p: { xs: 1.5, sm: 2, md: 2.25 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1.5, md: 2 }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.2} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <Avatar
            sx={{
              width: { xs: 42, md: 46 },
              height: { xs: 42, md: 46 },
              bgcolor: alpha(theme.palette.secondary.main, 0.13),
              color: "secondary.main",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <AutoStoriesOutlinedIcon />
          </Avatar>

          <Stack spacing={0.3} sx={{ minWidth: 0 }}>
            <Typography component="h1" variant="h4" sx={{ fontSize: { xs: "1.7rem", sm: "2rem", md: "2.125rem" } }}>
              Models
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 660 }}>
              Explore the available methods and find the approach that best fits your decision problem.
            </Typography>
          </Stack>
        </Stack>

        <TextField
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          size="small"
          placeholder="Search models"
          fullWidth
          sx={{ width: { xs: "100%", md: 330 }, flexShrink: 0 }}
          slotProps={{
            htmlInput: {
              "aria-label": "Search models",
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>
    </Paper>
  );
};

export default ModelsPageHeader;
