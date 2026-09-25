import { createTheme } from '@mui/material/styles';

export const GLOBAL_MUI_THEME = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#06B6D4',
      light: '#22D3EE',
      dark: '#0891B2',
    },
    background: {
      default: '#0F1424',
      paper: '#161C30',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    resume: {
      50: '#F8FAFC',
      100: '#E2E8F0',
      200: '#CBD5E1',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#1E293B',
      800: '#0C101D',
      900: '#070A12',
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#161C30',
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(99, 102, 241, 0.25)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(99, 102, 241, 0.5)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#6366F1',
            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
          },
        },
        input: {
          color: '#F8FAFC',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          '&.Mui-focused': {
            color: '#818CF8',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#13192B',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#F1F5F9',
          fontSize: '13px',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            color: '#FFFFFF',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(99, 102, 241, 0.25)',
            color: '#818CF8',
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#161C30',
          borderRadius: 8,
          border: '1px solid rgba(99, 102, 241, 0.2)',
          '&:before': {
            borderBottom: 'none !important',
          },
          '&:hover:before': {
            borderBottom: 'none !important',
          },
          '&:after': {
            borderBottom: '2px solid #6366F1',
          },
          '&:hover': {
            backgroundColor: '#1B233D',
            borderColor: 'rgba(99, 102, 241, 0.45)',
          },
          '&.Mui-focused': {
            backgroundColor: '#161C30',
            borderColor: '#6366F1',
          },
        },
        input: {
          color: '#F8FAFC',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#6366F1',
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': {
            color: '#818CF8',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
        outlined: {
          borderColor: 'rgba(99, 102, 241, 0.35)',
          color: '#C7D2FE',
          '&:hover': {
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            color: '#FFFFFF',
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#6366F1',
        },
        thumb: {
          backgroundColor: '#FFFFFF',
          border: '2px solid #6366F1',
          '&:hover, &.Mui-focusVisible': {
            boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.16)',
          },
        },
        track: {
          background: 'linear-gradient(to right, #6366F1, #06B6D4)',
        },
        rail: {
          backgroundColor: '#1E293B',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '& > .MuiSwitch-thumb': {
            backgroundColor: '#FFFFFF',
          },
          '&.Mui-checked > .MuiSwitch-thumb': {
            backgroundColor: '#06B6D4',
          },
          '& + .MuiSwitch-track': {
            backgroundColor: '#1E293B',
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#6366F1',
          },
        },
      },
    },
  },
});

declare module '@mui/material/styles' {
  interface Palette {
    resume: Palette['grey'];
  }

  // allow configuration using `createTheme`
  interface PaletteOptions {
    resume?: PaletteOptions['grey'];
  }
}
