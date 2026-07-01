//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Image, ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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

function getStatusColor(theme, status) {
  if (status === "pendiente") return theme.colors.warning;
  if (status === "en progreso") return theme.colors.info;
  if (status === "completada") return theme.colors.success;
  if (status === "pausada") return theme.colors.secondary;
  return theme.colors.primary;
}

function getStatusSoftColor(theme, status) {
  if (status === "pendiente") return theme.colors.warningSoft;
  if (status === "en progreso") return theme.colors.infoSoft;
  if (status === "completada") return theme.colors.successSoft;
  if (status === "pausada") return theme.colors.borderSoft;
  return theme.colors.primarySoft;
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

function getTaskDateValue(task) {
  return task?.createdAt?.seconds || task?.updatedAt?.seconds || 0;
}

function sortTasksLikeMainList(a, b) {
  const orderA = a.order ?? 999999;
  const orderB = b.order ?? 999999;

  if (orderA !== orderB) return orderA - orderB;

  return getTaskDateValue(b) - getTaskDateValue(a);
}

export default function HomeScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notes, setNotes] = useState([]);

  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);

  const loading = !tasksLoaded || !projectsLoaded || !notesLoaded;

  useEffect(() => {
    if (!user?.uid) {
      setTasks([]);
      setProjects([]);
      setNotes([]);
      setTasksLoaded(true);
      setProjectsLoaded(true);
      setNotesLoaded(true);
      return;
    }

    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const notesQuery = query(
      collection(db, "notes"),
      where("userId", "==", user.uid)
    );

    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .sort(sortTasksLikeMainList);

        setTasks(data);
        setTasksLoaded(true);
      },
      (error) => {
        console.error("Error cargando tareas:", error);
        setTasks([]);
        setTasksLoaded(true);
      }
    );

    const unsubscribeProjects = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setProjects(data);
        setProjectsLoaded(true);
      },
      (error) => {
        console.error("Error cargando proyectos:", error);
        setProjects([]);
        setProjectsLoaded(true);
      }
    );

    const unsubscribeNotes = onSnapshot(
      notesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setNotes(data);
        setNotesLoaded(true);
      },
      (error) => {
        console.error("Error cargando notas:", error);
        setNotes([]);
        setNotesLoaded(true);
      }
    );

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
      unsubscribeNotes();
    };
  }, [user]);

  const topTask = useMemo(() => {
    return tasks[0] || null;
  }, [tasks]);

  const heroProject = useMemo(() => {
    if (!topTask?.projectId) return null;

    return projects.find((project) => project.id === topTask.projectId) || null;
  }, [topTask, projects]);

  const stats = useMemo(() => {
    const pendingTasks = tasks.filter(
      (task) => task.status === "pendiente"
    ).length;

    const inProgressTasks = tasks.filter(
      (task) => task.status === "en progreso"
    ).length;

    const completedTasks = tasks.filter(
      (task) => task.status === "completada"
    ).length;

    const totalTasks = tasks.length;

    const activeProjects = projects.filter(
      (project) => project.status === "activo"
    ).length;

    const finishedProjects = projects.filter(
      (project) => project.status === "finalizado"
    ).length;

    return {
      pendingTasks,
      inProgressTasks,
      completedTasks,
      totalTasks,
      activeProjects,
      finishedProjects,
      totalProjects: projects.length,
      totalNotes: notes.length,
    };
  }, [tasks, projects, notes]);

  const pendingTasks = useMemo(() => {
    return tasks.filter((task) => task.status === "pendiente").slice(0, 4);
  }, [tasks]);

  const inProgressTasks = useMemo(() => {
    return tasks.filter((task) => task.status === "en progreso").slice(0, 4);
  }, [tasks]);

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
            variant={IS_TABLET ? "headlineMedium" : "headlineSmall"}
            style={[styles.title, { color: theme.colors.text }]}
          >
            Inicio
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Resumen rápido de tus proyectos, tareas y notas.
        </Text>
      </View>

      {loading ? (
        <HomeSkeleton theme={theme} />
      ) : (
        <>
          <Card
            mode="contained"
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View style={styles.heroText}>
                  <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
                    Panel principal
                  </Text>

                  <Text
                    style={[
                      styles.heroDescription,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Una vista simple para controlar lo importante de CodeDesk.
                  </Text>
                </View>

                <HeroProjectLogo
                  task={topTask}
                  project={heroProject}
                  theme={theme}
                />
              </View>

              <View style={styles.heroStats}>
                <HeroMiniStat
                  label="Proyectos"
                  value={stats.totalProjects}
                  icon="folder-multiple-outline"
                  color={theme.colors.primary}
                  theme={theme}
                />

                <View
                  style={[
                    styles.heroDivider,
                    {
                      backgroundColor: theme.colors.borderSoft,
                    },
                  ]}
                />

                <HeroMiniStat
                  label="Tareas"
                  value={stats.totalTasks}
                  icon="format-list-checks"
                  color={theme.colors.primary}
                  theme={theme}
                />

                <View
                  style={[
                    styles.heroDivider,
                    {
                      backgroundColor: theme.colors.borderSoft,
                    },
                  ]}
                />

                <HeroMiniStat
                  label="Notas"
                  value={stats.totalNotes}
                  icon="note-text-outline"
                  color={theme.colors.primary}
                  theme={theme}
                />
              </View>
            </View>
          </Card>

          <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
            Proyectos
          </Text>

          <View style={styles.projectGrid}>
            <ProjectStatCard
              title="Activos"
              value={stats.activeProjects}
              icon="folder-open-outline"
              color={theme.colors.info}
              softColor={theme.colors.infoSoft}
              theme={theme}
            />

            <ProjectStatCard
              title="Finalizados"
              value={stats.finishedProjects}
              icon="folder-check-outline"
              color={theme.colors.success}
              softColor={theme.colors.successSoft}
              theme={theme}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
            Tareas
          </Text>

          <View style={styles.taskStatsRow}>
            <DashboardCard
              title="Pendientes"
              value={stats.pendingTasks}
              icon="clock-outline"
              color={theme.colors.warning}
              softColor={theme.colors.warningSoft}
              theme={theme}
            />

            <DashboardCard
              title="En progreso"
              value={stats.inProgressTasks}
              icon="progress-clock"
              color={theme.colors.info}
              softColor={theme.colors.infoSoft}
              theme={theme}
            />

            <DashboardCard
              title="Completadas"
              value={stats.completedTasks}
              icon="check-circle-outline"
              color={theme.colors.success}
              softColor={theme.colors.successSoft}
              theme={theme}
            />
          </View>

          <SectionHeader
            title="En progreso"
            count={inProgressTasks.length}
            theme={theme}
          />

          {inProgressTasks.length === 0 ? (
            <EmptyCard
              text="No tenés tareas en progreso."
              icon="progress-check"
              theme={theme}
            />
          ) : (
            inProgressTasks.map((task) => (
              <TaskPreview key={task.id} task={task} theme={theme} />
            ))
          )}

          <SectionHeader
            title="Pendientes"
            count={pendingTasks.length}
            theme={theme}
          />

          {pendingTasks.length === 0 ? (
            <EmptyCard
              text="No tenés tareas pendientes."
              icon="check-all"
              theme={theme}
            />
          ) : (
            pendingTasks.map((task) => (
              <TaskPreview key={task.id} task={task} theme={theme} />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function HeroProjectLogo({ task, project, theme }) {
  const color = task?.projectColor || project?.color || theme.colors.primary;
  const logoUrl = task?.projectLogoUrl || project?.logoUrl;

  const projectName =
    task?.projectName || project?.name || "Proyecto principal";

  const letter = projectName?.charAt(0)?.toUpperCase();

  return (
    <View style={styles.heroLogoWrap}>
      <View
        style={[
          styles.heroRocketBadge,
          {
            backgroundColor: theme.colors.info,
            borderColor: theme.colors.surface,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="rocket-launch"
          size={responsive(14, 17)}
          color="#FFFFFF"
        />
      </View>

      <View
        style={[
          styles.heroIcon,
          {
            backgroundColor: getProjectIconBackground(theme, color),
            borderColor: getProjectIconBorder(theme, color),
          },
        ]}
      >
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.heroLogo} />
        ) : letter ? (
          <Text style={[styles.heroLogoLetter, { color }]}>{letter}</Text>
        ) : (
          <MaterialCommunityIcons
            name="folder-outline"
            size={responsive(38, 48)}
            color={theme.colors.primary}
          />
        )}
      </View>

      <Text style={[styles.heroProgressText, { color: theme.colors.info }]}>
        En progreso
      </Text>
    </View>
  );
}

function TaskProjectLogo({ task, theme }) {
  const projectColor = task.projectColor || theme.colors.primary;
  const logoUrl = task.projectLogoUrl;
  const letter = task.projectName?.charAt(0)?.toUpperCase();

  const projectIconBackground = getProjectIconBackground(theme, projectColor);
  const projectIconBorder = getProjectIconBorder(theme, projectColor);

  return (
    <View
      style={[
        styles.taskIconBox,
        {
          backgroundColor: projectIconBackground,
          borderColor: projectIconBorder,
        },
      ]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.taskProjectLogo} />
      ) : letter ? (
        <Text style={[styles.taskProjectLetter, { color: projectColor }]}>
          {letter}
        </Text>
      ) : (
        <MaterialCommunityIcons
          name="checkbox-blank-circle"
          size={responsive(21, 26)}
          color={projectColor}
        />
      )}
    </View>
  );
}

function HeroMiniStat({ label, value, icon, color, theme }) {
  return (
    <View style={styles.heroMiniStat}>
      <View style={styles.heroMiniValueRow}>
        <MaterialCommunityIcons
          name={icon}
          size={responsive(22, 28)}
          color={color}
        />

        <Text style={[styles.heroMiniValue, { color }]}>{value}</Text>
      </View>

      <Text style={[styles.heroMiniLabel, { color: theme.colors.secondary }]}>
        {label}
      </Text>
    </View>
  );
}

function DashboardCard({ title, value, icon, color, softColor, theme }) {
  return (
    <Card
      mode="contained"
      style={[
        styles.taskStatCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.taskStatContent}>
        <View style={[styles.taskStatIconBox, { backgroundColor: softColor }]}>
          <MaterialCommunityIcons
            name={icon}
            size={responsive(20, 26)}
            color={color}
          />
        </View>

        <Text style={[styles.taskStatValue, { color }]}>{value}</Text>

        <Text
          style={[styles.taskStatTitle, { color: theme.colors.secondary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </Card>
  );
}

function ProjectStatCard({ title, value, icon, color, softColor, theme }) {
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
        <View style={[styles.projectIconBox, { backgroundColor: softColor }]}>
          <MaterialCommunityIcons
            name={icon}
            size={responsive(22, 28)}
            color={color}
          />
        </View>

        <View style={styles.projectText}>
          <Text style={[styles.projectValue, { color: theme.colors.text }]}>
            {value}
          </Text>

          <Text style={[styles.projectTitle, { color: theme.colors.secondary }]}>
            {title}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function SectionHeader({ title, count, theme }) {
  return (
    <View style={styles.listHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
        {title}
      </Text>

      <Text style={[styles.sectionCount, { color: theme.colors.secondary }]}>
        {count} visibles
      </Text>
    </View>
  );
}

function EmptyCard({ text, icon, theme }) {
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
            name={icon}
            size={responsive(21, 26)}
            color={theme.colors.primary}
          />
        </View>

        <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
          {text}
        </Text>
      </View>
    </Card>
  );
}

function TaskPreview({ task, theme }) {
  const statusColor = getStatusColor(theme, task.status);
  const statusSoft = getStatusSoftColor(theme, task.status);

  return (
    <Card
      mode="contained"
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.taskContent}>
        <TaskProjectLogo task={task} theme={theme} />

        <View style={styles.taskInfo}>
          <Text
            style={[styles.taskTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {task.title || "Tarea sin título"}
          </Text>

          <Text
            style={[styles.taskProject, { color: theme.colors.secondary }]}
            numberOfLines={1}
          >
            {task.projectName || "Tarea personal"}
          </Text>
        </View>

        <Chip
          compact
          textStyle={[
            styles.statusChipText,
            {
              color: statusColor,
            },
          ]}
          style={[
            styles.statusChip,
            {
              backgroundColor: statusSoft,
            },
          ]}
        >
          {task.status}
        </Chip>
      </View>
    </Card>
  );
}

function HomeSkeleton({ theme }) {
  const skeletonColor = theme.dark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.07)";

  const skeletonStrongColor = theme.dark
    ? "rgba(255,255,255,0.12)"
    : "rgba(15,23,42,0.11)";

  return (
    <View>
      <Card
        mode="contained"
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <View
                style={[
                  styles.skeletonLineLarge,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonLineMedium,
                  { backgroundColor: skeletonColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonLineSmall,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>

            <View
              style={[
                styles.skeletonLogo,
                { backgroundColor: skeletonStrongColor },
              ]}
            />
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroMiniStat}>
              <View
                style={[
                  styles.skeletonNumber,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonLabel,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>

            <View
              style={[
                styles.heroDivider,
                {
                  backgroundColor: theme.colors.borderSoft,
                },
              ]}
            />

            <View style={styles.heroMiniStat}>
              <View
                style={[
                  styles.skeletonNumber,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonLabel,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>

            <View
              style={[
                styles.heroDivider,
                {
                  backgroundColor: theme.colors.borderSoft,
                },
              ]}
            />

            <View style={styles.heroMiniStat}>
              <View
                style={[
                  styles.skeletonNumber,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonLabel,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>
          </View>
        </View>
      </Card>

      <View
        style={[
          styles.skeletonSectionTitle,
          {
            backgroundColor: skeletonColor,
            marginTop: responsive(4, 8),
            marginBottom: responsive(10, 14),
          },
        ]}
      />

      <View style={styles.projectGrid}>
        <SkeletonProjectCard
          skeletonColor={skeletonColor}
          skeletonStrongColor={skeletonStrongColor}
          theme={theme}
        />

        <SkeletonProjectCard
          skeletonColor={skeletonColor}
          skeletonStrongColor={skeletonStrongColor}
          theme={theme}
        />
      </View>

      <View style={styles.taskStatsRow}>
        <SkeletonSmallCard
          skeletonColor={skeletonColor}
          skeletonStrongColor={skeletonStrongColor}
          theme={theme}
        />

        <SkeletonSmallCard
          skeletonColor={skeletonColor}
          skeletonStrongColor={skeletonStrongColor}
          theme={theme}
        />

        <SkeletonSmallCard
          skeletonColor={skeletonColor}
          skeletonStrongColor={skeletonStrongColor}
          theme={theme}
        />
      </View>

      <SkeletonTaskList
        skeletonColor={skeletonColor}
        skeletonStrongColor={skeletonStrongColor}
        theme={theme}
      />

      <SkeletonTaskList
        skeletonColor={skeletonColor}
        skeletonStrongColor={skeletonStrongColor}
        theme={theme}
      />
    </View>
  );
}

function SkeletonSmallCard({ skeletonColor, skeletonStrongColor, theme }) {
  return (
    <Card
      mode="contained"
      style={[
        styles.taskStatCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.taskStatContent}>
        <View
          style={[
            styles.skeletonSmallIcon,
            { backgroundColor: skeletonStrongColor },
          ]}
        />

        <View
          style={[
            styles.skeletonSmallNumber,
            { backgroundColor: skeletonStrongColor },
          ]}
        />

        <View
          style={[styles.skeletonSmallLabel, { backgroundColor: skeletonColor }]}
        />
      </View>
    </Card>
  );
}

function SkeletonProjectCard({ skeletonColor, skeletonStrongColor, theme }) {
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
        <View
          style={[
            styles.skeletonProjectIcon,
            { backgroundColor: skeletonStrongColor },
          ]}
        />

        <View style={styles.projectText}>
          <View
            style={[
              styles.skeletonProjectNumber,
              { backgroundColor: skeletonStrongColor },
            ]}
          />

          <View
            style={[
              styles.skeletonProjectLabel,
              { backgroundColor: skeletonColor },
            ]}
          />
        </View>
      </View>
    </Card>
  );
}

function SkeletonTaskList({ skeletonColor, skeletonStrongColor, theme }) {
  return (
    <View>
      <View style={styles.listHeader}>
        <View
          style={[
            styles.skeletonSectionTitle,
            { backgroundColor: skeletonColor },
          ]}
        />

        <View
          style={[
            styles.skeletonSectionMeta,
            { backgroundColor: skeletonColor },
          ]}
        />
      </View>

      {[1, 2].map((item) => (
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
          <View style={styles.taskContent}>
            <View
              style={[
                styles.skeletonTaskIcon,
                { backgroundColor: skeletonStrongColor },
              ]}
            />

            <View style={styles.taskInfo}>
              <View
                style={[
                  styles.skeletonTaskTitle,
                  { backgroundColor: skeletonStrongColor },
                ]}
              />

              <View
                style={[
                  styles.skeletonTaskSubtitle,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>

            <View
              style={[
                styles.skeletonChip,
                { backgroundColor: skeletonStrongColor },
              ]}
            />
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
    paddingBottom: responsive(135, 165),
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

  heroCard: {
    borderRadius: responsive(26, 32),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(20, 26),
  },

  heroContent: {
    padding: responsive(18, 28),
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroText: {
    flex: 1,
    paddingRight: responsive(12, 24),
  },

  heroTitle: {
    fontSize: responsive(24, 32),
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: responsive(30, 39),
  },

  heroDescription: {
    marginTop: responsive(6, 9),
    fontSize: responsive(13, 16),
    lineHeight: responsive(18, 23),
    maxWidth: responsive(260, 440),
  },

  heroLogoWrap: {
    position: "relative",
    width: responsive(98, 126),
    alignItems: "center",
    paddingTop: responsive(4, 6),
  },

  heroRocketBadge: {
    position: "absolute",
    top: responsive(-3, -4),
    right: responsive(5, 9),
    zIndex: 5,
    width: responsive(27, 34),
    height: responsive(27, 34),
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  heroIcon: {
    width: responsive(88, 112),
    height: responsive(88, 112),
    borderRadius: responsive(30, 36),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  heroLogo: {
    width: "100%",
    height: "100%",
  },

  heroLogoLetter: {
    fontSize: responsive(36, 46),
    fontWeight: "900",
  },

  heroProgressText: {
    marginTop: responsive(6, 9),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  heroStats: {
    marginTop: responsive(18, 26),
    flexDirection: "row",
    alignItems: "center",
  },

  heroMiniStat: {
    flex: 1,
  },

  heroMiniValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive(7, 10),
  },

  heroMiniValue: {
    fontSize: responsive(27, 36),
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  heroMiniLabel: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  heroDivider: {
    width: 1,
    height: responsive(38, 50),
    marginHorizontal: responsive(12, 20),
  },

  sectionTitle: {
    marginBottom: responsive(10, 14),
    marginLeft: 2,
    fontSize: responsive(12, 14),
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  taskStatsRow: {
    flexDirection: "row",
    gap: responsive(10, 16),
    marginBottom: responsive(12, 20),
  },

  taskStatCard: {
    flex: 1,
    borderRadius: responsive(20, 26),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  taskStatContent: {
    paddingVertical: responsive(13, 21),
    paddingHorizontal: responsive(10, 16),
    alignItems: "center",
  },

  taskStatIconBox: {
    width: responsive(38, 52),
    height: responsive(38, 52),
    borderRadius: responsive(14, 18),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(10, 14),
  },

  taskStatValue: {
    fontSize: responsive(25, 34),
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  taskStatTitle: {
    marginTop: responsive(1, 3),
    fontSize: responsive(11.5, 14),
    fontWeight: "800",
    textAlign: "center",
  },

  projectGrid: {
    flexDirection: "row",
    gap: responsive(12, 18),
    marginBottom: responsive(18, 26),
  },

  projectCard: {
    flex: 1,
    borderRadius: responsive(22, 28),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  projectContent: {
    padding: responsive(14, 22),
    flexDirection: "row",
    alignItems: "center",
  },

  projectIconBox: {
    width: responsive(42, 56),
    height: responsive(42, 56),
    borderRadius: responsive(15, 19),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
  },

  projectText: {
    flex: 1,
  },

  projectValue: {
    fontSize: responsive(24, 34),
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  projectTitle: {
    marginTop: responsive(1, 3),
    fontSize: responsive(12.5, 15),
    fontWeight: "800",
  },

  listHeader: {
    marginTop: responsive(14, 22),
    marginBottom: responsive(2, 6),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionCount: {
    marginBottom: responsive(10, 14),
    fontSize: responsive(12, 14),
    fontWeight: "800",
  },

  emptyCard: {
    borderRadius: responsive(22, 28),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(10, 14),
  },

  emptyContent: {
    minHeight: responsive(68, 86),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(12, 16),
  },

  emptyIconBox: {
    width: responsive(40, 52),
    height: responsive(40, 52),
    borderRadius: responsive(14, 18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
  },

  emptyText: {
    flex: 1,
    fontSize: responsive(13, 16),
    fontWeight: "700",
    lineHeight: responsive(18, 23),
  },

  taskCard: {
    borderRadius: responsive(22, 28),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: responsive(10, 14),
  },

  taskContent: {
    minHeight: responsive(70, 88),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(10, 14),
  },

  taskIconBox: {
    width: responsive(42, 54),
    height: responsive(42, 54),
    borderRadius: responsive(15, 19),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(12, 16),
    overflow: "hidden",
  },

  taskProjectLogo: {
    width: "100%",
    height: "100%",
  },

  taskProjectLetter: {
    fontSize: responsive(18, 24),
    fontWeight: "900",
  },

  taskInfo: {
    flex: 1,
    paddingRight: responsive(8, 12),
  },

  taskTitle: {
    fontSize: responsive(15, 18),
    fontWeight: "850",
    letterSpacing: -0.2,
  },

  taskProject: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(17, 21),
  },

  statusChip: {
    height: responsive(30, 36),
    borderRadius: 999,
  },

  statusChipText: {
    fontSize: responsive(11.5, 13),
    fontWeight: "900",
    textTransform: "capitalize",
  },

  skeletonLineLarge: {
    width: "75%",
    height: responsive(25, 34),
    borderRadius: 999,
    marginBottom: responsive(10, 13),
  },

  skeletonLineMedium: {
    width: "90%",
    height: responsive(13, 16),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonLineSmall: {
    width: "65%",
    height: responsive(13, 16),
    borderRadius: 999,
  },

  skeletonLogo: {
    width: responsive(88, 112),
    height: responsive(88, 112),
    borderRadius: responsive(30, 36),
  },

  skeletonNumber: {
    width: responsive(58, 76),
    height: responsive(28, 36),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonLabel: {
    width: responsive(82, 102),
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonSectionTitle: {
    width: responsive(86, 108),
    height: responsive(13, 16),
    borderRadius: 999,
    marginBottom: responsive(10, 14),
    marginLeft: 2,
  },

  skeletonSectionMeta: {
    width: responsive(92, 118),
    height: responsive(13, 16),
    borderRadius: 999,
    marginBottom: responsive(10, 14),
  },

  skeletonSmallIcon: {
    width: responsive(38, 52),
    height: responsive(38, 52),
    borderRadius: responsive(14, 18),
    marginBottom: responsive(10, 14),
  },

  skeletonSmallNumber: {
    width: responsive(32, 44),
    height: responsive(25, 34),
    borderRadius: 999,
    marginBottom: responsive(7, 10),
  },

  skeletonSmallLabel: {
    width: responsive(58, 78),
    height: responsive(11, 14),
    borderRadius: 999,
  },

  skeletonProjectIcon: {
    width: responsive(42, 56),
    height: responsive(42, 56),
    borderRadius: responsive(15, 19),
    marginRight: responsive(12, 16),
  },

  skeletonProjectNumber: {
    width: responsive(34, 46),
    height: responsive(24, 32),
    borderRadius: 999,
    marginBottom: responsive(7, 10),
  },

  skeletonProjectLabel: {
    width: responsive(78, 104),
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonTaskIcon: {
    width: responsive(40, 54),
    height: responsive(40, 54),
    borderRadius: responsive(14, 19),
    marginRight: responsive(12, 16),
  },

  skeletonTaskTitle: {
    width: "72%",
    height: responsive(15, 19),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonTaskSubtitle: {
    width: "52%",
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonChip: {
    width: responsive(76, 96),
    height: responsive(30, 36),
    borderRadius: 999,
  },
});