//Importaciones:
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
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
import * as LocalAuthentication from "expo-local-authentication";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase/firebaseConfig";

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

function SwitchRow({ theme, icon, title, description, value, onValueChange }) {
  return (
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
  );
}

export default function MoreScreen({
  theme,
  navigation,
  isDarkMode,
  setIsDarkMode,
}) {
  const { user, logout } = useAuth();

  const email = user?.email || "Sin email";

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [profileName, setProfileName] = useState("Ajustes de CodeDesk");
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const initial = profileName?.trim()
    ? profileName.trim().charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase();

  useEffect(() => {
    async function loadUserProfile() {
      try {
        if (!user?.uid) {
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();

          const backendName =
            data.name ||
            data.nombreCompleto ||
            user.displayName ||
            "Ajustes de CodeDesk";

          const backendImage = data.profileImageUrl || null;

          setProfileName(backendName);
          setProfileImageUri(backendImage);
          return;
        }

        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email || null,
            name: "Ajustes de CodeDesk",
            nombreCompleto: "Ajustes de CodeDesk",
            profileImageUrl: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setProfileName("Ajustes de CodeDesk");
        setProfileImageUri(null);
      } catch (error) {
        console.log("Error cargando perfil:", error);
        Alert.alert("Error", "No se pudo cargar tu perfil.");
      }
    }

    loadUserProfile();
  }, [user?.uid, user?.email, user?.displayName]);

  async function handleSaveProfileName() {
    try {
      if (!user?.uid) {
        Alert.alert("Error", "No se pudo identificar el usuario.");
        return;
      }

      const cleanName = profileName.trim() || "Ajustes de CodeDesk";

      setSavingProfile(true);

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email || null,
          name: cleanName,
          nombreCompleto: cleanName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfileName(cleanName);
      setEditingName(false);
    } catch (error) {
      console.log("Error guardando nombre:", error);
      Alert.alert("Error", "No se pudo guardar el nombre.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadImageToStorage(uri) {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileName = `profile-${Date.now()}.jpg`;

    const imageRef = ref(storage, `users/${user.uid}/profile/${fileName}`);

    await uploadBytes(imageRef, blob);

    const downloadUrl = await getDownloadURL(imageRef);

    return downloadUrl;
  }

  async function handlePickProfileImage() {
    try {
      if (!user?.uid) {
        Alert.alert("Error", "No se pudo identificar el usuario.");
        return;
      }

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

      setSavingProfile(true);

      const downloadUrl = await uploadImageToStorage(uri);

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email || null,
          profileImageUrl: downloadUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfileImageUri(downloadUrl);
    } catch (error) {
      console.log("Error seleccionando imagen:", error);
      Alert.alert("Error", "No se pudo guardar la imagen.");
    } finally {
      setSavingProfile(false);
    }
  }

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
            Más
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Tu perfil, accesos secundarios y preferencias principales de CodeDesk.
        </Text>
      </View>

      <Card
        mode="contained"
        style={[
          styles.profileCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft || theme.colors.outline,
          },
        ]}
      >
        <View style={styles.profileContent}>
          <View style={styles.avatarWrap}>
            <TouchableRipple
              borderless
              onPress={savingProfile ? undefined : handlePickProfileImage}
              disabled={savingProfile}
              rippleColor={theme.colors.primarySoft || theme.colors.primary + "22"}
              style={[
                styles.configAvatar,
                {
                  backgroundColor: profileImageUri
                    ? theme.colors.surfaceSoft || theme.colors.surface
                    : theme.colors.primary,
                  borderColor: profileImageUri
                    ? theme.colors.borderSoft || theme.colors.outline
                    : theme.colors.primary,
                  opacity: savingProfile ? 0.65 : 1,
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
                  disabled={savingProfile}
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
                  disabled={savingProfile}
                  onPress={handleSaveProfileName}
                />

                <IconButton
                  icon="close"
                  size={responsive(18, 23)}
                  mode="contained-tonal"
                  iconColor={theme.colors.secondary}
                  containerColor={theme.colors.surfaceSoft}
                  style={styles.nameActionButton}
                  disabled={savingProfile}
                  onPress={() => setEditingName(false)}
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
                  disabled={savingProfile}
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
                  {savingProfile ? "Guardando..." : "Sesión activa"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        Accesos
      </Text>

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

      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        Apariencia
      </Text>

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
    overflow: "hidden",
    borderWidth: 1,
    elevation: 0,
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
    marginTop: responsive(0, 0),
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