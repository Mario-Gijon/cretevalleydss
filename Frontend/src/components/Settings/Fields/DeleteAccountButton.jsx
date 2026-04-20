                                     
import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

                                 
export default function DeleteAccountButton({ onClick }) {
  return (
                                    
    <Button
      variant="contained"
      color="error"
      fullWidth
      startIcon={<DeleteIcon />}
      onClick={onClick}
    >
      Delete Account
    </Button>
  );
}