import { styled } from '@mui/system';
import { Tabs } from '@mui/material';

                                     
export const GradientTabs = styled(Tabs)({
  '& .MuiTabs-indicator': {
    background: 'linear-gradient(95deg, #45C5C5 30%, #9AECA4 100%)',              
    height: '4px',                                    
  },
});
