//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
  TouchableRipple,
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

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

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

function getProjectIconBackground(theme, projectColor) {
  if (theme.dark) {
    return "rgba(248, 250, 252, 0.94)";
  }

  return hexToRgba(projectColor, 0.1);
}

function getProjectIconBorder(theme, projectColor) {
  if (theme.dark) {
    return hexToRgba(projectColor, 0.38);
  }

  return hexToRgba(projectColor, 0.18);
}

function getProjectSelectorBackground(theme, projectColor, selected) {
  if (!selected) {
    return theme.colors.surfaceSoft;
  }

  if (theme.dark) {
    return "rgba(248, 250, 252, 0.94)";
  }

  return hexToRgba(projectColor, 0.09);
}

function getProjectSelectorBorder(theme, projectColor, selected) {
  if (!selected) {
    return theme.colors.borderSoft;
  }

  if (theme.dark) {
    return hexToRgba(projectColor, 0.42);
  }

  return hexToRgba(projectColor, 0.2);
}

function getSkeletonColors(theme) {
  return {
    soft: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
    strong: theme.dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.11)",
  };
}

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
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
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
    return projects.find((project) => project.id === projectId) || null;
  }, [projects, projectId]);

  function resetForm() {
    setEditingDatabase(null);
    setProjectId(null);
    setProjectSelectorOpen(false);
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
    setProjectSelectorOpen(false);
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
            <ProjectIcon item={item} theme={theme} size={responsive(56, 72)} />

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
                size={responsive(17, 22)}
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
                size={responsive(20, 26)}
                mode="contained-tonal"
                iconColor={theme.colors.primary}
                containerColor={theme.colors.primarySoft}
                style={styles.actionIcon}
                onPress={() => openEditModal(item)}
              />

              <IconButton
                icon="delete-outline"
                size={responsive(20, 26)}
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
        <DatabasesSkeleton theme={theme} />
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
                size={responsive(27, 35)}
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
              contentStyle={styles.emptyButtonContent}
              labelStyle={styles.emptyButtonLabel}
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
                    {editingDatabase ? "Editar enlace" : "Nuevo enlace Firebase"}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Vinculá un proyecto con su acceso directo a Firebase Console.
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
                      size={responsive(22, 28)}
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
                  <>
                    <TouchableRipple
                      onPress={() => setProjectSelectorOpen((prev) => !prev)}
                      rippleColor={theme.colors.primarySoft}
                      style={[
                        styles.projectSelectorCard,
                        {
                          backgroundColor: getProjectSelectorBackground(
                            theme,
                            selectedProject?.color || theme.colors.primary,
                            !!selectedProject
                          ),
                          borderColor: getProjectSelectorBorder(
                            theme,
                            selectedProject?.color || theme.colors.primary,
                            !!selectedProject
                          ),
                        },
                      ]}
                    >
                      <View style={styles.projectSelectorContent}>
                        <ProjectSelectorIcon
                          theme={theme}
                          color={selectedProject?.color || theme.colors.primary}
                          logoUrl={selectedProject?.logoUrl}
                          letter={selectedProject?.name?.charAt(0)?.toUpperCase()}
                          icon={
                            selectedProject
                              ? "folder-outline"
                              : "folder-search-outline"
                          }
                        />

                        <View style={styles.projectSelectorText}>
                          <Text
                            style={[
                              styles.projectSelectorTitle,
                              {
                                color: selectedProject
                                  ? selectedProject.color || theme.colors.primary
                                  : theme.colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {selectedProject?.name || "Seleccionar proyecto"}
                          </Text>

                          <Text
                            style={[
                              styles.projectSelectorSubtitle,
                              { color: theme.colors.secondary },
                            ]}
                          >
                            Tocá para desplegar la lista
                          </Text>
                        </View>

                        <MaterialCommunityIcons
                          name={
                            projectSelectorOpen ? "chevron-up" : "chevron-down"
                          }
                          size={responsive(23, 29)}
                          color={theme.colors.secondary}
                        />
                      </View>
                    </TouchableRipple>

                    {projectSelectorOpen && (
                      <Card
                        mode="contained"
                        style={[
                          styles.projectOptionsCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.borderSoft,
                          },
                        ]}
                      >
                        <View style={styles.projectOptionsContent}>
                          {projects.map((project) => {
                            const selected = projectId === project.id;
                            const color = project.color || theme.colors.primary;

                            return (
                              <ProjectDropdownOption
                                key={project.id}
                                label={project.name}
                                selected={selected}
                                color={color}
                                theme={theme}
                                logoUrl={project.logoUrl}
                                onPress={() => {
                                  setProjectId(project.id);
                                  setProjectSelectorOpen(false);
                                }}
                              />
                            );
                          })}
                        </View>
                      </Card>
                    )}
                  </>
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
                  contentStyle={styles.inputContent}
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
                  contentStyle={styles.inputContent}
                  textAlignVertical="top"
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
        </KeyboardAvoidingView>
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

function ProjectIcon({ item, theme, size = 56 }) {
  const color = item?.projectColor || item?.color || theme.colors.primary;
  const logoUrl = item?.projectLogoUrl || item?.logoUrl;

  return (
    <View
      style={[
        styles.projectIcon,
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
        <Text style={[styles.projectLetter, { color }]}>
          {(item?.projectName || item?.name || "P").charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function ProjectSelectorIcon({
  theme,
  color,
  logoUrl,
  letter,
  icon = "folder-outline",
}) {
  return (
    <View
      style={[
        styles.projectSelectorIconBox,
        {
          backgroundColor: getProjectIconBackground(theme, color),
          borderColor: getProjectIconBorder(theme, color),
        },
      ]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : letter ? (
        <Text style={[styles.projectSelectorLetter, { color }]}>{letter}</Text>
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={responsive(20, 26)}
          color={color}
        />
      )}
    </View>
  );
}

function ProjectDropdownOption({
  label,
  selected,
  color,
  theme,
  logoUrl,
  onPress,
}) {
  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={hexToRgba(color, 0.12)}
      style={[
        styles.projectDropdownOption,
        {
          backgroundColor: getProjectSelectorBackground(theme, color, selected),
          borderColor: getProjectSelectorBorder(theme, color, selected),
        },
      ]}
    >
      <View style={styles.projectDropdownContent}>
        <View
          style={[
            styles.projectDropdownIcon,
            {
              backgroundColor: getProjectIconBackground(theme, color),
              borderColor: getProjectIconBorder(theme, color),
            },
          ]}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} />
          ) : (
            <MaterialCommunityIcons
              name="folder-outline"
              size={responsive(19, 25)}
              color={color}
            />
          )}
        </View>

        <Text
          style={[
            styles.projectDropdownText,
            {
              color: selected ? color : theme.colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {selected && (
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={responsive(19, 25)}
            color={color}
          />
        )}
      </View>
    </TouchableRipple>
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
      <MaterialCommunityIcons
        name={icon}
        size={responsive(13, 17)}
        color={color}
      />

      <Text style={[styles.smallInfoChipText, { color }]}>{label}</Text>
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

function DatabasesSkeleton({ theme }) {
  return (
    <View style={styles.list}>
      {[1, 2, 3, 4].map((item) => (
        <DatabaseSkeletonCard key={item} theme={theme} />
      ))}
    </View>
  );
}

function DatabaseSkeletonCard({ theme }) {
  const skeleton = getSkeletonColors(theme);

  return (
    <Card
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
          <SkeletonBlock style={styles.skeletonProjectIcon} color={skeleton.strong} />

          <View style={styles.cardInfo}>
            <SkeletonBlock style={styles.skeletonTitle} color={skeleton.strong} />
            <SkeletonBlock style={styles.skeletonSubtitle} color={skeleton.soft} />

            <View style={styles.skeletonChipsRow}>
              <SkeletonBlock style={styles.skeletonChip} color={skeleton.strong} />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.notesBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <SkeletonBlock style={styles.skeletonNoteIcon} color={skeleton.strong} />

          <View style={styles.skeletonNoteTextWrap}>
            <SkeletonBlock style={styles.skeletonNoteLine} color={skeleton.soft} />
            <SkeletonBlock
              style={styles.skeletonNoteLineSmall}
              color={skeleton.soft}
            />
          </View>
        </View>

        <View
          style={[
            styles.cardDivider,
            {
              backgroundColor: theme.colors.borderSoft,
            },
          ]}
        />

        <View style={styles.cardActions}>
          <SkeletonBlock style={styles.skeletonOpenButton} color={skeleton.strong} />

          <View style={styles.iconActions}>
            <SkeletonBlock style={styles.skeletonAction} color={skeleton.strong} />
            <SkeletonBlock style={styles.skeletonAction} color={skeleton.strong} />
          </View>
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
    width: "100%",
    maxWidth: responsive(undefined, 860),
    alignSelf: "center",
    paddingHorizontal: responsive(20, 34),
    paddingTop: responsive(6, 18),
    paddingBottom: responsive(155, 185),
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
    maxWidth: responsive(undefined, 460),
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

  databaseCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  cardContent: {
    padding: responsive(14, 22),
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: responsive(2, 4),
  },

  projectIcon: {
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

  projectLetter: {
    fontSize: responsive(24, 32),
    fontWeight: "900",
  },

  cardInfo: {
    flex: 1,
  },

  projectName: {
    fontSize: responsive(17, 22),
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  cardSubtitle: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(7, 10),
    marginTop: responsive(9, 13),
  },

  smallInfoChip: {
    height: responsive(28, 35),
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: responsive(9, 13),
    flexDirection: "row",
    alignItems: "center",
  },

  smallInfoChipText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(11, 13),
    fontWeight: "900",
  },

  notesBox: {
    marginTop: responsive(13, 18),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notes: {
    flex: 1,
    marginLeft: responsive(8, 11),
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 24),
  },

  cardDivider: {
    height: 1,
    marginTop: responsive(14, 20),
    marginBottom: responsive(10, 14),
  },

  cardActions: {
    minHeight: responsive(44, 56),
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
    height: responsive(42, 52),
    paddingHorizontal: responsive(10, 16),
  },

  openFirebaseButtonLabel: {
    fontSize: responsive(12.5, 15),
    fontWeight: "900",
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: responsive(4, 7),
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
    paddingBottom: responsive(90, 110),
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
  },

  closeButton: {
    margin: 0,
  },

  sectionTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    marginTop: responsive(6, 10),
    marginBottom: responsive(10, 14),
  },

  noProjectsBox: {
    minHeight: responsive(58, 74),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(14, 20),
  },

  noProjectsText: {
    flex: 1,
    marginLeft: responsive(9, 12),
    fontSize: responsive(13, 15.5),
    fontWeight: "700",
    lineHeight: responsive(18, 22),
  },

  projectSelectorCard: {
    borderRadius: responsive(20, 26),
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: responsive(12, 16),
  },

  projectSelectorContent: {
    minHeight: responsive(64, 80),
    paddingHorizontal: responsive(13, 18),
    paddingVertical: responsive(10, 14),
    flexDirection: "row",
    alignItems: "center",
  },

  projectSelectorIconBox: {
    width: responsive(42, 54),
    height: responsive(42, 54),
    borderRadius: responsive(15, 19),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
    overflow: "hidden",
  },

  projectSelectorLetter: {
    fontSize: responsive(18, 24),
    fontWeight: "900",
  },

  projectSelectorText: {
    flex: 1,
  },

  projectSelectorTitle: {
    fontSize: responsive(14.5, 17),
    fontWeight: "900",
  },

  projectSelectorSubtitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  projectOptionsCard: {
    borderRadius: responsive(22, 28),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(14, 20),
  },

  projectOptionsContent: {
    padding: responsive(12, 18),
    gap: responsive(8, 11),
  },

  projectDropdownOption: {
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    overflow: "hidden",
  },

  projectDropdownContent: {
    minHeight: responsive(54, 68),
    paddingHorizontal: responsive(11, 16),
    paddingVertical: responsive(8, 12),
    flexDirection: "row",
    alignItems: "center",
  },

  projectDropdownIcon: {
    width: responsive(36, 48),
    height: responsive(36, 48),
    borderRadius: responsive(13, 17),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(10, 14),
    overflow: "hidden",
  },

  projectDropdownText: {
    flex: 1,
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
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

  saveButton: {
    borderRadius: responsive(18, 22),
    marginTop: responsive(12, 18),
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

  deletePreview: {
    width: "100%",
    borderRadius: responsive(18, 22),
    borderWidth: 1,
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(12, 16),
    marginTop: responsive(16, 22),
  },

  deletePreviewTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    textAlign: "center",
  },

  deletePreviewSubtitle: {
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

  skeletonProjectIcon: {
    width: responsive(56, 72),
    height: responsive(56, 72),
    borderRadius: responsive(19, 24),
    marginRight: responsive(12, 18),
  },

  skeletonTitle: {
    width: "82%",
    height: responsive(17, 22),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonSubtitle: {
    width: "58%",
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonChipsRow: {
    flexDirection: "row",
    gap: responsive(7, 10),
    marginTop: responsive(12, 16),
  },

  skeletonChip: {
    width: responsive(88, 116),
    height: responsive(28, 35),
    borderRadius: 999,
  },

  skeletonNoteIcon: {
    width: responsive(18, 23),
    height: responsive(18, 23),
    borderRadius: 999,
    marginRight: responsive(8, 11),
  },

  skeletonNoteTextWrap: {
    flex: 1,
  },

  skeletonNoteLine: {
    width: "92%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonNoteLineSmall: {
    width: "66%",
    height: responsive(13, 16),
    borderRadius: 999,
  },

  skeletonOpenButton: {
    width: responsive(142, 178),
    height: responsive(42, 52),
    borderRadius: 999,
  },

  skeletonAction: {
    width: responsive(40, 50),
    height: responsive(40, 50),
    borderRadius: 999,
    marginLeft: responsive(4, 7),
  },
});