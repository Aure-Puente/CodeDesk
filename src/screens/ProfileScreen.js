//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import {
  cancelTaskReminderNotification,
  prepareNotifications,
} from "../services/notifications";

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

//JS:
const NOTIFICATION_HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "15:00",
  "18:00",
  "20:00",
  "21:00",
];

const NOTIFICATIONS_ENABLED_KEY = "codedesk_notifications_enabled";
const NOTIFICATION_TIME_KEY = "codedesk_notification_time";

const getProfileNameKey = (uid) => `codedesk_profile_name_${uid || "local"}`;
const getProfileImageKey = (uid) => `codedesk_profile_image_${uid || "local"}`;

function normalizeTime(value) {
  const clean = String(value || "").trim();

  const onlyNumbersAndColon = clean.replace(/[^\d:]/g, "");

  if (!onlyNumbersAndColon) {
    return "";
  }

  if (onlyNumbersAndColon.includes(":")) {
    const [rawHour = "", rawMinute = ""] = onlyNumbersAndColon.split(":");

    const hour = rawHour.slice(0, 2);
    const minute = rawMinute.slice(0, 2);

    return `${hour}${rawMinute.length > 0 ? `:${minute}` : ""}`;
  }

  const numbers = onlyNumbersAndColon.slice(0, 4);

  if (numbers.length <= 2) {
    return numbers;
  }

  return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
}

function isValidTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  return match;
}

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
      : chipColor === theme.colors.warning
      ? theme.colors.warningSoft || theme.colors.primarySoft
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

