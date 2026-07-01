//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
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
import {
  cancelTaskReminderNotification,
  scheduleTaskReminderNotification,
} from "../services/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

//JS:
const STATUSES = ["pendiente", "en progreso", "completada", "pausada"];
const NOTIFICATIONS_ENABLED_KEY = "codedesk_notifications_enabled";
const NOTIFICATION_TIME_KEY = "codedesk_notification_time";
const TASK_REMINDER_SIGNATURE_KEY = "codedesk_task_reminder_signature";

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
  if (value === "pausada") return theme.colors.paused || "#94A3B8";
  return theme.colors.primary;
}

function getStatusIcon(value) {
  return STATUS_ICONS[value] || STATUS_ICONS.pendiente;
}

function getProjectIconBackground(theme, projectColor) {
  if (theme.dark) {
    return "rgba(248, 250, 252, 0.94)";
  }

  return hexToRgba(projectColor, 0.1);
}

function getProjectIconBorder(theme, projectColor) {
  if (theme.dark) {
    return hexToRgba(projectColor, 0.36);
  }

  return hexToRgba(projectColor, 0.18);
}

function getProjectSelectorBackground(theme, projectColor, hasProject) {
  if (!hasProject) {
    return theme.colors.surfaceSoft || theme.colors.surface;
  }

  if (theme.dark) {
    return "rgba(248, 250, 252, 0.94)";
  }

  return hexToRgba(projectColor, 0.09);
}

function getProjectSelectorBorder(theme, projectColor, hasProject) {
  if (!hasProject) {
    return theme.colors.borderSoft;
  }

  if (theme.dark) {
    return hexToRgba(projectColor, 0.42);
  }

  return hexToRgba(projectColor, 0.2);
}

function getSelectableChipBackground(theme, color, selected, label) {
  const isPausedChip = label === "Pausada";

  if (!selected) {
    return theme.dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)";
  }

  if (isPausedChip) {
    return theme.dark
      ? "rgba(148, 163, 184, 0.24)"
      : "rgba(100, 116, 139, 0.14)";
  }

  return theme.dark ? hexToRgba(color, 0.18) : hexToRgba(color, 0.1);
}

function getSelectableChipBorder(theme, color, selected, label) {
  const isPausedChip = label === "Pausada";

  if (!selected) {
    return theme.colors.borderSoft;
  }

  if (isPausedChip) {
    return theme.dark
      ? "rgba(148, 163, 184, 0.46)"
      : "rgba(100, 116, 139, 0.26)";
  }

  return theme.dark ? hexToRgba(color, 0.28) : hexToRgba(color, 0.18);
}

