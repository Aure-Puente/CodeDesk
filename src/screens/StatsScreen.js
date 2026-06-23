import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";
import { BarChart, PieChart, ProgressChart } from "react-native-chart-kit";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth - 40;

const RANGE_OPTIONS = [
  { label: "Todo", value: "all" },
  { label: "Este mes", value: "month" },
  { label: "Este año", value: "year" },
];

export default function StatsScreen({ theme }) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubTasks = onSnapshot(
      query(collection(db, "tasks"), where("userId", "==", user.uid)),
      (snapshot) => {
        setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), where("userId", "==", user.uid)),
      (snapshot) => {
        setProjects(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (snapshot) => {
        setPayments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    const unsubNotes = onSnapshot(
      query(collection(db, "notes"), where("userId", "==", user.uid)),
      (snapshot) => {
        setNotes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );

    return () => {
      unsubTasks();
      unsubProjects();
      unsubPayments();
      unsubNotes();
    };
  }, [user]);

  const filteredData = useMemo(() => {
    return {
      tasks: filterByRange(tasks, range),
      projects: filterByRange(projects, range),
      payments: filterByRange(payments, range),
      notes: filterByRange(notes, range),
    };
  }, [tasks, projects, payments, notes, range]);

  const stats = useMemo(() => {
    const paidTotal = filteredData.payments.reduce(
      (acc, payment) => acc + getPaidAmount(payment),
      0
    );

    const agreedTotal = filteredData.payments.reduce(
      (acc, payment) => acc + Number(payment.totalAmount || 0),
      0
    );

    const pendingTotal = Math.max(agreedTotal - paidTotal, 0);

    return {
      totalTasks: filteredData.tasks.length,
      completedTasks: filteredData.tasks.filter((task) => task.status === "completada").length,
      pendingTasks: filteredData.tasks.filter((task) => task.status === "pendiente").length,
      urgentTasks: filteredData.tasks.filter((task) => task.priority === "urgente").length,
      totalProjects: filteredData.projects.length,
      activeProjects: filteredData.projects.filter((project) => project.status === "activo").length,
      paidTotal,
      pendingTotal,
      totalNotes: filteredData.notes.length,
    };
  }, [filteredData]);

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: () => theme.colors.primary,
    labelColor: () => theme.colors.secondary,
    propsForBackgroundLines: {
      stroke: theme.colors.outline,
    },
    barPercentage: 0.72,
  };

  const taskStatusData = {
    labels: ["Pend.", "Progr.", "Hechas", "Paus."],
    datasets: [
      {
        data: [
          filteredData.tasks.filter((t) => t.status === "pendiente").length,
          filteredData.tasks.filter((t) => t.status === "en progreso").length,
          filteredData.tasks.filter((t) => t.status === "completada").length,
          filteredData.tasks.filter((t) => t.status === "pausada").length,
        ],
      },
    ],
  };

  const priorityData = [
    {
      name: "Baja",
      population: filteredData.tasks.filter((t) => t.priority === "baja").length,
      color: "#16A34A",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Media",
      population: filteredData.tasks.filter((t) => t.priority === "media").length,
      color: "#2563EB",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Alta",
      population: filteredData.tasks.filter((t) => t.priority === "alta").length,
      color: "#EA580C",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Urgente",
      population: filteredData.tasks.filter((t) => t.priority === "urgente").length,
      color: "#DC2626",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
  ].filter((item) => item.population > 0);

  const projectStatusData = [
    {
      name: "Activos",
      population: filteredData.projects.filter((p) => p.status === "activo").length,
      color: "#2563EB",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Pausados",
      population: filteredData.projects.filter((p) => p.status === "pausado").length,
      color: "#EA580C",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Finalizados",
      population: filteredData.projects.filter((p) => p.status === "finalizado").length,
      color: "#16A34A",
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
  ].filter((item) => item.population > 0);

  const progressValue =
    stats.totalTasks === 0 ? 0 : stats.completedTasks / stats.totalTasks;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Métricas generales de productividad, proyectos y cobros.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {RANGE_OPTIONS.map((item) => (
          <Chip
            key={item.value}
            selected={range === item.value}
            onPress={() => setRange(item.value)}
            style={styles.filterChip}
          >
            {item.label}
          </Chip>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard title="Tareas" value={stats.totalTasks} icon="checkbox-marked-circle-outline" theme={theme} />
            <StatCard title="Hechas" value={stats.completedTasks} icon="check-circle-outline" theme={theme} />
            <StatCard title="Proyectos" value={stats.totalProjects} icon="folder-outline" theme={theme} />
            <StatCard title="Notas" value={stats.totalNotes} icon="note-text-outline" theme={theme} />
          </View>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Progreso de tareas
              </Text>

              <ProgressChart
                data={{
                  labels: ["Hechas"],
                  data: [progressValue],
                }}
                width={chartWidth - 32}
                height={190}
                strokeWidth={16}
                radius={52}
                chartConfig={chartConfig}
                hideLegend={false}
              />

              <Text style={[styles.centerText, { color: theme.colors.secondary }]}>
                {stats.completedTasks} de {stats.totalTasks} tareas completadas
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Tareas por estado
              </Text>

              <BarChart
                data={taskStatusData}
                width={chartWidth - 32}
                height={230}
                chartConfig={chartConfig}
                fromZero
                showValuesOnTopOfBars
                yAxisLabel=""
                yAxisSuffix=""
                style={styles.chart}
              />
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Prioridades
              </Text>

              {priorityData.length === 0 ? (
                <EmptyText theme={theme} text="Todavía no hay tareas con prioridad." />
              ) : (
                <PieChart
                  data={priorityData}
                  width={chartWidth - 32}
                  height={210}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="4"
                  absolute
                />
              )}
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Proyectos por estado
              </Text>

              {projectStatusData.length === 0 ? (
                <EmptyText theme={theme} text="Todavía no hay proyectos para mostrar." />
              ) : (
                <PieChart
                  data={projectStatusData}
                  width={chartWidth - 32}
                  height={210}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="4"
                  absolute
                />
              )}
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Resumen financiero
              </Text>

              <View style={styles.moneyGrid}>
                <MoneyBox title="Cobrado" value={formatMoney(stats.paidTotal)} icon="cash-check" theme={theme} />
                <MoneyBox title="Pendiente" value={formatMoney(stats.pendingTotal)} icon="cash-clock" theme={theme} />
              </View>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function filterByRange(items, range) {
  if (range === "all") return items;

  const now = new Date();

  return items.filter((item) => {
    const seconds = item.createdAt?.seconds;
    if (!seconds) return true;

    const date = new Date(seconds * 1000);

    if (range === "month") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }

    if (range === "year") {
      return date.getFullYear() === now.getFullYear();
    }

    return true;
  });
}

function getPaidAmount(payment) {
  return (payment.installments || []).reduce(
    (acc, item) => acc + Number(item.amount || 0),
    0
  );
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

function StatCard({ title, value, icon, theme }) {
  return (
    <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.statHeader}>
          <MaterialCommunityIcons name={icon} size={22} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {value}
          </Text>
        </View>

        <Text style={{ color: theme.colors.secondary }}>{title}</Text>
      </Card.Content>
    </Card>
  );
}

function MoneyBox({ title, value, icon, theme }) {
  return (
    <View style={[styles.moneyBox, { borderColor: theme.colors.outline }]}>
      <MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />

      <Text style={[styles.moneyValue, { color: theme.colors.text }]}>
        {value}
      </Text>

      <Text style={{ color: theme.colors.secondary }}>{title}</Text>
    </View>
  );
}

function EmptyText({ text, theme }) {
  return (
    <Text style={{ color: theme.colors.secondary, marginTop: 8 }}>
      {text}
    </Text>
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

  filters: {
    marginBottom: 16,
  },

  filterChip: {
    marginRight: 8,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  statCard: {
    width: "48%",
    borderRadius: 22,
  },

  statHeader: {
    gap: 8,
  },

  statValue: {
    fontSize: 28,
    fontWeight: "900",
  },

  card: {
    borderRadius: 24,
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  chart: {
    borderRadius: 18,
  },

  centerText: {
    textAlign: "center",
    marginTop: -8,
  },

  moneyGrid: {
    flexDirection: "row",
    gap: 12,
  },

  moneyBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  moneyValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
});