//Importaciones:
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Divider, Text, TouchableRipple } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../context/AuthContext";

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
    title: "Configuración",
    description: "Tema, notificaciones, horario y preferencias generales",
    icon: "cog-outline",
    route: "Configuracion",
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
              name="shield-lock-outline"
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

export default function MoreScreen({ theme, navigation }) {
  const { logout } = useAuth();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  async function requestLocalAccess(item) {
    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      const hasAnyDeviceSecurity =
        securityLevel === LocalAuthentication.SecurityLevel.SECRET ||
        securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK ||
        securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;

      if (!hasAnyDeviceSecurity) {
        Alert.alert(
          "Seguridad no configurada",
          "Para acceder a esta sección, primero configurá un PIN, patrón, contraseña, huella o rostro en tu dispositivo."
        );
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Acceder a ${item.title}`,
        promptSubtitle: "Usá huella, rostro, PIN, patrón o contraseña",
        promptDescription:
          "Esta sección contiene información sensible de tus proyectos.",
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar PIN",
        disableDeviceFallback: false,
        requireConfirmation: true,
      });

      if (result.success) {
        return true;
      }

      if (result.error === "user_cancel" || result.error === "system_cancel") {
        return false;
      }

      if (result.error === "passcode_not_set") {
        Alert.alert(
          "PIN no configurado",
          "Configurá un PIN, patrón o contraseña en tu dispositivo para poder acceder."
        );
        return false;
      }

      if (result.error === "not_enrolled") {
        Alert.alert(
          "Seguridad no configurada",
          "Configurá un PIN, patrón, contraseña, huella o rostro en tu dispositivo para poder acceder."
        );
        return false;
      }

      if (result.error === "lockout") {
        Alert.alert(
          "Acceso bloqueado temporalmente",
          "Intentaste autenticarte varias veces. Probá nuevamente usando el bloqueo del dispositivo."
        );
        return false;
      }

      Alert.alert(
        "No se pudo verificar",
        "No pudimos validar tu identidad. Intentá nuevamente."
      );

      return false;
    } catch (error) {
      Alert.alert(
        "Error de autenticación",
        "Ocurrió un problema al intentar verificar tu identidad."
      );

      return false;
    }
  }

  async function handleNavigate(item) {
    if (!item.protected) {
      navigation.navigate(item.route);
      return;
    }

    const canAccess = await requestLocalAccess(item);

    if (canAccess) {
      navigation.navigate(item.route);
    }
  }

  async function handleLogout() {
    await logout();
    setLogoutModalVisible(false);
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

      <Button
        mode="contained-tonal"
        icon="logout"
        textColor={theme.colors.danger}
        buttonColor={theme.colors.dangerSoft}
        style={styles.logoutButton}
        contentStyle={styles.logoutButtonContent}
        labelStyle={styles.logoutButtonLabel}
        onPress={() => setLogoutModalVisible(true)}
      >
        Cerrar sesión
      </Button>

      <Modal visible={logoutModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <Card
            mode="contained"
            style={[
              styles.logoutModal,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft || theme.colors.outline,
              },
            ]}
          >
            <View style={styles.logoutModalContent}>
              <View
                style={[
                  styles.logoutIconBox,
                  { backgroundColor: theme.colors.dangerSoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={responsive(28, 36)}
                  color={theme.colors.danger}
                />
              </View>

              <Text
                style={[styles.logoutModalTitle, { color: theme.colors.text }]}
              >
                Cerrar sesión
              </Text>

              <Text
                style={[
                  styles.logoutModalText,
                  { color: theme.colors.secondary },
                ]}
              >
                ¿Seguro que querés salir de CodeDesk?
              </Text>

              <View style={styles.logoutActions}>
                <Button
                  mode="contained-tonal"
                  style={styles.cancelButton}
                  contentStyle={styles.modalButtonContent}
                  labelStyle={styles.modalButtonLabel}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  Cancelar
                </Button>

                <Button
                  mode="contained"
                  icon="logout"
                  buttonColor={theme.colors.danger}
                  textColor="#FFFFFF"
                  style={styles.confirmButton}
                  contentStyle={styles.modalButtonContent}
                  labelStyle={styles.modalButtonLabel}
                  onPress={handleLogout}
                >
                  Salir
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </Modal>
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
    paddingBottom: responsive(135, 170),
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

  logoutButton: {
    marginTop: responsive(16, 24),
    borderRadius: responsive(18, 22),
    elevation: 0,
  },

  logoutButtonContent: {
    height: responsive(50, 60),
  },

  logoutButtonLabel: {
    fontSize: responsive(14, 16),
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: responsive(22, 34),
  },

  logoutModal: {
    width: "100%",
    maxWidth: responsive(undefined, 560),
    alignSelf: "center",
    borderRadius: responsive(28, 34),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  logoutModalContent: {
    padding: responsive(22, 32),
    alignItems: "center",
  },

  logoutIconBox: {
    width: responsive(58, 74),
    height: responsive(58, 74),
    borderRadius: responsive(20, 25),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(16, 22),
  },

  logoutModalTitle: {
    fontSize: responsive(21, 27),
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },

  logoutModalText: {
    marginTop: responsive(8, 12),
    fontSize: responsive(13.5, 16),
    lineHeight: responsive(20, 24),
    textAlign: "center",
  },

  logoutActions: {
    width: "100%",
    flexDirection: "row",
    gap: responsive(10, 14),
    marginTop: responsive(20, 28),
  },

  cancelButton: {
    flex: 1,
    borderRadius: responsive(16, 20),
    elevation: 0,
  },

  confirmButton: {
    flex: 1,
    borderRadius: responsive(16, 20),
    elevation: 0,
  },

  modalButtonContent: {
    height: responsive(48, 58),
  },

  modalButtonLabel: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },
});