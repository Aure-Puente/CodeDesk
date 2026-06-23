//Tema:
import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

export const lightTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,

    // Marca principal
    primary: "#2563EB",
    primarySoft: "rgba(37, 99, 235, 0.08)",

    // Textos
    text: "#0F172A",
    secondary: "#64748B",
    muted: "#94A3B8",

    // Fondos
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceSoft: "#F1F5F9",

    // Bordes
    outline: "#E2E8F0",
    borderSoft: "rgba(15, 23, 42, 0.08)",

    // Estados
    success: "#16A34A",
    successSoft: "rgba(22, 163, 74, 0.10)",

    warning: "#D97706",
    warningSoft: "rgba(217, 119, 6, 0.10)",

    danger: "#DC2626",
    dangerSoft: "rgba(220, 38, 38, 0.08)",

    info: "#2563EB",
    infoSoft: "rgba(37, 99, 235, 0.10)",

    paused: "#64748B",
    pausedSoft: "rgba(100, 116, 139, 0.10)",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,

    // Marca principal
    primary: "#60A5FA",
    primarySoft: "rgba(96, 165, 250, 0.14)",

    // Textos
    text: "#F8FAFC",
    secondary: "#94A3B8",
    muted: "#64748B",

    // Fondos
    background: "#020617",
    surface: "#0F172A",
    surfaceSoft: "#111827",

    // Bordes
    outline: "#1E293B",
    borderSoft: "rgba(255, 255, 255, 0.08)",

    // Estados
    success: "#22C55E",
    successSoft: "rgba(34, 197, 94, 0.16)",

    warning: "#F59E0B",
    warningSoft: "rgba(245, 158, 11, 0.16)",

    danger: "#F87171",
    dangerSoft: "rgba(248, 113, 113, 0.16)",

    info: "#60A5FA",
    infoSoft: "rgba(96, 165, 250, 0.16)",

    paused: "#94A3B8",
    pausedSoft: "rgba(148, 163, 184, 0.14)",
  },
};