import { useState } from "react";
import {
  Typography,
  Container,
  CircularProgress,
  Button,
  Stack,
  Link,
  Divider,
  Box,
  InputAdornment,
  IconButton,
  TextField,
  Avatar,
  Paper,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { useOutletContext } from "react-router-dom";

import { login } from "../../../services/auth.service";
import { useAuthContext } from "../../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  loginFormInitialErrors,
  loginFormInitialValues,
} from "../constants/loginForm.constants";
import { validateLoginForm } from "../utils/loginForm.validation";
import { authCardContentSx, getAuthCardSx } from "../styles/auth.styles";

const LogInForm = () => {
  const theme = useTheme();
  const { navigate } = useOutletContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { setIsLoggedIn } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState(loginFormInitialValues);
  const [errors, setErrors] = useState(loginFormInitialErrors);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleRestart = () => {
    setFormValues(loginFormInitialValues);
    setErrors(loginFormInitialErrors);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    const newErrors = validateLoginForm(formValues);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const data = await login(formValues);

      if (!data?.success) {
        const validationErrors = data?.error?.details;

        if (
          validationErrors &&
          typeof validationErrors === "object" &&
          !Array.isArray(validationErrors)
        ) {
          setErrors(validationErrors);
        }

        showSnackbarAlert(data?.message || "Invalid credentials", "error");
        return;
      }

      setErrors(loginFormInitialErrors);
      showSnackbarAlert("Logged in successfully!", "success");
      setIsLoggedIn(true);
      window.location.reload();
    } catch (error) {
      console.error("Error submitting login form:", error);
      showSnackbarAlert("An error occurred while submitting the form", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailKeyDown = (event) => {
    if (event.key === "Enter") {
      document.getElementById("password")?.focus();
    }
  };

  const handlePasswordKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin(event);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={getAuthCardSx(theme, "secondary")}>
        <Box sx={authCardContentSx}>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", mb: 2 }}>
            <Avatar className="auth-header-avatar">
              <LockRoundedIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                Log In
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Access your workspace
              </Typography>
            </Stack>
          </Stack>

          <Box component="form" onSubmit={handleLogin} sx={{ pt: 2 }}>
            <Stack spacing={1.2}>
              <TextField
                id="email"
                name="email"
                type="email"
                label="Email"
                value={formValues.email}
                onChange={handleChange}
                onKeyDown={handleEmailKeyDown}
                error={!!errors.email}
                helperText={errors.email || " "}
                fullWidth
                size="small"
                color="secondary"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={formValues.password}
                onChange={handleChange}
                onKeyDown={handlePasswordKeyDown}
                autoComplete="off"
                error={!!errors.password}
                helperText={errors.password || " "}
                fullWidth
                size="small"
                color="secondary"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack spacing={1.2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    disabled={loading}
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      py: 1.05,
                      fontWeight: 950,
                    }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Log in"}
                  </Button>

                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleRestart}
                    disabled={loading}
                    sx={{ borderRadius: 3, py: 1.05, minWidth: 56 }}
                    title="Restart"
                  >
                    <RestartAltRoundedIcon fontSize="small" />
                  </Button>
                </Stack>

                <Divider sx={{ opacity: 0.18 }} />

                <Stack direction="row" sx={{ justifyContent: "center", pt: 1 }}>
                  <Link
                    underline="hover"
                    color="secondary"
                    sx={{ textAlign: "center", cursor: "pointer", fontWeight: 850 }}
                    onClick={() => navigate("/signup")}
                  >
                    Not registered? Click here to continue
                  </Link>
                </Stack>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default LogInForm;
