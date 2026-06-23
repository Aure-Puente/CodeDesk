//Importaciones:
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

//JS:
const COLORS = [
  "#136F63",
  "#2B1B17",
  "#12824C",
  "#3E6B1F",
  "#A50454",
  "#D16B18",
  "#2E1941",
  "#16A34A",
  "#2563EB",
  "#0F766E",
  "#7C3AED",
  "#DC2626",
  "#0891B2",
  "#CA8A04",
  "#DB2777",
  "#475569",
  "#1E3A8A",
  "#6D28D9",
  "#9F1239",
  "#92400E",
];

const STATUS_OPTIONS = ["activo", "pausado", "finalizado"];

const PROJECT_TYPES = [
  { value: "mobile", label: "Mobile", icon: "cellphone" },
  { value: "web", label: "Web", icon: "monitor-dashboard" },
  { value: "both", label: "Web + Mobile", icon: "devices" },
];

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

function getStatusLabel(value) {
  if (value === "activo") return "Activo";
  if (value === "pausado") return "Pausado";
  if (value === "finalizado") return "Finalizado";
  return "Activo";
}

function getStatusIcon(value) {
  if (value === "activo") return "rocket-launch-outline";
  if (value === "pausado") return "pause-circle-outline";
  if (value === "finalizado") return "check-circle-outline";
  return "rocket-launch-outline";
}

function getStatusColor(theme, value) {
  if (value === "pausado") return theme.colors.warning;
  if (value === "finalizado") return theme.colors.success;
  return theme.colors.info;
}

function getStatusSoft(theme, value) {
  if (value === "pausado") return theme.colors.warningSoft;
  if (value === "finalizado") return theme.colors.successSoft;
  return theme.colors.infoSoft;
}

function getProjectType(value) {
  return PROJECT_TYPES.find((type) => type.value === value) || PROJECT_TYPES[1];
}

function getStatusOrder(status) {
  if (status === "activo") return 1;
  if (status === "pausado") return 2;
  if (status === "finalizado") return 3;
  return 1;
}

