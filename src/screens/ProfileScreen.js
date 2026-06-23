import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  List,
  Switch,
  Text,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen({ theme, isDarkMode, setIsDarkMode }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir de CodeDesk?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  const email = user?.email || "Sin email";
  const initial = email.charAt(0).toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={68}
              label={initial}
              style={{ backgroundColor: theme.colors.primary }}
              color="#FFFFFF"
            />

            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: theme.colors.text }]}>
                Usuario CodeDesk
              </Text>

              <Text style={{ color: theme.colors.secondary }}>{email}</Text>

              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.primary + "22" },
                ]}
              >
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={16}
                  color={theme.colors.primary}
                />

                <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                  Sesión activa
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <List.Section>
          <List.Subheader>Configuración</List.Subheader>

          <List.Item
            title="Modo oscuro"
            description={isDarkMode ? "Activado" : "Desactivado"}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
            )}
          />

          <Divider />

          <List.Item
            title="Notificaciones"
            description="Próximamente: tareas, cobros y mantenimientos"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
          />

          <Divider />

          <List.Item
            title="Privacidad"
            description="Cada usuario ve solo sus propios datos"
            left={(props) => <List.Icon {...props} icon="lock-check-outline" />}
          />
        </List.Section>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <List.Section>
          <List.Subheader>CodeDesk</List.Subheader>

          <List.Item
            title="Versión"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="cellphone-cog" />}
          />

          <Divider />

          <List.Item
            title="Datos guardados"
            description="Proyectos, tareas, pagos, credenciales, bases y notas"
            left={(props) => <List.Icon {...props} icon="database-outline" />}
          />
        </List.Section>
      </Card>

      <Button
        mode="outlined"
        icon="logout"
        textColor="#DC2626"
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        Cerrar sesión
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 135,
  },

  profileCard: {
    borderRadius: 26,
    marginBottom: 18,
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  profileInfo: {
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  card: {
    borderRadius: 24,
    marginBottom: 18,
    overflow: "hidden",
  },

  logoutButton: {
    borderRadius: 16,
    borderColor: "#DC2626",
  },
});