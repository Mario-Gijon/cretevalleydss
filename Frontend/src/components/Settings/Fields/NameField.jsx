                                         
import { TextField, IconButton, Button, FormHelperText, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';

                                  
export default function NameField({initialValue, value, setValue, showReset, onSave, error, color, loading }) {

                                        
  const handleKeyDown = (e) => {
    e.key === 'Enter' && onSave()
  }

  return (
    <>
      {                                   }
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
            <IconButton onClick={() => setValue(initialValue)} color="secondary" sx={{ ml: 1 }} size="small">
              <RefreshIcon color={color} />
            </IconButton>
          ) : null,
        }}
      />
      {                                }
      {error && <FormHelperText error>{error}</FormHelperText>} 
      {                                    }
      <Button
        variant="contained"
        color={color}
        fullWidth
        sx={{ mt: 2 }}
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