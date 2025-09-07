// Importar hooks y componentes necesarios de React y MUI
import { useState, useEffect, forwardRef } from 'react';
// Importar componentes de MUI
import { Slide, Container, Backdrop, Typography, Stack, CircularProgress, Divider } from '@mui/material';
import Grid from '@mui/material/Grid2';
// Importar contexto de autenticación
import { useAuthContext } from '../../context/auth/auth.context';
// Importar helpers de autenticación
import { logout, deleteAccount, updatePassword, modifyUniversity, modifyName, modifyEmail } from '../../controllers/authController';
// Importar hook de esquema de color de MUI
import { useColorScheme } from '@mui/material';
// Importar funciones de validación
import { validateUniversity, validateName, validateEmail, validatePassword } from './utils/validationUtils';
// Importar componentes personalizados
import SettingsHeader from './SettingsHeader';
import UniversityField from './Fields/UniversityField';
import NameField from './Fields/NameField';
import EmailField from './Fields/EmailField';
import PasswordField from './Fields/PasswordField';
/* import NotificationsSwitch from './NotificationsSwitch'; */
import DeleteAccountButton from './Fields/DeleteAccountButton';
import ConfirmDeleteDialog from './Fields/ConfirmDeleteDialog';
import ConfirmPasswordDialog from './Fields/ConfirmPasswordDialog';
import { useSnackbarAlertContext } from '../../context/snackbarAlert/snackbarAlert.context';
import { GlassDialog } from '../StyledComponents/GlassDialog';

// Definir el componente de transición para el Dialog
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide in direction="down" ref={ref} {...props} />;
});

