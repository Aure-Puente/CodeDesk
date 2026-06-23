import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Card, List, Switch, Text } from "react-native-paper";

export default function MoreScreen({
  theme,
  navigation,
  isDarkMode,
  setIsDarkMode,
}) {
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.text }]}
      >
        Más
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Accesos secundarios de CodeDesk.
      </Text>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title="Credenciales"
          description="Accesos de Firebase, GitHub, Vercel y más"
          left={(props) => <List.Icon {...props} icon="lock-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("Credenciales")}
        />

        <List.Item
          title="Base de datos"
          description="Firebase, colecciones y reglas importantes"
          left={(props) => <List.Icon {...props} icon="database-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("BaseDeDatos")}
        />

        <List.Item
          title="Notas"
          description="Ideas, bugs, comandos y pendientes rápidos"
          left={(props) => <List.Icon {...props} icon="note-text-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("Notas")}
        />

        <List.Item
          title="Estadísticas"
          description="Productividad, proyectos y cobros"
          left={(props) => <List.Icon {...props} icon="chart-line" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("Estadisticas")}
        />

        <List.Item
          title="Perfil"
          description="Cuenta, configuración y sesión"
          left={(props) => <List.Icon {...props} icon="account-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("Perfil")}
        />

        <List.Item
          title="Modo oscuro"
          description={isDarkMode ? "Activado" : "Desactivado"}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
          )}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
  },
});