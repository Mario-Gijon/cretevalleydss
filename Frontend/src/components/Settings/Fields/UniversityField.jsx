                              
import { TextField, IconButton, Button, FormHelperText, CircularProgress } from '@mui/material';
                         
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
                                                    
import PropTypes from 'prop-types';

                                        
export default function UniversityField({ initialValue, value, setValue, showReset, onSave, error, color, loading }) {
                                        
  const handleKeyDown = (e) => {
                                                                  
    e.key === 'Enter' && onSave()
  }

  return (
    <>
      {                                              }
      <TextField
        label="University"
        variant="filled"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        color={color}
        error={!!error}                                                
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
      {                                               }
      <Button
        variant="contained"
        color={color}
        fullWidth
        sx={{ mt: 2 }}
        startIcon={!loading && <AccountCircleIcon />}
        disabled={!showReset || loading}                                                   
        onClick={onSave}
      >
        {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
        Modify university
      </Button>
    </>
  );
}