//Importaciones:
import React, { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

//JS:
//Assets:
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");
const LOGO_ZOOM = 3;
const LOGO_AREA_HEIGHT = 208;
const LOGO_FRAME_WIDTH = 255;
const LOGO_FRAME_HEIGHT = 125;
const DARK_LOGIN_BACKGROUND = "#0B111E";
const DARK_CARD_BACKGROUND = "#151D2E";
const DARK_INPUT_BACKGROUND = "#080D18";
const DARK_BORDER = "rgba(148, 163, 184, 0.22)";
const DARK_INPUT_BORDER = "rgba(148, 163, 184, 0.18)";
const LIGHT_LOGIN_BACKGROUND = "#F9F9F9";
const LIGHT_CARD_BACKGROUND = "#FFFFFF";
const LIGHT_INPUT_BACKGROUND = "#F3F5F8";
const LIGHT_BORDER = "rgba(15, 23, 42, 0.1)";
const LIGHT_INPUT_BORDER = "rgba(15, 23, 42, 0.12)";

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

export default function LoginScreen({ theme }) {
  const { login } = useAuth();
  const scrollRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securePassword, setSecurePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isDark = !!theme.dark;
  const logoSource = isDark ? logoDark : logoLight;

  const screenBackground = isDark
    ? DARK_LOGIN_BACKGROUND
    : LIGHT_LOGIN_BACKGROUND;

  const cardBackground = isDark
    ? DARK_CARD_BACKGROUND
    : LIGHT_CARD_BACKGROUND;

  const inputBackground = isDark
    ? DARK_INPUT_BACKGROUND
    : LIGHT_INPUT_BACKGROUND;

  const borderColor = isDark ? DARK_BORDER : LIGHT_BORDER;

  const inputBorderColor = isDark ? DARK_INPUT_BORDER : LIGHT_INPUT_BORDER;

  const subtitleColor = isDark ? "#AAB4C8" : "#64748B";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const secondaryTextColor = isDark ? "#A7B0C2" : "#64748B";

  const iconBoxBackground = isDark
    ? "rgba(37, 99, 235, 0.18)"
    : "rgba(37, 99, 235, 0.1)";

  function handleInputFocus() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 230,
        animated: true,
      });
    }, 250);
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Completá email y contraseña.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      await login(email.trim(), password);
    } catch (error) {
      setErrorMessage("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: screenBackground }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: screenBackground },
        ]}
      >
        <View style={[styles.content, { backgroundColor: screenBackground }]}>
          <View style={[styles.logoArea, { height: LOGO_AREA_HEIGHT }]}>
            <View
              style={[
                styles.logoFrame,
                {
                  width: LOGO_FRAME_WIDTH,
                  height: LOGO_FRAME_HEIGHT,
                  backgroundColor: screenBackground,
                },
              ]}
            >
              <Image
                source={logoSource}
                style={[
                  styles.logo,
                  {
                    transform: [{ scale: LOGO_ZOOM }],
                  },
                ]}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.subtitle, { color: subtitleColor }]}>
              Organizá tus proyectos, tareas, pagos y accesos en un solo lugar.
            </Text>
          </View>

          <Card
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: cardBackground,
                borderColor,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: iconBoxBackground,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="login-variant"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={styles.cardHeaderText}>
                  <Text style={[styles.title, { color: textColor }]}>
                    Iniciar sesión
                  </Text>

                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: secondaryTextColor },
                    ]}
                  >
                    Accedé a tu espacio de trabajo.
                  </Text>
                </View>
              </View>

              <TextInput
                label="Email"
                value={email}
                onFocus={handleInputFocus}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errorMessage) setErrorMessage("");
                }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: inputBackground }]}
                outlineStyle={[
                  styles.inputOutline,
                  {
                    borderColor: inputBorderColor,
                  },
                ]}
                textColor={textColor}
                placeholderTextColor={secondaryTextColor}
                activeOutlineColor={theme.colors.primary}
                outlineColor={inputBorderColor}
                left={
                  <TextInput.Icon
                    icon="email-outline"
                    color={secondaryTextColor}
                  />
                }
              />

              <TextInput
                label="Contraseña"
                value={password}
                onFocus={handleInputFocus}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) setErrorMessage("");
                }}
                mode="outlined"
                secureTextEntry={securePassword}
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: inputBackground }]}
                outlineStyle={[
                  styles.inputOutline,
                  {
                    borderColor: inputBorderColor,
                  },
                ]}
                textColor={textColor}
                placeholderTextColor={secondaryTextColor}
                activeOutlineColor={theme.colors.primary}
                outlineColor={inputBorderColor}
                left={
                  <TextInput.Icon
                    icon="lock-outline"
                    color={secondaryTextColor}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={securePassword ? "eye-outline" : "eye-off-outline"}
                    color={secondaryTextColor}
                    onPress={() => setSecurePassword(!securePassword)}
                  />
                }
              />

              {!!errorMessage && (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: hexToRgba(
                        theme.colors.danger,
                        isDark ? 0.34 : 0.18
                      ),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={18}
                    color={theme.colors.danger}
                  />

                  <Text
                    style={[styles.errorText, { color: theme.colors.danger }]}
                  >
                    {errorMessage}
                  </Text>
                </View>
              )}

              <Button
                mode="contained"
                icon="arrow-right"
                loading={loading}
                disabled={loading}
                onPress={handleLogin}
                buttonColor={theme.colors.primary}
                textColor="#FFFFFF"
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Entrar
              </Button>
            </View>
          </Card>

          <Text style={[styles.footerText, { color: secondaryTextColor }]}>
            CodeDesk · Panel personal para programadores
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 34,
  },

  logoArea: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 22,
  },

  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    marginTop: 16,
  },

  logo: {
    width: 150,
    height: 105,
  },

  subtitle: {
    marginTop: 40,
    maxWidth: 315,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "700",
  },

  card: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },

  cardContent: {
    padding: 20,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardHeaderText: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  cardSubtitle: {
    marginTop: 2,
    fontSize: 12.8,
    lineHeight: 18,
    fontWeight: "700",
  },

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
  },

  errorBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12.8,
    lineHeight: 18,
    fontWeight: "800",
  },

  button: {
    borderRadius: 18,
    elevation: 0,
    marginTop: 4,
  },

  buttonContent: {
    height: 52,
    flexDirection: "row-reverse",
  },

  buttonLabel: {
    fontSize: 14.5,
    fontWeight: "900",
  },

  footerText: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
});