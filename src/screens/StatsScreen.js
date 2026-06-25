//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";
import { BarChart, PieChart } from "react-native-chart-kit";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

const CONTENT_MAX_WIDTH = 860;
const horizontalPadding = responsive(20, 34);
const availableWidth = IS_TABLET
  ? Math.min(width, CONTENT_MAX_WIDTH) - horizontalPadding * 2
  : width - horizontalPadding * 2;

const chartWidth = availableWidth - responsive(28, 44);

//JS:
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
        setTasks(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoading(false);
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, "projects"), where("userId", "==", user.uid)),
      (snapshot) => {
        setProjects(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoading(false);
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("userId", "==", user.uid)),
      (snapshot) => {
        setPayments(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
        setLoading(false);
      }
    );

    const unsubNotes = onSnapshot(
      query(collection(db, "notes"), where("userId", "==", user.uid)),
      (snapshot) => {
        setNotes(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
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
      fontSize: responsive(11, 13),
      fontWeight: "700",
    },
    barPercentage: responsive(0.68, 0.74),
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
      legendFontSize: responsive(12, 14),
    },
    {
      name: "Pausados",
      population: stats.pausedProjects,
      color: theme.colors.warning,
      legendFontColor: theme.colors.secondary,
      legendFontSize: responsive(12, 14),
    },
    {
      name: "Finalizados",
      population: stats.finishedProjects,
      color: theme.colors.success,
      legendFontColor: theme.colors.secondary,
      legendFontSize: responsive(12, 14),
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
          <ActivityIndicator color={theme.colors.primary} size="large" />
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
                  size={responsive(28, 38)}
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
                      height={responsive(205, 260)}
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
                    height={responsive(220, 270)}
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
        <MaterialCommunityIcons
          name={icon}
          size={responsive(19, 25)}
          color={color}
        />
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
        <MaterialCommunityIcons
          name={icon}
          size={responsive(17, 22)}
          color={color}
        />
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
        <MaterialCommunityIcons
          name={icon}
          size={responsive(18, 23)}
          color={color}
        />
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
        size={responsive(24, 31)}
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
    width: "100%",
    maxWidth: responsive(undefined, CONTENT_MAX_WIDTH),
    alignSelf: "center",
    paddingHorizontal: horizontalPadding,
    paddingTop: responsive(6, 18),
    paddingBottom: responsive(135, 170),
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
    fontSize: responsive(24, 31),
    lineHeight: responsive(30, 38),
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: responsive(7, 10),
    fontSize: responsive(13.5, 16),
    lineHeight: responsive(19, 23),
    maxWidth: responsive(340, 560),
  },

  filtersScroll: {
    marginBottom: responsive(14, 20),
  },

  filtersContent: {
    paddingRight: responsive(20, 34),
    gap: responsive(8, 11),
  },

  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
  },

  filterChipText: {
    fontSize: responsive(12, 14),
    fontWeight: "900",
  },

  loadingBox: {
    minHeight: responsive(180, 260),
    alignItems: "center",
    justifyContent: "center",
  },

  heroCard: {
    borderRadius: responsive(26, 32),
    borderWidth: 1,
    elevation: 0,
    marginBottom: responsive(14, 20),
    overflow: "hidden",
  },

  heroContent: {
    minHeight: responsive(118, 154),
    padding: responsive(16, 24),
    flexDirection: "row",
    alignItems: "center",
  },

  heroIconBox: {
    width: responsive(62, 82),
    height: responsive(62, 82),
    borderRadius: responsive(22, 28),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(14, 20),
  },

  heroInfo: {
    flex: 1,
  },

  heroLabel: {
    fontSize: responsive(13, 16),
    fontWeight: "800",
  },

  heroValue: {
    marginTop: responsive(2, 4),
    fontSize: responsive(42, 56),
    lineHeight: responsive(48, 62),
    fontWeight: "900",
    letterSpacing: -1,
  },

  heroHint: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  card: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    marginBottom: responsive(14, 20),
    overflow: "hidden",
  },

  cardContent: {
    padding: responsive(14, 22),
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(14, 20),
  },

  sectionIconBox: {
    width: responsive(38, 50),
    height: responsive(38, 50),
    borderRadius: responsive(14, 18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(10, 14),
  },

  sectionTextBox: {
    flex: 1,
  },

  cardTitle: {
    fontSize: responsive(16, 20),
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  cardSubtitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(17, 22),
  },

  pieWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: responsive(-2, 0),
  },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(10, 14),
    marginTop: responsive(6, 12),
  },

  legendItem: {
    flex: 1,
    minWidth: "30%",
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    padding: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
  },

  legendDot: {
    width: responsive(10, 13),
    height: responsive(10, 13),
    borderRadius: 999,
    marginRight: responsive(8, 10),
  },

  legendTextBox: {
    flex: 1,
  },

  legendValue: {
    fontSize: responsive(15, 19),
    fontWeight: "900",
  },

  legendLabel: {
    marginTop: responsive(1, 3),
    fontSize: responsive(9, 12),
    fontWeight: "800",
  },

  progressInfoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: responsive(10, 14),
  },

  progressPercent: {
    fontSize: responsive(38, 52),
    lineHeight: responsive(42, 58),
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  progressText: {
    marginLeft: responsive(7, 10),
    marginBottom: responsive(6, 9),
    fontSize: responsive(13, 16),
    fontWeight: "800",
  },

  progressTrack: {
    height: responsive(10, 13),
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
    gap: responsive(10, 14),
    marginTop: responsive(14, 22),
  },

  miniMetric: {
    width: responsive("48%", "48.8%"),
    minHeight: responsive(66, 86),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    padding: responsive(10, 14),
    flexDirection: "row",
    alignItems: "center",
  },

  miniIconBox: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(9, 12),
  },

  miniMetricText: {
    flex: 1,
  },

  miniValue: {
    fontSize: responsive(17, 22),
    fontWeight: "900",
  },

  miniTitle: {
    marginTop: responsive(1, 3),
    fontSize: responsive(11.5, 14),
    fontWeight: "800",
  },

  barChartWrap: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
  },

  chart: {
    borderRadius: responsive(18, 23),
    marginLeft: responsive(-10, -6),
  },

  moneyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(10, 14),
  },

  moneyBox: {
    width: responsive("48%", "48.8%"),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    padding: responsive(12, 16),
  },

  moneyIconBox: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(9, 12),
  },

  moneyValue: {
    fontSize: responsive(16, 20),
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  moneyTitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(11.5, 14),
    fontWeight: "800",
  },

  emptyBox: {
    minHeight: responsive(86, 116),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: responsive(14, 20),
  },

  emptyText: {
    marginTop: responsive(7, 10),
    fontSize: responsive(13, 16),
    textAlign: "center",
    lineHeight: responsive(18, 23),
  },
});