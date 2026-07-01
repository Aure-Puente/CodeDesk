//Importaciones:
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from "@react-navigation/native";
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
import DataBaseScreen from "../screens/DataBaseScreen";
import NotesScreen from "../screens/NotesScreen";
import StatsScreen from "../screens/StatsScreen";

//JS:
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

function TabIconLabel({ routeName, color, focused, styles }) {
  let iconName = "circle-outline";
  let label = routeName;

  if (routeName === "Inicio") {
    iconName = focused ? "home-variant" : "home-variant-outline";
    label = "Inicio";
  }

  if (routeName === "Tareas") {
    iconName = focused
      ? "checkbox-marked-circle"
      : "checkbox-marked-circle-outline";
    label = "Tareas";
  }

  if (routeName === "Proyectos") {
    iconName = focused ? "view-grid" : "view-grid-outline";
    label = "Proyectos";
  }

  if (routeName === "Pagos") {
    iconName = focused ? "wallet" : "wallet-outline";
    label = "Pagos";
  }

  if (routeName === "Más") {
    iconName = focused ? "dots-grid" : "dots-grid";
    label = "Más";
  }

  return (
    <View style={styles.tabContent}>
      <MaterialCommunityIcons
        name={iconName}
        size={30}
        color={color}
        style={styles.tabIcon}
      />

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
        headerShown: false,
        animation: "none",
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        navigationBarColor: theme.colors.background,
      }}
    >
      <Stack.Screen name="MasHome">
        {(props) => (
          <MoreScreen
            {...props}
            theme={theme}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Credenciales">
        {(props) => <CredentialsScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="BaseDeDatos">
        {(props) => <DataBaseScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="Notas">
        {(props) => <NotesScreen {...props} theme={theme} />}
      </Stack.Screen>

      <Stack.Screen name="Estadisticas">
        {(props) => <StatsScreen {...props} theme={theme} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function AppNavigator({ theme, isDarkMode, setIsDarkMode }) {
  const primary = theme.colors.primary;
  const inactiveColor = theme.colors.secondary;
  const tabBackground = theme.colors.surface;
  const tabBorder = theme.colors.borderSoft || theme.colors.outline;
  const shadowColor = "#000000";

  const primarySoft =
    theme.colors.primarySoft ||
    (isDarkMode ? hexToRgba(primary, 0.14) : hexToRgba(primary, 0.1));

  const customStyles = useMemo(
    () =>
      createStyles({
        isDarkMode,
      }),
    [isDarkMode]
  );

  const navigationTheme = useMemo(() => {
    const baseTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;

    return {
      ...baseTheme,
      dark: isDarkMode,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.borderSoft || theme.colors.outline,
        notification: theme.colors.primary,
      },
    };
  }, [isDarkMode, theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Inicio"
        sceneContainerStyle={{
          backgroundColor: theme.colors.background,
        }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: primary,
          tabBarInactiveTintColor: inactiveColor,
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: false,

          sceneStyle: {
            backgroundColor: theme.colors.background,
          },

          tabBarStyle: {
            backgroundColor: tabBackground,
            borderTopColor: tabBorder,
            borderTopWidth: 1,
            height: 114,
            paddingTop: 6,
            shadowColor,
            shadowOpacity: isDarkMode ? 0.28 : 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: -3 },
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

function createStyles({ isDarkMode }) {
  return StyleSheet.create({
    tabButtonBase: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },

    tabButtonPressed: {
      opacity: isDarkMode ? 0.9 : 0.94,
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
      width: 58,
      height: 58,
      borderRadius: 999,
    },

    tabContent: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 72,
    },

    tabIcon: {
      marginBottom: 5,
    },

    customLabel: {
      fontSize: 11.5,
      lineHeight: 15,
      marginBottom: 6,
      letterSpacing: -0.1,
    },
  });
}