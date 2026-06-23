//App:
import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import SplashScreen from "./src/screens/SplashScreen";
import { darkTheme, lightTheme } from "./src/theme/theme";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

const SPLASH_DURATION_MS = 2000;

function AppContent({ theme, isDarkMode, setIsDarkMode }) {
  const { user, checkingAuth } = useAuth();

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  if (checkingAuth || showSplash) {
    return <SplashScreen theme={theme} />;
  }

  if (!user) {
    return <LoginScreen theme={theme} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <AppNavigator
        theme={theme}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const savedTheme = await AsyncStorage.getItem("codedesk_theme");

      if (savedTheme === "dark") {
        setIsDarkMode(true);
      }

      if (savedTheme === "light") {
        setIsDarkMode(false);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingTheme(false);
    }
  }

  async function handleThemeChange(value) {
    setIsDarkMode(value);

    try {
      await AsyncStorage.setItem("codedesk_theme", value ? "dark" : "light");
    } catch (error) {
      console.log(error);
    }
  }

  const theme = useMemo(() => {
    return isDarkMode ? darkTheme : lightTheme;
  }, [isDarkMode]);

  if (loadingTheme) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <PaperProvider theme={darkTheme}>
            <StatusBar style="light" backgroundColor="#0B111E" />

            <SplashScreen />
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <View
              style={[
                styles.container,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <StatusBar
                style={isDarkMode ? "light" : "dark"}
                backgroundColor={theme.colors.background}
              />

              <AppContent
                theme={theme}
                isDarkMode={isDarkMode}
                setIsDarkMode={handleThemeChange}
              />
            </View>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },
});