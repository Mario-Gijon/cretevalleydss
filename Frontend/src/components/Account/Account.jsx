import { useEffect } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { useAuthContext } from "../../context/auth/auth.context";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { GlassPaper } from "../StyledComponents/GlassPaper";

/**
 * Muestra la ficha de cuenta del usuario dentro de un modal.
 *
 * @param {Object} props Props del componente.
 * @param {Function} props.setOpenBackdrop Setter para cerrar el modal.
 * @returns {JSX.Element}
 */
export const Account = ({ setOpenBackdrop }) => {
  const theme = useTheme();
  const {
    value: { name, university, email, accountCreation },
  } = useAuthContext();

  const handleCloseBackdrop = () => {
    setOpenBackdrop(false);
  };

  const handlePaperClick = (event) => {
    event.stopPropagation();
  };

  const userFields = [
    { label: "Name", value: name },
    { label: "University", value: university },
    { label: "Email", value: email },
    { label: "Sign-Up Date", value: accountCreation },
  ];

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <GlassDialog
      open
      onClick={handleCloseBackdrop}
      sx={{
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <GlassPaper
        elevation={6}
        square={false}
        onClick={handlePaperClick}
        sx={{
          p: { xs: 2.2, sm: 4.2 },
          px: { xs: 2.2, sm: 5.6 },
          maxHeight: "80%",
          overflow: "auto",
          borderRadius: 4,
          boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.22)}`,
          position: "relative",
          maxWidth: "600px",
          minWidth: { xs: "300px", sm: "430px" },
          border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
          background: `radial-gradient(900px 340px at 10% 0%, ${alpha(
            theme.palette.info.main,
            0.20
          )}, transparent 62%), rgba(16, 24, 34, 0.90)`,
        }}
      >
        <IconButton
          onClick={handleCloseBackdrop}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            "&:hover": {
              bgcolor: alpha(theme.palette.common.white, 0.10),
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Stack
          direction="column"
          spacing={3}
          alignItems="center"
          sx={{ position: "relative" }}
        >
          <Box sx={{ textAlign: "center", width: { xs: "220px", sm: "280px" } }}>
            <AccountCircleIcon
              color="inherit"
              sx={{ fontSize: "58px", color: "info.main" }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {userFields[0].value}
            </Typography>
            <Divider sx={{ mt: 2 }} />
          </Box>

          <Box
            sx={{
              textAlign: "center",
              justifyContent: "center",
              width: { xs: "220px", sm: "280px" },
            }}
          >
            {userFields.slice(1).map((field, index) => (
              <Box key={field.label}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {field.label}
                </Typography>
                <Typography color="text.secondary">{field.value}</Typography>
                <Divider
                  sx={{
                    my: 2,
                    display: index === userFields.length - 2 ? "none" : "flex",
                    opacity: 0.2,
                  }}
                />
              </Box>
            ))}
          </Box>
        </Stack>
      </GlassPaper>
    </GlassDialog>
  );
};