export default function TasksScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pendiente");
  const [projectId, setProjectId] = useState(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterProject, setFilterProject] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterProjectSelectorOpen, setFilterProjectSelectorOpen] =
    useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
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

    useEffect(() => {
    async function syncTaskReminderNotification() {
      try {
        if (!user?.uid || loading) {
          return;
        }

        const storedEnabled = await AsyncStorage.getItem(
          NOTIFICATIONS_ENABLED_KEY
        );

        const storedTime = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);

        const notificationsEnabled =
          storedEnabled === null ? true : storedEnabled === "true";

        const notificationTime = storedTime || "10:00";

        if (!notificationsEnabled) {
          await cancelTaskReminderNotification();
          await AsyncStorage.removeItem(TASK_REMINDER_SIGNATURE_KEY);
          return;
        }

        const [hourText, minuteText] = notificationTime.split(":");

        const hour = Number(hourText);
        const minute = Number(minuteText);

        const validTime =
          !Number.isNaN(hour) &&
          !Number.isNaN(minute) &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59;

        if (!validTime) {
          return;
        }

        const firstTaskToNotify = tasks.find(
          (task) => task.status !== "completada"
        );

        if (!firstTaskToNotify) {
          await cancelTaskReminderNotification();
          await AsyncStorage.removeItem(TASK_REMINDER_SIGNATURE_KEY);
          return;
        }

        const reminderSignature = `${user.uid}-${firstTaskToNotify.id}-${
          firstTaskToNotify.updatedAt?.seconds || ""
        }-${notificationTime}`;

        const lastReminderSignature = await AsyncStorage.getItem(
          TASK_REMINDER_SIGNATURE_KEY
        );

        if (lastReminderSignature === reminderSignature) {
          return;
        }

        await scheduleTaskReminderNotification({
          task: firstTaskToNotify,
          hour,
          minute,
        });

        await AsyncStorage.setItem(
          TASK_REMINDER_SIGNATURE_KEY,
          reminderSignature
        );
      } catch (error) {
        console.log("Error sincronizando notificación de tarea:", error);
      }
    }

    syncTaskReminderNotification();
  }, [tasks, loading, user?.uid]);

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
        color: theme.colors.paused || "#94A3B8",
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

    return `${statusLabel} · ${selectedFilterProject.name}`;
  }, [filterStatus, selectedFilterProject]);

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setStatus("pendiente");
    setProjectId(null);
    setProjectSelectorOpen(false);
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
    setProjectSelectorOpen(false);
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

  function openDetailModal(task) {
    setSelectedTask(task);
    setDetailModalVisible(true);
  }

  function closeDetailModal() {
    setSelectedTask(null);
    setDetailModalVisible(false);
  }

  function openEditFromDetail() {
    if (!selectedTask) return;

    const task = selectedTask;

    closeDetailModal();

    setTimeout(() => {
      openEditModal(task);
    }, 120);
  }

  async function moveExistingTasksDown() {
    const updates = tasks.map((task) =>
      updateDoc(doc(db, "tasks", task.id), {
        order: (task.order ?? 0) + 1,
        updatedAt: serverTimestamp(),
      })
    );

    await Promise.all(updates);
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
        await moveExistingTasksDown();

        await addDoc(collection(db, "tasks"), {
          userId: user.uid,
          title: title.trim(),
          description: description.trim(),
          status,
          projectId: projectId || null,
          projectName: selectedProject?.name || null,
          projectColor: selectedProject?.color || null,
          projectLogoUrl: selectedProject?.logoUrl || null,
          order: 1,
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
    try {
      const isDone = task.status === "completada";

      if (isDone) {
        await updateDoc(doc(db, "tasks", task.id), {
          status: "pendiente",
          updatedAt: serverTimestamp(),
        });

        return;
      }

      const maxOrder =
        tasks.length > 0
          ? Math.max(...tasks.map((item) => item.order ?? 0))
          : 0;

      await updateDoc(doc(db, "tasks", task.id), {
        status: "completada",
        order: maxOrder + 1,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo actualizar la tarea.");
    }
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
              variant={IS_TABLET ? "headlineMedium" : "headlineSmall"}
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
                size={responsive(19, 24)}
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
              size={responsive(22, 28)}
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
                  <ProjectSmallIcon
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
                    name={
                      filterProjectSelectorOpen ? "chevron-up" : "chevron-down"
                    }
                    size={responsive(22, 28)}
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
                      color={theme.colors.paused || "#94A3B8"}
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
            </View>
          </Card>
        )}

        <View style={styles.listInfoRow}>
          <Text style={[styles.listTitle, { color: theme.colors.secondary }]}>
            {loading
              ? "Cargando tareas"
              : `${filteredTasks.length} tareas visibles`}
          </Text>
        </View>
      </View>
    );
  }

  function renderEmpty() {
    if (loading) {
      return <TasksSkeleton theme={theme} />;
    }

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
              size={responsive(24, 31)}
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
            labelStyle={styles.emptyButtonLabel}
            contentStyle={styles.emptyButtonContent}
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

    const doneActionColor = isDone ? theme.colors.warning : theme.colors.success;
    const doneActionBg = isDone
      ? theme.colors.warningSoft
      : theme.colors.successSoft;

    return (
      <ScaleDecorator>
        <Card
          mode="contained"
          onPress={() => openDetailModal(task)}
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
              <ProjectSmallIcon
                theme={theme}
                color={taskColor}
                logoUrl={task.projectLogoUrl}
                letter={task.projectName?.charAt(0)?.toUpperCase()}
                icon="checkbox-blank-circle"
                size="large"
              />

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
                size={responsive(21, 27)}
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
                size={responsive(21, 27)}
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
                  size={responsive(20, 26)}
                  mode="contained-tonal"
                  iconColor={theme.colors.primary}
                  containerColor={theme.colors.primarySoft}
                  style={styles.actionIcon}
                  onPress={() => openEditModal(task)}
                />

                <IconButton
                  icon="delete-outline"
                  size={responsive(20, 26)}
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

  const detailStatusColor = selectedTask
    ? getStatusColor(theme, selectedTask.status)
    : theme.colors.primary;

  const detailProjectColor = selectedTask?.projectColor || theme.colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DraggableFlatList
        data={loading ? [] : filteredTasks}
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
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
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
                      selectedProject?.color || theme.colors.paused || "#94A3B8",
                      !!selectedProject
                    ),
                    borderColor: getProjectSelectorBorder(
                      theme,
                      selectedProject?.color || theme.colors.paused || "#94A3B8",
                      !!selectedProject
                    ),
                  },
                ]}
              >
                <View style={styles.projectSelectorContent}>
                  <ProjectSmallIcon
                    theme={theme}
                    color={selectedProject?.color || theme.colors.paused || "#94A3B8"}
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
                    size={responsive(22, 28)}
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
                      color={theme.colors.paused || "#94A3B8"}
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
                <ProjectSmallIcon
                  theme={theme}
                  color={detailProjectColor}
                  logoUrl={selectedTask?.projectLogoUrl}
                  letter={selectedTask?.projectName?.charAt(0)?.toUpperCase()}
                  icon="checkbox-blank-circle"
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
                    {selectedTask?.projectName || "Tarea personal"}
                  </Text>

                  <Text style={[styles.detailTitle, { color: theme.colors.text }]}>
                    {selectedTask?.title || "Tarea sin título"}
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

              <View style={styles.detailStatusRow}>
                <InfoChip
                  label={getStatusLabel(selectedTask?.status)}
                  icon={getStatusIcon(selectedTask?.status)}
                  color={detailStatusColor}
                  theme={theme}
                />
              </View>

              <Divider
                style={[
                  styles.detailDivider,
                  { backgroundColor: theme.colors.borderSoft },
                ]}
              />

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailScrollContent}
              >
                <Text style={[styles.detailSectionTitle, { color: theme.colors.text }]}>
                  Descripción
                </Text>

                <Text
                  style={[
                    styles.detailDescription,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {selectedTask?.description?.trim()
                    ? selectedTask.description
                    : "Esta tarea no tiene descripción."}
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
                      Editar tarea
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
                  size={responsive(28, 36)}
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

function ProjectSmallIcon({
  theme,
  color,
  logoUrl,
  letter,
  icon = "folder-outline",
  size = "normal",
}) {
  const boxStyle =
    size === "large"
      ? styles.projectIcon
      : size === "detail"
      ? styles.detailProjectIcon
      : styles.projectSelectorIconBox;

  const iconSize =
    size === "detail"
      ? responsive(21, 28)
      : size === "large"
      ? responsive(20, 27)
      : responsive(19, 25);

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
            size === "detail" ? styles.detailProjectLetter : styles.logoLetter,
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
      <MaterialCommunityIcons
        name={icon}
        size={responsive(14, 18)}
        color={color}
      />

      <Text style={[styles.infoChipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FilterChip({ label, selected, color, icon, theme, onPress }) {
  const bg = getSelectableChipBackground(theme, color, selected, label);
  const border = getSelectableChipBorder(theme, color, selected, label);
  const textColor = selected ? color : theme.colors.secondary;
  const iconColor = selected ? color : theme.colors.secondary;

  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={hexToRgba(color, 0.12)}
      style={[
        styles.filterChip,
        {
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
    >
      <View style={styles.filterChipContent}>
        <MaterialCommunityIcons
          name={icon}
          size={responsive(15, 19)}
          color={iconColor}
        />

        <Text
          style={[
            styles.filterChipText,
            {
              color: textColor,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

function FormSection({ title, theme }) {
  return (
    <Text style={[styles.formSectionTitle, { color: theme.colors.text }]}>
      {title}
    </Text>
  );
}

function TasksSkeleton({ theme }) {
  const skeletonColor = theme.dark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.07)";

  const skeletonStrongColor = theme.dark
    ? "rgba(255,255,255,0.12)"
    : "rgba(15,23,42,0.11)";

  return (
    <View>
      {[1, 2, 3, 4].map((item) => (
        <Card
          key={item}
          mode="contained"
          style={[
            styles.taskCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <View style={styles.taskAccentWrap}>
            <View
              style={[
                styles.taskAccent,
                {
                  backgroundColor: skeletonStrongColor,
                },
              ]}
            />
          </View>

          <View style={styles.taskContent}>
            <View style={styles.taskHeader}>
              <View
                style={[
                  styles.skeletonProjectIcon,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View style={styles.taskInfo}>
                <View
                  style={[
                    styles.skeletonTitle,
                    { backgroundColor: skeletonStrongColor },
                  ]}
                />

                <View
                  style={[
                    styles.skeletonSubtitle,
                    { backgroundColor: skeletonColor },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.skeletonDrag,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>

            <View
              style={[
                styles.skeletonDescription,
                { backgroundColor: skeletonColor },
              ]}
            />

            <View
              style={[
                styles.skeletonDescriptionSmall,
                { backgroundColor: skeletonColor },
              ]}
            />

            <View
              style={[
                styles.taskDivider,
                {
                  backgroundColor: theme.colors.borderSoft,
                },
              ]}
            />

            <View style={styles.actionsRow}>
              <View
                style={[
                  styles.skeletonAction,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonChip,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View style={styles.iconActions}>
                <View
                  style={[
                    styles.skeletonAction,
                    { backgroundColor: skeletonStrongColor },
                  ]}
                />

                <View
                  style={[
                    styles.skeletonAction,
                    { backgroundColor: skeletonStrongColor },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card>
      ))}
    </View>
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
    maxWidth: responsive(330, 520),
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
    fontWeight: "900",
    fontSize: responsive(14, 16),
  },

  activeFiltersCard: {
    borderRadius: responsive(22, 28),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(10, 16),
  },

  activeFiltersContent: {
    minHeight: responsive(66, 82),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(10, 14),
  },

  smallIconBox: {
    width: responsive(40, 52),
    height: responsive(40, 52),
    borderRadius: responsive(14, 18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
  },

  activeFiltersText: {
    flex: 1,
  },

  activeFiltersTitle: {
    fontSize: responsive(14.5, 17),
    fontWeight: "850",
  },

  activeFiltersSubtitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(17, 21),
  },

  filtersCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(12, 18),
  },

  filtersContent: {
    padding: responsive(14, 22),
  },

  filterTitle: {
    fontSize: responsive(13, 16),
    fontWeight: "900",
    marginBottom: responsive(10, 14),
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(8, 11),
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 2,
  },

  filterChipContent: {
    minHeight: responsive(32, 39),
    paddingHorizontal: responsive(11, 15),
    paddingVertical: responsive(7, 9),
    flexDirection: "row",
    alignItems: "center",
  },

  filterChipText: {
    marginLeft: responsive(6, 8),
    fontSize: responsive(12, 14),
    fontWeight: "850",
    maxWidth: responsive(160, 230),
  },

  filterDivider: {
    height: 1,
    marginVertical: responsive(14, 20),
  },

  listInfoRow: {
    marginTop: responsive(4, 8),
    marginBottom: responsive(10, 14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  listTitle: {
    fontSize: responsive(12, 14),
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  dragHint: {
    fontSize: responsive(11.5, 13.5),
    fontWeight: "700",
  },

  emptyCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginTop: responsive(4, 8),
  },

  emptyContent: {
    alignItems: "center",
    padding: responsive(22, 34),
  },

  emptyIconBox: {
    width: responsive(52, 68),
    height: responsive(52, 68),
    borderRadius: responsive(18, 23),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(14, 20),
  },

  emptyTitle: {
    fontSize: responsive(18, 23),
    fontWeight: "900",
    letterSpacing: -0.2,
    marginBottom: responsive(5, 8),
    textAlign: "center",
  },

  emptyText: {
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 23),
    textAlign: "center",
    marginBottom: responsive(16, 22),
    maxWidth: responsive(undefined, 470),
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

  taskCard: {
    position: "relative",
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(12, 18),
  },

  taskAccentWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: responsive(5, 6),
  },

  taskAccent: {
    flex: 1,
  },

  taskContent: {
    padding: responsive(15, 22),
    paddingLeft: responsive(18, 26),
  },

  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  projectIcon: {
    width: responsive(46, 60),
    height: responsive(46, 60),
    borderRadius: responsive(16, 21),
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: responsive(12, 16),
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  logoLetter: {
    fontSize: responsive(20, 27),
    fontWeight: "900",
  },

  taskInfo: {
    flex: 1,
  },

  taskTitle: {
    fontSize: responsive(16, 20),
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: responsive(21, 26),
  },

  projectName: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  dragButton: {
    margin: 0,
    opacity: 0.75,
  },

  description: {
    marginTop: responsive(12, 16),
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 24),
  },

  taskDivider: {
    height: 1,
    marginTop: responsive(14, 20),
    marginBottom: responsive(10, 14),
  },

  actionsRow: {
    minHeight: responsive(42, 52),
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
    paddingHorizontal: responsive(8, 12),
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: responsive(4, 7),
  },

  infoChip: {
    maxWidth: responsive(150, 210),
    height: responsive(30, 38),
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: responsive(9, 13),
    flexDirection: "row",
    alignItems: "center",
  },

  infoChipText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "900",
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
    paddingBottom: responsive(40, 48),
    paddingTop: responsive(10, 14),
  },

  modalScrollContent: {
    paddingBottom: responsive(34, 44),
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

  formSectionTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    marginTop: responsive(8, 12),
    marginBottom: responsive(10, 14),
  },

  projectSelectorCard: {
    borderRadius: responsive(20, 26),
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: responsive(12, 16),
  },

  projectSelectorContent: {
    minHeight: responsive(62, 78),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(13, 18),
    paddingVertical: responsive(10, 14),
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
    borderRadius: responsive(18, 22),
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

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(8, 11),
    marginBottom: responsive(14, 20),
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
    maxHeight: responsive("82%", "78%"),
    borderRadius: responsive(30, 36),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  detailContent: {
    padding: responsive(18, 28),
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

  detailStatusRow: {
    marginTop: responsive(16, 22),
    flexDirection: "row",
    alignItems: "center",
  },

  detailDivider: {
    height: 1,
    marginTop: responsive(16, 22),
    marginBottom: responsive(14, 20),
  },

  detailScrollContent: {
    paddingBottom: responsive(18, 26),
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

  deleteTaskPreview: {
    width: "100%",
    borderRadius: responsive(18, 22),
    borderWidth: 1,
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(12, 16),
    marginTop: responsive(16, 22),
  },

  deleteTaskTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "850",
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

  cancelDeleteLabel: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },

  confirmDeleteLabel: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },

  skeletonProjectIcon: {
    width: responsive(46, 60),
    height: responsive(46, 60),
    borderRadius: responsive(16, 21),
    marginRight: responsive(12, 16),
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

  skeletonDrag: {
    width: responsive(28, 36),
    height: responsive(28, 36),
    borderRadius: 999,
  },

  skeletonDescription: {
    width: "94%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginTop: responsive(14, 19),
  },

  skeletonDescriptionSmall: {
    width: "68%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginTop: responsive(8, 11),
  },

  skeletonAction: {
    width: responsive(40, 50),
    height: responsive(40, 50),
    borderRadius: 999,
  },

  skeletonChip: {
    width: responsive(112, 145),
    height: responsive(30, 38),
    borderRadius: 999,
  },
});