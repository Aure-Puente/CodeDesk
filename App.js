//App:
import React, { useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import { darkTheme, lightTheme } from "./src/theme/theme";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

function AppContent({ theme, isDarkMode, setIsDarkMode }) {
  const { user, checkingAuth } = useAuth();

  if (checkingAuth) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
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

  const theme = useMemo(() => {
    return isDarkMode ? darkTheme : lightTheme;
  }, [isDarkMode]);

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
                setIsDarkMode={setIsDarkMode}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});