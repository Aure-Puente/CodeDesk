import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

export default function HomeScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    });

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setProjects(data);
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
    };
  }, [user]);

  const stats = useMemo(() => {
    return {
      pendingTasks: tasks.filter((task) => task.status === "pendiente").length,
      inProgressTasks: tasks.filter((task) => task.status === "en progreso").length,
      urgentTasks: tasks.filter((task) => task.priority === "urgente").length,
      completedTasks: tasks.filter((task) => task.status === "completada").length,
      activeProjects: projects.filter((project) => project.status === "activo").length,
      pausedProjects: projects.filter((project) => project.status === "pausado").length,
      finishedProjects: projects.filter((project) => project.status === "finalizado").length,
    };
  }, [tasks, projects]);

  const urgentTasks = tasks.filter(
    (task) => task.priority === "urgente" && task.status !== "completada"
  );

  const inProgressTasks = tasks.filter((task) => task.status === "en progreso");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.text }]}>
        CodeDesk
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Resumen general de tus proyectos y tareas.
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <>
          <View style={styles.grid}>
            <DashboardCard
              title="Pendientes"
              value={stats.pendingTasks}
              icon="clock-outline"
              theme={theme}
            />

            <DashboardCard
              title="En progreso"
              value={stats.inProgressTasks}
              icon="progress-clock"
              theme={theme}
            />

            <DashboardCard
              title="Urgentes"
              value={stats.urgentTasks}
              icon="alert-circle-outline"
              theme={theme}
            />

            <DashboardCard
              title="Completadas"
              value={stats.completedTasks}
              icon="check-circle-outline"
              theme={theme}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Proyectos
          </Text>

          <View style={styles.grid}>
            <DashboardCard
              title="Activos"
              value={stats.activeProjects}
              icon="folder-open-outline"
              theme={theme}
            />

            <DashboardCard
              title="Pausados"
              value={stats.pausedProjects}
              icon="pause-circle-outline"
              theme={theme}
            />

            <DashboardCard
              title="Finalizados"
              value={stats.finishedProjects}
              icon="folder-check-outline"
              theme={theme}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Urgentes
          </Text>

          {urgentTasks.length === 0 ? (
            <EmptyCard text="No tenés tareas urgentes pendientes." theme={theme} />
          ) : (
            urgentTasks.slice(0, 4).map((task) => (
              <TaskPreview key={task.id} task={task} theme={theme} />
            ))
          )}

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            En progreso
          </Text>

          {inProgressTasks.length === 0 ? (
            <EmptyCard text="No tenés tareas en progreso." theme={theme} />
          ) : (
            inProgressTasks.slice(0, 4).map((task) => (
              <TaskPreview key={task.id} task={task} theme={theme} />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function DashboardCard({ title, value, icon, theme }) {
  return (
    <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={theme.colors.primary}
          />

          <Text style={[styles.cardValue, { color: theme.colors.primary }]}>
            {value}
          </Text>
        </View>

        <Text style={{ color: theme.colors.secondary }}>{title}</Text>
      </Card.Content>
    </Card>
  );
}

function EmptyCard({ text, theme }) {
  return (
    <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={{ color: theme.colors.secondary }}>{text}</Text>
      </Card.Content>
    </Card>
  );
}

function TaskPreview({ task, theme }) {
  const color = task.projectColor || theme.colors.primary;

  return (
    <Card style={[styles.taskCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.taskRow}>
          <View style={[styles.taskDot, { backgroundColor: color }]} />

          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
              {task.title}
            </Text>

            <Text style={{ color: theme.colors.secondary }}>
              {task.projectName || "Tarea personal"}
            </Text>
          </View>

          <Chip compact>{task.status}</Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 135,
  },

  title: {
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 22,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    width: "48%",
    borderRadius: 22,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardValue: {
    fontSize: 28,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },

  emptyCard: {
    borderRadius: 20,
    marginBottom: 10,
  },

  taskCard: {
    borderRadius: 20,
    marginBottom: 10,
  },

  taskRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  taskDot: {
    width: 12,
    height: 42,
    borderRadius: 999,
    marginRight: 12,
  },

  taskInfo: {
    flex: 1,
  },

  taskTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
});