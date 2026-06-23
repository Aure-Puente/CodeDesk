import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Searchbar,
  Text,
  TextInput,
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

const CATEGORIES = [
  "General",
  "Idea",
  "Bug",
  "Código",
  "Cliente",
  "Firebase",
  "Comando",
];

export default function NotesScreen({ theme }) {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [projectId, setProjectId] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [filterProject, setFilterProject] = useState("todos");

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
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setProjects(data);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeProjects();
    };
  }, [user]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesCategory =
        filterCategory === "Todas" ? true : note.category === filterCategory;

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

      return matchesCategory && matchesProject && matchesSearch;
    });
  }, [notes, filterCategory, filterProject, search]);

  function resetForm() {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setCategory("General");
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
    setCategory(note.category || "General");
    setProjectId(note.projectId || null);
    setModalVisible(true);
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
        category,
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

  function handleDeleteNote(note) {
    Alert.alert("Eliminar nota", `¿Eliminar "${note.title || "Sin título"}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "notes", note.id));
        },
      },
    ]);
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

  function getCategoryIcon(value) {
    if (value === "Idea") return "lightbulb-outline";
    if (value === "Bug") return "bug-outline";
    if (value === "Código") return "code-tags";
    if (value === "Cliente") return "account-tie-outline";
    if (value === "Firebase") return "firebase";
    if (value === "Comando") return "console-line";
    return "note-text-outline";
  }

  function ProjectBadge({ item }) {
    const color = item.projectColor || theme.colors.primary;

    return (
      <View style={[styles.projectBadge, { backgroundColor: color }]}>
        {item.projectLogoUrl ? (
          <Image source={{ uri: item.projectLogoUrl }} style={styles.logo} />
        ) : item.projectName ? (
          <Text style={styles.projectLetter}>
            {item.projectName.charAt(0).toUpperCase()}
          </Text>
        ) : (
          <MaterialCommunityIcons
            name="note-text-outline"
            size={24}
            color="#FFFFFF"
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Guardá ideas, bugs, comandos, recordatorios y apuntes rápidos.
      </Text>

      <Button mode="contained" style={styles.button} onPress={openCreateModal}>
        Nueva nota
      </Button>

      <Searchbar
        placeholder="Buscar notas..."
        value={search}
        onChangeText={setSearch}
        style={[styles.search, { backgroundColor: theme.colors.surface }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {["Todas", ...CATEGORIES].map((item) => (
          <Chip
            key={item}
            selected={filterCategory === item}
            onPress={() => setFilterCategory(item)}
            style={styles.filterChip}
            icon={item === "Todas" ? "filter-outline" : getCategoryIcon(item)}
          >
            {item}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <Chip
          selected={filterProject === "todos"}
          onPress={() => setFilterProject("todos")}
          style={styles.filterChip}
        >
          Todos
        </Chip>

        <Chip
          selected={filterProject === "sinProyecto"}
          onPress={() => setFilterProject("sinProyecto")}
          style={styles.filterChip}
        >
          Sin proyecto
        </Chip>

        {projects.map((project) => (
          <Chip
            key={project.id}
            selected={filterProject === project.id}
            onPress={() => setFilterProject(project.id)}
            style={styles.filterChip}
            icon="folder-outline"
          >
            {project.name}
          </Chip>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : filteredNotes.length === 0 ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Sin notas para mostrar
            </Text>

            <Text style={{ color: theme.colors.secondary }}>
              Agregá una nota rápida para ideas, bugs o comandos útiles.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.list}>
          {filteredNotes.map((note) => {
            const accentColor = note.projectColor || theme.colors.primary;

            return (
              <Card
                key={note.id}
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderLeftColor: accentColor,
                    borderLeftWidth: note.projectId ? 5 : 0,
                  },
                ]}
              >
                <Card.Content>
                  <View style={styles.noteHeader}>
                    <ProjectBadge item={note} />

                    <View style={styles.noteInfo}>
                      <Text
                        style={[styles.noteTitle, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {note.title || "Sin título"}
                      </Text>

                      <View style={styles.chipsRow}>
                        <Chip compact icon={getCategoryIcon(note.category)}>
                          {note.category || "General"}
                        </Chip>

                        <Chip
                          compact
                          icon={note.projectId ? "folder-outline" : "account-outline"}
                          style={
                            note.projectId
                              ? { backgroundColor: accentColor + "22" }
                              : undefined
                          }
                          textStyle={
                            note.projectId
                              ? { color: accentColor, fontWeight: "800" }
                              : undefined
                          }
                        >
                          {note.projectName || "Sin proyecto"}
                        </Chip>
                      </View>
                    </View>
                  </View>

                  {!!note.content && (
                    <Text
                      style={[styles.noteContent, { color: theme.colors.secondary }]}
                      numberOfLines={4}
                    >
                      {note.content}
                    </Text>
                  )}

                  <View style={styles.actionsRow}>
                    <Button mode="text" icon="content-copy" onPress={() => copyNote(note)}>
                      Copiar
                    </Button>

                    <Button
                      mode="text"
                      icon="pencil-outline"
                      onPress={() => openEditModal(note)}
                    >
                      Editar
                    </Button>

                    <Button
                      mode="text"
                      icon="delete-outline"
                      textColor="#DC2626"
                      onPress={() => handleDeleteNote(note)}
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
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingNote ? "Editar nota" : "Nueva nota"}
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
              <TextInput
                label="Título"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
              />

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Proyecto relacionado
              </Text>

              <View style={styles.optionWrap}>
                <Chip
                  selected={!projectId}
                  onPress={() => setProjectId(null)}
                  style={styles.optionChip}
                  icon="account-outline"
                >
                  Sin proyecto
                </Chip>

                {projects.map((project) => (
                  <Chip
                    key={project.id}
                    selected={projectId === project.id}
                    onPress={() => setProjectId(project.id)}
                    style={styles.optionChip}
                    icon="folder-outline"
                  >
                    {project.name}
                  </Chip>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Categoría
              </Text>

              <View style={styles.optionWrap}>
                {CATEGORIES.map((item) => (
                  <Chip
                    key={item}
                    selected={category === item}
                    onPress={() => setCategory(item)}
                    style={styles.optionChip}
                    icon={getCategoryIcon(item)}
                  >
                    {item}
                  </Chip>
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
              />

              <Button mode="contained" style={styles.saveButton} onPress={handleSaveNote}>
                {editingNote ? "Guardar cambios" : "Guardar nota"}
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
    paddingBottom: 135,
  },

  subtitle: {
    marginBottom: 18,
  },

  button: {
    borderRadius: 16,
    marginBottom: 14,
  },

  search: {
    borderRadius: 18,
    marginBottom: 12,
  },

  filters: {
    marginBottom: 10,
  },

  filterChip: {
    marginRight: 8,
  },

  card: {
    borderRadius: 22,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  list: {
    gap: 14,
  },

  noteCard: {
    borderRadius: 22,
    overflow: "hidden",
  },

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  projectBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  projectLetter: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  noteInfo: {
    flex: 1,
  },

  noteTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  noteContent: {
    marginTop: 12,
    lineHeight: 20,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: 12,
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

  input: {
    marginBottom: 12,
  },

  textArea: {
    marginBottom: 12,
    minHeight: 180,
  },

  sectionTitle: {
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  optionChip: {
    marginBottom: 4,
  },

  saveButton: {
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 10,
  },
});