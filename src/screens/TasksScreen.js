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
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
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
const STATUSES = ["pendiente", "en progreso", "completada", "pausada"];

const STATUS_ICONS = {
  pendiente: "clock-outline",
  "en progreso": "progress-clock",
  completada: "check-circle-outline",
  pausada: "pause-circle-outline",
};

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
  if (value === "pendiente") return "Pendiente";
  if (value === "en progreso") return "En progreso";
  if (value === "completada") return "Completada";
  if (value === "pausada") return "Pausada";
  return "Pendiente";
}

function getStatusColor(theme, value) {
  if (value === "pendiente") return theme.colors.warning;
  if (value === "en progreso") return theme.colors.info;
  if (value === "completada") return theme.colors.success;
  if (value === "pausada") return theme.colors.paused;
  return theme.colors.primary;
}

function getStatusSoftColor(theme, value) {
  if (value === "pendiente") return theme.colors.warningSoft;
  if (value === "en progreso") return theme.colors.infoSoft;
  if (value === "completada") return theme.colors.successSoft;
  if (value === "pausada") return theme.colors.pausedSoft;
  return theme.colors.primarySoft;
}

function getStatusIcon(value) {
  return STATUS_ICONS[value] || STATUS_ICONS.pendiente;
}

export default function TasksScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pendiente");
  const [projectId, setProjectId] = useState(null);

  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterProject, setFilterProject] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isDarkMode = theme.dark;

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

  const activeFilterLabel = useMemo(() => {
    const statusLabel =
      filterStatus === "todas"
        ? "Todos los estados"
        : getStatusLabel(filterStatus);

    let projectLabel = "Todos los proyectos";

    if (filterProject === "sinProyecto") {
      projectLabel = "Sin proyecto";
    }

    if (filterProject !== "todos" && filterProject !== "sinProyecto") {
      const selectedProject = projects.find(
        (project) => project.id === filterProject
      );

      projectLabel = selectedProject?.name || "Proyecto";
    }

    return `${statusLabel} · ${projectLabel}`;
  }, [filterStatus, filterProject, projects]);

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
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
    setStatus(task.status || "pendiente");
    setProjectId(task.projectId || null);
    setModalVisible(true);
  }

  function openDeleteModal(task) {
    setTaskToDelete(task);
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    setTaskToDelete(null);
    setDeleteModalVisible(false);
  }

  async function handleSaveTask() {
    if (!title.trim()) {
      Alert.alert("Falta el título", "La tarea necesita un título.");
      return;
    }

    try {
      const selectedProject = projects.find(
        (project) => project.id === projectId
      );

      if (editingTask) {
        await updateDoc(doc(db, "tasks", editingTask.id), {
          title: title.trim(),
          description: description.trim(),
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

  async function confirmDeleteTask() {
    if (!taskToDelete?.id) return;

    try {
      await deleteDoc(doc(db, "tasks", taskToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo eliminar la tarea.");
    }
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

  function renderHeader() {
    return (
      <View>
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
              Tareas
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
            Organizá tus pendientes por estado y proyecto.
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
          Nueva tarea
        </Button>

        <TouchableRipple
          onPress={() => setFiltersOpen((prev) => !prev)}
          rippleColor={theme.colors.primarySoft}
          style={[
            styles.activeFiltersCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <View style={styles.activeFiltersContent}>
            <View
              style={[
                styles.smallIconBox,
                { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <MaterialCommunityIcons
                name="filter-outline"
                size={19}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles.activeFiltersText}>
              <Text
                style={[styles.activeFiltersTitle, { color: theme.colors.text }]}
              >
                Filtros
              </Text>

              <Text
                style={[
                  styles.activeFiltersSubtitle,
                  { color: theme.colors.secondary },
                ]}
                numberOfLines={1}
              >
                {activeFilterLabel}
              </Text>
            </View>

            <MaterialCommunityIcons
              name={filtersOpen ? "chevron-up" : "chevron-down"}
              size={22}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableRipple>

        {filtersOpen && (
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
            <View style={styles.filtersContent}>
              <Text style={[styles.filterTitle, { color: theme.colors.text }]}>
                Estado
              </Text>

              <View style={styles.chipsWrap}>
                <FilterChip
                  label="Todas"
                  selected={filterStatus === "todas"}
                  color={theme.colors.primary}
                  icon="format-list-bulleted"
                  theme={theme}
                  onPress={() => setFilterStatus("todas")}
                />

                {STATUSES.map((item) => (
                  <FilterChip
                    key={item}
                    label={getStatusLabel(item)}
                    selected={filterStatus === item}
                    color={getStatusColor(theme, item)}
                    icon={getStatusIcon(item)}
                    theme={theme}
                    onPress={() => setFilterStatus(item)}
                  />
                ))}
              </View>

              <Divider
                style={[
                  styles.filterDivider,
                  {
                    backgroundColor: theme.colors.borderSoft,
                  },
                ]}
              />

              <Text style={[styles.filterTitle, { color: theme.colors.text }]}>
                Proyecto
              </Text>

              <View style={styles.chipsWrap}>
                <FilterChip
                  label="Todos"
                  selected={filterProject === "todos"}
                  color={theme.colors.primary}
                  icon="folder-multiple-outline"
                  theme={theme}
                  onPress={() => setFilterProject("todos")}
                />

                <FilterChip
                  label="Sin proyecto"
                  selected={filterProject === "sinProyecto"}
                  color={theme.colors.paused}
                  icon="checkbox-blank-circle-outline"
                  theme={theme}
                  onPress={() => setFilterProject("sinProyecto")}
                />

                {projects.map((project) => (
                  <FilterChip
                    key={project.id}
                    label={project.name}
                    selected={filterProject === project.id}
                    color={project.color || theme.colors.primary}
                    icon="folder-outline"
                    theme={theme}
                    onPress={() => setFilterProject(project.id)}
                  />
                ))}
              </View>
            </View>
          </Card>
        )}

        <View style={styles.listInfoRow}>
          <Text style={[styles.listTitle, { color: theme.colors.secondary }]}>
            {filteredTasks.length} tareas visibles
          </Text>

          <Text style={[styles.dragHint, { color: theme.colors.secondary }]}>
            Mantené presionado para ordenar
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}
      </View>
    );
  }

  function renderEmpty() {
    if (loading) return null;

    return (
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
              name="clipboard-text-outline"
              size={24}
              color={theme.colors.primary}
            />
          </View>

          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No hay tareas para mostrar
          </Text>

          <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
            Creá una tarea nueva o cambiá los filtros para ver otros resultados.
          </Text>

          <Button
            mode="contained"
            icon="plus"
            style={styles.emptyButton}
            onPress={openCreateModal}
          >
            Nueva tarea
          </Button>
        </View>
      </Card>
    );
  }

  function renderTask({ item: task, drag, isActive }) {
    const taskColor = task.projectColor || theme.colors.primary;
    const isDone = task.status === "completada";
    const statusColor = getStatusColor(theme, task.status);

    const projectSoft = theme.dark
      ? hexToRgba(taskColor, 0.16)
      : hexToRgba(taskColor, 0.1);

    const doneActionColor = isDone ? theme.colors.warning : theme.colors.success;
    const doneActionBg = isDone
      ? theme.colors.warningSoft
      : theme.colors.successSoft;

    return (
      <ScaleDecorator>
        <Card
          mode="contained"
          style={[
            styles.taskCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isActive
                ? hexToRgba(theme.colors.primary, 0.35)
                : theme.colors.borderSoft,
              opacity: isDone ? 0.78 : 1,
              transform: [{ scale: isActive ? 1.015 : 1 }],
            },
          ]}
        >
          <View style={styles.taskAccentWrap}>
            <View
              style={[
                styles.taskAccent,
                {
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>

          <View style={styles.taskContent}>
            <View style={styles.taskHeader}>
              <View style={[styles.projectIcon, { backgroundColor: projectSoft }]}>
                {task.projectLogoUrl ? (
                  <Image source={{ uri: task.projectLogoUrl }} style={styles.logo} />
                ) : task.projectName ? (
                  <Text style={[styles.logoLetter, { color: taskColor }]}>
                    {task.projectName.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <MaterialCommunityIcons
                    name="checkbox-blank-circle-outline"
                    size={22}
                    color={taskColor}
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
                  numberOfLines={2}
                >
                  {task.title || "Tarea sin título"}
                </Text>

                <Text
                  style={[styles.projectName, { color: theme.colors.secondary }]}
                  numberOfLines={1}
                >
                  {task.projectName || "Tarea personal"}
                </Text>
              </View>

              <IconButton
                icon="drag-horizontal-variant"
                size={21}
                iconColor={theme.colors.secondary}
                style={styles.dragButton}
                onLongPress={drag}
                delayLongPress={120}
              />
            </View>

            {!!task.description && (
              <Text
                style={[styles.description, { color: theme.colors.secondary }]}
                numberOfLines={3}
              >
                {task.description}
              </Text>
            )}

            <View
              style={[
                styles.taskDivider,
                {
                  backgroundColor: theme.colors.borderSoft,
                },
              ]}
            />

            <View style={styles.actionsRow}>
              <IconButton
                icon={isDone ? "restore" : "check-circle-outline"}
                size={21}
                mode="contained-tonal"
                iconColor={doneActionColor}
                containerColor={doneActionBg}
                style={styles.statusActionIcon}
                onPress={() => toggleDone(task)}
              />

              <View style={styles.centerStatusChip}>
                <InfoChip
                  label={getStatusLabel(task.status)}
                  icon={getStatusIcon(task.status)}
                  color={statusColor}
                  theme={theme}
                />
              </View>

              <View style={styles.iconActions}>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  mode="contained-tonal"
                  iconColor={theme.colors.primary}
                  containerColor={theme.colors.primarySoft}
                  style={styles.actionIcon}
                  onPress={() => openEditModal(task)}
                />

                <IconButton
                  icon="delete-outline"
                  size={20}
                  mode="contained-tonal"
                  iconColor={theme.colors.danger}
                  containerColor={theme.colors.dangerSoft}
                  style={styles.actionIcon}
                  onPress={() => openDeleteModal(task)}
                />
              </View>
            </View>
          </View>
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
        showsVerticalScrollIndicator={false}
      />

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
                  {editingTask ? "Editar tarea" : "Nueva tarea"}
                </Text>

                <Text
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Definí proyecto y estado.
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

              <FormSection title="Proyecto relacionado" theme={theme} />

              <View style={styles.optionWrap}>
                <FilterChip
                  label="Sin proyecto"
                  selected={!projectId}
                  color={theme.colors.paused}
                  icon="checkbox-blank-circle-outline"
                  theme={theme}
                  onPress={() => setProjectId(null)}
                />

                {projects.map((project) => (
                  <FilterChip
                    key={project.id}
                    label={project.name}
                    selected={projectId === project.id}
                    color={project.color || theme.colors.primary}
                    icon="folder-outline"
                    theme={theme}
                    onPress={() => setProjectId(project.id)}
                  />
                ))}
              </View>

              <FormSection title="Estado" theme={theme} />

              <View style={styles.optionWrap}>
                {STATUSES.map((item) => (
                  <FilterChip
                    key={item}
                    label={getStatusLabel(item)}
                    selected={status === item}
                    color={getStatusColor(theme, item)}
                    icon={getStatusIcon(item)}
                    theme={theme}
                    onPress={() => setStatus(item)}
                  />
                ))}
              </View>

              <Button
                mode="contained"
                icon={editingTask ? "content-save-outline" : "plus"}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                labelStyle={styles.saveButtonLabel}
                onPress={handleSaveTask}
              >
                {editingTask ? "Guardar cambios" : "Guardar tarea"}
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
                  name="trash-can-outline"
                  size={28}
                  color={theme.colors.danger}
                />
              </View>

              <Text style={[styles.deleteTitle, { color: theme.colors.text }]}>
                Eliminar tarea
              </Text>

              <Text style={[styles.deleteText, { color: theme.colors.secondary }]}>
                ¿Seguro que querés eliminar esta tarea? Esta acción no se puede
                deshacer.
              </Text>

              {!!taskToDelete?.title && (
                <View
                  style={[
                    styles.deleteTaskPreview,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.borderSoft,
                    },
                  ]}
                >
                  <Text
                    style={[styles.deleteTaskTitle, { color: theme.colors.text }]}
                    numberOfLines={2}
                  >
                    {taskToDelete.title}
                  </Text>
                </View>
              )}

              <View style={styles.deleteActions}>
                <Button
                  mode="contained-tonal"
                  style={styles.cancelDeleteButton}
                  contentStyle={styles.deleteButtonContent}
                  labelStyle={styles.cancelDeleteLabel}
                  onPress={closeDeleteModal}
                >
                  Cancelar
                </Button>

                <Button
                  mode="contained"
                  buttonColor={theme.colors.danger}
                  textColor="#FFFFFF"
                  icon="delete-outline"
                  style={styles.confirmDeleteButton}
                  contentStyle={styles.deleteButtonContent}
                  labelStyle={styles.confirmDeleteLabel}
                  onPress={confirmDeleteTask}
                >
                  Eliminar
                </Button>
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function InfoChip({ label, icon, color, theme }) {
  const bg = theme.dark ? hexToRgba(color, 0.16) : hexToRgba(color, 0.09);
  const border = theme.dark ? hexToRgba(color, 0.22) : hexToRgba(color, 0.14);

  return (
    <View
      style={[
        styles.infoChip,
        {
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={14} color={color} />

      <Text style={[styles.infoChipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FilterChip({ label, selected, color, icon, theme, onPress }) {
  const selectedBg = theme.dark
    ? hexToRgba(color, 0.18)
    : hexToRgba(color, 0.1);

  const defaultBg = theme.dark
    ? "rgba(255,255,255,0.04)"
    : "rgba(15,23,42,0.04)";

  const selectedBorder = theme.dark
    ? hexToRgba(color, 0.28)
    : hexToRgba(color, 0.18);

  return (
    <Chip
      compact
      selected={selected}
      icon={icon}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? selectedBg : defaultBg,
          borderColor: selected ? selectedBorder : theme.colors.borderSoft,
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

function FormSection({ title, theme }) {
  return (
    <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
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
    maxWidth: 330,
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
    fontWeight: "900",
    fontSize: 14,
  },

  activeFiltersCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 10,
  },

  activeFiltersContent: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  smallIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  activeFiltersText: {
    flex: 1,
  },

  activeFiltersTitle: {
    fontSize: 14.5,
    fontWeight: "850",
  },

  activeFiltersSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
  },

  filtersCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 12,
  },

  filtersContent: {
    padding: 14,
  },

  filterTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 2,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "850",
  },

  filterDivider: {
    height: 1,
    marginVertical: 14,
  },

  listInfoRow: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  listTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  dragHint: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  loadingBox: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginTop: 4,
  },

  emptyContent: {
    alignItems: "center",
    padding: 22,
  },

  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginBottom: 5,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
  },

  emptyButton: {
    borderRadius: 16,
  },

  taskCard: {
    position: "relative",
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 12,
  },

  taskAccentWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },

  taskAccent: {
    flex: 1,
  },

  taskContent: {
    padding: 15,
    paddingLeft: 18,
  },

  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
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
    fontSize: 20,
    fontWeight: "900",
  },

  taskInfo: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 21,
  },

  projectName: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
  },

  dragButton: {
    margin: 0,
    opacity: 0.75,
  },

  description: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
  },

  taskDivider: {
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

  statusActionIcon: {
    margin: 0,
  },

  centerStatusChip: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: 4,
  },

  infoChip: {
    maxWidth: 150,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  infoChipText: {
    marginLeft: 5,
    fontSize: 11.5,
    fontWeight: "900",
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

  formSectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
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

  deleteTaskPreview: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },

  deleteTaskTitle: {
    fontSize: 14,
    fontWeight: "850",
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

  cancelDeleteLabel: {
    fontSize: 13.5,
    fontWeight: "900",
  },

  confirmDeleteLabel: {
    fontSize: 13.5,
    fontWeight: "900",
  },
});