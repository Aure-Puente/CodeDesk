//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";
import { BarChart, PieChart } from "react-native-chart-kit";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

//JS:
const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth - 84;

const RANGE_OPTIONS = [
  { label: "Todo", value: "all" },
  { label: "Este mes", value: "month" },
  { label: "Este año", value: "year" },
];

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
        setTasks(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), where("userId", "==", user.uid)),
      (snapshot) => {
        setProjects(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (snapshot) => {
        setPayments(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        setLoading(false);
      }
    );

    const unsubNotes = onSnapshot(
      query(collection(db, "notes"), where("userId", "==", user.uid)),
      (snapshot) => {
        setNotes(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
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
    const completedTasks = filteredData.tasks.filter(
      (task) => task.status === "completada"
    ).length;

    const pendingTasks = filteredData.tasks.filter(
      (task) => task.status === "pendiente"
    ).length;

    const inProgressTasks = filteredData.tasks.filter(
      (task) => task.status === "en progreso"
    ).length;

    const pausedTasks = filteredData.tasks.filter(
      (task) => task.status === "pausada"
    ).length;

    const activeProjects = filteredData.projects.filter(
      (project) => project.status === "activo"
    ).length;

    const pausedProjects = filteredData.projects.filter(
      (project) => project.status === "pausado"
    ).length;

    const finishedProjects = filteredData.projects.filter(
      (project) => project.status === "finalizado"
    ).length;

    const money = {
      ARS: {
        agreed: 0,
        paid: 0,
        pending: 0,
      },
      USD: {
        agreed: 0,
        paid: 0,
        pending: 0,
      },
    };

    filteredData.payments.forEach((payment) => {
      const currency = payment.currency || "ARS";
      const agreed = Number(payment.totalAmount || 0);
      const paid = getPaidAmount(payment);
      const pending = Math.max(agreed - paid, 0);

      if (!money[currency]) {
        money[currency] = {
          agreed: 0,
          paid: 0,
          pending: 0,
        };
      }

      money[currency].agreed += agreed;
      money[currency].paid += paid;
      money[currency].pending += pending;
    });

    return {
      totalTasks: filteredData.tasks.length,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      pausedTasks,
      totalProjects: filteredData.projects.length,
      activeProjects,
      pausedProjects,
      finishedProjects,
      totalNotes: filteredData.notes.length,
      money,
    };
  }, [filteredData]);

  const taskProgress =
    stats.totalTasks === 0 ? 0 : stats.completedTasks / stats.totalTasks;

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: () => theme.colors.primary,
    labelColor: () => theme.colors.secondary,
    propsForBackgroundLines: {
      stroke: theme.colors.borderSoft || theme.colors.outline,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: "700",
    },
    barPercentage: 0.68,
  };

  const taskStatusData = {
    labels: ["Pend.", "Progr.", "Hechas", "Paus."],
    datasets: [
      {
        data: [
          stats.pendingTasks,
          stats.inProgressTasks,
          stats.completedTasks,
          stats.pausedTasks,
        ],
      },
    ],
  };

  const projectStatusData = [
    {
      name: "Activos",
      population: stats.activeProjects,
      color: theme.colors.primary,
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Pausados",
      population: stats.pausedProjects,
      color: theme.colors.warning,
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
    {
      name: "Finalizados",
      population: stats.finishedProjects,
      color: theme.colors.success,
      legendFontColor: theme.colors.secondary,
      legendFontSize: 12,
    },
  ].filter((item) => item.population > 0);

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

          <Text style={[styles.title, { color: theme.colors.text }]}>
            Estadísticas
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Métricas generales de productividad, proyectos, notas y cobros.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {RANGE_OPTIONS.map((item) => {
          const selected = range === item.value;

          return (
            <Chip
              key={item.value}
              compact
              selected={selected}
              icon={item.value === "all" ? "calendar-blank" : "calendar-range"}
              onPress={() => setRange(item.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected
                    ? theme.colors.primarySoft
                    : theme.colors.surface,
                  borderColor: selected
                    ? hexToRgba(theme.colors.primary, theme.dark ? 0.34 : 0.18)
                    : theme.colors.borderSoft,
                },
              ]}
              textStyle={[
                styles.filterChipText,
                {
                  color: selected
                    ? theme.colors.primary
                    : theme.colors.secondary,
                },
              ]}
            >
              {item.label}
            </Chip>
          );
        })}
      </ScrollView>

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
              <View
                style={[
                  styles.heroIconBox,
                  { backgroundColor: theme.colors.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="folder-multiple-outline"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.heroInfo}>
                <Text style={[styles.heroLabel, { color: theme.colors.secondary }]}>
                  Total de proyectos
                </Text>

                <Text style={[styles.heroValue, { color: theme.colors.text }]}>
                  {stats.totalProjects}
                </Text>

                <Text style={[styles.heroHint, { color: theme.colors.secondary }]}>
                  Según el rango seleccionado
                </Text>
              </View>
            </View>
          </Card>

          <Card
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <SectionHeader
                title="Proyectos por estado"
                subtitle="Distribución actual de tus proyectos"
                icon="chart-donut"
                color={theme.colors.primary}
                softColor={theme.colors.primarySoft}
                theme={theme}
              />

              {projectStatusData.length === 0 ? (
                <EmptyBox
                  theme={theme}
                  icon="folder-open-outline"
                  text="Todavía no hay proyectos para mostrar."
                />
              ) : (
                <>
                  <View style={styles.pieWrap}>
                    <PieChart
                      data={projectStatusData}
                      width={chartWidth}
                      height={205}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="0"
                      center={[chartWidth / 4, 0]}
                      absolute
                      hasLegend={false}
                    />
                  </View>

                  <View style={styles.legendGrid}>
                    <LegendItem
                      label="Activos"
                      value={stats.activeProjects}
                      color={theme.colors.primary}
                      theme={theme}
                    />

                    <LegendItem
                      label="Pausados"
                      value={stats.pausedProjects}
                      color={theme.colors.warning}
                      theme={theme}
                    />

                    <LegendItem
                      label="Finalizados"
                      value={stats.finishedProjects}
                      color={theme.colors.success}
                      theme={theme}
                    />
                  </View>
                </>
              )}
            </View>
          </Card>

          <Card
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <SectionHeader
                title="Progreso de tareas"
                subtitle={`${stats.completedTasks} de ${stats.totalTasks} tareas completadas`}
                icon="checkbox-marked-circle-outline"
                color={theme.colors.success}
                softColor={theme.colors.successSoft}
                theme={theme}
              />

              <View style={styles.progressInfoRow}>
                <Text style={[styles.progressPercent, { color: theme.colors.text }]}>
                  {Math.round(taskProgress * 100)}%
                </Text>

                <Text style={[styles.progressText, { color: theme.colors.secondary }]}>
                  completado
                </Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.borderSoft },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(taskProgress * 100)}%`,
                      backgroundColor: theme.colors.success,
                    },
                  ]}
                />
              </View>

              <View style={styles.taskMiniGrid}>
                <MiniMetric
                  title="Pendientes"
                  value={stats.pendingTasks}
                  icon="clock-outline"
                  color={theme.colors.warning}
                  softColor={theme.colors.warningSoft}
                  theme={theme}
                />

                <MiniMetric
                  title="En progreso"
                  value={stats.inProgressTasks}
                  icon="progress-clock"
                  color={theme.colors.info}
                  softColor={theme.colors.infoSoft}
                  theme={theme}
                />

                <MiniMetric
                  title="Hechas"
                  value={stats.completedTasks}
                  icon="check-circle-outline"
                  color={theme.colors.success}
                  softColor={theme.colors.successSoft}
                  theme={theme}
                />

                <MiniMetric
                  title="Notas"
                  value={stats.totalNotes}
                  icon="note-text-outline"
                  color={theme.colors.primary}
                  softColor={theme.colors.primarySoft}
                  theme={theme}
                />
              </View>
            </View>
          </Card>

          <Card
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <SectionHeader
                title="Tareas por estado"
                subtitle="Comparación rápida por estado"
                icon="chart-bar"
                color={theme.colors.info}
                softColor={theme.colors.infoSoft}
                theme={theme}
              />

              {stats.totalTasks === 0 ? (
                <EmptyBox
                  theme={theme}
                  icon="clipboard-text-outline"
                  text="Todavía no hay tareas para graficar."
                />
              ) : (
                <View style={styles.barChartWrap}>
                  <BarChart
                    data={taskStatusData}
                    width={chartWidth}
                    height={220}
                    chartConfig={chartConfig}
                    fromZero
                    showValuesOnTopOfBars
                    yAxisLabel=""
                    yAxisSuffix=""
                    style={styles.chart}
                  />
                </View>
              )}
            </View>
          </Card>

          <Card
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <SectionHeader
                title="Resumen financiero"
                subtitle="Cobrado y pendiente por moneda"
                icon="wallet-outline"
                color={theme.colors.primary}
                softColor={theme.colors.primarySoft}
                theme={theme}
              />

              <View style={styles.moneyGrid}>
                <MoneyBox
                  title="Cobrado ARS"
                  value={formatMoney(stats.money.ARS.paid, "ARS")}
                  icon="cash-check"
                  color={theme.colors.success}
                  softColor={theme.colors.successSoft}
                  theme={theme}
                />

                <MoneyBox
                  title="Pendiente ARS"
                  value={formatMoney(stats.money.ARS.pending, "ARS")}
                  icon="cash-clock"
                  color={theme.colors.warning}
                  softColor={theme.colors.warningSoft}
                  theme={theme}
                />

                <MoneyBox
                  title="Cobrado USD"
                  value={formatMoney(stats.money.USD.paid, "USD")}
                  icon="currency-usd"
                  color={theme.colors.success}
                  softColor={theme.colors.successSoft}
                  theme={theme}
                />

                <MoneyBox
                  title="Pendiente USD"
                  value={formatMoney(stats.money.USD.pending, "USD")}
                  icon="cash-clock"
                  color={theme.colors.warning}
                  softColor={theme.colors.warningSoft}
                  theme={theme}
                />
              </View>
            </View>
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

function formatMoney(value, currency = "ARS") {
  const number = Number(value || 0);

  if (currency === "USD") {
    return `US$${number.toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })}`;
  }

  return `$${number.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

function SectionHeader({ title, subtitle, icon, color, softColor, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBox, { backgroundColor: softColor }]}>
        <MaterialCommunityIcons name={icon} size={19} color={color} />
      </View>

      <View style={styles.sectionTextBox}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {title}
        </Text>

        <Text style={[styles.cardSubtitle, { color: theme.colors.secondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function LegendItem({ label, value, color, theme }) {
  return (
    <View
      style={[
        styles.legendItem,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={[styles.legendDot, { backgroundColor: color }]} />

      <View style={styles.legendTextBox}>
        <Text style={[styles.legendValue, { color: theme.colors.text }]}>
          {value}
        </Text>

        <Text style={[styles.legendLabel, { color: theme.colors.secondary }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MiniMetric({ title, value, icon, color, softColor, theme }) {
  return (
    <View
      style={[
        styles.miniMetric,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={[styles.miniIconBox, { backgroundColor: softColor }]}>
        <MaterialCommunityIcons name={icon} size={17} color={color} />
      </View>

      <View style={styles.miniMetricText}>
        <Text style={[styles.miniValue, { color: theme.colors.text }]}>
          {value}
        </Text>

        <Text
          style={[styles.miniTitle, { color: theme.colors.secondary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

function MoneyBox({ title, value, icon, color, softColor, theme }) {
  return (
    <View
      style={[
        styles.moneyBox,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={[styles.moneyIconBox, { backgroundColor: softColor }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>

      <Text
        style={[styles.moneyValue, { color: theme.colors.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>

      <Text
        style={[styles.moneyTitle, { color: theme.colors.secondary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}

function EmptyBox({ text, icon, theme }) {
  return (
    <View
      style={[
        styles.emptyBox,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={theme.colors.secondary}
      />

      <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
        {text}
      </Text>
    </View>
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: 340,
  },

  filtersScroll: {
    marginBottom: 14,
  },

  filtersContent: {
    paddingRight: 20,
    gap: 8,
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
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

  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    elevation: 0,
    marginBottom: 14,
    overflow: "hidden",
  },

  heroContent: {
    minHeight: 118,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  heroIconBox: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  heroInfo: {
    flex: 1,
  },

  heroLabel: {
    fontSize: 13,
    fontWeight: "800",
  },

  heroValue: {
    marginTop: 2,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    letterSpacing: -1,
  },

  heroHint: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    marginBottom: 14,
    overflow: "hidden",
  },

  cardContent: {
    padding: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionTextBox: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  cardSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
  },

  pieWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: -2,
  },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },

  legendItem: {
    flex: 1,
    minWidth: "30%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },

  legendTextBox: {
    flex: 1,
  },

  legendValue: {
    fontSize: 15,
    fontWeight: "900",
  },

  legendLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: "800",
  },

  progressInfoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },

  progressPercent: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  progressText: {
    marginLeft: 7,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "800",
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  taskMiniGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },

  miniMetric: {
    width: "48%",
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  miniIconBox: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  miniMetricText: {
    flex: 1,
  },

  miniValue: {
    fontSize: 17,
    fontWeight: "900",
  },

  miniTitle: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: "800",
  },

  barChartWrap: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
  },

  chart: {
    borderRadius: 18,
    marginLeft: -10,
  },

  moneyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  moneyBox: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },

  moneyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  moneyValue: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  moneyTitle: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: "800",
  },

  emptyBox: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});