function SwitchRow({
  theme,
  icon,
  title,
  description,
  value,
  onValueChange,
  showDivider,
}) {
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
            name={icon}
            size={responsive(21, 27)}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
            {title}
          </Text>

          <Text
            style={[styles.rowDescription, { color: theme.colors.secondary }]}
          >
            {description}
          </Text>
        </View>

        <Switch value={value} onValueChange={onValueChange} />
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

function TimeOption({ theme, time, selected, disabled, onPress }) {
  return (
    <TouchableRipple
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      borderless
      rippleColor={theme.colors.primarySoft || theme.colors.primary + "22"}
      style={[
        styles.timeOption,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.primarySoft,
          borderColor: selected
            ? theme.colors.primary
            : theme.colors.borderSoft,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.timeOptionText,
          {
            color: selected ? "#FFFFFF" : theme.colors.primary,
          },
        ]}
      >
        {time}
      </Text>
    </TouchableRipple>
  );
}

export default function ProfileScreen({ theme, isDarkMode, setIsDarkMode }) {
  const { user } = useAuth();

  const email = user?.email || "Sin email";
  const initial = email.charAt(0).toUpperCase();

  const profileNameKey = useMemo(() => {
    return getProfileNameKey(user?.uid);
  }, [user?.uid]);

  const profileImageKey = useMemo(() => {
    return getProfileImageKey(user?.uid);
  }, [user?.uid]);

  const [profileName, setProfileName] = useState("Ajustes de CodeDesk");
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [editingName, setEditingName] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState("10:00");
  const [notificationTimeInput, setNotificationTimeInput] = useState("10:00");

  const selectedHourLabel = notificationsEnabled
    ? `Todos los días a las ${notificationTime}`
    : "Desactivadas";

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedEnabled = await AsyncStorage.getItem(
          NOTIFICATIONS_ENABLED_KEY
        );

        const storedTime = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);

        const storedProfileName = await AsyncStorage.getItem(profileNameKey);
        const storedProfileImage = await AsyncStorage.getItem(profileImageKey);

        if (storedEnabled !== null) {
          setNotificationsEnabled(storedEnabled === "true");
        }

        if (storedTime && isValidTime(storedTime)) {
          setNotificationTime(storedTime);
          setNotificationTimeInput(storedTime);
        }

        if (storedProfileName?.trim()) {
          setProfileName(storedProfileName);
        }

        if (storedProfileImage) {
          setProfileImageUri(storedProfileImage);
        }
      } catch (error) {
        console.log("Error cargando configuración:", error);
      }
    }

    loadSettings();
  }, [profileNameKey, profileImageKey]);

  async function handleSaveProfileName() {
    try {
      const cleanName = profileName.trim();

      if (!cleanName) {
        setProfileName("Ajustes de CodeDesk");
        await AsyncStorage.setItem(profileNameKey, "Ajustes de CodeDesk");
      } else {
        await AsyncStorage.setItem(profileNameKey, cleanName);
      }

      setEditingName(false);
    } catch (error) {
      console.log("Error guardando nombre:", error);
      Alert.alert("Error", "No se pudo guardar el nombre.");
    }
  }

  async function handlePickProfileImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso necesario",
          "Necesitamos acceso a tus fotos para elegir una imagen de perfil."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const uri = result.assets?.[0]?.uri;

      if (!uri) {
        return;
      }

      setProfileImageUri(uri);
      await AsyncStorage.setItem(profileImageKey, uri);
    } catch (error) {
      console.log("Error seleccionando imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  }

  async function handleRemoveProfileImage() {
    try {
      setProfileImageUri(null);
      await AsyncStorage.removeItem(profileImageKey);
    } catch (error) {
      console.log("Error eliminando imagen:", error);
    }
  }

  async function handleNotificationsEnabledChange(value) {
    try {
      if (value) {
        const hasPermission = await prepareNotifications();

        if (!hasPermission) {
          Alert.alert(
            "Permiso de notificaciones",
            "Para recibir recordatorios, activá las notificaciones de CodeDesk desde los ajustes del dispositivo."
          );

          setNotificationsEnabled(false);
          await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
          await cancelTaskReminderNotification();
          return;
        }
      } else {
        await cancelTaskReminderNotification();
      }

      setNotificationsEnabled(value);
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(value));
    } catch (error) {
      console.log("Error guardando notificaciones:", error);
      Alert.alert("Error", "No se pudo actualizar la configuración.");
    }
  }

  async function saveNotificationTime(value) {
    try {
      const normalized = normalizeTime(value);

      if (!isValidTime(normalized)) {
        Alert.alert(
          "Hora inválida",
          "Escribí la hora con formato HH:mm. Por ejemplo: 09:30 o 18:00."
        );

        setNotificationTimeInput(notificationTime);
        return;
      }

      setNotificationTime(normalized);
      setNotificationTimeInput(normalized);
      await AsyncStorage.setItem(NOTIFICATION_TIME_KEY, normalized);
    } catch (error) {
      console.log("Error guardando hora:", error);
      Alert.alert("Error", "No se pudo guardar la hora de aviso.");
    }
  }

  function handleTimeInputChange(value) {
    const normalized = normalizeTime(value);
    setNotificationTimeInput(normalized);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
            Configuración
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Ajustá el tema de la app, las notificaciones y las preferencias
          generales de CodeDesk.
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
            <TouchableRipple
              borderless
              onPress={handlePickProfileImage}
              rippleColor={theme.colors.primarySoft}
              style={[
                styles.configAvatar,
                {
                  backgroundColor: profileImageUri
                    ? theme.colors.surfaceSoft
                    : theme.colors.primary,
                  borderColor: profileImageUri
                    ? theme.colors.borderSoft
                    : theme.colors.primary,
                },
              ]}
            >
              <>
                {profileImageUri ? (
                  <Image
                    source={{ uri: profileImageUri }}
                    style={styles.profileImage}
                  />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={responsive(30, 40)}
                      color="#FFFFFF"
                    />

                    <Text style={styles.configInitial}>{initial}</Text>
                  </>
                )}

                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="camera-outline"
                    size={responsive(13, 16)}
                    color="#FFFFFF"
                  />
                </View>
              </>
            </TouchableRipple>

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
            {editingName ? (
              <View style={styles.nameEditWrap}>
                <TextInput
                  value={profileName}
                  onChangeText={setProfileName}
                  mode="outlined"
                  dense
                  placeholder="Escribí tu nombre"
                  style={styles.nameInput}
                  outlineStyle={styles.nameInputOutline}
                  contentStyle={styles.nameInputContent}
                  autoFocus
                  onSubmitEditing={handleSaveProfileName}
                  returnKeyType="done"
                />

                <IconButton
                  icon="check"
                  size={responsive(19, 24)}
                  mode="contained-tonal"
                  iconColor={theme.colors.success}
                  containerColor={theme.colors.successSoft}
                  style={styles.nameActionButton}
                  onPress={handleSaveProfileName}
                />
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {profileName}
                </Text>

                <IconButton
                  icon="pencil-outline"
                  size={responsive(18, 23)}
                  mode="contained-tonal"
                  iconColor={theme.colors.primary}
                  containerColor={theme.colors.primarySoft}
                  style={styles.editNameButton}
                  onPress={() => setEditingName(true)}
                />
              </View>
            )}

            <Text
              style={[styles.email, { color: theme.colors.secondary }]}
              numberOfLines={1}
            >
              {email}
            </Text>

            <View style={styles.profileBadgesRow}>
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

                <Text
                  style={[styles.badgeText, { color: theme.colors.success }]}
                >
                  Sesión activa
                </Text>
              </View>

              {profileImageUri && (
                <TouchableRipple
                  borderless
                  onPress={handleRemoveProfileImage}
                  rippleColor={theme.colors.dangerSoft}
                  style={[
                    styles.removeImageButton,
                    {
                      backgroundColor: theme.colors.dangerSoft,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="image-remove-outline"
                    size={responsive(17, 21)}
                    color={theme.colors.danger}
                  />
                </TouchableRipple>
              )}
            </View>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        Apariencia
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
            icon="theme-light-dark"
            title="Modo oscuro"
            description={isDarkMode ? "Activado" : "Desactivado"}
            value={isDarkMode}
            onValueChange={setIsDarkMode}
          />
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        Notificaciones
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
            icon="bell-outline"
            title="Recordatorio diario"
            description={selectedHourLabel}
            value={notificationsEnabled}
            onValueChange={handleNotificationsEnabledChange}
            showDivider
          />

          <View style={styles.timeSection}>
            <View style={styles.timeHeader}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: theme.colors.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={responsive(21, 27)}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>
                  Hora de aviso
                </Text>

                <Text
                  style={[
                    styles.rowDescription,
                    { color: theme.colors.secondary },
                  ]}
                >
                  Escribí una hora o elegí una sugerida. Usá formato HH:mm.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.timeInputCard,
                {
                  backgroundColor: notificationsEnabled
                    ? theme.colors.surfaceSoft || theme.colors.surface
                    : theme.colors.background,
                  borderColor: theme.colors.borderSoft,
                  opacity: notificationsEnabled ? 1 : 0.45,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-edit-outline"
                size={responsive(20, 25)}
                color={theme.colors.primary}
                style={styles.timeInputIcon}
              />

              <TextInput
                value={notificationTimeInput}
                onChangeText={handleTimeInputChange}
                onBlur={() => saveNotificationTime(notificationTimeInput)}
                onSubmitEditing={() => saveNotificationTime(notificationTimeInput)}
                editable={notificationsEnabled}
                keyboardType="number-pad"
                mode="flat"
                dense
                placeholder="10:00"
                style={styles.timeInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor={theme.colors.text}
                returnKeyType="done"
                maxLength={5}
              />

              <Button
                mode="contained"
                compact
                disabled={!notificationsEnabled}
                style={styles.timeSaveButton}
                labelStyle={styles.timeSaveButtonLabel}
                contentStyle={styles.timeSaveButtonContent}
                onPress={() => saveNotificationTime(notificationTimeInput)}
              >
                Guardar
              </Button>
            </View>

            <View style={styles.timeOptions}>
              {NOTIFICATION_HOURS.map((time) => (
                <TimeOption
                  key={time}
                  theme={theme}
                  time={time}
                  selected={notificationTime === time}
                  disabled={!notificationsEnabled}
                  onPress={() => saveNotificationTime(time)}
                />
              ))}
            </View>

            <Text
              style={[
                styles.notificationHint,
                {
                  color: theme.colors.secondary,
                  opacity: notificationsEnabled ? 1 : 0.55,
                },
              ]}
            >
              La notificación usará la primera tarea pendiente de tu lista.
            </Text>
          </View>
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
          />
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

  configAvatar: {
    width: responsive(68, 88),
    height: responsive(68, 88),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  configInitial: {
    position: "absolute",
    right: responsive(13, 17),
    bottom: responsive(10, 13),
    color: "#FFFFFF",
    fontSize: responsive(11, 14),
    fontWeight: "900",
    opacity: 0.95,
  },

  cameraBadge: {
    position: "absolute",
    right: responsive(0, 2),
    bottom: responsive(0, 2),
    width: responsive(24, 30),
    height: responsive(24, 30),
    borderRadius: 999,
    borderWidth: responsive(2, 3),
    alignItems: "center",
    justifyContent: "center",
  },

  statusDot: {
    position: "absolute",
    right: responsive(1, 2),
    top: responsive(2, 3),
    width: responsive(15, 19),
    height: responsive(15, 19),
    borderRadius: 999,
    borderWidth: responsive(3, 4),
  },

  profileInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    flex: 1,
    fontSize: responsive(19, 25),
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  editNameButton: {
    margin: 0,
    marginLeft: responsive(5, 8),
  },

  nameEditWrap: {
    flexDirection: "row",
    alignItems: "center",
  },

  nameInput: {
    flex: 1,
    backgroundColor: "transparent",
  },

  nameInputOutline: {
    borderRadius: responsive(14, 18),
  },

  nameInputContent: {
    fontSize: responsive(14, 17),
    fontWeight: "800",
  },

  nameActionButton: {
    margin: 0,
    marginLeft: responsive(6, 9),
  },

  email: {
    marginTop: responsive(3, 5),
    fontSize: responsive(13, 16),
    lineHeight: responsive(18, 23),
  },

  profileBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: responsive(10, 14),
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: responsive(10, 14),
    paddingVertical: responsive(5, 7),
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(12, 14),
    fontWeight: "800",
  },

  removeImageButton: {
    width: responsive(32, 40),
    height: responsive(32, 40),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: responsive(8, 11),
    overflow: "hidden",
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

  timeSection: {
    paddingHorizontal: responsive(14, 22),
    paddingTop: responsive(12, 18),
    paddingBottom: responsive(16, 24),
  },

  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(14, 18),
  },

  timeInputCard: {
    minHeight: responsive(56, 68),
    borderRadius: responsive(18, 22),
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: responsive(12, 16),
    paddingRight: responsive(8, 12),
    marginLeft: responsive(52, 70),
    marginBottom: responsive(12, 16),
    overflow: "hidden",
  },

  timeInputIcon: {
    marginRight: responsive(8, 11),
  },

  timeInput: {
    flex: 1,
    backgroundColor: "transparent",
    height: responsive(46, 56),
    fontSize: responsive(15, 18),
    fontWeight: "900",
  },

  timeSaveButton: {
    borderRadius: responsive(14, 17),
    elevation: 0,
  },

  timeSaveButtonContent: {
    height: responsive(36, 44),
    paddingHorizontal: responsive(4, 7),
  },

  timeSaveButtonLabel: {
    fontSize: responsive(12, 14),
    fontWeight: "900",
  },

  timeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(8, 10),
    paddingLeft: responsive(52, 70),
  },

  timeOption: {
    minWidth: responsive(72, 88),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive(12, 15),
    paddingVertical: responsive(9, 11),
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },

  timeOptionText: {
    fontSize: responsive(12.5, 15),
    fontWeight: "900",
  },

  notificationHint: {
    paddingLeft: responsive(52, 70),
    marginTop: responsive(12, 16),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(18, 22),
    fontWeight: "700",
  },
});