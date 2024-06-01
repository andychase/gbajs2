import type { DefaultTheme } from 'styled-components';

export const GbaDarkTheme: DefaultTheme = {
  // media queries
  isLargerThanPhone: 'only screen and (min-width: 600px)',
  isMobileLandscape:
    'only screen and (max-height: 1000px) and (max-width: 1000px) and (orientation: landscape)',
  isMobilePortrait:
    'only screen and (max-width: 1000px) and (orientation: portrait)',
  isMobileWithUrlBar:
    'only screen and (max-height: 700px) and (orientation: portrait)',
  // css colors
  aliceBlue1: '#f8f9fa',
  aliceBlue2: '#edf2f7',
  arcticAirBlue: '#cad8e5',
  blackRussian: '#1a202c',
  blueCharcoal: '#212529',
  checkMarkGreen: '#7ac142',
  darkCharcoal: '#333',
  darkGrayBlue: '#495057',
  disabledGray: '#6c757d',
  errorRed: '#d32f2f',
  gbaThemeBlue: '#0d6efd',
  mediumBlack: '#100901',
  menuHighlight: '#ffffff26',
  menuHover: '#0a58ca',
  pattensBlue: '#dee2e6',
  pureBlack: '#000',
  pureWhite: '#fff',
  darkGray: '#111',
  panelControlGray: '#a9a9a9',
  panelBlueGray: '#4f555a'
};
