//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  ProgressBar,
  Text,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

//Assets:
const adaptiveIcon = require("../../assets/adaptive-icon.png");

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
  return theme.colors.primary;
}

function getStatusSoftColor(theme, status) {
  if (status === "pendiente") return theme.colors.warningSoft;
  if (status === "en progreso") return theme.colors.infoSoft;
  if (status === "completada") return theme.colors.successSoft;
  return theme.colors.primarySoft;
}

export default function HomeScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const loading = !tasksLoaded || !projectsLoaded;

  useEffect(() => {
    if (!user?.uid) return;

    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setTasks(data);
      setTasksLoaded(true);
    });

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setProjects(data);
      setProjectsLoaded(true);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
    };
  }, [user]);

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
    const completedPercent = totalTasks > 0 ? completedTasks / totalTasks : 0;

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
      completedPercent,
      activeProjects,
      finishedProjects,
    };
  }, [tasks, projects]);

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
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.text }]}
          >
            Inicio
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Resumen rápido de tus tareas, proyectos y progreso general.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
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
                  <Text
                    style={[
                      styles.heroTitle,
                      { color: theme.colors.text },
                    ]}
                  >
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

                <View
                  style={[
                    styles.heroIcon,
                    { backgroundColor: theme.colors.primarySoft },
                  ]}
                >
                  <Image source={adaptiveIcon} style={styles.heroLogo} />
                </View>
              </View>

              <View style={styles.heroStats}>
                <HeroMiniStat
                  label="Tareas"
                  value={stats.totalTasks}
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
                  label="Proyectos"
                  value={projects.length}
                  color={theme.colors.primary}
                  theme={theme}
                />
              </View>
            </View>
          </Card>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
              Tareas
            </Text>

            <Text style={[styles.sectionMeta, { color: theme.colors.secondary }]}>
              {Math.round(stats.completedPercent * 100)}% completado
            </Text>
          </View>

          <Card
            mode="contained"
            style={[
              styles.progressCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.progressContent}>
              <View style={styles.progressHeader}>
                <Text
                  style={[styles.progressLabel, { color: theme.colors.text }]}
                >
                  Progreso de tareas
                </Text>

                <Text
                  style={[
                    styles.progressValue,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {stats.completedTasks}/{stats.totalTasks}
                </Text>
              </View>

              <ProgressBar
                progress={stats.completedPercent}
                color={theme.colors.primary}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: theme.colors.borderSoft,
                  },
                ]}
              />
            </View>
          </Card>

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
        </>
      )}
    </ScrollView>
  );
}

function HeroMiniStat({ label, value, color, theme }) {
  return (
    <View style={styles.heroMiniStat}>
      <Text style={[styles.heroMiniValue, { color }]}>{value}</Text>

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
          <MaterialCommunityIcons name={icon} size={20} color={color} />
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
          <MaterialCommunityIcons name={icon} size={22} color={color} />
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
            size={21}
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
  const projectColor = task.projectColor || theme.colors.primary;
  const statusColor = getStatusColor(theme, task.status);
  const statusSoft = getStatusSoftColor(theme, task.status);

  const projectSoft = theme.dark
    ? hexToRgba(projectColor, 0.16)
    : hexToRgba(projectColor, 0.1);

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
        <View style={[styles.taskIconBox, { backgroundColor: projectSoft }]}>
          <MaterialCommunityIcons
            name="checkbox-blank-circle-outline"
            size={20}
            color={projectColor}
          />
        </View>

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

  loadingBox: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },

  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 20,
  },

  heroContent: {
    padding: 18,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroText: {
    flex: 1,
    paddingRight: 12,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 30,
  },

  heroDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 260,
  },

  heroIcon: {
    width: 85,
    height: 85,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  heroLogo: {
    width: 85,
    height: 85,
    borderRadius: 28,
  },

  heroStats: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  heroMiniStat: {
    flex: 1,
  },

  heroMiniValue: {
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  heroMiniLabel: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
  },

  heroDivider: {
    width: 1,
    height: 38,
    marginHorizontal: 18,
  },

  sectionHeaderRow: {
    marginTop: 2,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    marginBottom: 10,
    marginLeft: 2,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  sectionMeta: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
  },

  progressCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 12,
  },

  progressContent: {
    padding: 15,
  },

  progressHeader: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressLabel: {
    fontSize: 13,
    fontWeight: "800",
  },

  progressValue: {
    fontSize: 12.5,
    fontWeight: "800",
  },

  progressBar: {
    height: 8,
    borderRadius: 999,
  },

  taskStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  taskStatCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  taskStatContent: {
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: "center",
  },

  taskStatIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  taskStatValue: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  taskStatTitle: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: "800",
    textAlign: "center",
  },

  projectGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  projectCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  projectContent: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  projectIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  projectText: {
    flex: 1,
  },

  projectValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  projectTitle: {
    marginTop: 1,
    fontSize: 12.5,
    fontWeight: "800",
  },

  listHeader: {
    marginTop: 14,
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionCount: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
  },

  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 10,
  },

  emptyContent: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  emptyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  emptyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  taskCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
    marginBottom: 10,
  },

  taskContent: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  taskIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  taskInfo: {
    flex: 1,
    paddingRight: 8,
  },

  taskTitle: {
    fontSize: 15,
    fontWeight: "850",
    letterSpacing: -0.2,
  },

  taskProject: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
  },

  statusChip: {
    height: 30,
    borderRadius: 999,
  },

  statusChipText: {
    fontSize: 11.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },
});