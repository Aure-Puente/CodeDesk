//Importaciones:
import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
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
          <MaterialCommunityIcons name={icon} size={21} color={chipColor} />
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
            size={21}
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
            variant="headlineSmall"
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
              size={62}
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
                size={15}
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
                  size={28}
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
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 135,
  },

  header: {
    marginBottom: 18,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionMarker: {
    width: 5,
    height: 28,
    borderRadius: 999,
    marginRight: 10,
  },

  title: {
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: 330,
  },

  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 20,
  },

  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  avatarWrap: {
    position: "relative",
    marginRight: 14,
  },

  avatarLabel: {
    fontSize: 24,
    fontWeight: "900",
  },

  statusDot: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 15,
    height: 15,
    borderRadius: 999,
    borderWidth: 3,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  email: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
  },

  badgeText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "800",
  },

  sectionTitle: {
    marginBottom: 8,
    marginLeft: 2,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  card: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 18,
  },

  cardContent: {
    paddingVertical: 2,
  },

  row: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rowText: {
    flex: 1,
    paddingRight: 8,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  rowDescription: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
  },

  divider: {
    marginLeft: 66,
    height: 1,
  },

  infoChip: {
    minWidth: 45,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },

  infoChipText: {
    fontSize: 11,
    fontWeight: "900",
  },

  logoutButton: {
    marginTop: 2,
    borderRadius: 18,
    elevation: 0,
  },

  logoutButtonContent: {
    height: 50,
  },

  logoutButtonLabel: {
    fontSize: 14,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  logoutModal: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  logoutModalContent: {
    padding: 22,
    alignItems: "center",
  },

  logoutIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  logoutModalTitle: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },

  logoutModalText: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },

  logoutActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },

  confirmButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },

  modalButtonContent: {
    height: 48,
  },

  modalButtonLabel: {
    fontSize: 13.5,
    fontWeight: "900",
  },
});