import { Box, useColorScheme } from "@mui/material";

import { CircularLoading } from "../components/LoadingProgress/CircularLoading";

const APP_LOADING_CONTAINER_SX = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  position: "relative",
  overflow: "hidden",
};

export function AppLoadingScreen() {
  const { mode } = useColorScheme();

  return (
    <Box className="dashboard-background" sx={APP_LOADING_CONTAINER_SX}>
      <CircularLoading
        size="5rem"
        color={mode === "dark" ? "secondary" : "primary"}
      />
    </Box>
  );
}
