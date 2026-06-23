//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

//JS:
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

export default function DataBaseScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingDatabase, setEditingDatabase] = useState(null);
  const [databaseToDelete, setDatabaseToDelete] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [firebaseUrl, setFirebaseUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const databasesQuery = query(
      collection(db, "databasesInfo"),
      where("userId", "==", user.uid)
    );

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .sort((a, b) => {
          const nameA = String(a.name || "").toLowerCase();
          const nameB = String(b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });

      setProjects(data);
    });

    const unsubscribeDatabases = onSnapshot(databasesQuery, (snapshot) => {
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

      setDatabases(data);
      setLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeDatabases();
    };
  }, [user]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectId);
  }, [projects, projectId]);

  function resetForm() {
    setEditingDatabase(null);
    setProjectId(null);
    setFirebaseUrl("");
    setNotes("");
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingDatabase(item);
    setProjectId(item.projectId || null);
    setFirebaseUrl(item.firebaseUrl || "");
    setNotes(item.notes || "");
    setModalVisible(true);
  }

  function openDeleteModal(item) {
    setDatabaseToDelete(item);
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    setDatabaseToDelete(null);
    setDeleteModalVisible(false);
  }

  async function openFirebaseLink(item) {
    if (!item.firebaseUrl) {
      Alert.alert("Sin enlace", "Este proyecto no tiene enlace cargado.");
      return;
    }

    const canOpen = await Linking.canOpenURL(item.firebaseUrl);

    if (!canOpen) {
      Alert.alert("Enlace inválido", "No se pudo abrir el enlace.");
      return;
    }

    await Linking.openURL(item.firebaseUrl);
  }

  async function handleSaveDatabase() {
    if (!projectId) {
      Alert.alert("Falta el proyecto", "Seleccioná un proyecto.");
      return;
    }

    if (!firebaseUrl.trim()) {
      Alert.alert("Falta el enlace", "Pegá el enlace de Firebase.");
      return;
    }

    try {
      const payload = {
        userId: user.uid,
        projectId,
        projectName: selectedProject?.name || "",
        projectColor: selectedProject?.color || null,
        projectLogoUrl: selectedProject?.logoUrl || null,
        firebaseUrl: firebaseUrl.trim(),
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingDatabase) {
        await updateDoc(doc(db, "databasesInfo", editingDatabase.id), payload);
      } else {
        await addDoc(collection(db, "databasesInfo"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar la base de datos.");
    }
  }

  async function confirmDeleteDatabase() {
    if (!databaseToDelete?.id) return;

    try {
      await deleteDoc(doc(db, "databasesInfo", databaseToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo eliminar el enlace.");
    }
  }

  function ProjectIcon({ item, size = 56 }) {
    const color = item?.projectColor || item?.color || theme.colors.primary;
    const logoUrl = item?.projectLogoUrl || item?.logoUrl;

    const softColor = theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.1);

    return (
      <View
        style={[
          styles.projectIcon,
          {
            width: size,
            height: size,
            borderRadius: size / 3,
            backgroundColor: softColor,
          },
        ]}
      >
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={[styles.projectLetter, { color }]}>
            {(item?.projectName || item?.name || "P").charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
    );
  }

  function renderDatabaseCard(item) {
    return (
      <Card
        key={item.id}
        mode="contained"
        style={[
          styles.databaseCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <ProjectIcon item={item} />

            <View style={styles.cardInfo}>
              <Text
                style={[styles.projectName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.projectName || "Proyecto sin nombre"}
              </Text>

              <Text
                style={[styles.cardSubtitle, { color: theme.colors.secondary }]}
                numberOfLines={1}
              >
                Acceso directo a Firebase Console
              </Text>

              <View style={styles.chipsRow}>
                <SmallInfoChip
                  label="Firebase"
                  icon="firebase"
                  color={theme.colors.warning}
                  softColor={theme.colors.warningSoft}
                />
              </View>
            </View>
          </View>

          {!!item.notes && (
            <View
              style={[
                styles.notesBox,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.borderSoft,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="note-text-outline"
                size={17}
                color={theme.colors.secondary}
              />

              <Text
                style={[styles.notes, { color: theme.colors.secondary }]}
                numberOfLines={2}
              >
                {item.notes}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.cardDivider,
              {
                backgroundColor: theme.colors.borderSoft,
              },
            ]}
          />

          <View style={styles.cardActions}>
            <Button
              mode="contained-tonal"
              icon="open-in-new"
              textColor={theme.colors.info}
              buttonColor={theme.colors.infoSoft}
              style={[
                styles.openFirebaseButton,
                {
                  borderColor: hexToRgba(
                    theme.colors.info,
                    theme.dark ? 0.32 : 0.18
                  ),
                },
              ]}
              contentStyle={styles.openFirebaseButtonContent}
              labelStyle={styles.openFirebaseButtonLabel}
              onPress={() => openFirebaseLink(item)}
            >
              Abrir Firebase
            </Button>

            <View style={styles.iconActions}>
              <IconButton
                icon="pencil-outline"
                size={20}
                mode="contained-tonal"
                iconColor={theme.colors.primary}
                containerColor={theme.colors.primarySoft}
                style={styles.actionIcon}
                onPress={() => openEditModal(item)}
              />

              <IconButton
                icon="delete-outline"
                size={20}
                mode="contained-tonal"
                iconColor={theme.colors.danger}
                containerColor={theme.colors.dangerSoft}
                style={styles.actionIcon}
                onPress={() => openDeleteModal(item)}
              />
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
            Base de datos
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Guardá enlaces directos a Firebase Console por proyecto.
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
        Nuevo enlace Firebase
      </Button>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : databases.length === 0 ? (
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
                name="database-plus-outline"
                size={27}
                color={theme.colors.primary}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Sin bases guardadas
            </Text>

            <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
              Agregá un proyecto y pegá su enlace de Firebase Console.
            </Text>

            <Button
              mode="contained"
              icon="plus"
              style={styles.emptyButton}
              onPress={openCreateModal}
            >
              Nuevo enlace
            </Button>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>{databases.map(renderDatabaseCard)}</View>
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
              <View style={styles.modalTitleBox}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {editingDatabase ? "Editar enlace" : "Nuevo enlace Firebase"}
                </Text>

                <Text
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Vinculá un proyecto con su acceso directo a Firebase Console.
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
              <FormSection title="Proyecto" theme={theme} />

              {projects.length === 0 ? (
                <View
                  style={[
                    styles.noProjectsBox,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.borderSoft,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="folder-alert-outline"
                    size={22}
                    color={theme.colors.secondary}
                  />

                  <Text
                    style={[
                      styles.noProjectsText,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Primero necesitás crear un proyecto.
                  </Text>
                </View>
              ) : (
                <View style={styles.optionWrap}>
                  {projects.map((project) => {
                    const selected = projectId === project.id;
                    const color = project.color || theme.colors.primary;

                    return (
                      <ProjectOptionChip
                        key={project.id}
                        label={project.name}
                        selected={selected}
                        color={color}
                        theme={theme}
                        onPress={() => setProjectId(project.id)}
                      />
                    );
                  })}
                </View>
              )}

              <TextInput
                label="Enlace de Firebase Console"
                value={firebaseUrl}
                onChangeText={setFirebaseUrl}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://console.firebase.google.com/..."
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <TextInput
                label="Notas"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <Button
                mode="contained"
                icon={editingDatabase ? "content-save-outline" : "plus"}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                labelStyle={styles.saveButtonLabel}
                onPress={handleSaveDatabase}
              >
                {editingDatabase ? "Guardar cambios" : "Guardar enlace"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DeleteModal
        visible={deleteModalVisible}
        theme={theme}
        title="Eliminar enlace"
        text="¿Seguro que querés eliminar este enlace de Firebase? Esta acción no se puede deshacer."
        previewTitle={databaseToDelete?.projectName}
        previewSubtitle="Firebase Console"
        icon="database-remove-outline"
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteDatabase}
      />
    </ScrollView>
  );
}

function SmallInfoChip({ label, icon, color, softColor }) {
  return (
    <View
      style={[
        styles.smallInfoChip,
        {
          backgroundColor: softColor,
          borderColor: softColor,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={13} color={color} />

      <Text style={[styles.smallInfoChipText, { color }]}>{label}</Text>
    </View>
  );
}

function ProjectOptionChip({ label, selected, color, theme, onPress }) {
  const bg = selected
    ? theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.09)
    : theme.colors.surfaceSoft;

  return (
    <Chip
      compact
      icon="folder-outline"
      selected={selected}
      onPress={onPress}
      style={[
        styles.optionChip,
        {
          backgroundColor: bg,
          borderColor: selected
            ? hexToRgba(color, theme.dark ? 0.34 : 0.18)
            : theme.colors.borderSoft,
        },
      ]}
      textStyle={[
        styles.optionChipText,
        {
          color: selected ? color : theme.colors.secondary,
        },
      ]}
    >
      {label}
    </Chip>
  );
}

function FormSection({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
      {title}
    </Text>
  );
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
                size={29}
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
                  styles.deletePreview,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.borderSoft,
                  },
                ]}
              >
                <Text
                  style={[styles.deletePreviewTitle, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {previewTitle}
                </Text>

                {!!previewSubtitle && (
                  <Text
                    style={[
                      styles.deletePreviewSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {previewSubtitle}
                  </Text>
                )}
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

  databaseCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  cardContent: {
    padding: 14,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },

  projectIcon: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  projectLetter: {
    fontSize: 24,
    fontWeight: "900",
  },

  cardInfo: {
    flex: 1,
  },

  projectName: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 9,
  },

  smallInfoChip: {
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  smallInfoChipText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "900",
  },

  notesBox: {
    marginTop: 13,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notes: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 19,
  },

  cardDivider: {
    height: 1,
    marginTop: 14,
    marginBottom: 10,
  },

  cardActions: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  openFirebaseButton: {
    borderRadius: 999,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  openFirebaseButtonContent: {
    height: 42,
    paddingHorizontal: 10,
  },

  openFirebaseButtonLabel: {
    fontSize: 12.5,
    fontWeight: "900",
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: 4,
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

  modalTitleBox: {
    flex: 1,
    paddingRight: 10,
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
  },

  closeButton: {
    margin: 0,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 2,
  },

  optionChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  noProjectsBox: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  noProjectsText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
  },

  saveButton: {
    borderRadius: 18,
    marginTop: 12,
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

  deletePreview: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },

  deletePreviewTitle: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  deletePreviewSubtitle: {
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