export default function ProjectsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [status, setStatus] = useState("activo");
  const [projectType, setProjectType] = useState("web");
  const [logoUri, setLogoUri] = useState(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .sort((a, b) => {
            const statusA = getStatusOrder(a.status);
            const statusB = getStatusOrder(b.status);

            if (statusA !== statusB) return statusA - statusB;

            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;

            return dateB - dateA;
          });

        setProjects(data);
        setLoadingProjects(false);
      },
      (error) => {
        console.log(error);
        setLoadingProjects(false);
      }
    );

    return unsubscribe;
  }, [user]);

  function resetForm() {
    setEditingProject(null);
    setName("");
    setClient("");
    setDescription("");
    setSelectedColor(COLORS[0]);
    setStatus("activo");
    setProjectType("web");
    setLogoUri(null);
    setCurrentLogoUrl(null);
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function openEditModal(project) {
    setEditingProject(project);
    setName(project.name || "");
    setClient(project.client || "");
    setDescription(project.description || "");
    setSelectedColor(project.color || COLORS[0]);
    setStatus(
      project.status === "pausado"
        ? "pausado"
        : project.status === "finalizado"
        ? "finalizado"
        : "activo"
    );
    setProjectType(project.projectType || "web");
    setCurrentLogoUrl(project.logoUrl || null);
    setLogoUri(null);
    setModalVisible(true);
  }

  function openDeleteModal(project) {
    setProjectToDelete(project);
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    setProjectToDelete(null);
    setDeleteModalVisible(false);
  }

  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permiso necesario",
        "Necesitamos acceso a tus imágenes para elegir un logo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  }

  async function uploadLogo(projectId) {
    if (!logoUri) return currentLogoUrl || null;

    const response = await fetch(logoUri);
    const blob = await response.blob();

    const logoRef = ref(
      storage,
      `projectLogos/${user.uid}/${projectId}-${Date.now()}.jpg`
    );

    await uploadBytes(logoRef, blob);

    return getDownloadURL(logoRef);
  }

  async function handleSaveProject() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "El proyecto necesita un nombre.");
      return;
    }

    try {
      setSaving(true);

      if (editingProject) {
        const logoUrl = await uploadLogo(editingProject.id);

        await updateDoc(doc(db, "projects", editingProject.id), {
          name: name.trim(),
          client: client.trim(),
          description: description.trim(),
          color: selectedColor,
          status,
          projectType,
          logoUrl,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, "projects"), {
          userId: user.uid,
          name: name.trim(),
          client: client.trim(),
          description: description.trim(),
          color: selectedColor,
          status,
          projectType,
          logoUrl: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const logoUrl = await uploadLogo(docRef.id);

        if (logoUrl) {
          await updateDoc(doc(db, "projects", docRef.id), {
            logoUrl,
            updatedAt: serverTimestamp(),
          });
        }
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteProject() {
    if (!projectToDelete?.id) return;

    try {
      await deleteDoc(doc(db, "projects", projectToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo eliminar el proyecto.");
    }
  }

  function renderProjectCard(project) {
    const typeInfo = getProjectType(project.projectType);
    const accentColor = project.color || theme.colors.primary;
    const statusColor = getStatusColor(theme, project.status);
    const statusSoft = getStatusSoft(theme, project.status);
    const logoSoft = theme.dark
      ? hexToRgba(accentColor, 0.18)
      : hexToRgba(accentColor, 0.1);

    return (
      <Card
        key={project.id}
        mode="contained"
        style={[
          styles.projectCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.projectContent}>
          <View style={styles.projectTop}>
            <View style={[styles.logoBox, { backgroundColor: logoSoft }]}>
              {project.logoUrl ? (
                <Image source={{ uri: project.logoUrl }} style={styles.logo} />
              ) : (
                <Text style={[styles.logoLetter, { color: accentColor }]}>
                  {project.name?.charAt(0)?.toUpperCase() || "P"}
                </Text>
              )}
            </View>

            <View style={styles.projectMain}>
              <Text
                style={[styles.projectName, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {project.name || "Proyecto sin nombre"}
              </Text>

              <Text
                style={[styles.clientText, { color: theme.colors.secondary }]}
                numberOfLines={1}
              >
                {project.client || "Sin cliente"}
              </Text>
            </View>

            <View style={styles.topActions}>
              <IconButton
                icon="pencil-outline"
                size={20}
                mode="contained-tonal"
                iconColor={theme.colors.primary}
                containerColor={theme.colors.primarySoft}
                style={styles.actionIcon}
                onPress={() => openEditModal(project)}
              />

              <IconButton
                icon="delete-outline"
                size={20}
                mode="contained-tonal"
                iconColor={theme.colors.danger}
                containerColor={theme.colors.dangerSoft}
                style={styles.actionIcon}
                onPress={() => openDeleteModal(project)}
              />
            </View>
          </View>

          {!!project.description && (
            <Text
              style={[styles.description, { color: theme.colors.secondary }]}
              numberOfLines={3}
            >
              {project.description}
            </Text>
          )}

          <View
            style={[
              styles.projectDivider,
              { backgroundColor: theme.colors.borderSoft },
            ]}
          />

          <View style={styles.bottomRow}>
            <StatusChip
              label={getStatusLabel(project.status)}
              icon={getStatusIcon(project.status)}
              color={statusColor}
              backgroundColor={statusSoft}
            />

            <View style={styles.typeInfo}>
              <MaterialCommunityIcons
                name={typeInfo.icon}
                size={15}
                color={theme.colors.secondary}
              />

              <Text
                style={[styles.typeText, { color: theme.colors.secondary }]}
                numberOfLines={1}
              >
                {typeInfo.label}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
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
            Proyectos
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Guardá clientes, logos, colores, tareas, pagos y mantenimientos.
        </Text>
      </View>

      <Button
        mode="contained"
        icon="plus"
        style={styles.createButton}
        contentStyle={styles.createButtonContent}
        labelStyle={styles.createButtonLabel}
        onPress={openCreateModal}
      >
        Nuevo proyecto
      </Button>

      {loadingProjects ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : projects.length === 0 ? (
        <Card
          mode="contained"
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <View style={styles.emptyContent}>
            <View
              style={[
                styles.emptyIconBox,
                { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <MaterialCommunityIcons
                name="folder-plus-outline"
                size={25}
                color={theme.colors.primary}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Todavía no tenés proyectos
            </Text>

            <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
              Cuando agregues proyectos, aparecerán acá con su logo, cliente,
              tipo y estado.
            </Text>

            <Button
              mode="contained"
              icon="plus"
              style={styles.emptyButton}
              onPress={openCreateModal}
            >
              Nuevo proyecto
            </Button>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>{projects.map(renderProjectCard)}</View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {editingProject ? "Editar proyecto" : "Nuevo proyecto"}
                </Text>

                <Text
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Definí logo, tipo, estado y datos principales.
                </Text>
              </View>

              <IconButton
                icon="close"
                size={21}
                iconColor={theme.colors.secondary}
                style={styles.closeButton}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.logoPicker,
                  {
                    borderColor: hexToRgba(selectedColor, theme.dark ? 0.38 : 0.28),
                    backgroundColor: theme.dark
                      ? hexToRgba(selectedColor, 0.14)
                      : hexToRgba(selectedColor, 0.08),
                  },
                ]}
                onPress={pickLogo}
                activeOpacity={0.85}
              >
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.previewLogo} />
                ) : currentLogoUrl ? (
                  <Image
                    source={{ uri: currentLogoUrl }}
                    style={styles.previewLogo}
                  />
                ) : (
                  <>
                    <View
                      style={[
                        styles.logoPickerIcon,
                        {
                          backgroundColor: theme.dark
                            ? hexToRgba(selectedColor, 0.18)
                            : hexToRgba(selectedColor, 0.1),
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="image-plus"
                        size={28}
                        color={selectedColor}
                      />
                    </View>

                    <Text
                      style={[
                        styles.logoPickerTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      Elegir logo
                    </Text>

                    <Text
                      style={[
                        styles.logoPickerText,
                        { color: theme.colors.secondary },
                      ]}
                    >
                      Opcional, formato cuadrado recomendado.
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                label="Nombre del proyecto"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <TextInput
                label="Cliente"
                value={client}
                onChangeText={setClient}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <TextInput
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <FormSection title="Tipo de proyecto" theme={theme} />

              <View style={styles.typeOptions}>
                {PROJECT_TYPES.map((type) => {
                  const selected = projectType === type.value;

                  return (
                    <TouchableOpacity
                      key={type.value}
                      activeOpacity={0.85}
                      style={[
                        styles.typeOption,
                        {
                          borderColor: selected
                            ? hexToRgba(selectedColor, theme.dark ? 0.36 : 0.22)
                            : theme.colors.borderSoft,
                          backgroundColor: selected
                            ? theme.dark
                              ? hexToRgba(selectedColor, 0.16)
                              : hexToRgba(selectedColor, 0.08)
                            : theme.colors.surfaceSoft,
                        },
                      ]}
                      onPress={() => setProjectType(type.value)}
                    >
                      <MaterialCommunityIcons
                        name={type.icon}
                        size={25}
                        color={selected ? selectedColor : theme.colors.secondary}
                      />

                      <Text
                        style={[
                          styles.typeOptionText,
                          {
                            color: selected
                              ? selectedColor
                              : theme.colors.secondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormSection title="Estado" theme={theme} />

              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((item) => {
                  const selected = status === item;
                  const statusColor = getStatusColor(theme, item);
                  const statusSoft = getStatusSoft(theme, item);

                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.85}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: selected
                            ? statusSoft
                            : theme.colors.surfaceSoft,
                          borderColor: selected
                            ? hexToRgba(statusColor, theme.dark ? 0.34 : 0.2)
                            : theme.colors.borderSoft,
                        },
                      ]}
                      onPress={() => setStatus(item)}
                    >
                      <MaterialCommunityIcons
                        name={getStatusIcon(item)}
                        size={18}
                        color={selected ? statusColor : theme.colors.secondary}
                      />

                      <Text
                        style={[
                          styles.statusOptionText,
                          {
                            color: selected
                              ? statusColor
                              : theme.colors.secondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {getStatusLabel(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormSection title="Color principal" theme={theme} />

              <View style={styles.colorsRow}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    activeOpacity={0.8}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      selectedColor === color && [
                        styles.selectedColor,
                        {
                          borderColor: theme.colors.surface,
                        },
                      ],
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <MaterialCommunityIcons
                        name="check"
                        size={17}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                mode="contained"
                icon={editingProject ? "content-save-outline" : "plus"}
                loading={saving}
                disabled={saving}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                labelStyle={styles.saveButtonLabel}
                onPress={handleSaveProject}
              >
                {editingProject ? "Guardar cambios" : "Guardar proyecto"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.deleteOverlay}>
          <Card
            mode="contained"
            style={[
              styles.deleteModal,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.deleteContent}>
              <View
                style={[
                  styles.deleteIconBox,
                  { backgroundColor: theme.colors.dangerSoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="folder-remove-outline"
                  size={29}
                  color={theme.colors.danger}
                />
              </View>

              <Text style={[styles.deleteTitle, { color: theme.colors.text }]}>
                Eliminar proyecto
              </Text>

              <Text style={[styles.deleteText, { color: theme.colors.secondary }]}>
                ¿Seguro que querés eliminar este proyecto? Esta acción no se
                puede deshacer.
              </Text>

              {!!projectToDelete?.name && (
                <View
                  style={[
                    styles.deleteProjectPreview,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.borderSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.deleteProjectTitle,
                      { color: theme.colors.text },
                    ]}
                    numberOfLines={2}
                  >
                    {projectToDelete.name}
                  </Text>

                  <Text
                    style={[
                      styles.deleteProjectClient,
                      { color: theme.colors.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {projectToDelete.client || "Sin cliente"}
                  </Text>
                </View>
              )}

              <View style={styles.deleteActions}>
                <Button
                  mode="contained-tonal"
                  style={styles.cancelDeleteButton}
                  contentStyle={styles.deleteButtonContent}
                  labelStyle={styles.deleteButtonLabel}
                  onPress={closeDeleteModal}
                >
                  Cancelar
                </Button>

                <Button
                  mode="contained"
                  icon="delete-outline"
                  buttonColor={theme.colors.danger}
                  textColor="#FFFFFF"
                  style={styles.confirmDeleteButton}
                  contentStyle={styles.deleteButtonContent}
                  labelStyle={styles.deleteButtonLabel}
                  onPress={confirmDeleteProject}
                >
                  Eliminar
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatusChip({ label, icon, color, backgroundColor }) {
  return (
    <View style={[styles.statusChip, { backgroundColor }]}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />

      <Text style={[styles.statusChipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FormSection({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
      {title}
    </Text>
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
    maxWidth: 340,
  },

  createButton: {
    width: "100%",
    borderRadius: 18,
    elevation: 0,
    marginBottom: 14,
  },

  createButtonContent: {
    height: 50,
  },

  createButtonLabel: {
    fontSize: 14,
    fontWeight: "900",
  },

  loadingBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  emptyContent: {
    alignItems: "center",
    padding: 22,
  },

  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  emptyButton: {
    borderRadius: 16,
  },

  list: {
    gap: 12,
  },

  projectCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  projectContent: {
    padding: 15,
  },

  projectTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  logoBox: {
    width: 58,
    height: 58,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  logoLetter: {
    fontSize: 24,
    fontWeight: "900",
  },

  projectMain: {
    flex: 1,
    paddingTop: 2,
    paddingRight: 8,
  },

  projectName: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 22,
  },

  clientText: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
  },

  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: 3,
  },

  description: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
  },

  projectDivider: {
    height: 1,
    marginTop: 14,
    marginBottom: 10,
  },

  bottomRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusChip: {
    height: 31,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 160,
  },

  statusChipText: {
    marginLeft: 5,
    fontSize: 11.5,
    fontWeight: "900",
  },

  typeInfo: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 130,
  },

  typeText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },

  modal: {
    maxHeight: "92%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },

  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.45)",
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
  },

  closeButton: {
    margin: 0,
  },

  logoPicker: {
    height: 126,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },

  previewLogo: {
    width: "100%",
    height: "100%",
  },

  logoPickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  logoPickerTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  logoPickerText: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
  },

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 10,
  },

  typeOptions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  typeOption: {
    flex: 1,
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  typeOptionText: {
    marginTop: 6,
    fontSize: 11.5,
    fontWeight: "900",
    textAlign: "center",
  },

  statusOptions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },

  statusOption: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statusOptionText: {
    marginLeft: 5,
    fontSize: 11.5,
    fontWeight: "900",
  },

  colorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedColor: {
    borderWidth: 3,
    elevation: 4,
  },

  saveButton: {
    borderRadius: 18,
    marginTop: 24,
    marginBottom: 10,
    elevation: 0,
  },

  saveButtonContent: {
    height: 50,
  },

  saveButtonLabel: {
    fontSize: 14,
    fontWeight: "900",
  },

  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  deleteModal: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  deleteContent: {
    padding: 22,
    alignItems: "center",
  },

  deleteIconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  deleteTitle: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },

  deleteText: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },

  deleteProjectPreview: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },

  deleteProjectTitle: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  deleteProjectClient: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
  },

  deleteActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelDeleteButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },

  confirmDeleteButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },

  deleteButtonContent: {
    height: 48,
  },

  deleteButtonLabel: {
    fontSize: 13.5,
    fontWeight: "900",
  },
});