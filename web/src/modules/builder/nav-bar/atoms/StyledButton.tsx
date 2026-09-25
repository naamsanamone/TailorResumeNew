import { Button, styled, alpha } from '@mui/material';

export const StyledButton = styled(Button)(() => ({
  color: '#cbd5e1',
  borderColor: 'rgba(6, 182, 212, 0.6)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.025em',
  padding: '6px 12px',
  borderRadius: 8,
  textTransform: 'none',
  transition: 'all 0.15s ease-in-out',
  ':hover': {
    color: '#ffffff',
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  '&.MuiButton-outlined': {
    borderColor: 'rgba(6, 182, 212, 0.7)',
    color: '#22d3ee',
    fontWeight: 700,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    '&:hover': {
      borderColor: '#22d3ee',
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
      boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)',
    },
  },
}));
