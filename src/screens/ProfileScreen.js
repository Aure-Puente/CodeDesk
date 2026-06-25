//Importaciones:
import React, { useState } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Switch,
  Text,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

//JS:
function InfoRow({
  theme,
  icon,
  title,
  description,
  chipLabel,
  chipColor,
  showDivider,
}) {
  const softColor =
    chipColor === theme.colors.danger
      ? theme.colors.dangerSoft
      : chipColor === theme.colors.success
      ? theme.colors.successSoft
      : theme.colors.primarySoft;

  return (
    <>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: softColor }]}>
          <MaterialCommunityIcons
            name={icon}
            size={responsive(21, 27)}
            color={chipColor}
          />
        </View>

        <View style={styles.rowText}>
          <Text
            style={[styles.rowTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={[styles.rowDescription, { color: theme.colors.secondary }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>

        {!!chipLabel && (
          <View
            style={[
              styles.infoChip,
              {
                backgroundColor: softColor,
                borderColor:
                  chipColor === theme.colors.secondary
                    ? theme.colors.borderSoft
                    : softColor,
              },
            ]}
          >
            <Text style={[styles.infoChipText, { color: chipColor }]}>
              {chipLabel}
            </Text>
          </View>
        )}
      </View>

      {showDivider && (
        <Divider
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.borderSoft,
            },
          ]}
        />
      )}
    </>
  );
}

function SwitchRow({ theme, isDarkMode, setIsDarkMode, showDivider }) {
  return (
    <>
      <View style={styles.row}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: theme.colors.primarySoft },
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

      {showDivider && (
        <Divider
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.borderSoft,
            },
          ]}
        />
      )}
    </>
  );
}

export default function ProfileScreen({ theme, isDarkMode, setIsDarkMode }) {
  const { user, logout } = useAuth();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const email = user?.email || "Sin email";
  const initial = email.charAt(0).toUpperCase();

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
            Perfil
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Tu cuenta, preferencias y datos generales de la app.
        </Text>
      </View>

      <Card
        mode="contained"
        style={[
          styles.profileCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.profileContent}>
          <View style={styles.avatarWrap}>
            <Avatar.Text
              size={responsive(62, 82)}
              label={initial}
              style={{ backgroundColor: theme.colors.primary }}
              color="#FFFFFF"
              labelStyle={styles.avatarLabel}
            />

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: theme.colors.success,
                  borderColor: theme.colors.surface,
                },
              ]}
            />
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              Usuario CodeDesk
            </Text>

            <Text
              style={[styles.email, { color: theme.colors.secondary }]}
              numberOfLines={1}
            >
              {email}
            </Text>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.successSoft,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={responsive(15, 19)}
                color={theme.colors.success}
              />

              <Text style={[styles.badgeText, { color: theme.colors.success }]}>
                Sesión activa
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        Preferencias
      </Text>

      <Card
        mode="contained"
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.cardContent}>
          <SwitchRow
            theme={theme}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            showDivider
          />

          <InfoRow
            theme={theme}
            icon="bell-outline"
            title="Notificaciones"
            description="Recordatorios para tareas, cobros y mantenimientos"
            chipLabel="Próx."
            chipColor={theme.colors.warning}
            showDivider
          />

          <InfoRow
            theme={theme}
            icon="lock-check-outline"
            title="Privacidad"
            description="Cada usuario ve únicamente sus propios datos"
            chipLabel="Info"
            chipColor={theme.colors.secondary}
          />
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        Información
      </Text>

      <Card
        mode="contained"
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.cardContent}>
          <InfoRow
            theme={theme}
            icon="cellphone-cog"
            title="Versión"
            description="CodeDesk 1.0.0"
            chipLabel="App"
            chipColor={theme.colors.primary}
            showDivider
          />

          <InfoRow
            theme={theme}
            icon="database-outline"
            title="Datos guardados"
            description="Proyectos, tareas, pagos, credenciales, bases y notas"
            chipLabel="Info"
            chipColor={theme.colors.secondary}
          />
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
                borderColor: theme.colors.borderSoft,
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

              <Text style={[styles.logoutModalTitle, { color: theme.colors.text }]}>
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

  profileCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(20, 28),
  },

  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: responsive(16, 24),
  },

  avatarWrap: {
    position: "relative",
    marginRight: responsive(14, 20),
  },

  avatarLabel: {
    fontSize: responsive(24, 32),
    fontWeight: "900",
  },

  statusDot: {
    position: "absolute",
    right: responsive(1, 2),
    bottom: responsive(2, 3),
    width: responsive(15, 19),
    height: responsive(15, 19),
    borderRadius: 999,
    borderWidth: responsive(3, 4),
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: responsive(19, 25),
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  email: {
    marginTop: responsive(3, 5),
    fontSize: responsive(13, 16),
    lineHeight: responsive(18, 23),
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: responsive(10, 14),
    paddingVertical: responsive(5, 7),
    borderRadius: 999,
    borderWidth: 1,
    marginTop: responsive(10, 14),
  },

  badgeText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(12, 14),
    fontWeight: "800",
  },

  sectionTitle: {
    marginBottom: responsive(8, 11),
    marginLeft: responsive(2, 4),
    fontSize: responsive(12, 14),
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  card: {
    borderRadius: responsive(22, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(18, 26),
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

  divider: {
    marginLeft: responsive(66, 92),
    height: 1,
  },

  infoChip: {
    minWidth: responsive(45, 58),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive(9, 12),
    paddingVertical: responsive(5, 7),
    borderRadius: 999,
    borderWidth: 1,
  },

  infoChipText: {
    fontSize: responsive(11, 13),
    fontWeight: "900",
  },

  logoutButton: {
    marginTop: responsive(2, 6),
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