// Definir el componente Settings
export function Settings({ open, setOpen }) {
  // Función para manejar el cierre del diálogo
  const handleClose = () => setOpen(false);

  // Obtener el modo (claro u oscuro) del hook useColorScheme
  const { mode } = useColorScheme();

  const {showSnackbarAlert} = useSnackbarAlertContext();

  // Obtener valores del contexto de autenticación
  const { value, setIsLoggedIn, setValue } = useAuthContext();

  // Definir variables de estado
  const [university, setUniversity] = useState(value.university);
  const [name, setName] = useState(value.name);
  const [email, setEmail] = useState(value.email);
  const [password, setPassword] = useState('');
  /* const [notifications, setNotifications] = useState(false); */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showUniversityReset, setShowUniversityReset] = useState(false);
  const [showNameReset, setShowNameReset] = useState(false);
  const [showEmailReset, setShowEmailReset] = useState(false);
  const [confirmPasswordDialogOpen, setConfirmPasswordDialogOpen] = useState(false);
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loadingUniversity, setLoadingUniversity] = useState(false);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fieldColors, setFieldColors] = useState({
    name: 'secondary',
    university: 'secondary',
    email: 'secondary',
    password: 'secondary',
  });
  const [errors, setErrors] = useState({
    university: '',
    name: '',
    email: '',
    password: '',
    repeatPassword: '',
  });

  // Efecto para mostrar botones de reinicio para campos con cambios
  useEffect(() => {
    setShowUniversityReset(university !== value.university);
    setShowNameReset(name !== value.name);
    setShowEmailReset(email !== value.email);
  }, [university, name, email, value.university, value.name, value.email]);

  // Efecto para reiniciar campos cuando el diálogo se cierra
  useEffect(() => {
    if (!open) {
      setUniversity(value.university)
      setName(value.name)
      setEmail(value.email)
      setPassword('')
      /* setNotifications(false) */
      setFieldColors({
        university: 'secondary',
        name: 'secondary',
        email: 'secondary',
        password: 'secondary',
      })
    }
  }, [open, value]);

  // Función para manejar la confirmación de eliminación
  const handleConfirmDelete = () => setConfirmOpen(true);
  const handleCancelDelete = () => setConfirmOpen(false);

  // Función para manejar cambios en University
  const handleUniversityChange = (newValue) => {
    setUniversity(newValue);
    setFieldColors((prevColor) => ({ ...prevColor, university: 'secondary' }));
    setErrors((prevErrors) => ({ ...prevErrors, university: '' }));
  };

  // Función para manejar cambios en name
  const handleNameChange = (newValue) => {
    setName(newValue);
    setFieldColors((prevColor) => ({ ...prevColor, name: 'secondary' }));
    setErrors((prevErrors) => ({ ...prevErrors, name: '' }));
  };

  // Función para manejar cambios en email
  const handleEmailChange = (newValue) => {
    setEmail(newValue);
    setFieldColors((prevColor) => ({ ...prevColor, email: 'secondary' }));
    setErrors((prevErrors) => ({ ...prevErrors, email: '' }));
  };

  // Función para manejar cambios en password
  const handlePasswordChange = (newValue) => {
    setPassword(newValue);
    setFieldColors((prevColor) => ({ ...prevColor, password: 'secondary' }));
    setErrors((prevErrors) => ({ ...prevErrors, password: '' }));
  };

  // Función para manejar la eliminación de la cuenta
  const handleDelete = async () => {
    setLoadingDelete(true);
    await new Promise(r => setTimeout(r, 1000));
    if (deleteAccount()) {
      setLoadingDelete(false);
      setIsLoggedIn(false);
      setConfirmOpen(false);
    }
    setLoadingDelete(false);
  };

  // Función para manejar la modificación de University
  const handleUniversityModify = async () => {
    const error = validateUniversity(university);
    if (error) {
      setErrors((prevErrors) => ({ ...prevErrors, university: error }));
      setFieldColors((prevColor) => ({ ...prevColor, university: 'error' }));
      return
    }

    setLoadingUniversity(true);

    const { success, msg } = await modifyUniversity(university);

    if (success) {
      setLoadingUniversity(false);

      setValue((prevValue) => ({
        ...prevValue,
        university: university,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, university: '' }));
      setFieldColors((prevColor) => ({ ...prevColor, university: 'success' }));
      showSnackbarAlert(msg, 'success');
    } else {
      setLoadingUniversity(false);

      setErrors((prevErrors) => ({ ...prevErrors, university: msg }));
      setFieldColors((prevColor) => ({ ...prevColor, university: 'error' }));
    }
  };

  // Función para manejar la modificación de name
  const handleNameModify = async () => {
    const error = validateName(name);
    if (error) {
      setErrors((prevErrors) => ({ ...prevErrors, name: error }));
      setFieldColors((prevColor) => ({ ...prevColor, name: 'error' }));
      return
    }

    setLoadingName(true);

    const { success, msg } = await modifyName(name);

    if (success) {
      setLoadingName(false);

      setValue((prevValue) => ({
        ...prevValue,
        name: name,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, name: '' }));
      setFieldColors((prevColor) => ({ ...prevColor, name: 'success' }));
      showSnackbarAlert(msg, 'success');
      return
    }

    setLoadingName(false);
    setErrors((prevErrors) => ({ ...prevErrors, name: msg }));
    setFieldColors((prevColor) => ({ ...prevColor, name: 'error' }));
  }



  // Función para manejar la modificación de email
  const handleEmailModify = async () => {
    const error = validateEmail(email);
    if (error) {
      setErrors((prevErrors) => ({ ...prevErrors, email: error }));
      setFieldColors((prevColor) => ({ ...prevColor, email: 'error' }));
      return
    }

    setLoadingEmail(true);

    const { success, msg } = await modifyEmail(email);
    console.log(success, msg);

    if (success) {
      setLoadingEmail(false);

      setValue((prevValue) => ({
        ...prevValue,
        email: email,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, email: '' }));
      setFieldColors((prevColor) => ({ ...prevColor, email: 'success' }));
      showSnackbarAlert(msg, 'success');
      return
    }

    setLoadingEmail(false);
    setErrors((prevErrors) => ({ ...prevErrors, email: msg }));
    setFieldColors((prevColor) => ({ ...prevColor, email: 'error' }));

  }

  // Función para manejar la modificación de password
  const handlePasswordModify = () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrors((prevErrors) => ({ ...prevErrors, password: passwordError, }));
      setFieldColors((prevColor) => ({ ...prevColor, password: 'error' }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, password: '' }));
      setFieldColors((prevColor) => ({ ...prevColor, password: 'success' }));
      setConfirmPasswordDialogOpen(true);
    }
  };

  // Función para manejar la repetición de password
  const handleRepeatPassword = async () => {
    if (password === repeatPassword) {

      setLoadingPassword(true);

      const { msg, success } = await updatePassword(password, repeatPassword);
      if (success) {
        setLoadingPassword(false);
        showSnackbarAlert('Password updated successfully!', 'success');
        setConfirmPasswordDialogOpen(false);
        setPassword('');
        setRepeatPassword('');
        setFieldColors((prevColor) => ({ ...prevColor, password: 'secondary' }));

        setBackdropOpen(true);
        let countdownValue = 3;

        const countdownInterval = setInterval(() => {
          setCountdown((prevCountdown) => {
            const newCountdown = prevCountdown - 1;
            if (newCountdown <= 0) {
              clearInterval(countdownInterval);
              setBackdropOpen(false);
              logout();
              setIsLoggedIn(false);
            }
            return newCountdown;
          });
        }, 1000);

        setCountdown(countdownValue);
      } else {
        setLoadingPassword(false);
        showSnackbarAlert(msg, 'error');
        setConfirmPasswordDialogOpen(false);
        setPassword('');
        setRepeatPassword('');
        setFieldColors((prevColor) => ({ ...prevColor, password: 'secondary' }));
      }
    } else {
      setLoadingPassword(false);

      setErrors((prevErrors) => ({ ...prevErrors, repeatPassword: 'Passwords do not match' }));
      setFieldColors((prevColor) => ({ ...prevColor, repeatPassword: 'error' }));
    }
  };

  // Función para manejar la cancelación del diálogo de password
  const handleCancelPasswordDialog = () => {
    setConfirmPasswordDialogOpen(false);
    setPassword('');
    setRepeatPassword('');
    setErrors((prevErrors) => ({ ...prevErrors, repeatPassword: '' }));
    setFieldColors((prevColors) => ({ ...prevColors, password: 'secondary' }));
  }

  return (
    <>
      <GlassDialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
      >
        <SettingsHeader handleClose={handleClose} />
        <Divider />

        <Container maxWidth="md" sx={{ p: 3 }}>
          <Grid container spacing={3} justifyContent={"center"} alignItems={"center"}>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <NameField initialValue={value.name} value={name} setValue={handleNameChange} showReset={showNameReset} onSave={handleNameModify} error={errors.name} color={fieldColors.name} loading={loadingName} />
            </Grid>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <UniversityField initialValue={value.university} value={university} setValue={handleUniversityChange} showReset={showUniversityReset} onSave={handleUniversityModify} error={errors.university} color={fieldColors.university} loading={loadingUniversity} />
            </Grid>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <EmailField initialValue={value.email} value={email} setValue={handleEmailChange} showReset={showEmailReset} onSave={handleEmailModify} error={errors.email} color={fieldColors.email} loading={loadingEmail} />
            </Grid>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <PasswordField value={password} setValue={handlePasswordChange} onSave={handlePasswordModify} error={errors.password} color={fieldColors.password} />
            </Grid>

            <Grid item>
              <DeleteAccountButton onClick={handleConfirmDelete} />
            </Grid>

          </Grid>
        </Container>

        <ConfirmDeleteDialog open={confirmOpen} handleCancel={handleCancelDelete} loading={loadingDelete} handleDelete={handleDelete} />
        <ConfirmPasswordDialog
          open={confirmPasswordDialogOpen}
          repeatPassword={repeatPassword}
          setRepeatPassword={(value) => {
            setRepeatPassword(value);
            setErrors((prevErrors) => ({ ...prevErrors, repeatPassword: '' }));
          }}
          onCancel={handleCancelPasswordDialog}
          onConfirm={handleRepeatPassword}
          error={errors.repeatPassword}
          loading={loadingPassword}
        />

        <Backdrop
          sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
          open={backdropOpen}
          onClick={() => setBackdropOpen(false)}
        >
          {countdown !== 0 &&
            (
              <Stack spacing={3} direction={'column'} justifyContent={"center"} alignItems={"center"}>
                <CircularProgress size="5rem" color={mode === "dark" ? "secondary" : "primary"} />
                <Typography variant="h6" color={mode === "dark" ? "secondary" : "primary"}>
                  Redirecting in {countdown}...
                </Typography>
              </Stack>
            )}
        </Backdrop>
      </GlassDialog>
    </>
  );
}