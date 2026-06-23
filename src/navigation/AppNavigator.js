import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

import HomeScreen from "../screens/HomeScreen";
import TasksScreen from "../screens/TasksScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import MoreScreen from "../screens/MoreScreen";

import CredentialsScreen from "../screens/CredentialsScreen";
import DatabaseScreen from "../screens/DataBaseScreen";
import NotesScreen from "../screens/NotesScreen";
import StatsScreen from "../screens/StatsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const hexToRgba = (hex, alpha = 1) => {
  const clean = String(hex || "").replace("#", "");

  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return `rgba(37, 99, 235, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function TabBarButton({
  children,
  onPress,
  onLongPress,
  style,
  rippleColor = "rgba(0,0,0,0.08)",
  focused = false,
  styles,
  ...rest
}) {
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const activeScale = useRef(new Animated.Value(focused ? 1 : 0.96)).current;

  useEffect(() => {
    Animated.spring(activeScale, {
      toValue: focused ? 1 : 0.96,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [focused, activeScale]);

  const handlePressIn = () => {
    rippleOpacity.setValue(1);
    rippleScale.setValue(0);

    Animated.timing(rippleScale, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(rippleOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        style,
        styles.tabButtonBase,
        pressed && styles.tabButtonPressed,
      ]}
      {...rest}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.rippleContainer,
          { opacity: rippleOpacity },
        ]}
      >
        <Animated.View
          style={[
            styles.rippleCircle,
            {
              backgroundColor: rippleColor,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.innerButtonWrap,
          {
            transform: [{ scale: activeScale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function TabIconLabel({ routeName, color, focused, primary, isDarkMode, styles }) {
  let iconName = "circle-outline";
  let label = routeName;

  if (routeName === "Inicio") {
    iconName = focused ? "view-dashboard" : "view-dashboard-outline";
    label = "Inicio";
  }

  if (routeName === "Tareas") {
    iconName = focused
      ? "checkbox-marked-circle"
      : "checkbox-marked-circle-outline";
    label = "Tareas";
  }

  if (routeName === "Proyectos") {
    iconName = focused ? "folder" : "folder-outline";
    label = "Proyectos";
  }

  if (routeName === "Pagos") {
    iconName = focused ? "cash-multiple" : "cash-multiple";
    label = "Pagos";
  }

  if (routeName === "Más") {
    iconName = focused
      ? "dots-horizontal-circle"
      : "dots-horizontal-circle-outline";
    label = "Más";
  }

  return (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.iconPill,
          focused && {
            backgroundColor: isDarkMode
              ? hexToRgba(primary, 0.18)
              : hexToRgba(primary, 0.12),
            borderColor: isDarkMode
              ? hexToRgba(primary, 0.28)
              : hexToRgba(primary, 0.18),
          },
        ]}
      >
        <MaterialCommunityIcons name={iconName} size={27} color={color} />
      </View>

      <Text
        style={[
          styles.customLabel,
          {
            color,
            fontWeight: focused ? "800" : "600",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function MoreStack({ theme, isDarkMode, setIsDarkMode }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: "800",
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="MasHome" options={{ title: "Más" }}>
        {(props) => (
          <MoreScreen
            {...props}
            theme={theme}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Credenciales" options={{ title: "Credenciales" }}>
        {(props) => <CredentialsScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="BaseDeDatos" options={{ title: "Base de datos" }}>
        {(props) => <DatabaseScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="Notas" options={{ title: "Notas" }}>
        {(props) => <NotesScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="Estadisticas" options={{ title: "Estadísticas" }}>
        {(props) => <StatsScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="Perfil" options={{ title: "Perfil" }}>
        {(props) => (
          <ProfileScreen
            {...props}
            theme={theme}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function AppNavigator({ theme, isDarkMode, setIsDarkMode }) {
  const primary = theme.colors.primary;
  const inactiveColor = theme.colors.secondary;
  const tabBackground = theme.colors.surface;
  const tabBorder = theme.colors.outline;
  const shadowColor = "#000000";

  const primarySoft = isDarkMode
    ? hexToRgba(primary, 0.18)
    : hexToRgba(primary, 0.14);

  const customStyles = useMemo(
    () =>
      createStyles({
        isDarkMode,
        primary,
        tabBackground,
        tabBorder,
      }),
    [isDarkMode, primary, tabBackground, tabBorder]
  );

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Inicio"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: primary,
          tabBarInactiveTintColor: inactiveColor,
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,

          tabBarStyle: {
            backgroundColor: tabBackground,
            borderTopColor: tabBorder,
            borderTopWidth: 1,
            height: 110,
            paddingTop: 4,
            shadowColor,
            shadowOpacity: isDarkMode ? 0.22 : 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -2 },
            elevation: 10,
          },

          tabBarItemStyle: {
            paddingTop: 2,
          },

          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              styles={customStyles}
              rippleColor={primarySoft}
              focused={props.accessibilityState?.selected}
            />
          ),

          tabBarIcon: ({ color, focused }) => (
            <TabIconLabel
              routeName={route.name}
              color={color}
              focused={focused}
              primary={primary}
              isDarkMode={isDarkMode}
              styles={customStyles}
            />
          ),
        })}
      >
        <Tab.Screen name="Inicio">
          {(props) => <HomeScreen {...props} theme={theme} />}
        </Tab.Screen>

        <Tab.Screen name="Tareas">
          {(props) => <TasksScreen {...props} theme={theme} />}
        </Tab.Screen>

        <Tab.Screen name="Proyectos">
          {(props) => <ProjectsScreen {...props} theme={theme} />}
        </Tab.Screen>

        <Tab.Screen name="Pagos">
          {(props) => <PaymentsScreen {...props} theme={theme} />}
        </Tab.Screen>

        <Tab.Screen name="Más">
          {(props) => (
            <MoreStack
              {...props}
              theme={theme}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function createStyles({ isDarkMode, primary, tabBackground, tabBorder }) {
  return StyleSheet.create({
    tabButtonBase: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    tabButtonPressed: {
      opacity: 0.95,
    },

    innerButtonWrap: {
      alignItems: "center",
      justifyContent: "center",
    },

    rippleContainer: {
      alignItems: "center",
      justifyContent: "center",
    },

    rippleCircle: {
      width: 82,
      height: 70,
      borderRadius: 26,
    },

    tabContent: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 72,
    },

    iconPill: {
      minWidth: 46,
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      backgroundColor: "transparent",
    },

    customLabel: {
      fontSize: 11.5,
      lineHeight: 15,
      marginBottom: 6,
    },
  });
}