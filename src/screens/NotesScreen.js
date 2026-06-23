//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
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

export default function NotesScreen({ theme }) {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingNote, setEditingNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState(null);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    setModalVisible(true);
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
      const selectedProject = projects.find((project) => project.id === projectId);

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
  }

  function ProjectBadge({ item, size = 52 }) {
    const color = item.projectColor || theme.colors.primary;
    const logoUrl = item.projectLogoUrl;

    const softColor = theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.1);

    return (
      <View
        style={[
          styles.projectBadge,
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
        ) : item.projectName ? (
          <Text style={[styles.projectLetter, { color }]}>
            {item.projectName.charAt(0).toUpperCase()}
          </Text>
        ) : (
          <MaterialCommunityIcons
            name="note-text-outline"
            size={24}
            color={theme.colors.primary}
          />
        )}
      </View>
    );
  }

  function renderNoteCard(note) {
    return (
      <Card
        key={note.id}
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
            <ProjectBadge item={note} />

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
                size={20}
                mode="contained-tonal"
                iconColor={theme.colors.primary}
                containerColor={theme.colors.primarySoft}
                style={styles.actionIcon}
                onPress={() => openEditModal(note)}
              />

              <IconButton
                icon="delete-outline"
                size={20}
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
          style={[styles.title, { color: theme.colors.text }]}
        >
          Notas
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
                size={20}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles.filtersTextBox}>
              <Text style={[styles.filtersTitle, { color: theme.colors.text }]}>
                Filtros
              </Text>

              <Text
                style={[styles.filtersSubtitle, { color: theme.colors.secondary }]}
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
                  style={[styles.activeBadgeText, { color: theme.colors.primary }]}
                >
                  {activeFiltersCount}
                </Text>
              </View>
            )}

            <MaterialCommunityIcons
              name={filtersOpen ? "chevron-up" : "chevron-down"}
              size={24}
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

            <View style={styles.optionWrap}>
              <ProjectFilterChip
                label="Todos"
                icon="format-list-bulleted"
                selected={filterProject === "todos"}
                color={theme.colors.primary}
                theme={theme}
                onPress={() => setFilterProject("todos")}
              />

              <ProjectFilterChip
                label="Sin proyecto"
                icon="account-outline"
                selected={filterProject === "sinProyecto"}
                color={theme.colors.secondary}
                theme={theme}
                onPress={() => setFilterProject("sinProyecto")}
              />

              {projects.map((project) => (
                <ProjectFilterChip
                  key={project.id}
                  label={project.name}
                  icon="folder-outline"
                  selected={filterProject === project.id}
                  color={project.color || theme.colors.primary}
                  theme={theme}
                  onPress={() => setFilterProject(project.id)}
                />
              ))}
            </View>

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
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
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
                size={27}
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
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Guardá una idea, comando, bug o recordatorio rápido.
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
              <TextInput
                label="Título"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <FormSection title="Proyecto relacionado" theme={theme} />

              <View style={styles.optionWrap}>
                <ProjectOptionChip
                  label="Sin proyecto"
                  icon="account-outline"
                  selected={!projectId}
                  color={theme.colors.secondary}
                  theme={theme}
                  onPress={() => setProjectId(null)}
                />

                {projects.map((project) => (
                  <ProjectOptionChip
                    key={project.id}
                    label={project.name}
                    icon="folder-outline"
                    selected={projectId === project.id}
                    color={project.color || theme.colors.primary}
                    theme={theme}
                    onPress={() => setProjectId(project.id)}
                  />
                ))}
              </View>

              <TextInput
                label="Contenido"
                value={content}
                onChangeText={setContent}
                mode="outlined"
                multiline
                numberOfLines={8}
                style={styles.textArea}
                outlineStyle={styles.inputOutline}
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

function ProjectFilterChip({ label, icon, selected, color, theme, onPress }) {
  const bg = selected
    ? theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.09)
    : theme.colors.surfaceSoft;

  return (
    <Chip
      compact
      icon={icon}
      selected={selected}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: bg,
          borderColor: selected
            ? hexToRgba(color, theme.dark ? 0.34 : 0.18)
            : theme.colors.borderSoft,
        },
      ]}
      textStyle={[
        styles.filterChipText,
        {
          color: selected ? color : theme.colors.secondary,
        },
      ]}
    >
      {label}
    </Chip>
  );
}

function ProjectOptionChip({ label, icon, selected, color, theme, onPress }) {
  const bg = selected
    ? theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.09)
    : theme.colors.surfaceSoft;

  return (
    <Chip
      compact
      icon={icon}
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
    width: "100%",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  sectionMarker: {
    width: 5,
    height: 28,
    borderRadius: 999,
    marginRight: 10,
  },

  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
    minWidth: 100,
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

  filtersCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 14,
  },

  filtersHeader: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  filtersIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  filtersTextBox: {
    flex: 1,
    paddingRight: 8,
  },

  filtersTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  filtersSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
  },

  activeBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 8,
  },

  activeBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  filtersBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  search: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 0,
    marginBottom: 12,
  },

  searchInput: {
    fontSize: 14,
  },

  clearFiltersButton: {
    borderRadius: 16,
    elevation: 0,
    marginTop: 2,
  },

  clearFiltersButtonContent: {
    height: 42,
  },

  clearFiltersButtonLabel: {
    fontSize: 13,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 2,
  },

  filterChipText: {
    fontSize: 12,
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

  noteCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  noteCardContent: {
    padding: 14,
  },

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectBadge: {
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
    fontSize: 22,
    fontWeight: "900",
  },

  noteInfo: {
    flex: 1,
  },

  noteTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 22,
  },

  noteMeta: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
  },

  contentBox: {
    marginTop: 13,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  noteContent: {
    fontSize: 13,
    lineHeight: 20,
  },

  cardDivider: {
    height: 1,
    marginTop: 14,
    marginBottom: 10,
  },

  actionsRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  copyButton: {
    borderRadius: 999,
    elevation: 0,
  },

  copyButtonContent: {
    height: 38,
  },

  copyButtonLabel: {
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

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
  },

  textArea: {
    marginBottom: 12,
    minHeight: 180,
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