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
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Searchbar,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

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

export default function NotesScreen({ theme }) {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingNote, setEditingNote] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterProjectSelectorOpen, setFilterProjectSelectorOpen] =
    useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const notesQuery = query(
      collection(db, "notes"),
      where("userId", "==", user.uid)
    );

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
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

      setNotes(data);
      setLoading(false);
    });

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

    return () => {
      unsubscribeNotes();
      unsubscribeProjects();
    };
  }, [user]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectId) || null;
  }, [projects, projectId]);

  const selectedFilterProject = useMemo(() => {
    if (filterProject === "todos") {
      return {
        id: "todos",
        name: "Todos los proyectos",
        color: theme.colors.primary,
        icon: "folder-multiple-outline",
        logoUrl: null,
        isSpecial: true,
      };
    }

    if (filterProject === "sinProyecto") {
      return {
        id: "sinProyecto",
        name: "Sin proyecto",
        color: theme.colors.paused || theme.colors.secondary,
        icon: "checkbox-blank-circle",
        logoUrl: null,
        isSpecial: true,
      };
    }

    const project = projects.find((item) => item.id === filterProject);

    return {
      id: project?.id || "todos",
      name: project?.name || "Proyecto",
      color: project?.color || theme.colors.primary,
      icon: "folder-outline",
      logoUrl: project?.logoUrl || null,
      isSpecial: false,
    };
  }, [filterProject, projects, theme]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;

    if (search.trim()) count += 1;
    if (filterProject !== "todos") count += 1;

    return count;
  }, [search, filterProject]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesProject =
        filterProject === "todos"
          ? true
          : filterProject === "sinProyecto"
          ? !note.projectId
          : note.projectId === filterProject;

      const text = `${note.title || ""} ${note.content || ""} ${
        note.projectName || ""
      }`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      return matchesProject && matchesSearch;
    });
  }, [notes, filterProject, search]);

  function resetForm() {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setProjectId(null);
    setProjectSelectorOpen(false);
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function openEditModal(note) {
    setEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setProjectId(note.projectId || null);
    setProjectSelectorOpen(false);
    setModalVisible(true);
  }

  function openDetailModal(note) {
    setSelectedNote(note);
    setDetailModalVisible(true);
  }

  function closeDetailModal() {
    setSelectedNote(null);
    setDetailModalVisible(false);
  }

  function openEditFromDetail() {
    if (!selectedNote) return;

    const note = selectedNote;

    closeDetailModal();

    setTimeout(() => {
      openEditModal(note);
    }, 120);
  }

  function openDeleteModal(note) {
    setNoteToDelete(note);
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    setNoteToDelete(null);
    setDeleteModalVisible(false);
  }

  async function handleSaveNote() {
    if (!title.trim() && !content.trim()) {
      Alert.alert("Nota vacía", "Escribí un título o contenido.");
      return;
    }

    try {
      const selectedProject = projects.find(
        (project) => project.id === projectId
      );

      const payload = {
        userId: user.uid,
        title: title.trim(),
        content: content.trim(),
        category: "General",
        projectId: projectId || null,
        projectName: selectedProject?.name || null,
        projectColor: selectedProject?.color || null,
        projectLogoUrl: selectedProject?.logoUrl || null,
        updatedAt: serverTimestamp(),
      };

      if (editingNote) {
        await updateDoc(doc(db, "notes", editingNote.id), payload);
      } else {
        await addDoc(collection(db, "notes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar la nota.");
    }
  }

  async function confirmDeleteNote() {
    if (!noteToDelete?.id) return;

    try {
      await deleteDoc(doc(db, "notes", noteToDelete.id));

      if (selectedNote?.id === noteToDelete.id) {
        closeDetailModal();
      }

      closeDeleteModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo eliminar la nota.");
    }
  }

  async function copyNote(note) {
    const text = `${note.title || ""}\n\n${note.content || ""}`.trim();

    if (!text) {
      Alert.alert("Sin contenido", "Esta nota no tiene contenido para copiar.");
      return;
    }

    await Clipboard.setStringAsync(text);
    Alert.alert("Copiado", "La nota fue copiada al portapapeles.");
  }

  function resetFilters() {
    setSearch("");
    setFilterProject("todos");
    setFilterProjectSelectorOpen(false);
  }

  function renderNoteCard(note) {
    return (
      <Card
        key={note.id}
        mode="contained"
        onPress={() => openDetailModal(note)}
        style={[
          styles.noteCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.noteCardContent}>
          <View style={styles.noteHeader}>
            <ProjectBadge item={note} theme={theme} size={responsive(52, 68)} />

            <View style={styles.noteInfo}>
              <Text
                style={[styles.noteTitle, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {note.title || "Sin título"}
              </Text>

              <Text
                style={[styles.noteMeta, { color: theme.colors.secondary }]}
                numberOfLines={1}
              >
                {note.projectName || "Sin proyecto"}
              </Text>
            </View>
          </View>

          {!!note.content && (
            <View
              style={[
                styles.contentBox,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.borderSoft,
                },
              ]}
            >
              <Text
                style={[styles.noteContent, { color: theme.colors.secondary }]}
                numberOfLines={5}
              >
                {note.content}
              </Text>
            </View>
          )}

          <Divider
            style={[
              styles.cardDivider,
              {
                backgroundColor: theme.colors.borderSoft,
              },
            ]}
          />

          <View style={styles.actionsRow}>
            <Button
              mode="contained-tonal"
              icon="content-copy"
              textColor={theme.colors.primary}
              buttonColor={theme.colors.primarySoft}
              style={styles.copyButton}
              contentStyle={styles.copyButtonContent}
              labelStyle={styles.copyButtonLabel}
              onPress={() => copyNote(note)}
            >
              Copiar
            </Button>

            <View style={styles.iconActions}>
              <IconButton
                icon="pencil-outline"
                size={responsive(20, 26)}
                mode="contained-tonal"
                iconColor={theme.colors.primary}
                containerColor={theme.colors.primarySoft}
                style={styles.actionIcon}
                onPress={() => openEditModal(note)}
              />

              <IconButton
                icon="delete-outline"
                size={responsive(20, 26)}
                mode="contained-tonal"
                iconColor={theme.colors.danger}
                containerColor={theme.colors.dangerSoft}
                style={styles.actionIcon}
                onPress={() => openDeleteModal(note)}
              />
            </View>
          </View>
        </View>
      </Card>
    );
  }

  const detailProjectColor = selectedNote?.projectColor || theme.colors.primary;

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
            Mis Notas
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Guardá ideas, bugs, comandos, recordatorios y apuntes rápidos.
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
        Nueva nota
      </Button>

      <Card
        mode="contained"
        style={[
          styles.filtersCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <TouchableRipple
          rippleColor={theme.colors.primarySoft}
          onPress={() => setFiltersOpen((prev) => !prev)}
        >
          <View style={styles.filtersHeader}>
            <View
              style={[
                styles.filtersIconBox,
                { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={responsive(20, 26)}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles.filtersTextBox}>
              <Text style={[styles.filtersTitle, { color: theme.colors.text }]}>
                Filtros
              </Text>

              <Text
                style={[
                  styles.filtersSubtitle,
                  { color: theme.colors.secondary },
                ]}
                numberOfLines={1}
              >
                {activeFiltersCount > 0
                  ? `${activeFiltersCount} filtro activo`
                  : "Buscar por texto o proyecto"}
              </Text>
            </View>

            {activeFiltersCount > 0 && (
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: theme.colors.primarySoft },
                ]}
              >
                <Text
                  style={[
                    styles.activeBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {activeFiltersCount}
                </Text>
              </View>
            )}

            <MaterialCommunityIcons
              name={filtersOpen ? "chevron-up" : "chevron-down"}
              size={responsive(24, 30)}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableRipple>

        {filtersOpen && (
          <View style={styles.filtersBody}>
            <Searchbar
              placeholder="Buscar notas..."
              value={search}
              onChangeText={setSearch}
              style={[
                styles.search,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.borderSoft,
                },
              ]}
              inputStyle={[styles.searchInput, { color: theme.colors.text }]}
              iconColor={theme.colors.secondary}
              placeholderTextColor={theme.colors.secondary}
            />

            <FormSection title="Proyecto" theme={theme} />

            <TouchableRipple
              onPress={() => setFilterProjectSelectorOpen((prev) => !prev)}
              rippleColor={theme.colors.primarySoft}
              style={[
                styles.projectSelectorCard,
                {
                  backgroundColor: getProjectSelectorBackground(
                    theme,
                    selectedFilterProject.color,
                    filterProject !== "todos"
                  ),
                  borderColor: getProjectSelectorBorder(
                    theme,
                    selectedFilterProject.color,
                    filterProject !== "todos"
                  ),
                },
              ]}
            >
              <View style={styles.projectSelectorContent}>
                <ProjectSelectorIcon
                  theme={theme}
                  color={selectedFilterProject.color}
                  logoUrl={selectedFilterProject.logoUrl}
                  icon={selectedFilterProject.icon}
                />

                <View style={styles.projectSelectorText}>
                  <Text
                    style={[
                      styles.projectSelectorTitle,
                      {
                        color:
                          filterProject === "todos"
                            ? theme.colors.text
                            : selectedFilterProject.color,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedFilterProject.name}
                  </Text>

                  <Text
                    style={[
                      styles.projectSelectorSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Tocá para elegir un proyecto
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name={filterProjectSelectorOpen ? "chevron-up" : "chevron-down"}
                  size={responsive(23, 29)}
                  color={theme.colors.secondary}
                />
              </View>
            </TouchableRipple>

            {filterProjectSelectorOpen && (
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
                  <ProjectDropdownOption
                    label="Todos los proyectos"
                    selected={filterProject === "todos"}
                    color={theme.colors.primary}
                    theme={theme}
                    icon="folder-multiple-outline"
                    onPress={() => {
                      setFilterProject("todos");
                      setFilterProjectSelectorOpen(false);
                    }}
                  />

                  <ProjectDropdownOption
                    label="Sin proyecto"
                    selected={filterProject === "sinProyecto"}
                    color={theme.colors.paused || theme.colors.secondary}
                    theme={theme}
                    icon="checkbox-blank-circle"
                    onPress={() => {
                      setFilterProject("sinProyecto");
                      setFilterProjectSelectorOpen(false);
                    }}
                  />

                  {projects.map((project) => (
                    <ProjectDropdownOption
                      key={project.id}
                      label={project.name}
                      selected={filterProject === project.id}
                      color={project.color || theme.colors.primary}
                      theme={theme}
                      logoUrl={project.logoUrl}
                      icon="folder-outline"
                      onPress={() => {
                        setFilterProject(project.id);
                        setFilterProjectSelectorOpen(false);
                      }}
                    />
                  ))}
                </View>
              </Card>
            )}

            {activeFiltersCount > 0 && (
              <Button
                mode="contained-tonal"
                icon="filter-remove-outline"
                style={styles.clearFiltersButton}
                contentStyle={styles.clearFiltersButtonContent}
                labelStyle={styles.clearFiltersButtonLabel}
                onPress={resetFilters}
              >
                Limpiar filtros
              </Button>
            )}
          </View>
        )}
      </Card>

      {loading ? (
        <NotesSkeleton theme={theme} />
      ) : filteredNotes.length === 0 ? (
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
                name="note-plus-outline"
                size={responsive(27, 35)}
                color={theme.colors.primary}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Sin notas para mostrar
            </Text>

            <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
              Agregá una nota rápida para ideas, bugs o comandos útiles.
            </Text>

            <Button
              mode="contained"
              icon="plus"
              style={styles.emptyButton}
              contentStyle={styles.emptyButtonContent}
              labelStyle={styles.emptyButtonLabel}
              onPress={openCreateModal}
            >
              Nueva nota
            </Button>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>{filteredNotes.map(renderNoteCard)}</View>
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
                    {editingNote ? "Editar nota" : "Nueva nota"}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Guardá una idea, comando, bug o recordatorio rápido.
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
                <TextInput
                  label="Título"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                />

                <FormSection title="Proyecto relacionado" theme={theme} />

                <TouchableRipple
                  onPress={() => setProjectSelectorOpen((prev) => !prev)}
                  rippleColor={theme.colors.primarySoft}
                  style={[
                    styles.projectSelectorCard,
                    {
                      backgroundColor: getProjectSelectorBackground(
                        theme,
                        selectedProject?.color ||
                          theme.colors.paused ||
                          theme.colors.secondary,
                        !!selectedProject
                      ),
                      borderColor: getProjectSelectorBorder(
                        theme,
                        selectedProject?.color ||
                          theme.colors.paused ||
                          theme.colors.secondary,
                        !!selectedProject
                      ),
                    },
                  ]}
                >
                  <View style={styles.projectSelectorContent}>
                    <ProjectSelectorIcon
                      theme={theme}
                      color={
                        selectedProject?.color ||
                        theme.colors.paused ||
                        theme.colors.secondary
                      }
                      logoUrl={selectedProject?.logoUrl}
                      letter={selectedProject?.name?.charAt(0)?.toUpperCase()}
                      icon={
                        selectedProject ? "folder-outline" : "checkbox-blank-circle"
                      }
                    />

                    <View style={styles.projectSelectorText}>
                      <Text
                        style={[
                          styles.projectSelectorTitle,
                          {
                            color: selectedProject?.color || theme.colors.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedProject?.name || "Sin proyecto"}
                      </Text>

                      <Text
                        style={[
                          styles.projectSelectorSubtitle,
                          { color: theme.colors.secondary },
                        ]}
                      >
                        Tocá para elegir un proyecto
                      </Text>
                    </View>

                    <MaterialCommunityIcons
                      name={projectSelectorOpen ? "chevron-up" : "chevron-down"}
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
                      <ProjectDropdownOption
                        label="Sin proyecto"
                        selected={!projectId}
                        color={theme.colors.paused || theme.colors.secondary}
                        theme={theme}
                        icon="checkbox-blank-circle"
                        onPress={() => {
                          setProjectId(null);
                          setProjectSelectorOpen(false);
                        }}
                      />

                      {projects.map((project) => (
                        <ProjectDropdownOption
                          key={project.id}
                          label={project.name}
                          selected={projectId === project.id}
                          color={project.color || theme.colors.primary}
                          theme={theme}
                          logoUrl={project.logoUrl}
                          icon="folder-outline"
                          onPress={() => {
                            setProjectId(project.id);
                            setProjectSelectorOpen(false);
                          }}
                        />
                      ))}
                    </View>
                  </Card>
                )}

                <TextInput
                  label="Contenido"
                  value={content}
                  onChangeText={setContent}
                  mode="outlined"
                  multiline
                  numberOfLines={8}
                  style={styles.textArea}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  textAlignVertical="top"
                />

                <Button
                  mode="contained"
                  icon={editingNote ? "content-save-outline" : "plus"}
                  style={styles.saveButton}
                  contentStyle={styles.saveButtonContent}
                  labelStyle={styles.saveButtonLabel}
                  onPress={handleSaveNote}
                >
                  {editingNote ? "Guardar cambios" : "Guardar nota"}
                </Button>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={detailModalVisible} animationType="fade" transparent>
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
                <ProjectSelectorIcon
                  theme={theme}
                  color={detailProjectColor}
                  logoUrl={selectedNote?.projectLogoUrl}
                  letter={selectedNote?.projectName?.charAt(0)?.toUpperCase()}
                  icon="note-text-outline"
                  size="detail"
                />

                <View style={styles.detailHeaderText}>
                  <Text
                    style={[
                      styles.detailProjectName,
                      { color: theme.colors.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedNote?.projectName || "Sin proyecto"}
                  </Text>

                  <Text style={[styles.detailTitle, { color: theme.colors.text }]}>
                    {selectedNote?.title || "Sin título"}
                  </Text>
                </View>

                <IconButton
                  icon="close"
                  size={responsive(21, 27)}
                  iconColor={theme.colors.secondary}
                  style={styles.closeButton}
                  onPress={closeDetailModal}
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
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
                contentContainerStyle={styles.detailScrollContent}
              >
                <Text style={[styles.detailSectionTitle, { color: theme.colors.text }]}>
                  Contenido
                </Text>

                <Text
                  style={[
                    styles.detailDescription,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {selectedNote?.content?.trim()
                    ? selectedNote.content
                    : "Esta nota no tiene contenido."}
                </Text>
              </ScrollView>

              <View style={styles.detailActions}>
                <TouchableRipple
                  borderless
                  rippleColor={theme.colors.primarySoft}
                  style={[
                    styles.detailEditFancyButton,
                    {
                      backgroundColor: theme.colors.primarySoft,
                      borderColor: hexToRgba(
                        theme.colors.primary,
                        theme.dark ? 0.34 : 0.18
                      ),
                    },
                  ]}
                  onPress={openEditFromDetail}
                >
                  <View style={styles.detailEditFancyContent}>
                    <Text
                      style={[
                        styles.detailEditFancyText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Editar nota
                    </Text>
                  </View>
                </TouchableRipple>

                <Button
                  mode="contained"
                  style={styles.detailCloseButton}
                  contentStyle={styles.detailButtonContent}
                  labelStyle={styles.detailButtonLabel}
                  onPress={closeDetailModal}
                >
                  Cerrar
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </Modal>

      <DeleteModal
        visible={deleteModalVisible}
        theme={theme}
        title="Eliminar nota"
        text="¿Seguro que querés eliminar esta nota? Esta acción no se puede deshacer."
        previewTitle={noteToDelete?.title || "Sin título"}
        previewSubtitle={noteToDelete?.projectName || "Sin proyecto"}
        icon="note-remove-outline"
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteNote}
      />
    </ScrollView>
  );
}

function ProjectBadge({ item, theme, size = 52 }) {
  const color = item.projectColor || theme.colors.primary;
  const logoUrl = item.projectLogoUrl;

  return (
    <View
      style={[
        styles.projectBadge,
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
      ) : item.projectName ? (
        <Text style={[styles.projectLetter, { color }]}>
          {item.projectName.charAt(0).toUpperCase()}
        </Text>
      ) : (
        <MaterialCommunityIcons
          name="note-text-outline"
          size={responsive(24, 31)}
          color={theme.colors.primary}
        />
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
  size = "normal",
}) {
  const boxStyle =
    size === "detail" ? styles.detailProjectIcon : styles.projectSelectorIconBox;

  const iconSize = size === "detail" ? responsive(22, 29) : responsive(20, 26);

  return (
    <View
      style={[
        boxStyle,
        {
          backgroundColor: getProjectIconBackground(theme, color),
          borderColor: getProjectIconBorder(theme, color),
        },
      ]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : letter ? (
        <Text
          style={[
            size === "detail"
              ? styles.detailProjectLetter
              : styles.projectSelectorLetter,
            { color },
          ]}
        >
          {letter}
        </Text>
      ) : (
        <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
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
  icon = "folder-outline",
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
              name={icon}
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

function FormSection({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
      {title}
    </Text>
  );
}

function NotesSkeleton({ theme }) {
  return (
    <View style={styles.list}>
      {[1, 2, 3, 4].map((item) => (
        <NoteSkeletonCard key={item} theme={theme} />
      ))}
    </View>
  );
}

function NoteSkeletonCard({ theme }) {
  const skeleton = getSkeletonColors(theme);

  return (
    <Card
      mode="contained"
      style={[
        styles.noteCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.noteCardContent}>
        <View style={styles.noteHeader}>
          <SkeletonBlock style={styles.skeletonProjectBadge} color={skeleton.strong} />

          <View style={styles.noteInfo}>
            <SkeletonBlock style={styles.skeletonTitle} color={skeleton.strong} />
            <SkeletonBlock style={styles.skeletonSubtitle} color={skeleton.soft} />
          </View>
        </View>

        <View
          style={[
            styles.contentBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <SkeletonBlock style={styles.skeletonContentLine} color={skeleton.soft} />
          <SkeletonBlock style={styles.skeletonContentLineTwo} color={skeleton.soft} />
          <SkeletonBlock
            style={styles.skeletonContentLineSmall}
            color={skeleton.soft}
          />
        </View>

        <Divider
          style={[
            styles.cardDivider,
            {
              backgroundColor: theme.colors.borderSoft,
            },
          ]}
        />

        <View style={styles.actionsRow}>
          <SkeletonBlock style={styles.skeletonCopyButton} color={skeleton.strong} />

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
                  style={[
                    styles.deletePreviewTitle,
                    { color: theme.colors.text },
                  ]}
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

  filtersCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(14, 20),
  },

  filtersHeader: {
    minHeight: responsive(70, 88),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 22),
    paddingVertical: responsive(11, 15),
  },

  filtersIconBox: {
    width: responsive(40, 54),
    height: responsive(40, 54),
    borderRadius: responsive(14, 19),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
  },

  filtersTextBox: {
    flex: 1,
    paddingRight: responsive(8, 12),
  },

  filtersTitle: {
    fontSize: responsive(15, 18),
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  filtersSubtitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(17, 21),
  },

  activeBadge: {
    minWidth: responsive(26, 34),
    height: responsive(26, 34),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(8, 12),
    paddingHorizontal: responsive(8, 11),
  },

  activeBadgeText: {
    fontSize: responsive(12, 14),
    fontWeight: "900",
  },

  filtersBody: {
    paddingHorizontal: responsive(14, 22),
    paddingBottom: responsive(14, 22),
  },

  search: {
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    elevation: 0,
    marginBottom: responsive(12, 18),
  },

  searchInput: {
    fontSize: responsive(14, 16),
  },

  clearFiltersButton: {
    borderRadius: responsive(16, 20),
    elevation: 0,
    marginTop: responsive(2, 6),
  },

  clearFiltersButtonContent: {
    height: responsive(42, 52),
  },

  clearFiltersButtonLabel: {
    fontSize: responsive(13, 15),
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    marginTop: responsive(4, 8),
    marginBottom: responsive(10, 14),
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

  noteCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  noteCardContent: {
    padding: responsive(14, 22),
  },

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectBadge: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: responsive(12, 18),
    borderWidth: 1,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  projectLetter: {
    fontSize: responsive(22, 30),
    fontWeight: "900",
  },

  noteInfo: {
    flex: 1,
  },

  noteTitle: {
    fontSize: responsive(17, 22),
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: responsive(22, 28),
  },

  noteMeta: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  contentBox: {
    marginTop: responsive(13, 18),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
  },

  noteContent: {
    fontSize: responsive(13, 16),
    lineHeight: responsive(20, 24),
  },

  cardDivider: {
    height: 1,
    marginTop: responsive(14, 20),
    marginBottom: responsive(10, 14),
  },

  actionsRow: {
    minHeight: responsive(42, 56),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  copyButton: {
    borderRadius: 999,
    elevation: 0,
  },

  copyButtonContent: {
    height: responsive(38, 48),
    paddingHorizontal: responsive(2, 8),
  },

  copyButtonLabel: {
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

  input: {
    marginBottom: responsive(12, 16),
  },

  inputContent: {
    fontSize: responsive(14, 16),
  },

  inputOutline: {
    borderRadius: responsive(16, 20),
  },

  textArea: {
    marginBottom: responsive(12, 16),
    minHeight: responsive(180, 240),
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

  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    paddingHorizontal: responsive(20, 34),
  },

  detailModal: {
    width: "100%",
    maxWidth: responsive(undefined, 680),
    alignSelf: "center",
    maxHeight: responsive("88%", "82%"),
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

  detailProjectIcon: {
    width: responsive(50, 66),
    height: responsive(50, 66),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: responsive(12, 16),
  },

  detailProjectLetter: {
    fontSize: responsive(21, 29),
    fontWeight: "900",
  },

  detailHeaderText: {
    flex: 1,
    paddingTop: responsive(2, 4),
  },

  detailProjectName: {
    fontSize: responsive(12.5, 15),
    fontWeight: "800",
    marginBottom: responsive(4, 6),
  },

  detailTitle: {
    fontSize: responsive(20, 26),
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: responsive(26, 33),
  },

  detailDivider: {
    height: 1,
    marginTop: responsive(16, 22),
    marginBottom: responsive(14, 20),
  },

  detailScrollArea: {
    flexShrink: 1,
    maxHeight: responsive(430, 560),
  },

  detailScrollContent: {
    paddingBottom: responsive(95, 115),
  },

  detailSectionTitle: {
    fontSize: responsive(13, 15),
    fontWeight: "900",
    marginBottom: responsive(8, 12),
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  detailDescription: {
    fontSize: responsive(14.5, 17),
    lineHeight: responsive(22, 27),
    fontWeight: "600",
  },

  detailActions: {
    flexDirection: "row",
    gap: responsive(10, 14),
    marginTop: responsive(14, 22),
  },

  detailEditFancyButton: {
    flex: 1.15,
    borderRadius: responsive(16, 20),
    borderWidth: 1,
    overflow: "hidden",
  },

  detailEditFancyContent: {
    height: responsive(48, 58),
    paddingLeft: responsive(8, 12),
    paddingRight: responsive(14, 18),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  detailEditIconBox: {
    width: responsive(31, 38),
    height: responsive(31, 38),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(8, 10),
  },

  detailEditFancyText: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },

  detailCloseButton: {
    flex: 0.85,
    borderRadius: responsive(16, 20),
    elevation: 0,
  },

  detailButtonContent: {
    height: responsive(48, 58),
  },

  detailButtonLabel: {
    fontSize: responsive(13.5, 16),
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

  skeletonProjectBadge: {
    width: responsive(52, 68),
    height: responsive(52, 68),
    borderRadius: responsive(18, 23),
    marginRight: responsive(12, 18),
  },

  skeletonTitle: {
    width: "82%",
    height: responsive(17, 22),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonSubtitle: {
    width: "54%",
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonContentLine: {
    width: "94%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginBottom: responsive(9, 12),
  },

  skeletonContentLineTwo: {
    width: "82%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginBottom: responsive(9, 12),
  },

  skeletonContentLineSmall: {
    width: "58%",
    height: responsive(13, 16),
    borderRadius: 999,
  },

  skeletonCopyButton: {
    width: responsive(94, 124),
    height: responsive(38, 48),
    borderRadius: 999,
  },

  skeletonAction: {
    width: responsive(40, 50),
    height: responsive(40, 50),
    borderRadius: 999,
    marginLeft: responsive(4, 7),
  },
});