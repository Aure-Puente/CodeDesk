import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ theme }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securePassword, setSecurePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Completá email y contraseña.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      await login(email, password);
    } catch (error) {
      setErrorMessage("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={[styles.appName, { color: theme.colors.primary }]}>
          CodeDesk
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Organizá tus proyectos, tareas y pagos.
        </Text>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Iniciar sesión
            </Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={securePassword}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={securePassword ? "eye-outline" : "eye-off-outline"}
                  onPress={() => setSecurePassword(!securePassword)}
                />
              }
            />

            <HelperText type="error" visible={!!errorMessage}>
              {errorMessage}
            </HelperText>

            <Button
              mode="contained"
              loading={loading}
              disabled={loading}
              onPress={handleLogin}
              style={styles.button}
            >
              Entrar
            </Button>
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  appName: {
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    borderRadius: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
  },
});