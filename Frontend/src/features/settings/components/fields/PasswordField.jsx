import { TextField, IconButton, Button, FormHelperText } from '@mui/material';

import LockIcon from '@mui/icons-material/Lock';
import ClearIcon from '@mui/icons-material/Clear';


export default function PasswordField({ value, setValue, onSave, error, color }) {

  const handleKeyDown = (e) => e.key === 'Enter' && onSave()

  return (
    <>
      <TextField
        label="New password"
        type='password'
        variant="filled"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        color={color}
        error={!!error}
        autoComplete="off"
        onKeyDown={value && handleKeyDown}
        InputProps={{
          endAdornment: value && (
            <IconButton onClick={() => setValue('')} color="secondary">
              <ClearIcon color={color} />
            </IconButton>
          ),
        }}
        sx={{
          "& .MuiFilledInput-root": {
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          },
          "& .MuiFilledInput-root:hover": {
            backgroundColor: "rgba(255,255,255,0.08)",
          },
          "& .MuiFilledInput-root.Mui-focused": {
            backgroundColor: "rgba(255,255,255,0.10)",
          },
        }}
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
      <Button
        variant="contained"
        color={color}
        fullWidth
        sx={{ mt: 2, borderRadius: 2, fontWeight: 700, textTransform: "none", py: 1 }}
        startIcon={<LockIcon />}
        disabled={!value}
        onClick={onSave}
      >
        Modify Password
      </Button>
    </>
  );
}
