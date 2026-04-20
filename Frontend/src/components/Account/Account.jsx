                           
import { Typography, Stack, Box, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect } from 'react';
import { useAuthContext } from '../../context/auth/auth.context';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { GlassPaper } from '../StyledComponents/GlassPaper';
import { GlassDialog } from '../StyledComponents/GlassDialog';
                                                     

                     
export const Account = ({ setOpenBackdrop }) => {
                                                                  
                                         

                                                      
  const { value: { name, university, email, accountCreation } } = useAuthContext();

                                    
  const handleCloseBackdrop = () => {
    setOpenBackdrop(false);                      
  };

                                                                       
  const handlePaperClick = (e) => {
    e.stopPropagation();                                               
  };

                             
  const userFields = [
    { label: 'Name', value: name },
    { label: 'University', value: university },
    { label: 'Email', value: email },   
                                                                                                      
    { label: 'Sign-Up Date', value: accountCreation }
  ];

                                                                            
  useEffect(() => {
    document.body.style.overflow = 'hidden';                                  

                                                                    
    return () => {
      document.body.style.overflow = '';                               
    };
  }, []);

  return (
                                         
    <GlassDialog
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',                                                   
      }}
      open={true}
      onClick={handleCloseBackdrop}                                                      
    >
      {                                     }
      <GlassPaper
        sx={{
          p: "40px",
          px: "70px",
          maxHeight: '80%',
          overflow: 'auto',
          borderRadius: 2,
          boxShadow: 3,
          position: 'relative',                                         
          maxWidth: '600px',                                    
          minWidth: { xs: "300px", sm: "430px" },
        }}
        elevation={6}
        square={false}
        onClick={handlePaperClick}                                                     
      >
        {                                }
        <IconButton
          onClick={handleCloseBackdrop}
          sx={{
            position: 'absolute',
            top: 10,                                    
            right: 10,                                   
            zIndex: 10,                                                         
          }}
        >
          <CloseIcon />
        </IconButton>

        {                                      }
        <Stack direction="column" spacing={3} alignItems="center">
          <Box sx={{ textAlign: 'center', width: { xs: "200px", sm: "260px" } }}>
            {                     }
            <AccountCircleIcon sx={{ fontSize: "80px" }} color='inherit' />
            <Typography variant="h5">
              {userFields[0].value}
            </Typography>
            <Divider sx={{ mt: 2 }} />
          </Box>
          <Box sx={{ textAlign: 'center', justifyContent: 'center', width: { xs: "200px", sm: "260px" } }}>
            {                         }
            {userFields.slice(1).map((field, index) => (
              <div key={index}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {field.label}
                </Typography>
                <Typography>{field.value}</Typography>
                <Divider sx={{ my: 2, display: index === (userFields.length - 2) ? "none" : "flex" }} />
              </div>
            ))}
          </Box>
        </Stack>
      </GlassPaper>
    </GlassDialog>
  );
};