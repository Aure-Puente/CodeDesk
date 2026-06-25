//Importaciones:
import React from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Card, Divider, Switch, Text, TouchableRipple } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

//JS:
const MENU_ITEMS = [
  {
    title: "Credenciales",
    description: "Mails y contraseñas para mantenimiento local o producción",
    icon: "lock-outline",
    route: "Credenciales",
    protected: true,
  },
  {
    title: "Base de datos",
    description: "Enlaces a Firebase y accesos rápidos de cada proyecto",
    icon: "firebase",
    route: "BaseDeDatos",
    protected: true,
  },
  {
    title: "Notas",
    description: "Ideas, bugs, comandos y pendientes rápidos",
    icon: "note-text-outline",
    route: "Notas",
  },
  {
    title: "Estadísticas",
    description: "Productividad, proyectos, pagos y progreso",
    icon: "chart-line",
    route: "Estadisticas",
  },
  {
    title: "Perfil",
    description: "Cuenta, configuración y sesión",
    icon: "account-outline",
    route: "Perfil",
  },
];

function MenuRow({ item, theme, onPress, showDivider }) {
  return (
    <>
      <TouchableRipple
        onPress={onPress}
        rippleColor={theme.colors.primarySoft || theme.colors.primary + "22"}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  theme.colors.primarySoft || theme.colors.primary + "22",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={responsive(21, 27)}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.rowText}>
            <Text
              style={[styles.rowTitle, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            <Text
              style={[styles.rowDescription, { color: theme.colors.secondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          </View>

          {item.protected && (
            <MaterialCommunityIcons
              name="fingerprint"
              size={responsive(21, 27)}
              color={theme.colors.primary}
              style={styles.fingerprint}
            />
          )}

          <MaterialCommunityIcons
            name="chevron-right"
            size={responsive(22, 28)}
            color={theme.colors.secondary}
            style={styles.chevron}
          />
        </View>
      </TouchableRipple>

      {showDivider && (
        <Divider
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.borderSoft || theme.colors.outline,
            },
          ]}
        />
      )}
    </>
  );
}

export default function MoreScreen({
  theme,
  navigation,
  isDarkMode,
  setIsDarkMode,
}) {
  async function handleNavigate(item) {
    if (!item.protected) {
      navigation.navigate(item.route);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();

    if (!hasHardware) {
      Alert.alert(
        "Biometría no disponible",
        "Este dispositivo no tiene lector biométrico disponible."
      );
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!isEnrolled) {
      Alert.alert(
        "Biometría no configurada",
        "Primero configurá huella, rostro o bloqueo de pantalla en tu dispositivo."
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Acceder a ${item.title}`,
      cancelLabel: "Cancelar",
      fallbackLabel: "Usar bloqueo del dispositivo",
      disableDeviceFallback: false,
    });

    if (result.success) {
      navigation.navigate(item.route);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.sectionMarker,
              { backgroundColor: theme.colors.primary },
            ]}
          />

          <Text
            variant={IS_TABLET ? "headlineMedium" : "headlineSmall"}
            style={[styles.title, { color: theme.colors.text }]}
          >
            Más
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Accesos secundarios para administrar tus herramientas y configuración.
        </Text>
      </View>

      <Card
        mode="contained"
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft || theme.colors.outline,
          },
        ]}
      >
        <View style={styles.cardContent}>
          {MENU_ITEMS.map((item, index) => (
            <MenuRow
              key={item.route}
              item={item}
              theme={theme}
              onPress={() => handleNavigate(item)}
              showDivider={index !== MENU_ITEMS.length - 1}
            />
          ))}
        </View>
      </Card>

      <Card
        mode="contained"
        style={[
          styles.themeCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft || theme.colors.outline,
          },
        ]}
      >
        <View style={styles.themeRow}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  theme.colors.primarySoft || theme.colors.primary + "22",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="theme-light-dark"
              size={responsive(21, 27)}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
              Modo oscuro
            </Text>

            <Text
              style={[styles.rowDescription, { color: theme.colors.secondary }]}
            >
              {isDarkMode ? "Activado" : "Desactivado"}
            </Text>
          </View>

          <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    width: "100%",
    maxWidth: responsive(undefined, 860),
    alignSelf: "center",
    paddingHorizontal: responsive(20, 34),
    paddingTop: responsive(6, 18),
    paddingBottom: responsive(28, 60),
  },

  header: {
    marginBottom: responsive(18, 26),
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionMarker: {
    width: responsive(5, 6),
    height: responsive(28, 34),
    borderRadius: 999,
    marginRight: responsive(10, 13),
  },

  title: {
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: responsive(7, 10),
    fontSize: responsive(13.5, 16),
    lineHeight: responsive(19, 23),
    maxWidth: responsive(330, 560),
  },

  card: {
    borderRadius: responsive(22, 30),
    overflow: "hidden",
    borderWidth: 1,
    elevation: 0,
  },

  cardContent: {
    paddingVertical: responsive(2, 6),
  },

  row: {
    minHeight: responsive(70, 88),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 22),
    paddingVertical: responsive(9, 14),
  },

  iconBox: {
    width: responsive(40, 54),
    height: responsive(40, 54),
    borderRadius: responsive(14, 19),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
  },

  rowText: {
    flex: 1,
    paddingRight: responsive(8, 12),
  },

  rowTitle: {
    fontSize: responsive(15, 18),
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  rowDescription: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(17, 21),
  },

  fingerprint: {
    marginRight: responsive(4, 7),
    opacity: 0.85,
  },

  chevron: {
    opacity: 0.65,
  },

  divider: {
    marginLeft: responsive(66, 92),
    height: 1,
  },

  themeCard: {
    marginTop: responsive(14, 22),
    borderRadius: responsive(22, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  themeRow: {
    minHeight: responsive(70, 88),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 22),
    paddingVertical: responsive(10, 14),
  },
});