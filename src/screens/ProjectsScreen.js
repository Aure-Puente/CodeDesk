//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
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

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

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

function getProjectIconBackground(theme, color) {
  if (theme.dark) return "rgba(248, 250, 252, 0.94)";
  return hexToRgba(color, 0.1);
}

function getProjectIconBorder(theme, color) {
  if (theme.dark) return hexToRgba(color, 0.38);
  return hexToRgba(color, 0.18);
}

function getSkeletonColors(theme) {
  return {
    soft: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
    strong: theme.dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.11)",
  };
}

export default function ProjectsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState(null);

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

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const unsubscribeProjects = onSnapshot(
      projectsQuery,
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

    const unsubscribeTasks = onSnapshot(
      query(collection(db, "tasks"), where("userId", "==", user.uid)),
      (snapshot) => {
        setTasks(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      }
    );

    const unsubscribeNotes = onSnapshot(
      query(collection(db, "notes"), where("userId", "==", user.uid)),
      (snapshot) => {
        setNotes(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      }
    );

    const unsubscribeCredentials = onSnapshot(
      query(collection(db, "credentials"), where("userId", "==", user.uid)),
      (snapshot) => {
        setCredentials(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      }
    );

    const unsubscribeDatabases = onSnapshot(
      query(collection(db, "databasesInfo"), where("userId", "==", user.uid)),
      (snapshot) => {
        setDatabases(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      }
    );

    const unsubscribePayments = onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (snapshot) => {
        setPayments(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      }
    );

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
      unsubscribeNotes();
      unsubscribeCredentials();
      unsubscribeDatabases();
      unsubscribePayments();
    };
  }, [user]);

  const projectDetailData = useMemo(() => {
    if (!selectedProjectDetail?.id) {
      return {
        tasks: [],
        notes: [],
        credentials: [],
        databases: [],
        payments: [],
      };
    }

    return {
      tasks: tasks.filter((item) => item.projectId === selectedProjectDetail.id),
      notes: notes.filter((item) => item.projectId === selectedProjectDetail.id),
      credentials: credentials.filter(
        (item) => item.projectId === selectedProjectDetail.id
      ),
      databases: databases.filter(
        (item) => item.projectId === selectedProjectDetail.id
      ),
      payments: payments.filter(
        (item) => item.projectId === selectedProjectDetail.id
      ),
    };
  }, [selectedProjectDetail, tasks, notes, credentials, databases, payments]);

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

  async function openProjectDetail(project) {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Huella no disponible",
          "Para ver el detalle del proyecto necesitás tener huella o bloqueo biométrico configurado."
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Ver detalle del proyecto",
        fallbackLabel: "Usar código",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });

      if (!result.success) return;

      setSelectedProjectDetail(project);
      setDetailModalVisible(true);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo validar la huella.");
    }
  }

  function closeProjectDetail() {
    setSelectedProjectDetail(null);
    setDetailModalVisible(false);
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
    const statusColor = getStatusColor(theme, project.status);
    const statusSoft = getStatusSoft(theme, project.status);

    return (
      <Card
        key={project.id}
        mode="contained"
        onPress={() => openProjectDetail(project)}
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
            <ProjectLogo project={project} theme={theme} size={responsive(58, 74)} />

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
                size={responsive(20, 26)}
                mode="contained-tonal"
                iconColor={theme.colors.primary}
                containerColor={theme.colors.primarySoft}
                style={styles.actionIcon}
                onPress={() => openEditModal(project)}
              />

              <IconButton
                icon="delete-outline"
                size={responsive(20, 26)}
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
                size={responsive(15, 20)}
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
        <ProjectsSkeleton theme={theme} />
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
                size={responsive(25, 33)}
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
              contentStyle={styles.emptyButtonContent}
              labelStyle={styles.emptyButtonLabel}
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
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
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
                <View style={styles.modalTitleBox}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    {editingProject ? "Editar proyecto" : "Nuevo proyecto"}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Definí logo, tipo, estado y datos principales.
                  </Text>
                </View>

                <IconButton
                  icon="close"
                  size={responsive(21, 27)}
                  iconColor={theme.colors.secondary}
                  style={styles.closeButton}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={styles.modalScrollContent}
              >
                <TouchableOpacity
                  style={[
                    styles.logoPicker,
                    {
                      borderColor: hexToRgba(
                        selectedColor,
                        theme.dark ? 0.38 : 0.28
                      ),
                      backgroundColor: getProjectIconBackground(
                        theme,
                        selectedColor
                      ),
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
                            backgroundColor: getProjectIconBackground(
                              theme,
                              selectedColor
                            ),
                            borderColor: getProjectIconBorder(
                              theme,
                              selectedColor
                            ),
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="image-plus"
                          size={responsive(28, 36)}
                          color={selectedColor}
                        />
                      </View>

                      <Text
                        style={[
                          styles.logoPickerTitle,
                          { color: selectedColor },
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
                  contentStyle={styles.inputContent}
                />

                <TextInput
                  label="Cliente"
                  value={client}
                  onChangeText={setClient}
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
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
                  contentStyle={styles.inputContent}
                  textAlignVertical="top"
                />

                <FormSection title="Tipo de proyecto" theme={theme} />

                <View style={styles.typeOptions}>
                  {PROJECT_TYPES.map((type) => {
                    const selected = projectType === type.value;

                    return (
                      <TouchableRipple
                        key={type.value}
                        borderless
                        rippleColor={hexToRgba(selectedColor, 0.12)}
                        style={[
                          styles.typeOption,
                          {
                            borderColor: selected
                              ? hexToRgba(
                                  selectedColor,
                                  theme.dark ? 0.42 : 0.22
                                )
                              : theme.colors.borderSoft,
                            backgroundColor: selected
                              ? getProjectIconBackground(theme, selectedColor)
                              : theme.colors.surfaceSoft,
                          },
                        ]}
                        onPress={() => setProjectType(type.value)}
                      >
                        <View style={styles.typeOptionContent}>
                          <MaterialCommunityIcons
                            name={type.icon}
                            size={responsive(25, 34)}
                            color={
                              selected ? selectedColor : theme.colors.secondary
                            }
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
                        </View>
                      </TouchableRipple>
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
                      <TouchableRipple
                        key={item}
                        borderless
                        rippleColor={hexToRgba(statusColor, 0.12)}
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
                        <View style={styles.statusOptionContent}>
                          <MaterialCommunityIcons
                            name={getStatusIcon(item)}
                            size={responsive(18, 24)}
                            color={
                              selected ? statusColor : theme.colors.secondary
                            }
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
                        </View>
                      </TouchableRipple>
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
                          size={responsive(17, 22)}
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
        </KeyboardAvoidingView>
      </Modal>

      <ProjectDetailModal
        visible={detailModalVisible}
        project={selectedProjectDetail}
        data={projectDetailData}
        theme={theme}
        onClose={closeProjectDetail}
      />

      <DeleteModal
        visible={deleteModalVisible}
        theme={theme}
        title="Eliminar proyecto"
        text="¿Seguro que querés eliminar este proyecto? Esta acción no se puede deshacer."
        previewTitle={projectToDelete?.name}
        previewSubtitle={projectToDelete?.client || "Sin cliente"}
        icon="folder-remove-outline"
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteProject}
      />
    </ScrollView>
  );
}

function ProjectLogo({ project, theme, size = 56 }) {
  const color = project?.color || project?.projectColor || theme.colors.primary;
  const logoUrl = project?.logoUrl || project?.projectLogoUrl;

  return (
    <View
      style={[
        styles.logoBox,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: getProjectIconBackground(theme, color),
          borderColor: getProjectIconBorder(theme, color),
        },
      ]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : (
        <Text style={[styles.logoLetter, { color }]}>
          {(project?.name || project?.projectName || "P")
            .charAt(0)
            .toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function ProjectDetailModal({ visible, project, data, theme, onClose }) {
  if (!project) return null;

  const color = project.color || theme.colors.primary;
  const typeInfo = getProjectType(project.projectType);

  const total =
    data.tasks.length +
    data.notes.length +
    data.credentials.length +
    data.databases.length +
    data.payments.length;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.detailOverlay}>
        <Card
          mode="contained"
          style={[
            styles.detailModal,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <View style={styles.detailContent}>
            <View style={styles.detailHeader}>
              <ProjectLogo
                project={project}
                theme={theme}
                size={responsive(54, 70)}
              />

              <View style={styles.detailHeaderText}>
                <Text
                  style={[styles.detailProjectName, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {project.name || "Proyecto sin nombre"}
                </Text>

                <Text
                  style={[
                    styles.detailProjectMeta,
                    { color: theme.colors.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {project.client || "Sin cliente"} · {typeInfo.label}
                </Text>
              </View>

              <IconButton
                icon="close"
                size={responsive(21, 27)}
                iconColor={theme.colors.secondary}
                style={styles.closeButton}
                onPress={onClose}
              />
            </View>

            <View style={styles.detailCounters}>
              <CounterPill
                label="Tareas"
                value={data.tasks.length}
                icon="format-list-checks"
                color={theme.colors.info}
                softColor={theme.colors.infoSoft}
              />

              <CounterPill
                label="Notas"
                value={data.notes.length}
                icon="note-text-outline"
                color={theme.colors.primary}
                softColor={theme.colors.primarySoft}
              />

              <CounterPill
                label="Total"
                value={total}
                icon="database-eye-outline"
                color={color}
                softColor={getProjectIconBackground(theme, color)}
              />
            </View>

            <Divider
              style={[
                styles.detailDivider,
                { backgroundColor: theme.colors.borderSoft },
              ]}
            />

            <ScrollView
              style={styles.detailScrollArea}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              contentContainerStyle={styles.detailScrollContent}
            >
              <DetailSection
                title="Tareas"
                icon="format-list-checks"
                count={data.tasks.length}
                theme={theme}
              >
                {data.tasks.length === 0 ? (
                  <EmptyDetailText text="No hay tareas asignadas." theme={theme} />
                ) : (
                  data.tasks.map((task) => (
                    <DetailItem
                      key={task.id}
                      title={task.title || "Tarea sin título"}
                      subtitle={task.status || "Sin estado"}
                      icon="checkbox-blank-circle"
                      theme={theme}
                      color={color}
                    />
                  ))
                )}
              </DetailSection>

              <DetailSection
                title="Notas"
                icon="note-text-outline"
                count={data.notes.length}
                theme={theme}
              >
                {data.notes.length === 0 ? (
                  <EmptyDetailText text="No hay notas asignadas." theme={theme} />
                ) : (
                  data.notes.map((note) => (
                    <DetailItem
                      key={note.id}
                      title={note.title || "Sin título"}
                      subtitle={note.content || "Sin contenido"}
                      icon="note-outline"
                      theme={theme}
                      color={theme.colors.primary}
                    />
                  ))
                )}
              </DetailSection>

              <DetailSection
                title="Credenciales"
                icon="key-variant"
                count={data.credentials.length}
                theme={theme}
              >
                {data.credentials.length === 0 ? (
                  <EmptyDetailText
                    text="No hay credenciales asignadas."
                    theme={theme}
                  />
                ) : (
                  data.credentials.map((credential) => (
                    <DetailItem
                      key={credential.id}
                      title={credential.type || "Credencial"}
                      subtitle={
                        [
                          credential.production?.email
                            ? `Prod: ${credential.production.email}`
                            : null,
                          credential.local?.email
                            ? `Local: ${credential.local.email}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin usuario cargado"
                      }
                      icon="key-outline"
                      theme={theme}
                      color={theme.colors.warning}
                    />
                  ))
                )}
              </DetailSection>

              <DetailSection
                title="Base de datos"
                icon="database-outline"
                count={data.databases.length}
                theme={theme}
              >
                {data.databases.length === 0 ? (
                  <EmptyDetailText
                    text="No hay enlaces de Firebase asignados."
                    theme={theme}
                  />
                ) : (
                  data.databases.map((database) => (
                    <DetailItem
                      key={database.id}
                      title="Firebase Console"
                      subtitle={database.firebaseUrl || "Sin enlace"}
                      icon="firebase"
                      theme={theme}
                      color={theme.colors.warning}
                    />
                  ))
                )}
              </DetailSection>

              <DetailSection
                title="Pagos"
                icon="cash-multiple"
                count={data.payments.length}
                theme={theme}
              >
                {data.payments.length === 0 ? (
                  <EmptyDetailText text="No hay pagos asignados." theme={theme} />
                ) : (
                  data.payments.map((payment) => (
                    <DetailItem
                      key={payment.id}
                      title={`Total acordado: ${
                        payment.currency === "USD" ? "US$" : "$"
                      }${Number(payment.totalAmount || 0).toLocaleString(
                        "es-AR"
                      )}`}
                      subtitle={payment.notes || "Sin notas"}
                      icon="cash"
                      theme={theme}
                      color={theme.colors.success}
                    />
                  ))
                )}
              </DetailSection>
            </ScrollView>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function DetailSection({ title, icon, count, theme, children }) {
  return (
    <View style={styles.detailSection}>
      <View style={styles.detailSectionHeader}>
        <View
          style={[
            styles.detailSectionIcon,
            { backgroundColor: theme.colors.primarySoft },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={responsive(18, 23)}
            color={theme.colors.primary}
          />
        </View>

        <Text style={[styles.detailSectionTitle, { color: theme.colors.text }]}>
          {title}
        </Text>

        <Text
          style={[styles.detailSectionCount, { color: theme.colors.secondary }]}
        >
          {count}
        </Text>
      </View>

      {children}
    </View>
  );
}

function DetailItem({ title, subtitle, icon, color, theme }) {
  return (
    <View
      style={[
        styles.detailItem,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View
        style={[
          styles.detailItemIcon,
          { backgroundColor: hexToRgba(color, 0.12) },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={responsive(17, 22)}
          color={color}
        />
      </View>

      <View style={styles.detailItemText}>
        <Text
          style={[styles.detailItemTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {title}
        </Text>

        {!!subtitle && (
          <Text
            style={[styles.detailItemSubtitle, { color: theme.colors.secondary }]}
            numberOfLines={3}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

function EmptyDetailText({ text, theme }) {
  return (
    <Text style={[styles.emptyDetailText, { color: theme.colors.secondary }]}>
      {text}
    </Text>
  );
}

function CounterPill({ label, value, icon, color, softColor }) {
  return (
    <View style={[styles.counterPill, { backgroundColor: softColor }]}>
      <MaterialCommunityIcons
        name={icon}
        size={responsive(14, 18)}
        color={color}
      />

      <Text style={[styles.counterPillText, { color }]}>
        {value} {label}
      </Text>
    </View>
  );
}

function StatusChip({ label, icon, color, backgroundColor }) {
  return (
    <View style={[styles.statusChip, { backgroundColor }]}>
      <MaterialCommunityIcons
        name={icon}
        size={responsive(14, 18)}
        color={color}
      />

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

function ProjectsSkeleton({ theme }) {
  return (
    <View style={styles.list}>
      {[1, 2, 3, 4].map((item) => (
        <ProjectSkeletonCard key={item} theme={theme} />
      ))}
    </View>
  );
}

function ProjectSkeletonCard({ theme }) {
  const skeleton = getSkeletonColors(theme);

  return (
    <Card
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
          <SkeletonBlock style={styles.skeletonLogo} color={skeleton.strong} />

          <View style={styles.projectMain}>
            <SkeletonBlock style={styles.skeletonTitle} color={skeleton.strong} />
            <SkeletonBlock style={styles.skeletonSubtitle} color={skeleton.soft} />
          </View>

          <View style={styles.topActions}>
            <SkeletonBlock style={styles.skeletonAction} color={skeleton.strong} />
            <SkeletonBlock style={styles.skeletonAction} color={skeleton.strong} />
          </View>
        </View>

        <SkeletonBlock style={styles.skeletonDescription} color={skeleton.soft} />
        <SkeletonBlock
          style={styles.skeletonDescriptionSmall}
          color={skeleton.soft}
        />

        <View
          style={[
            styles.projectDivider,
            { backgroundColor: theme.colors.borderSoft },
          ]}
        />

        <View style={styles.bottomRow}>
          <SkeletonBlock style={styles.skeletonStatus} color={skeleton.strong} />
          <SkeletonBlock style={styles.skeletonType} color={skeleton.soft} />
        </View>
      </View>
    </Card>
  );
}

function SkeletonBlock({ style, color }) {
  return <View style={[style, { backgroundColor: color }]} />;
}

function DeleteModal({
  visible,
  theme,
  title,
  text,
  previewTitle,
  previewSubtitle,
  icon,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
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
                name={icon}
                size={responsive(29, 37)}
                color={theme.colors.danger}
              />
            </View>

            <Text style={[styles.deleteTitle, { color: theme.colors.text }]}>
              {title}
            </Text>

            <Text style={[styles.deleteText, { color: theme.colors.secondary }]}>
              {text}
            </Text>

            {!!previewTitle && (
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
                  style={[styles.deleteProjectTitle, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {previewTitle}
                </Text>

                <Text
                  style={[
                    styles.deleteProjectClient,
                    { color: theme.colors.secondary },
                  ]}
                  numberOfLines={1}
                >
                  {previewSubtitle}
                </Text>
              </View>
            )}

            <View style={styles.deleteActions}>
              <Button
                mode="contained-tonal"
                style={styles.cancelDeleteButton}
                contentStyle={styles.deleteButtonContent}
                labelStyle={styles.deleteButtonLabel}
                onPress={onCancel}
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
                onPress={onConfirm}
              >
                Eliminar
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
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
    paddingBottom: responsive(165, 195),
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
    maxWidth: responsive(340, 560),
  },

  createButton: {
    width: "100%",
    borderRadius: responsive(18, 22),
    elevation: 0,
    marginBottom: responsive(14, 20),
  },

  createButtonContent: {
    height: responsive(50, 60),
  },

  createButtonLabel: {
    fontSize: responsive(14, 16),
    fontWeight: "900",
  },

  emptyCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  emptyContent: {
    alignItems: "center",
    padding: responsive(22, 34),
  },

  emptyIconBox: {
    width: responsive(54, 70),
    height: responsive(54, 70),
    borderRadius: responsive(19, 24),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(14, 20),
  },

  emptyTitle: {
    fontSize: responsive(18, 23),
    fontWeight: "900",
    letterSpacing: -0.25,
    textAlign: "center",
  },

  emptyText: {
    marginTop: responsive(6, 9),
    marginBottom: responsive(16, 22),
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 23),
    textAlign: "center",
    maxWidth: responsive(undefined, 480),
  },

  emptyButton: {
    borderRadius: responsive(16, 20),
  },

  emptyButtonContent: {
    height: responsive(44, 54),
  },

  emptyButtonLabel: {
    fontSize: responsive(14, 16),
    fontWeight: "900",
  },

  list: {
    gap: responsive(12, 18),
  },

  projectCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  projectContent: {
    padding: responsive(15, 22),
  },

  projectTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  logoBox: {
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: responsive(12, 18),
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  logoLetter: {
    fontSize: responsive(24, 32),
    fontWeight: "900",
  },

  projectMain: {
    flex: 1,
    paddingTop: responsive(2, 4),
    paddingRight: responsive(8, 12),
  },

  projectName: {
    fontSize: responsive(17, 22),
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: responsive(22, 28),
  },

  clientText: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: responsive(3, 6),
  },

  description: {
    marginTop: responsive(12, 18),
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 24),
  },

  projectDivider: {
    height: 1,
    marginTop: responsive(14, 20),
    marginBottom: responsive(10, 14),
  },

  bottomRow: {
    minHeight: responsive(32, 42),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusChip: {
    height: responsive(31, 39),
    borderRadius: 999,
    paddingHorizontal: responsive(10, 14),
    flexDirection: "row",
    alignItems: "center",
    maxWidth: responsive(160, 220),
  },

  statusChipText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "900",
  },

  typeInfo: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: responsive(130, 190),
  },

  typeText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(12, 14.5),
    fontWeight: "800",
  },

  tapHint: {
    marginTop: responsive(9, 12),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "800",
    textAlign: "right",
  },

  modalKeyboardView: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },

  modal: {
    width: "100%",
    maxWidth: responsive(undefined, 760),
    alignSelf: "center",
    maxHeight: responsive("92%", "88%"),
    borderTopLeftRadius: responsive(30, 34),
    borderTopRightRadius: responsive(30, 34),
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: responsive(20, 32),
    paddingBottom: responsive(32, 42),
    paddingTop: responsive(10, 14),
  },

  modalScrollContent: {
    paddingBottom: responsive(95, 115),
  },

  modalHandle: {
    alignSelf: "center",
    width: responsive(44, 56),
    height: responsive(5, 6),
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.45)",
    marginBottom: responsive(14, 20),
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: responsive(16, 22),
  },

  modalTitleBox: {
    flex: 1,
    paddingRight: responsive(10, 16),
  },

  modalTitle: {
    fontSize: responsive(22, 28),
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  modalSubtitle: {
    marginTop: responsive(3, 5),
    fontSize: responsive(13, 16),
    lineHeight: responsive(18, 23),
    maxWidth: responsive(280, 460),
  },

  closeButton: {
    margin: 0,
  },

  logoPicker: {
    height: responsive(126, 170),
    borderRadius: responsive(24, 30),
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: responsive(16, 22),
    overflow: "hidden",
  },

  previewLogo: {
    width: "100%",
    height: "100%",
  },

  logoPickerIcon: {
    width: responsive(52, 68),
    height: responsive(52, 68),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(9, 13),
  },

  logoPickerTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
  },

  logoPickerText: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
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

  sectionTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    marginTop: responsive(6, 10),
    marginBottom: responsive(10, 14),
  },

  typeOptions: {
    flexDirection: "row",
    gap: responsive(10, 14),
    marginBottom: responsive(14, 20),
  },

  typeOption: {
    flex: 1,
    minHeight: responsive(82, 106),
    borderWidth: 1,
    borderRadius: responsive(18, 23),
    overflow: "hidden",
  },

  typeOptionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsive(8, 12),
    paddingVertical: responsive(10, 14),
  },

  typeOptionText: {
    marginTop: responsive(6, 9),
    fontSize: responsive(11.5, 14),
    fontWeight: "900",
    textAlign: "center",
  },

  statusOptions: {
    flexDirection: "row",
    gap: responsive(8, 12),
    marginBottom: responsive(14, 20),
  },

  statusOption: {
    flex: 1,
    minHeight: responsive(46, 58),
    borderWidth: 1,
    borderRadius: responsive(16, 20),
    overflow: "hidden",
  },

  statusOptionContent: {
    flex: 1,
    paddingHorizontal: responsive(6, 10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statusOptionText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(11.5, 14),
    fontWeight: "900",
  },

  colorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(12, 16),
  },

  colorCircle: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(17, 22),
    alignItems: "center",
    justifyContent: "center",
  },

  selectedColor: {
    borderWidth: 3,
    elevation: 4,
  },

  saveButton: {
    borderRadius: responsive(18, 22),
    marginTop: responsive(24, 32),
    marginBottom: responsive(24, 30),
    elevation: 0,
  },

  saveButtonContent: {
    height: responsive(52, 62),
  },

  saveButtonLabel: {
    fontSize: responsive(14, 16),
    fontWeight: "900",
  },

  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: responsive(18, 34),
  },

  detailModal: {
    width: "100%",
    maxWidth: responsive(undefined, 720),
    alignSelf: "center",
    maxHeight: responsive("88%", "84%"),
    borderRadius: responsive(30, 36),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  detailContent: {
    padding: responsive(18, 28),
    maxHeight: "100%",
  },

  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  detailHeaderText: {
    flex: 1,
    paddingTop: responsive(3, 5),
  },

  detailProjectName: {
    fontSize: responsive(19, 26),
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: responsive(25, 33),
  },

  detailProjectMeta: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "800",
  },

  detailCounters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(8, 12),
    marginTop: responsive(16, 24),
  },

  counterPill: {
    height: responsive(30, 38),
    borderRadius: 999,
    paddingHorizontal: responsive(9, 13),
    flexDirection: "row",
    alignItems: "center",
  },

  counterPillText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "900",
  },

  detailDivider: {
    height: 1,
    marginTop: responsive(16, 22),
    marginBottom: responsive(12, 18),
  },

  detailScrollArea: {
    flexShrink: 1,
    maxHeight: responsive(520, 620),
  },

  detailScrollContent: {
    paddingBottom: responsive(95, 115),
  },

  detailSection: {
    marginBottom: responsive(16, 24),
  },

  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(9, 13),
  },

  detailSectionIcon: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(9, 12),
  },

  detailSectionTitle: {
    flex: 1,
    fontSize: responsive(15, 18),
    fontWeight: "900",
  },

  detailSectionCount: {
    fontSize: responsive(12.5, 15),
    fontWeight: "900",
  },

  detailItem: {
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(11, 16),
    paddingVertical: responsive(10, 14),
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: responsive(8, 12),
  },

  detailItemIcon: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(9, 12),
  },

  detailItemText: {
    flex: 1,
  },

  detailItemTitle: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
    lineHeight: responsive(18, 22),
  },

  detailItemSubtitle: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(18, 22),
    fontWeight: "700",
  },

  emptyDetailText: {
    fontSize: responsive(13, 15.5),
    fontWeight: "700",
    lineHeight: responsive(18, 22),
    marginLeft: 2,
  },

  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: responsive(22, 34),
  },

  deleteModal: {
    width: "100%",
    maxWidth: responsive(undefined, 560),
    alignSelf: "center",
    borderRadius: responsive(28, 34),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  deleteContent: {
    padding: responsive(22, 32),
    alignItems: "center",
  },

  deleteIconBox: {
    width: responsive(58, 74),
    height: responsive(58, 74),
    borderRadius: responsive(20, 25),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(16, 22),
  },

  deleteTitle: {
    fontSize: responsive(21, 27),
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },

  deleteText: {
    marginTop: responsive(8, 12),
    fontSize: responsive(13.5, 16),
    lineHeight: responsive(20, 24),
    textAlign: "center",
  },

  deleteProjectPreview: {
    width: "100%",
    borderRadius: responsive(18, 22),
    borderWidth: 1,
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(12, 16),
    marginTop: responsive(16, 22),
  },

  deleteProjectTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    textAlign: "center",
  },

  deleteProjectClient: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
    textAlign: "center",
  },

  deleteActions: {
    width: "100%",
    flexDirection: "row",
    gap: responsive(10, 14),
    marginTop: responsive(20, 28),
  },

  cancelDeleteButton: {
    flex: 1,
    borderRadius: responsive(16, 20),
    elevation: 0,
  },

  confirmDeleteButton: {
    flex: 1,
    borderRadius: responsive(16, 20),
    elevation: 0,
  },

  deleteButtonContent: {
    height: responsive(48, 58),
  },

  deleteButtonLabel: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },

  skeletonLogo: {
    width: responsive(58, 74),
    height: responsive(58, 74),
    borderRadius: responsive(19, 25),
    marginRight: responsive(12, 18),
  },

  skeletonTitle: {
    width: "84%",
    height: responsive(17, 22),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonSubtitle: {
    width: "58%",
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonAction: {
    width: responsive(40, 50),
    height: responsive(40, 50),
    borderRadius: 999,
    marginLeft: responsive(3, 6),
  },

  skeletonDescription: {
    width: "94%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginTop: responsive(14, 20),
  },

  skeletonDescriptionSmall: {
    width: "68%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginTop: responsive(8, 11),
  },

  skeletonStatus: {
    width: responsive(94, 124),
    height: responsive(31, 39),
    borderRadius: 999,
  },

  skeletonType: {
    width: responsive(88, 118),
    height: responsive(18, 23),
    borderRadius: 999,
  },
});