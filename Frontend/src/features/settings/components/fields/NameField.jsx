import { TextField, IconButton, Button, FormHelperText, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';


export default function NameField({initialValue, value, setValue, showReset, onSave, error, color, loading }) {


  const handleKeyDown = (e) => {
    e.key === 'Enter' && onSave()
  }

  return (
    <>
      <TextField
        label="Name"
        variant="filled"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        color={color}
        error={error}
        autoComplete="off"
        onKeyDown={showReset && handleKeyDown}
        InputProps={{
          endAdornment: showReset ? (
            <IconButton onClick={() => setValue(initialValue)} color="secondary" sx={{ ml: 1 }}>
              <RefreshIcon color={color} />
            </IconButton>
          ) : null,
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
        startIcon={!loading && <PersonIcon />}
        disabled={!showReset || loading}
        onClick={onSave}
      >
        {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
        Modify Name
      </Button>
    </>
  );
}
