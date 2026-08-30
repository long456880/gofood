import { createContext, useContext, useState, ReactNode } from 'react';

type Theme = {
  dark: boolean;
  toggle: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    input: string;
  };
};

const light = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  text: '#111111',
  subtext: '#666666',
  border: '#E8E8E8',
  input: '#F5F5F5',
};

const dark = {
  background: '#111111',
  card: '#1E1E1E',
  text: '#FFFFFF',
  subtext: '#AAAAAA',
  border: '#333333',
  input: '#2A2A2A',
};

const ThemeContext = createContext<Theme>({
  dark: false,
  toggle: () => {},
  colors: light,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggle = () => setIsDark((v) => !v);

  return (
    <ThemeContext.Provider
      value={{ dark: isDark, toggle, colors: isDark ? dark : light }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);