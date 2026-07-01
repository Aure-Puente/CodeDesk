//Importaciones:
import React, { useRef, useState } from "react";
import {
  Dimensions,
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

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

//Assets:
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");

//JS:
const LOGO_ZOOM = responsive(2.75, 2.95);
const LOGO_AREA_HEIGHT = responsive(214, 278);
const LOGO_FRAME_WIDTH = responsive(255, 340);
const LOGO_FRAME_HEIGHT = responsive(132, 172);

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

  const screenBackground = theme.colors.background;
  const cardBackground = theme.colors.surface;

  const inputBackground = isDark
    ? theme.colors.background
    : theme.colors.surfaceSoft || theme.colors.surface;

  const borderColor = theme.colors.borderSoft || theme.colors.outline;
  const inputBorderColor = theme.colors.borderSoft || theme.colors.outline;
  const textColor = theme.colors.text;
  const secondaryTextColor = theme.colors.secondary;
  const primaryColor = theme.colors.primary;

  const iconBoxBackground =
    theme.colors.primarySoft || hexToRgba(primaryColor, isDark ? 0.18 : 0.1);

  const cardShadowColor = isDark ? "#000000" : "#0F172A";

  function handleInputFocus() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: responsive(230, 260),
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={[styles.logoArea, { height: LOGO_AREA_HEIGHT }]}>
            <View
              style={[
                styles.logoFrame,
                {
                  width: LOGO_FRAME_WIDTH,
                  height: LOGO_FRAME_HEIGHT,
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

            <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
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
                shadowColor: cardShadowColor,
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
                    size={responsive(22, 29)}
                    color={primaryColor}
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
                contentStyle={styles.inputContent}
                outlineStyle={[
                  styles.inputOutline,
                  {
                    borderColor: inputBorderColor,
                  },
                ]}
                textColor={textColor}
                placeholderTextColor={secondaryTextColor}
                activeOutlineColor={primaryColor}
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
                contentStyle={styles.inputContent}
                outlineStyle={[
                  styles.inputOutline,
                  {
                    borderColor: inputBorderColor,
                  },
                ]}
                textColor={textColor}
                placeholderTextColor={secondaryTextColor}
                activeOutlineColor={primaryColor}
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
                    size={responsive(18, 23)}
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
                buttonColor={primaryColor}
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
    overflow: "hidden",
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: responsive(undefined, 620),
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: responsive(22, 34),
    paddingTop: responsive(18, 34),
    paddingBottom: responsive(34, 54),
  },

  logoArea: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: responsive(22, 30),
  },

  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    marginTop: responsive(16, 20),
  },

  logo: {
    width: responsive(150, 190),
    height: responsive(105, 132),
  },

  subtitle: {
    marginTop: responsive(34, 48),
    maxWidth: responsive(315, 460),
    textAlign: "center",
    fontSize: responsive(13.5, 16),
    lineHeight: responsive(20, 24),
    fontWeight: "700",
  },

  card: {
    borderRadius: responsive(28, 34),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",

    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.1,
    shadowRadius: 28,
  },

  cardContent: {
    padding: responsive(20, 30),
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(18, 26),
  },

  iconBox: {
    width: responsive(44, 58),
    height: responsive(44, 58),
    borderRadius: responsive(16, 20),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
  },

  cardHeaderText: {
    flex: 1,
  },

  title: {
    fontSize: responsive(22, 29),
    lineHeight: responsive(27, 35),
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  cardSubtitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.8, 15.5),
    lineHeight: responsive(18, 22),
    fontWeight: "700",
  },

  input: {
    marginBottom: responsive(12, 16),
  },

  inputContent: {
    fontSize: responsive(14, 16),
  },

  inputOutline: {
    borderRadius: responsive(16, 20),
  },

  errorBox: {
    borderWidth: 1,
    borderRadius: responsive(16, 20),
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(10, 13),
    flexDirection: "row",
    alignItems: "center",
    marginTop: responsive(2, 4),
    marginBottom: responsive(12, 16),
  },

  errorText: {
    flex: 1,
    marginLeft: responsive(8, 11),
    fontSize: responsive(12.8, 15),
    lineHeight: responsive(18, 22),
    fontWeight: "800",
  },

  button: {
    borderRadius: responsive(18, 22),
    elevation: 0,
    marginTop: responsive(4, 8),
  },

  buttonContent: {
    height: responsive(52, 62),
    flexDirection: "row-reverse",
  },

  buttonLabel: {
    fontSize: responsive(14.5, 17),
    fontWeight: "900",
  },

  footerText: {
    marginTop: responsive(18, 26),
    textAlign: "center",
    fontSize: responsive(12, 14),
    fontWeight: "700",
  },
});