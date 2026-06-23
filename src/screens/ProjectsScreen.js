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
  Chip,
  IconButton,
  Menu,
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

const COLORS = [
  "#2563EB",
  "#16A34A",
  "#EA580C",
  "#7C3AED",
  "#DC2626",
  "#0891B2",
  "#CA8A04",
  "#DB2777",
];

const STATUS_OPTIONS = ["activo", "pausado", "finalizado"];

const PROJECT_TYPES = [
  {
    value: "mobile",
    label: "App mobile",
    icon: "cellphone",
  },
  {
    value: "web",
    label: "App web",
    icon: "monitor-dashboard",
  },
  {
    value: "both",
    label: "Web + Mobile",
    icon: "devices",
  },
];

export default function ProjectsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [status, setStatus] = useState("activo");
  const [projectType, setProjectType] = useState("web");
  const [logoUri, setLogoUri] = useState(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(null);

  const [saving, setSaving] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

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
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

setProjects(data);

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
    setStatusMenuVisible(false);
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
    setStatus(project.status || "activo");
    setProjectType(project.projectType || "web");
    setCurrentLogoUrl(project.logoUrl || null);
    setLogoUri(null);
    setModalVisible(true);
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

  function handleDeleteProject(project) {
    Alert.alert(
      "Eliminar proyecto",
      `¿Seguro que querés eliminar "${project.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "projects", project.id));
            } catch (error) {
              console.log(error);
              Alert.alert("Error", "No se pudo eliminar el proyecto.");
            }
          },
        },
      ]
    );
  }

  function getStatusLabel(value) {
    if (value === "activo") return "Activo";
    if (value === "pausado") return "Pausado";
    if (value === "finalizado") return "Finalizado";
    return "Activo";
  }

  function getProjectType(value) {
    return PROJECT_TYPES.find((type) => type.value === value) || PROJECT_TYPES[1];
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.text }]}
      >
        Proyectos
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Guardá clientes, logos, colores, tareas, pagos y mantenimientos.
      </Text>

      <Button mode="contained" style={styles.button} onPress={openCreateModal}>
        Nuevo proyecto
      </Button>

      {loadingProjects ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : projects.length === 0 ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Todavía no tenés proyectos
            </Text>

            <Text style={{ color: theme.colors.secondary }}>
              Cuando agregues proyectos, aparecerán acá con su logo, color,
              cliente, tipo y estado.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.list}>
          {projects.map((project) => {
            const typeInfo = getProjectType(project.projectType);

            return (
              <Card
                key={project.id}
                style={[
                  styles.projectCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <View style={styles.projectContent}>
                    <View
                      style={[
                        styles.logoBox,
                        {
                          backgroundColor:
                            project.color || theme.colors.primary,
                        },
                      ]}
                    >
                      {project.logoUrl ? (
                        <Image
                          source={{ uri: project.logoUrl }}
                          style={styles.logo}
                        />
                      ) : (
                        <Text style={styles.logoLetter}>
                          {project.name?.charAt(0)?.toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.projectInfo}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.projectName,
                            { color: theme.colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {project.name}
                        </Text>

                        <View
                          style={[
                            styles.typeIconBox,
                            {
                              backgroundColor:
                                (project.color || theme.colors.primary) + "1A",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={typeInfo.icon}
                            size={18}
                            color={project.color || theme.colors.primary}
                          />
                        </View>
                      </View>

                      <Text style={{ color: theme.colors.secondary }}>
                        {project.client || "Sin cliente"}
                      </Text>

                      <View style={styles.chipsRow}>
                        <Chip
                          compact
                          style={[
                            styles.statusChip,
                            { backgroundColor: project.color + "22" },
                          ]}
                          textStyle={{
                            color: project.color || theme.colors.primary,
                            fontWeight: "800",
                          }}
                        >
                          {getStatusLabel(project.status)}
                        </Chip>

                        <Chip
                          compact
                          icon={typeInfo.icon}
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor:
                                (project.color || theme.colors.primary) + "14",
                            },
                          ]}
                          textStyle={{
                            color: project.color || theme.colors.primary,
                            fontWeight: "800",
                          }}
                        >
                          {typeInfo.label}
                        </Chip>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <Button
                      mode="text"
                      icon="pencil-outline"
                      onPress={() => openEditModal(project)}
                    >
                      Editar
                    </Button>

                    <Button
                      mode="text"
                      icon="delete-outline"
                      textColor="#DC2626"
                      onPress={() => handleDeleteProject(project)}
                    >
                      Eliminar
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingProject ? "Editar proyecto" : "Nuevo proyecto"}
              </Text>

              <IconButton
                icon="close"
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.previewLogo} />
                ) : currentLogoUrl ? (
                  <Image
                    source={{ uri: currentLogoUrl }}
                    style={styles.previewLogo}
                  />
                ) : (
                  <>
                    <IconButton icon="image-plus" size={30} />
                    <Text style={{ color: theme.colors.secondary }}>
                      Elegir logo
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
              />

              <TextInput
                label="Cliente"
                value={client}
                onChangeText={setClient}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Descripción"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Tipo de proyecto
              </Text>

              <View style={styles.typeOptions}>
                {PROJECT_TYPES.map((type) => {
                  const selected = projectType === type.value;

                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        {
                          borderColor: selected
                            ? selectedColor
                            : theme.colors.outline,
                          backgroundColor: selected
                            ? selectedColor + "14"
                            : "transparent",
                        },
                      ]}
                      onPress={() => setProjectType(type.value)}
                    >
                      <MaterialCommunityIcons
                        name={type.icon}
                        size={24}
                        color={selected ? selectedColor : theme.colors.secondary}
                      />

                      <Text
                        style={{
                          color: selected ? selectedColor : theme.colors.secondary,
                          fontWeight: selected ? "800" : "600",
                          marginTop: 6,
                        }}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Estado
              </Text>

              <Menu
                visible={statusMenuVisible}
                onDismiss={() => setStatusMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    style={styles.selectButton}
                    onPress={() => setStatusMenuVisible(true)}
                  >
                    {getStatusLabel(status)}
                  </Button>
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option}
                    title={getStatusLabel(option)}
                    onPress={() => {
                      setStatus(option);
                      setStatusMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Color principal
              </Text>

              <View style={styles.colorsRow}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColor,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <Button
                mode="contained"
                loading={saving}
                disabled={saving}
                style={styles.saveButton}
                onPress={handleSaveProject}
              >
                {editingProject ? "Guardar cambios" : "Guardar proyecto"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 135,
  },

  title: {
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 18,
  },

  button: {
    borderRadius: 16,
    marginBottom: 18,
  },

  card: {
    borderRadius: 22,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  list: {
    gap: 14,
  },

  projectCard: {
    borderRadius: 22,
  },

  projectContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  logoBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  logoLetter: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },

  projectInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  projectName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
  },

  typeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  statusChip: {
    alignSelf: "flex-start",
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modal: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  logoPicker: {
    height: 120,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#CBD5E1",
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

  input: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },

  typeOptions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  typeOption: {
    flex: 1,
    minHeight: 86,
    borderWidth: 1.5,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  selectButton: {
    borderRadius: 14,
    marginBottom: 14,
    alignSelf: "flex-start",
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
  },

  selectedColor: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 4,
  },

  saveButton: {
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 10,
  },
});