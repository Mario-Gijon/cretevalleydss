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
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import { useSignupForm } from "../hooks/useSignupForm";
import { authCardContentSx, getAuthCardSx } from "../styles/auth.styles";

const SignUpForm = () => {
  const theme = useTheme();
  const {
    errors,
    formValues,
    loading,
    showPassword,
    showRepeatPassword,
    focusNextField,
    handleChange,
    handleNavigateToLogin,
    handleRestart,
    handleSignUp,
    handleSubmitOnEnter,
    togglePasswordVisibility,
    toggleRepeatPasswordVisibility,
  } = useSignupForm();

  return (
    <Container maxWidth="sm" sx={{ display: "flex", justifyContent: "center" }}>
      <Paper elevation={0} sx={getAuthCardSx(theme, "info")}>
        <Box sx={authCardContentSx}>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", mb: 2 }}>
            <Avatar className="auth-header-avatar">
              <PersonAddAltRoundedIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                Sign Up
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Create your account
              </Typography>
            </Stack>
          </Stack>

          <Box component="form" onSubmit={handleSignUp} pt={2}>
            <Stack spacing={1.4}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4} sx={{ width: "100%" }}>
                <TextField
                  id="name"
                  name="name"
                  label="Name"
                  value={formValues.name}
                  onChange={handleChange}
                  onKeyDown={(event) => focusNextField(event, "email")}
                  autoComplete="off"
                  error={!!errors.name}
                  helperText={errors.name || " "}
                  size="small"
                  fullWidth
                  color="secondary"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  id="university"
                  name="university"
                  label="University"
                  value={formValues.university}
                  onChange={handleChange}
                  onKeyDown={(event) => focusNextField(event, "name")}
                  autoComplete="off"
                  error={!!errors.university}
                  helperText={errors.university || " "}
                  size="small"
                  fullWidth
                  color="secondary"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SchoolRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              <TextField
                id="email"
                name="email"
                type="email"
                label="Email"
                value={formValues.email}
                onChange={handleChange}
                onKeyDown={(event) => focusNextField(event, "password")}
                autoComplete="off"
                error={!!errors.email}
                helperText={errors.email || " "}
                size="small"
                fullWidth
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
                onKeyDown={(event) => focusNextField(event, "repeatPassword")}
                autoComplete="off"
                error={!!errors.password}
                helperText={errors.password || "1 number, 1 letter, min 6"}
                size="small"
                fullWidth
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
                        onClick={togglePasswordVisibility}
                        edge="end"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                id="repeatPassword"
                name="repeatPassword"
                type={showRepeatPassword ? "text" : "password"}
                label="Repeat Password"
                value={formValues.repeatPassword}
                onChange={handleChange}
                onKeyDown={handleSubmitOnEnter}
                autoComplete="off"
                error={!!errors.repeatPassword}
                helperText={errors.repeatPassword || " "}
                size="small"
                fullWidth
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
                        onClick={toggleRepeatPasswordVisibility}
                        edge="end"
                        aria-label={
                          showRepeatPassword
                            ? "Hide repeated password"
                            : "Show repeated password"
                        }
                      >
                        {showRepeatPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack spacing={1.2} sx={{ mt: 0.5 }}>
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
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Sign Up"}
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

                <Stack direction="row" sx={{ justifyContent: "center" }}>
                  <Link
                    underline="hover"
                    color="secondary"
                    sx={{ textAlign: "center", cursor: "pointer", fontWeight: 850 }}
                    onClick={handleNavigateToLogin}
                  >
                    Already registered? Click here to continue
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

export default SignUpForm;
