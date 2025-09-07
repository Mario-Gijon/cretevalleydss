
import SettingsIcon from '@mui/icons-material/Settings';
import MediationIcon from '@mui/icons-material/Mediation';
import GroupIcon from '@mui/icons-material/Group';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import SummarizeIcon from '@mui/icons-material/Summarize';

import { StepConnector, stepConnectorClasses, styled } from "@mui/material";

export const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: theme.palette.mode === 'light'
        ? 'linear-gradient(95deg, #C2E812 0%, #84D76C 10%, #45C5C5 50%)' // Modo claro
        : 'linear-gradient(95deg, #84D76C 0%, #70D9B5 10%, #45C5C5 50%)', // Modo oscuro
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: theme.palette.mode === 'light'
        ? 'linear-gradient(95deg, #C2E812 0%, #84D76C 50%, #45C5C5 100%)' // Modo claro
        : 'linear-gradient(95deg, #9AECA4 0%, #70D9B5 50%, #45C5C5 100%)', // Modo oscuro
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1,
    ...theme.applyStyles('dark', {
      backgroundColor: theme.palette.grey[800],
    }),
  },
}));

export const ColorlibStepIconRoot = styled('div')(({ theme }) => ({
  backgroundColor: '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...theme.applyStyles('dark', {
    backgroundColor: theme.palette.grey[700],
  }),
  variants: [
    {
      props: ({ ownerState }) => ownerState.active,
      style: {
        backgroundImage: theme.palette.mode === 'light'
          ? 'linear-gradient(95deg, #C2E812 0%, #84D76C 10%, #45C5C5 50%)' // Modo claro
          : 'linear-gradient(95deg, #84D76C 0%, #70D9B5 10%, #45C5C5 50%)', // Modo oscuro
        boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
      },
    },
    {
      props: ({ ownerState }) => ownerState.completed,
      style: {
        backgroundImage: theme.palette.mode === 'light'
          ? 'linear-gradient(95deg, #C2E812 0%, #84D76C 60%, #45C5C5 100%)' // Modo claro
          : 'linear-gradient(95deg, #84D76C 0%, #70D9B5 50%, #45C5C5 100%)', // Modo oscuro
      },
    },
  ],
}));

export const DeactivateColorlibStepIconRoot = styled('div')(({ theme }) => ({
  backgroundColor: '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...theme.applyStyles('dark', {
    backgroundColor: theme.palette.grey[700],
  }),
}));

export const ColorlibStepIcon = (props) => {
  const { active, completed, className } = props;

  const icons = {
    1: <ModelTrainingIcon />,
    2: <MediationIcon />,
    3: <SettingsIcon />,
    4: <GroupIcon />,
    5: <FormatListNumberedIcon />,
    6: <SummarizeIcon />
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

export const DeactivateColorlibStepIcon = (props) => {
  const { active, completed, className } = props;

  const icons = {
    1: <ModelTrainingIcon />,
    2: <MediationIcon />,
    3: <SettingsIcon />,
    4: <GroupIcon />,
    5: <FormatListNumberedIcon />,
    6: <SummarizeIcon />
  };

  return (
    <DeactivateColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </DeactivateColorlibStepIconRoot>
  );
}