import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, View } from "react-native";
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
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
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

const PRIORITIES = ["baja", "media", "alta", "urgente"];
const STATUSES = ["pendiente", "en progreso", "completada", "pausada"];

export default function TasksScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [status, setStatus] = useState("pendiente");
  const [projectId, setProjectId] = useState(null);

  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterProject, setFilterProject] = useState("todos");

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));
      setProjects(data);
    });

    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const data = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...document.data(),
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      setTasks(data);
      setLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, [user]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusOk =
        filterStatus === "todas" ? true : task.status === filterStatus;

      const projectOk =
        filterProject === "todos"
          ? true
          : filterProject === "sinProyecto"
          ? !task.projectId
          : task.projectId === filterProject;

      return statusOk && projectOk;
    });
  }, [tasks, filterStatus, filterProject]);

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setPriority("media");
    setStatus("pendiente");
    setProjectId(null);
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setPriority(task.priority || "media");
    setStatus(task.status || "pendiente");
    setProjectId(task.projectId || null);
    setModalVisible(true);
  }

  async function handleSaveTask() {
    if (!title.trim()) {
      Alert.alert("Falta el título", "La tarea necesita un título.");
      return;
    }

    try {
      const selectedProject = projects.find((project) => project.id === projectId);

      if (editingTask) {
        await updateDoc(doc(db, "tasks", editingTask.id), {
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          projectId: projectId || null,
          projectName: selectedProject?.name || null,
          projectColor: selectedProject?.color || null,
          projectLogoUrl: selectedProject?.logoUrl || null,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "tasks"), {
          userId: user.uid,
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          projectId: projectId || null,
          projectName: selectedProject?.name || null,
          projectColor: selectedProject?.color || null,
          projectLogoUrl: selectedProject?.logoUrl || null,
          order: tasks.length + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar la tarea.");
    }
  }

  async function toggleDone(task) {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "completada" ? "pendiente" : "completada",
      updatedAt: serverTimestamp(),
    });
  }

  function handleDeleteTask(task) {
    Alert.alert("Eliminar tarea", `¿Eliminar "${task.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "tasks", task.id));
        },
      },
    ]);
  }

  async function handleDragEnd({ data }) {
    try {
      const updates = data.map((task, index) =>
        updateDoc(doc(db, "tasks", task.id), {
          order: index + 1,
          updatedAt: serverTimestamp(),
        })
      );

      await Promise.all(updates);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo reordenar la tarea.");
    }
  }

  function getPriorityLabel(value) {
    if (value === "baja") return "Baja";
    if (value === "media") return "Media";
    if (value === "alta") return "Alta";
    if (value === "urgente") return "Urgente";
    return "Media";
  }

  function getStatusLabel(value) {
    if (value === "pendiente") return "Pendiente";
    if (value === "en progreso") return "En progreso";
    if (value === "completada") return "Completada";
    if (value === "pausada") return "Pausada";
    return "Pendiente";
  }

  function getPriorityColor(value) {
    if (value === "baja") return "#16A34A";
    if (value === "media") return "#2563EB";
    if (value === "alta") return "#EA580C";
    if (value === "urgente") return "#DC2626";
    return "#2563EB";
  }

  function renderHeader() {
    return (
      <View>
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.text }]}
        >
          Tareas
        </Text>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Organizá tareas por prioridad, estado y proyecto.
        </Text>

        <Button mode="contained" style={styles.button} onPress={openCreateModal}>
          Nueva tarea
        </Button>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {["todas", ...STATUSES].map((item) => (
            <Chip
              key={item}
              selected={filterStatus === item}
              onPress={() => setFilterStatus(item)}
              style={styles.filterChip}
            >
              {item === "todas" ? "Todas" : getStatusLabel(item)}
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
            >
              {project.name}
            </Chip>
          ))}
        </ScrollView>

        {loading && <ActivityIndicator color={theme.colors.primary} />}
      </View>
    );
  }

  function renderEmpty() {
    if (loading) return null;

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No hay tareas para mostrar
          </Text>
          <Text style={{ color: theme.colors.secondary }}>
            Creá una tarea y asignala a un proyecto o dejala como tarea personal.
          </Text>
        </Card.Content>
      </Card>
    );
  }

  function renderTask({ item: task, drag, isActive }) {
    const taskColor = task.projectColor || theme.colors.primary;
    const isDone = task.status === "completada";

    return (
      <ScaleDecorator>
        <Card
          style={[
            styles.taskCard,
            {
              backgroundColor: theme.colors.surface,
              opacity: isDone ? 0.65 : 1,
              transform: [{ scale: isActive ? 1.02 : 1 }],
            },
          ]}
        >
          <Card.Content>
            <View style={styles.taskHeader}>
              <View style={[styles.projectIcon, { backgroundColor: taskColor }]}>
                {task.projectLogoUrl ? (
                  <Image source={{ uri: task.projectLogoUrl }} style={styles.logo} />
                ) : task.projectName ? (
                  <Text style={styles.logoLetter}>
                    {task.projectName.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <MaterialCommunityIcons
                    name="checkbox-marked-circle-outline"
                    size={26}
                    color="#FFFFFF"
                  />
                )}
              </View>

              <View style={styles.taskInfo}>
                <Text
                  style={[
                    styles.taskTitle,
                    {
                      color: theme.colors.text,
                      textDecorationLine: isDone ? "line-through" : "none",
                    },
                  ]}
                >
                  {task.title}
                </Text>

                <Text style={{ color: theme.colors.secondary }}>
                  {task.projectName || "Tarea personal"}
                </Text>
              </View>

              <IconButton
                icon="drag-horizontal-variant"
                onLongPress={drag}
                delayLongPress={120}
              />
            </View>

            {!!task.description && (
              <Text style={[styles.description, { color: theme.colors.secondary }]}>
                {task.description}
              </Text>
            )}

            <View style={styles.chipsRow}>
              <Chip
                compact
                style={{ backgroundColor: getPriorityColor(task.priority) + "22" }}
                textStyle={{
                  color: getPriorityColor(task.priority),
                  fontWeight: "800",
                }}
              >
                {getPriorityLabel(task.priority)}
              </Chip>

              <Chip compact>{getStatusLabel(task.status)}</Chip>
            </View>

            <View style={styles.actionsRow}>
              <Button
                mode="text"
                icon={isDone ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                onPress={() => toggleDone(task)}
              >
                {isDone ? "Hecha" : "Marcar"}
              </Button>

              <Button mode="text" icon="pencil-outline" onPress={() => openEditModal(task)}>
                Editar
              </Button>

              <Button
                mode="text"
                icon="delete-outline"
                textColor="#DC2626"
                onPress={() => handleDeleteTask(task)}
              >
                Eliminar
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScaleDecorator>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DraggableFlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        onDragEnd={handleDragEnd}
        activationDistance={12}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.content}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingTask ? "Editar tarea" : "Nueva tarea"}
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
                Proyecto relacionado
              </Text>

              <View style={styles.optionWrap}>
                <Chip
                  selected={!projectId}
                  onPress={() => setProjectId(null)}
                  style={styles.optionChip}
                >
                  Sin proyecto
                </Chip>

                {projects.map((project) => (
                  <Chip
                    key={project.id}
                    selected={projectId === project.id}
                    onPress={() => setProjectId(project.id)}
                    style={styles.optionChip}
                    icon={project.logoUrl ? undefined : "folder-outline"}
                  >
                    {project.name}
                  </Chip>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Prioridad
              </Text>

              <View style={styles.optionWrap}>
                {PRIORITIES.map((item) => (
                  <Chip
                    key={item}
                    selected={priority === item}
                    onPress={() => setPriority(item)}
                    style={[
                      styles.optionChip,
                      priority === item && {
                        backgroundColor: getPriorityColor(item) + "22",
                      },
                    ]}
                    textStyle={
                      priority === item
                        ? {
                            color: getPriorityColor(item),
                            fontWeight: "800",
                          }
                        : undefined
                    }
                  >
                    {getPriorityLabel(item)}
                  </Chip>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Estado
              </Text>

              <View style={styles.optionWrap}>
                {STATUSES.map((item) => (
                  <Chip
                    key={item}
                    selected={status === item}
                    onPress={() => setStatus(item)}
                    style={styles.optionChip}
                  >
                    {getStatusLabel(item)}
                  </Chip>
                ))}
              </View>

              <Button mode="contained" style={styles.saveButton} onPress={handleSaveTask}>
                {editingTask ? "Guardar cambios" : "Guardar tarea"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
    marginBottom: 14,
  },

  filters: {
    marginBottom: 10,
  },

  filterChip: {
    marginRight: 8,
  },

  card: {
    borderRadius: 22,
    marginTop: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  taskCard: {
    borderRadius: 22,
    marginBottom: 14,
  },

  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
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
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  taskInfo: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  description: {
    marginTop: 12,
    lineHeight: 20,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
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
    marginTop: 18,
    marginBottom: 10,
  },
});