//Tema:
import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563EB",
    secondary: "#64748B",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    outline: "#E2E8F0",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#60A5FA",
    secondary: "#94A3B8",
    background: "#020617",
    surface: "#0F172A",
    text: "#F8FAFC",
    outline: "#1E293B",
  },
};