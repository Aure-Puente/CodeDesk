//Importaciones:
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
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

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
  return IS_TABLET ? tablet : mobile;
};

//JS:
const FILTERS = ["todos", "no_pagado", "parcial", "pagado"];

const CURRENCIES = [
  {
    value: "ARS",
    label: "Pesos",
    shortLabel: "ARS",
    icon: "currency-usd-off",
  },
  {
    value: "USD",
    label: "Dólares",
    shortLabel: "USD",
    icon: "currency-usd",
  },
];

const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Mercado Pago", "Otro"];

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

function getPaidAmount(payment) {
  return (payment.installments || []).reduce(
    (acc, item) => acc + Number(item.amount || 0),
    0
  );
}

function getCurrency(payment) {
  return payment.currency || "ARS";
}

function getCurrencyInfo(currency) {
  return CURRENCIES.find((item) => item.value === currency) || CURRENCIES[0];
}

function getStatusLabel(status) {
  if (status === "no_pagado") return "No pagado";
  if (status === "parcial") return "Parcial";
  if (status === "pagado") return "Pagado";
  return "No pagado";
}

function getStatusIcon(status) {
  if (status === "no_pagado") return "cash-remove";
  if (status === "parcial") return "cash-clock";
  if (status === "pagado") return "cash-check";
  return "cash-remove";
}

function getStatusColor(theme, status) {
  if (status === "no_pagado") return theme.colors.danger;
  if (status === "parcial") return theme.colors.warning;
  if (status === "pagado") return theme.colors.success;
  return theme.colors.danger;
}

function getStatusSoft(theme, status) {
  if (status === "no_pagado") return theme.colors.dangerSoft;
  if (status === "parcial") return theme.colors.warningSoft;
  if (status === "pagado") return theme.colors.successSoft;
  return theme.colors.dangerSoft;
}

function getProgressColor(theme, status) {
  if (status === "pagado") return theme.colors.success;
  if (status === "parcial") return theme.colors.warning;
  return theme.colors.danger;
}

function getProjectIconBackground(theme, projectColor) {
  if (theme.dark) {
    return "rgba(248, 250, 252, 0.94)";
  }

  return hexToRgba(projectColor, 0.1);
}

function getProjectIconBorder(theme, projectColor) {
  if (theme.dark) {
    return hexToRgba(projectColor, 0.38);
  }

  return hexToRgba(projectColor, 0.18);
}

function getProjectSelectorBackground(theme, projectColor, selected) {
  if (!selected) {
    return theme.colors.surfaceSoft;
  }

  if (theme.dark) {
    return "rgba(248, 250, 252, 0.94)";
  }

  return hexToRgba(projectColor, 0.09);
}

function getProjectSelectorBorder(theme, projectColor, selected) {
  if (!selected) {
    return theme.colors.borderSoft;
  }

  if (theme.dark) {
    return hexToRgba(projectColor, 0.42);
  }

  return hexToRgba(projectColor, 0.2);
}

function getSkeletonColors(theme) {
  return {
    soft: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
    strong: theme.dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.11)",
  };
}

export default function PaymentsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [installmentModalVisible, setInstallmentModalVisible] = useState(false);
  const [deletePaymentModalVisible, setDeletePaymentModalVisible] =
    useState(false);
  const [deleteInstallmentModalVisible, setDeleteInstallmentModalVisible] =
    useState(false);

  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [installmentToDelete, setInstallmentToDelete] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [notes, setNotes] = useState("");

  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentMethod, setInstallmentMethod] = useState("");
  const [installmentNote, setInstallmentNote] = useState("");

  const [filter, setFilter] = useState("todos");
  const [expandedPayments, setExpandedPayments] = useState({});

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const paymentsQuery = query(
      collection(db, "payments"),
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

    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
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

      setPayments(data);
      setLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribePayments();
    };
  }, [user]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectId) || null;
  }, [projects, projectId]);

  const paymentsWithStatus = useMemo(() => {
    return payments.map((payment) => {
      const total = Number(payment.totalAmount || 0);
      const paid = getPaidAmount(payment);
      const pending = Math.max(total - paid, 0);
      const progress = total > 0 ? Math.min(paid / total, 1) : 0;

      let status = "no_pagado";

      if (paid > 0 && paid < total) status = "parcial";
      if (total > 0 && paid >= total) status = "pagado";

      return {
        ...payment,
        currency: getCurrency(payment),
        paidAmount: paid,
        pendingAmount: pending,
        paymentStatus: status,
        progress,
      };
    });
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (filter === "todos") return paymentsWithStatus;

    return paymentsWithStatus.filter(
      (payment) => payment.paymentStatus === filter
    );
  }, [paymentsWithStatus, filter]);

  const summary = useMemo(() => {
    const initial = {
      ARS: {
        totalAgreed: 0,
        totalPaid: 0,
        totalPending: 0,
      },
      USD: {
        totalAgreed: 0,
        totalPaid: 0,
        totalPending: 0,
      },
      partialCount: 0,
    };

    paymentsWithStatus.forEach((payment) => {
      const paymentCurrency = getCurrency(payment);

      initial[paymentCurrency].totalAgreed += Number(payment.totalAmount || 0);
      initial[paymentCurrency].totalPaid += Number(payment.paidAmount || 0);
      initial[paymentCurrency].totalPending += Number(payment.pendingAmount || 0);

      if (payment.paymentStatus === "parcial") {
        initial.partialCount += 1;
      }
    });

    return initial;
  }, [paymentsWithStatus]);

  function formatMoney(value, moneyCurrency = "ARS") {
    const number = Number(value || 0);

    if (moneyCurrency === "USD") {
      return `US$${number.toLocaleString("es-AR", {
        maximumFractionDigits: 0,
      })}`;
    }

    return `$${number.toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })}`;
  }

  function formatDate(date) {
    if (!date) return "Sin fecha";

    try {
      return new Date(date).toLocaleDateString("es-AR");
    } catch {
      return "Sin fecha";
    }
  }

  function resetPaymentForm() {
    setEditingPayment(null);
    setProjectId(null);
    setProjectSelectorOpen(false);
    setTotalAmount("");
    setCurrency("ARS");
    setNotes("");
  }

  function resetInstallmentForm() {
    setInstallmentAmount("");
    setInstallmentMethod("");
    setInstallmentNote("");
  }

  function openCreateModal() {
    resetPaymentForm();
    setModalVisible(true);
  }

  function openEditModal(payment) {
    setEditingPayment(payment);
    setProjectId(payment.projectId || null);
    setProjectSelectorOpen(false);
    setTotalAmount(String(payment.totalAmount || ""));
    setCurrency(getCurrency(payment));
    setNotes(payment.notes || "");
    setModalVisible(true);
  }

  function openInstallmentModal(payment) {
    setSelectedPayment(payment);
    resetInstallmentForm();
    setInstallmentModalVisible(true);
  }

  function openDeletePaymentModal(payment) {
    setPaymentToDelete(payment);
    setDeletePaymentModalVisible(true);
  }

  function closeDeletePaymentModal() {
    setPaymentToDelete(null);
    setDeletePaymentModalVisible(false);
  }

  function openDeleteInstallmentModal(payment, installment) {
    setInstallmentToDelete({
      payment,
      installment,
    });
    setDeleteInstallmentModalVisible(true);
  }

  function closeDeleteInstallmentModal() {
    setInstallmentToDelete(null);
    setDeleteInstallmentModalVisible(false);
  }

  function toggleExpanded(paymentId) {
    setExpandedPayments((prev) => ({
      ...prev,
      [paymentId]: !prev[paymentId],
    }));
  }

  async function handleSavePayment() {
    if (!projectId) {
      Alert.alert("Falta el proyecto", "Seleccioná un proyecto.");
      return;
    }

    if (!totalAmount || Number(totalAmount) <= 0) {
      Alert.alert("Monto inválido", "Ingresá el monto total acordado.");
      return;
    }

    const selectedProject = projects.find((project) => project.id === projectId);

    try {
      if (editingPayment) {
        await updateDoc(doc(db, "payments", editingPayment.id), {
          projectId,
          projectName: selectedProject?.name || "",
          projectColor: selectedProject?.color || null,
          projectLogoUrl: selectedProject?.logoUrl || null,
          totalAmount: Number(totalAmount),
          currency,
          notes: notes.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const newDoc = await addDoc(collection(db, "payments"), {
          userId: user.uid,
          projectId,
          projectName: selectedProject?.name || "",
          projectColor: selectedProject?.color || null,
          projectLogoUrl: selectedProject?.logoUrl || null,
          totalAmount: Number(totalAmount),
          currency,
          installments: [],
          notes: notes.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setExpandedPayments((prev) => ({
          ...prev,
          [newDoc.id]: true,
        }));
      }

      resetPaymentForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar el pago.");
    }
  }

  async function handleAddInstallment() {
    if (!selectedPayment) return;

    if (!installmentAmount || Number(installmentAmount) <= 0) {
      Alert.alert("Monto inválido", "Ingresá el monto pagado.");
      return;
    }

    const newInstallment = {
      id: Date.now().toString(),
      amount: Number(installmentAmount),
      method: installmentMethod.trim(),
      note: installmentNote.trim(),
      date: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, "payments", selectedPayment.id), {
        installments: [...(selectedPayment.installments || []), newInstallment],
        updatedAt: serverTimestamp(),
      });

      setExpandedPayments((prev) => ({
        ...prev,
        [selectedPayment.id]: true,
      }));

      resetInstallmentForm();
      setSelectedPayment(null);
      setInstallmentModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo agregar el pago.");
    }
  }

  async function confirmDeletePayment() {
    if (!paymentToDelete?.id) return;

    try {
      await deleteDoc(doc(db, "payments", paymentToDelete.id));
      closeDeletePaymentModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo eliminar el registro.");
    }
  }

  async function confirmDeleteInstallment() {
    if (!installmentToDelete?.payment?.id || !installmentToDelete?.installment?.id) {
      return;
    }

    const payment = installmentToDelete.payment;
    const installmentId = installmentToDelete.installment.id;

    const updatedInstallments = (payment.installments || []).filter(
      (item) => item.id !== installmentId
    );

    try {
      await updateDoc(doc(db, "payments", payment.id), {
        installments: updatedInstallments,
        updatedAt: serverTimestamp(),
      });

      closeDeleteInstallmentModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo eliminar el pago.");
    }
  }

  function renderPaymentCard(payment) {
    const projectColor = payment.projectColor || theme.colors.primary;
    const isExpanded = Boolean(expandedPayments[payment.id]);

    const paymentCurrency = getCurrency(payment);
    const currencyInfo = getCurrencyInfo(paymentCurrency);

    const statusColor = getStatusColor(theme, payment.paymentStatus);
    const statusSoft = getStatusSoft(theme, payment.paymentStatus);

    const projectIconBg = getProjectIconBackground(theme, projectColor);
    const projectIconBorder = getProjectIconBorder(theme, projectColor);

    const installments = payment.installments || [];

    return (
      <Card
        key={payment.id}
        mode="contained"
        style={[
          styles.paymentCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <TouchableRipple
          onPress={() => toggleExpanded(payment.id)}
          rippleColor={theme.colors.primarySoft}
        >
          <View style={styles.paymentHeader}>
            <View
              style={[
                styles.projectIcon,
                {
                  backgroundColor: projectIconBg,
                  borderColor: projectIconBorder,
                },
              ]}
            >
              {payment.projectLogoUrl ? (
                <Image
                  source={{ uri: payment.projectLogoUrl }}
                  style={styles.projectLogo}
                />
              ) : (
                <Text style={[styles.projectLetter, { color: projectColor }]}>
                  {payment.projectName?.charAt(0)?.toUpperCase() || "P"}
                </Text>
              )}
            </View>

            <View style={styles.paymentInfo}>
              <Text
                style={[styles.projectName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {payment.projectName || "Proyecto sin nombre"}
              </Text>

              <Text
                style={[styles.paymentSubtitle, { color: theme.colors.secondary }]}
                numberOfLines={1}
              >
                Total acordado: {formatMoney(payment.totalAmount, paymentCurrency)}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <StatusChip
                label={getStatusLabel(payment.paymentStatus)}
                icon={getStatusIcon(payment.paymentStatus)}
                color={statusColor}
                backgroundColor={statusSoft}
              />

              <View style={styles.headerMetaRow}>
                <CurrencyPill currency={paymentCurrency} theme={theme} small />

                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={responsive(23, 29)}
                  color={theme.colors.secondary}
                  style={styles.chevron}
                />
              </View>
            </View>
          </View>
        </TouchableRipple>

        <View style={styles.progressWrap}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: theme.colors.borderSoft,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(payment.progress * 100)}%`,
                  backgroundColor: getProgressColor(theme, payment.paymentStatus),
                },
              ]}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.accordionContent}>
            <View style={styles.currencyInfoBox}>
              <View
                style={[
                  styles.currencyInfoIcon,
                  { backgroundColor: theme.colors.primarySoft },
                ]}
              >
                <MaterialCommunityIcons
                  name={currencyInfo.icon}
                  size={responsive(18, 23)}
                  color={theme.colors.primary}
                />
              </View>

              <Text
                style={[styles.currencyInfoText, { color: theme.colors.secondary }]}
              >
                Este registro está pactado en{" "}
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {currencyInfo.label}
                </Text>
                . Los pagos parciales se cargan en la misma moneda.
              </Text>
            </View>

            <View style={styles.amountRow}>
              <AmountBox
                title="Cobrado"
                value={formatMoney(payment.paidAmount, paymentCurrency)}
                icon="cash-check"
                color={theme.colors.success}
                softColor={theme.colors.successSoft}
                theme={theme}
              />

              <AmountBox
                title="Falta"
                value={formatMoney(payment.pendingAmount, paymentCurrency)}
                icon="cash-clock"
                color={
                  payment.pendingAmount > 0
                    ? theme.colors.warning
                    : theme.colors.success
                }
                softColor={
                  payment.pendingAmount > 0
                    ? theme.colors.warningSoft
                    : theme.colors.successSoft
                }
                theme={theme}
              />
            </View>

            {!!payment.notes && (
              <View
                style={[
                  styles.notesBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.borderSoft,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="note-text-outline"
                  size={responsive(18, 23)}
                  color={theme.colors.secondary}
                />

                <Text style={[styles.notesText, { color: theme.colors.secondary }]}>
                  {payment.notes}
                </Text>
              </View>
            )}

            <View style={styles.installmentsHeader}>
              <Text
                style={[styles.installmentsTitle, { color: theme.colors.text }]}
              >
                Pagos recibidos
              </Text>

              <Text
                style={[
                  styles.installmentsCount,
                  { color: theme.colors.secondary },
                ]}
              >
                {installments.length} registros
              </Text>
            </View>

            {installments.length === 0 ? (
              <View
                style={[
                  styles.emptyInstallments,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.borderSoft,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="cash-plus"
                  size={responsive(21, 27)}
                  color={theme.colors.secondary}
                />

                <Text
                  style={[
                    styles.emptyInstallmentsText,
                    { color: theme.colors.secondary },
                  ]}
                >
                  Todavía no cargaste pagos parciales.
                </Text>
              </View>
            ) : (
              installments.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.installmentItem,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.borderSoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.installmentIconBox,
                      {
                        backgroundColor: theme.colors.successSoft,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="cash"
                      size={responsive(18, 23)}
                      color={theme.colors.success}
                    />
                  </View>

                  <View style={styles.installmentInfo}>
                    <Text
                      style={[
                        styles.installmentAmount,
                        { color: theme.colors.text },
                      ]}
                    >
                      {formatMoney(item.amount, paymentCurrency)}
                    </Text>

                    <Text
                      style={[
                        styles.installmentMeta,
                        { color: theme.colors.secondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.method || "Sin método"} · {formatDate(item.date)}
                    </Text>

                    {!!item.note && (
                      <Text
                        style={[
                          styles.installmentNote,
                          { color: theme.colors.secondary },
                        ]}
                        numberOfLines={2}
                      >
                        {item.note}
                      </Text>
                    )}
                  </View>

                  <IconButton
                    icon="delete-outline"
                    size={responsive(19, 25)}
                    mode="contained-tonal"
                    iconColor={theme.colors.danger}
                    containerColor={theme.colors.dangerSoft}
                    style={styles.smallActionIcon}
                    onPress={() => openDeleteInstallmentModal(payment, item)}
                  />
                </View>
              ))
            )}

            <Divider
              style={[
                styles.cardDivider,
                {
                  backgroundColor: theme.colors.borderSoft,
                },
              ]}
            />

            <View style={styles.actionsRow}>
              <TouchableRipple
                borderless
                rippleColor={theme.colors.successSoft}
                style={[
                  styles.addPaymentButton,
                  {
                    backgroundColor: theme.colors.successSoft,
                    borderColor: hexToRgba(
                      theme.colors.success,
                      theme.dark ? 0.32 : 0.18
                    ),
                  },
                ]}
                onPress={() => openInstallmentModal(payment)}
              >
                <View style={styles.addPaymentContent}>
                  <View
                    style={[
                      styles.addPaymentIconBox,
                      {
                        backgroundColor: theme.colors.success,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="cash-plus"
                      size={responsive(17, 22)}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text
                    style={[
                      styles.addPaymentText,
                      { color: theme.colors.success },
                    ]}
                  >
                    Agregar pago
                  </Text>
                </View>
              </TouchableRipple>

              <View style={styles.iconActions}>
                <IconButton
                  icon="pencil-outline"
                  size={responsive(20, 26)}
                  mode="contained-tonal"
                  iconColor={theme.colors.primary}
                  containerColor={theme.colors.primarySoft}
                  style={styles.actionIcon}
                  onPress={() => openEditModal(payment)}
                />

                <IconButton
                  icon="delete-outline"
                  size={responsive(20, 26)}
                  mode="contained-tonal"
                  iconColor={theme.colors.danger}
                  containerColor={theme.colors.dangerSoft}
                  style={styles.actionIcon}
                  onPress={() => openDeletePaymentModal(payment)}
                />
              </View>
            </View>
          </View>
        )}
      </Card>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
            Pagos
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Controlá cobros por proyecto, pagos parciales y saldos pendientes.
        </Text>
      </View>

      {loading ? (
        <SummarySkeleton theme={theme} />
      ) : (
        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Acordado ARS"
            value={formatMoney(summary.ARS.totalAgreed, "ARS")}
            icon="file-document-outline"
            color={theme.colors.primary}
            softColor={theme.colors.primarySoft}
            theme={theme}
          />

          <SummaryCard
            title="Cobrado ARS"
            value={formatMoney(summary.ARS.totalPaid, "ARS")}
            icon="cash-check"
            color={theme.colors.success}
            softColor={theme.colors.successSoft}
            theme={theme}
          />

          <SummaryCard
            title="Acordado USD"
            value={formatMoney(summary.USD.totalAgreed, "USD")}
            icon="currency-usd"
            color={theme.colors.info}
            softColor={theme.colors.infoSoft}
            theme={theme}
          />

          <SummaryCard
            title="Cobrado USD"
            value={formatMoney(summary.USD.totalPaid, "USD")}
            icon="cash-check"
            color={theme.colors.success}
            softColor={theme.colors.successSoft}
            theme={theme}
          />
        </View>
      )}

      <Button
        mode="contained"
        icon="plus"
        style={styles.createButton}
        contentStyle={styles.createButtonContent}
        labelStyle={styles.createButtonLabel}
        onPress={openCreateModal}
      >
        Nuevo registro de pago
      </Button>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((item) => {
          const selected = filter === item;
          const color =
            item === "todos" ? theme.colors.primary : getStatusColor(theme, item);

          const soft =
            item === "todos"
              ? theme.colors.primarySoft
              : getStatusSoft(theme, item);

          return (
            <FilterChip
              key={item}
              label={item === "todos" ? "Todos" : getStatusLabel(item)}
              icon={
                item === "todos" ? "format-list-bulleted" : getStatusIcon(item)
              }
              selected={selected}
              color={color}
              softColor={soft}
              theme={theme}
              onPress={() => setFilter(item)}
            />
          );
        })}
      </ScrollView>

      {loading ? (
        <PaymentsSkeleton theme={theme} />
      ) : filteredPayments.length === 0 ? (
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
                name="cash-plus"
                size={responsive(26, 34)}
                color={theme.colors.primary}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No hay pagos para mostrar
            </Text>

            <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
              Cargá un proyecto y su monto total acordado para comenzar.
            </Text>

            <Button
              mode="contained"
              icon="plus"
              style={styles.emptyButton}
              contentStyle={styles.emptyButtonContent}
              labelStyle={styles.emptyButtonLabel}
              onPress={openCreateModal}
            >
              Nuevo registro
            </Button>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>{filteredPayments.map(renderPaymentCard)}</View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
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
                <View style={styles.modalTitleBox}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    {editingPayment ? "Editar registro" : "Nuevo registro"}
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                  >
                    Elegí el proyecto, moneda y monto total acordado.
                  </Text>
                </View>

                <IconButton
                  icon="close"
                  size={responsive(21, 27)}
                  iconColor={theme.colors.secondary}
                  style={styles.closeButton}
                  onPress={() => {
                    resetPaymentForm();
                    setModalVisible(false);
                  }}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={styles.modalScrollContent}
              >
                <FormSection title="Proyecto" theme={theme} />

                {projects.length === 0 ? (
                  <View
                    style={[
                      styles.noProjectsBox,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderColor: theme.colors.borderSoft,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="folder-alert-outline"
                      size={responsive(22, 28)}
                      color={theme.colors.secondary}
                    />

                    <Text
                      style={[
                        styles.noProjectsText,
                        { color: theme.colors.secondary },
                      ]}
                    >
                      Primero necesitás crear un proyecto.
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableRipple
                      onPress={() => setProjectSelectorOpen((prev) => !prev)}
                      rippleColor={theme.colors.primarySoft}
                      style={[
                        styles.projectSelectorCard,
                        {
                          backgroundColor: getProjectSelectorBackground(
                            theme,
                            selectedProject?.color || theme.colors.primary,
                            !!selectedProject
                          ),
                          borderColor: getProjectSelectorBorder(
                            theme,
                            selectedProject?.color || theme.colors.primary,
                            !!selectedProject
                          ),
                        },
                      ]}
                    >
                      <View style={styles.projectSelectorContent}>
                        <View
                          style={[
                            styles.projectSelectorIconBox,
                            {
                              backgroundColor: getProjectIconBackground(
                                theme,
                                selectedProject?.color || theme.colors.primary
                              ),
                              borderColor: getProjectIconBorder(
                                theme,
                                selectedProject?.color || theme.colors.primary
                              ),
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={
                              selectedProject
                                ? "folder-outline"
                                : "folder-search-outline"
                            }
                            size={responsive(21, 27)}
                            color={selectedProject?.color || theme.colors.primary}
                          />
                        </View>

                        <View style={styles.projectSelectorText}>
                          <Text
                            style={[
                              styles.projectSelectorTitle,
                              {
                                color: selectedProject
                                  ? selectedProject.color || theme.colors.primary
                                  : theme.colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {selectedProject?.name || "Seleccionar proyecto"}
                          </Text>

                          <Text
                            style={[
                              styles.projectSelectorSubtitle,
                              { color: theme.colors.secondary },
                            ]}
                          >
                            Tocá para desplegar la lista
                          </Text>
                        </View>

                        <MaterialCommunityIcons
                          name={
                            projectSelectorOpen ? "chevron-up" : "chevron-down"
                          }
                          size={responsive(23, 29)}
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
                          {projects.map((project) => {
                            const selected = projectId === project.id;
                            const color = project.color || theme.colors.primary;

                            return (
                              <ProjectDropdownOption
                                key={project.id}
                                label={project.name}
                                selected={selected}
                                color={color}
                                theme={theme}
                                logoUrl={project.logoUrl}
                                onPress={() => {
                                  setProjectId(project.id);
                                  setProjectSelectorOpen(false);
                                }}
                              />
                            );
                          })}
                        </View>
                      </Card>
                    )}
                  </>
                )}

                <FormSection title="Moneda" theme={theme} />

                <View style={styles.currencyOptions}>
                  {CURRENCIES.map((item) => {
                    const selected = currency === item.value;

                    return (
                      <TouchableRipple
                        key={item.value}
                        borderless
                        onPress={() => setCurrency(item.value)}
                        rippleColor={theme.colors.primarySoft}
                        style={[
                          styles.currencyOption,
                          {
                            backgroundColor: selected
                              ? theme.colors.primarySoft
                              : theme.colors.surfaceSoft,
                            borderColor: selected
                              ? hexToRgba(
                                  theme.colors.primary,
                                  theme.dark ? 0.34 : 0.18
                                )
                              : theme.colors.borderSoft,
                          },
                        ]}
                      >
                        <View style={styles.currencyOptionContent}>
                          <MaterialCommunityIcons
                            name={item.icon}
                            size={responsive(20, 26)}
                            color={
                              selected
                                ? theme.colors.primary
                                : theme.colors.secondary
                            }
                          />

                          <View style={styles.currencyOptionTextWrap}>
                            <Text
                              style={[
                                styles.currencyOptionTitle,
                                {
                                  color: selected
                                    ? theme.colors.primary
                                    : theme.colors.text,
                                },
                              ]}
                            >
                              {item.label}
                            </Text>

                            <Text
                              style={[
                                styles.currencyOptionSubtitle,
                                { color: theme.colors.secondary },
                              ]}
                            >
                              {item.shortLabel}
                            </Text>
                          </View>
                        </View>
                      </TouchableRipple>
                    );
                  })}
                </View>

                <TextInput
                  label="Monto total acordado"
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  returnKeyType="next"
                />

                <TextInput
                  label="Notas"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  textAlignVertical="top"
                />

                <Button
                  mode="contained"
                  icon={editingPayment ? "content-save-outline" : "plus"}
                  style={styles.saveButton}
                  contentStyle={styles.saveButtonContent}
                  labelStyle={styles.saveButtonLabel}
                  onPress={handleSavePayment}
                >
                  {editingPayment ? "Guardar cambios" : "Guardar registro"}
                </Button>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={installmentModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
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
                <View style={styles.modalTitleBox}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Agregar pago
                  </Text>

                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedPayment?.projectName || "Registro seleccionado"}
                  </Text>
                </View>

                <IconButton
                  icon="close"
                  size={responsive(21, 27)}
                  iconColor={theme.colors.secondary}
                  style={styles.closeButton}
                  onPress={() => {
                    resetInstallmentForm();
                    setSelectedPayment(null);
                    setInstallmentModalVisible(false);
                  }}
                />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={styles.modalScrollContent}
              >
                {!!selectedPayment && (
                  <View
                    style={[
                      styles.modalCurrencyBox,
                      {
                        backgroundColor: theme.colors.primarySoft,
                        borderColor: hexToRgba(
                          theme.colors.primary,
                          theme.dark ? 0.34 : 0.18
                        ),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getCurrencyInfo(getCurrency(selectedPayment)).icon}
                      size={responsive(20, 26)}
                      color={theme.colors.primary}
                    />

                    <Text
                      style={[
                        styles.modalCurrencyText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Este pago se carga en{" "}
                      {getCurrencyInfo(getCurrency(selectedPayment)).label}
                    </Text>
                  </View>
                )}

                <TextInput
                  label="Monto pagado"
                  value={installmentAmount}
                  onChangeText={setInstallmentAmount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                />

                <FormSection title="Método de pago" theme={theme} />

                <View style={styles.methodOptions}>
                  {PAYMENT_METHODS.map((method) => {
                    const selected = installmentMethod === method;

                    return (
                      <TouchableRipple
                        key={method}
                        borderless
                        onPress={() => setInstallmentMethod(method)}
                        rippleColor={theme.colors.primarySoft}
                        style={[
                          styles.methodOption,
                          {
                            backgroundColor: selected
                              ? theme.colors.primarySoft
                              : theme.colors.surfaceSoft,
                            borderColor: selected
                              ? hexToRgba(
                                  theme.colors.primary,
                                  theme.dark ? 0.35 : 0.18
                                )
                              : theme.colors.borderSoft,
                          },
                        ]}
                      >
                        <View style={styles.methodOptionContent}>
                          <MaterialCommunityIcons
                            name={
                              selected ? "check-circle-outline" : "circle-outline"
                            }
                            size={responsive(18, 23)}
                            color={
                              selected
                                ? theme.colors.primary
                                : theme.colors.secondary
                            }
                          />

                          <Text
                            style={[
                              styles.methodOptionText,
                              {
                                color: selected
                                  ? theme.colors.primary
                                  : theme.colors.secondary,
                              },
                            ]}
                          >
                            {method}
                          </Text>
                        </View>
                      </TouchableRipple>
                    );
                  })}
                </View>

                <TextInput
                  label="Nota"
                  value={installmentNote}
                  onChangeText={setInstallmentNote}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  textAlignVertical="top"
                />

                <Button
                  mode="contained"
                  icon="cash-plus"
                  style={styles.saveButton}
                  contentStyle={styles.saveButtonContent}
                  labelStyle={styles.saveButtonLabel}
                  onPress={handleAddInstallment}
                >
                  Guardar pago
                </Button>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DeleteModal
        visible={deletePaymentModalVisible}
        theme={theme}
        title="Eliminar registro"
        text="¿Seguro que querés eliminar este registro de pago? Esta acción no se puede deshacer."
        previewTitle={paymentToDelete?.projectName}
        previewSubtitle={
          paymentToDelete
            ? `Total acordado: ${formatMoney(
                paymentToDelete.totalAmount,
                getCurrency(paymentToDelete)
              )}`
            : ""
        }
        icon="file-remove-outline"
        onCancel={closeDeletePaymentModal}
        onConfirm={confirmDeletePayment}
      />

      <DeleteModal
        visible={deleteInstallmentModalVisible}
        theme={theme}
        title="Eliminar pago"
        text="¿Seguro que querés eliminar este pago recibido?"
        previewTitle={
          installmentToDelete?.installment
            ? formatMoney(
                installmentToDelete.installment.amount,
                getCurrency(installmentToDelete.payment)
              )
            : ""
        }
        previewSubtitle={
          installmentToDelete?.installment
            ? `${
                installmentToDelete.installment.method || "Sin método"
              } · ${formatDate(installmentToDelete.installment.date)}`
            : ""
        }
        icon="cash-remove"
        onCancel={closeDeleteInstallmentModal}
        onConfirm={confirmDeleteInstallment}
      />
    </ScrollView>
  );
}

function SummaryCard({ title, value, icon, color, softColor, theme }) {
  return (
    <Card
      mode="contained"
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.summaryContent}>
        <View style={[styles.summaryIconBox, { backgroundColor: softColor }]}>
          <MaterialCommunityIcons
            name={icon}
            size={responsive(20, 26)}
            color={color}
          />
        </View>

        <View style={styles.summaryText}>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {value}
          </Text>

          <Text style={[styles.summaryTitle, { color: theme.colors.secondary }]}>
            {title}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function AmountBox({ title, value, icon, color, softColor, theme }) {
  return (
    <View
      style={[
        styles.amountBox,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={[styles.amountIconBox, { backgroundColor: softColor }]}>
        <MaterialCommunityIcons
          name={icon}
          size={responsive(18, 23)}
          color={color}
        />
      </View>

      <View style={styles.amountText}>
        <Text style={[styles.amountValue, { color: theme.colors.text }]}>
          {value}
        </Text>

        <Text style={[styles.amountTitle, { color: theme.colors.secondary }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

function StatusChip({ label, icon, color, backgroundColor }) {
  return (
    <View style={[styles.statusChip, { backgroundColor }]}>
      <MaterialCommunityIcons
        name={icon}
        size={responsive(14, 18)}
        color={color}
      />

      <Text style={[styles.statusChipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function CurrencyPill({ currency, theme, small = false }) {
  const info = getCurrencyInfo(currency);

  return (
    <View
      style={[
        styles.currencyPill,
        {
          backgroundColor: theme.colors.primarySoft,
          borderColor: hexToRgba(theme.colors.primary, theme.dark ? 0.28 : 0.14),
          height: small ? responsive(25, 31) : responsive(30, 38),
        },
      ]}
    >
      <MaterialCommunityIcons
        name={info.icon}
        size={small ? responsive(12, 15) : responsive(14, 18)}
        color={theme.colors.primary}
      />

      <Text
        style={[
          styles.currencyPillText,
          {
            color: theme.colors.primary,
            fontSize: small ? responsive(10.5, 12.5) : responsive(11.5, 13.5),
          },
        ]}
      >
        {info.shortLabel}
      </Text>
    </View>
  );
}

function FilterChip({ label, icon, selected, color, softColor, theme, onPress }) {
  return (
    <Chip
      compact
      selected={selected}
      icon={icon}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? softColor : theme.colors.surface,
          borderColor: selected
            ? hexToRgba(color, theme.dark ? 0.32 : 0.18)
            : theme.colors.borderSoft,
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

function ProjectDropdownOption({
  label,
  selected,
  color,
  theme,
  logoUrl,
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
            <Image source={{ uri: logoUrl }} style={styles.projectLogo} />
          ) : (
            <MaterialCommunityIcons
              name="folder-outline"
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

function FormSection({ title, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
      {title}
    </Text>
  );
}

function SummarySkeleton({ theme }) {
  const skeleton = getSkeletonColors(theme);

  return (
    <View style={styles.summaryGrid}>
      {[1, 2, 3, 4].map((item) => (
        <Card
          key={item}
          mode="contained"
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <View style={styles.summaryContent}>
            <SkeletonBlock
              style={styles.skeletonSummaryIcon}
              color={skeleton.strong}
            />

            <View style={styles.summaryText}>
              <SkeletonBlock
                style={styles.skeletonSummaryValue}
                color={skeleton.strong}
              />

              <SkeletonBlock
                style={styles.skeletonSummaryTitle}
                color={skeleton.soft}
              />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function PaymentsSkeleton({ theme }) {
  return (
    <View style={styles.list}>
      {[1, 2, 3].map((item) => (
        <PaymentSkeletonCard key={item} theme={theme} />
      ))}
    </View>
  );
}

function PaymentSkeletonCard({ theme }) {
  const skeleton = getSkeletonColors(theme);

  return (
    <Card
      mode="contained"
      style={[
        styles.paymentCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.paymentHeader}>
        <SkeletonBlock style={styles.skeletonProjectIcon} color={skeleton.strong} />

        <View style={styles.paymentInfo}>
          <SkeletonBlock style={styles.skeletonPaymentTitle} color={skeleton.strong} />
          <SkeletonBlock style={styles.skeletonPaymentSubtitle} color={skeleton.soft} />
        </View>

        <View style={styles.headerRight}>
          <SkeletonBlock style={styles.skeletonStatusChip} color={skeleton.strong} />
          <SkeletonBlock style={styles.skeletonCurrencyPill} color={skeleton.soft} />
        </View>
      </View>

      <View style={styles.progressWrap}>
        <SkeletonBlock style={styles.skeletonProgress} color={skeleton.strong} />
      </View>
    </Card>
  );
}

function SkeletonBlock({ style, color }) {
  return <View style={[style, { backgroundColor: color }]} />;
}

function DeleteModal({
  visible,
  theme,
  title,
  text,
  previewTitle,
  previewSubtitle,
  icon,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
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
                name={icon}
                size={responsive(29, 37)}
                color={theme.colors.danger}
              />
            </View>

            <Text style={[styles.deleteTitle, { color: theme.colors.text }]}>
              {title}
            </Text>

            <Text style={[styles.deleteText, { color: theme.colors.secondary }]}>
              {text}
            </Text>

            {!!previewTitle && (
              <View
                style={[
                  styles.deletePreview,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.borderSoft,
                  },
                ]}
              >
                <Text
                  style={[styles.deletePreviewTitle, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {previewTitle}
                </Text>

                {!!previewSubtitle && (
                  <Text
                    style={[
                      styles.deletePreviewSubtitle,
                      { color: theme.colors.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {previewSubtitle}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.deleteActions}>
              <Button
                mode="contained-tonal"
                style={styles.cancelDeleteButton}
                contentStyle={styles.deleteButtonContent}
                labelStyle={styles.deleteButtonLabel}
                onPress={onCancel}
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                icon="delete-outline"
                buttonColor={theme.colors.danger}
                textColor="#FFFFFF"
                style={styles.confirmDeleteButton}
                contentStyle={styles.deleteButtonContent}
                labelStyle={styles.deleteButtonLabel}
                onPress={onConfirm}
              >
                Eliminar
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
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
    maxWidth: responsive(340, 560),
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(12, 16),
    marginBottom: responsive(14, 20),
  },

  summaryCard: {
    width: responsive("48%", "48.8%"),
    borderRadius: responsive(22, 28),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  summaryContent: {
    minHeight: responsive(76, 96),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(13, 20),
    paddingVertical: responsive(12, 16),
  },

  summaryIconBox: {
    width: responsive(39, 52),
    height: responsive(39, 52),
    borderRadius: responsive(14, 18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(10, 14),
  },

  summaryText: {
    flex: 1,
  },

  summaryValue: {
    fontSize: responsive(17, 22),
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  summaryTitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    fontWeight: "800",
  },

  createButton: {
    width: "100%",
    borderRadius: responsive(18, 22),
    elevation: 0,
    marginBottom: responsive(12, 18),
  },

  createButtonContent: {
    height: responsive(50, 60),
  },

  createButtonLabel: {
    fontSize: responsive(14, 16),
    fontWeight: "900",
  },

  filtersScroll: {
    marginBottom: responsive(12, 18),
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

  emptyCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  emptyContent: {
    alignItems: "center",
    padding: responsive(22, 34),
  },

  emptyIconBox: {
    width: responsive(54, 70),
    height: responsive(54, 70),
    borderRadius: responsive(19, 24),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: responsive(14, 20),
  },

  emptyTitle: {
    fontSize: responsive(18, 23),
    fontWeight: "900",
    letterSpacing: -0.25,
    textAlign: "center",
  },

  emptyText: {
    marginTop: responsive(6, 9),
    marginBottom: responsive(16, 22),
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 23),
    textAlign: "center",
    maxWidth: responsive(undefined, 460),
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

  list: {
    gap: responsive(12, 18),
  },

  paymentCard: {
    borderRadius: responsive(24, 30),
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  paymentHeader: {
    minHeight: responsive(76, 96),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(11, 16),
  },

  projectIcon: {
    width: responsive(48, 62),
    height: responsive(48, 62),
    borderRadius: responsive(17, 21),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: responsive(12, 16),
  },

  projectLogo: {
    width: "100%",
    height: "100%",
  },

  projectLetter: {
    fontSize: responsive(20, 27),
    fontWeight: "900",
  },

  paymentInfo: {
    flex: 1,
    paddingRight: responsive(8, 12),
  },

  projectName: {
    fontSize: responsive(16, 20),
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  paymentSubtitle: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },

  headerMetaRow: {
    marginTop: responsive(4, 6),
    flexDirection: "row",
    alignItems: "center",
  },

  chevron: {
    marginLeft: responsive(4, 6),
    opacity: 0.75,
  },

  statusChip: {
    height: responsive(30, 38),
    borderRadius: 999,
    paddingHorizontal: responsive(9, 13),
    flexDirection: "row",
    alignItems: "center",
    maxWidth: responsive(120, 170),
  },

  statusChipText: {
    marginLeft: responsive(5, 7),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "900",
  },

  currencyPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: responsive(7, 10),
    flexDirection: "row",
    alignItems: "center",
  },

  currencyPillText: {
    marginLeft: responsive(4, 6),
    fontWeight: "900",
  },

  progressWrap: {
    paddingHorizontal: responsive(14, 20),
    paddingBottom: responsive(12, 16),
  },

  progressTrack: {
    height: responsive(7, 9),
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  accordionContent: {
    paddingHorizontal: responsive(14, 20),
    paddingBottom: responsive(14, 22),
  },

  currencyInfoBox: {
    borderRadius: responsive(18, 23),
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(12, 18),
  },

  currencyInfoIcon: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(9, 12),
  },

  currencyInfoText: {
    flex: 1,
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(18, 22),
    fontWeight: "700",
  },

  amountRow: {
    flexDirection: "row",
    gap: responsive(10, 14),
  },

  amountBox: {
    flex: 1,
    minHeight: responsive(74, 92),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    padding: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
  },

  amountIconBox: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(9, 12),
  },

  amountText: {
    flex: 1,
  },

  amountValue: {
    fontSize: responsive(16, 20),
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  amountTitle: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12, 14.5),
    fontWeight: "800",
  },

  notesBox: {
    marginTop: responsive(12, 18),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notesText: {
    flex: 1,
    marginLeft: responsive(8, 11),
    fontSize: responsive(13, 16),
    lineHeight: responsive(19, 24),
  },

  installmentsHeader: {
    marginTop: responsive(15, 22),
    marginBottom: responsive(9, 13),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  installmentsTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
  },

  installmentsCount: {
    fontSize: responsive(12, 14.5),
    fontWeight: "800",
  },

  emptyInstallments: {
    minHeight: responsive(58, 74),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
  },

  emptyInstallmentsText: {
    flex: 1,
    marginLeft: responsive(9, 12),
    fontSize: responsive(13, 15.5),
    fontWeight: "700",
    lineHeight: responsive(18, 22),
  },

  installmentItem: {
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(10, 14),
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(8, 12),
  },

  installmentIconBox: {
    width: responsive(34, 44),
    height: responsive(34, 44),
    borderRadius: responsive(13, 17),
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(10, 14),
  },

  installmentInfo: {
    flex: 1,
    paddingRight: responsive(6, 10),
  },

  installmentAmount: {
    fontSize: responsive(15, 18),
    fontWeight: "900",
  },

  installmentMeta: {
    marginTop: responsive(2, 4),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
  },

  installmentNote: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    lineHeight: responsive(17, 21),
  },

  smallActionIcon: {
    margin: 0,
  },

  cardDivider: {
    height: 1,
    marginTop: responsive(8, 12),
    marginBottom: responsive(10, 14),
  },

  actionsRow: {
    minHeight: responsive(44, 56),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  addPaymentButton: {
    minHeight: responsive(42, 52),
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },

  addPaymentContent: {
    height: responsive(42, 52),
    paddingLeft: responsive(7, 10),
    paddingRight: responsive(14, 18),
    flexDirection: "row",
    alignItems: "center",
  },

  addPaymentIconBox: {
    width: responsive(29, 37),
    height: responsive(29, 37),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: responsive(8, 10),
  },

  addPaymentText: {
    fontSize: responsive(12.5, 15),
    fontWeight: "900",
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: responsive(4, 7),
  },

  modalKeyboardView: {
    flex: 1,
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
    paddingBottom: responsive(32, 42),
    paddingTop: responsive(10, 14),
  },

  modalScrollContent: {
    paddingBottom: responsive(90, 110),
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

  modalTitleBox: {
    flex: 1,
    paddingRight: responsive(10, 16),
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

  sectionTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    marginTop: responsive(6, 10),
    marginBottom: responsive(10, 14),
  },

  noProjectsBox: {
    minHeight: responsive(58, 74),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    paddingVertical: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(14, 20),
  },

  noProjectsText: {
    flex: 1,
    marginLeft: responsive(9, 12),
    fontSize: responsive(13, 15.5),
    fontWeight: "700",
    lineHeight: responsive(18, 22),
  },

  projectSelectorCard: {
    borderRadius: responsive(20, 26),
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: responsive(12, 16),
  },

  projectSelectorContent: {
    minHeight: responsive(64, 80),
    paddingHorizontal: responsive(13, 18),
    paddingVertical: responsive(10, 14),
    flexDirection: "row",
    alignItems: "center",
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
    borderRadius: responsive(18, 23),
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

  currencyOptions: {
    flexDirection: "row",
    gap: responsive(10, 14),
    marginBottom: responsive(14, 20),
  },

  currencyOption: {
    flex: 1,
    minHeight: responsive(66, 84),
    borderRadius: responsive(18, 23),
    borderWidth: 1,
    overflow: "hidden",
  },

  currencyOptionContent: {
    flex: 1,
    paddingHorizontal: responsive(12, 16),
    flexDirection: "row",
    alignItems: "center",
  },

  currencyOptionTextWrap: {
    marginLeft: responsive(9, 12),
  },

  currencyOptionTitle: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },

  currencyOptionSubtitle: {
    marginTop: responsive(1, 3),
    fontSize: responsive(11.5, 13.5),
    fontWeight: "800",
  },

  modalCurrencyBox: {
    minHeight: responsive(48, 62),
    borderRadius: responsive(16, 20),
    borderWidth: 1,
    paddingHorizontal: responsive(12, 16),
    flexDirection: "row",
    alignItems: "center",
    marginBottom: responsive(14, 20),
  },

  modalCurrencyText: {
    marginLeft: responsive(8, 11),
    fontSize: responsive(13, 16),
    fontWeight: "900",
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

  methodOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: responsive(8, 11),
    marginBottom: responsive(14, 20),
  },

  methodOption: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },

  methodOptionContent: {
    height: responsive(36, 44),
    paddingHorizontal: responsive(11, 15),
    flexDirection: "row",
    alignItems: "center",
  },

  methodOptionText: {
    marginLeft: responsive(6, 8),
    fontSize: responsive(12.5, 15),
    fontWeight: "900",
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

  deletePreview: {
    width: "100%",
    borderRadius: responsive(18, 22),
    borderWidth: 1,
    paddingHorizontal: responsive(14, 20),
    paddingVertical: responsive(12, 16),
    marginTop: responsive(16, 22),
  },

  deletePreviewTitle: {
    fontSize: responsive(14, 17),
    fontWeight: "900",
    textAlign: "center",
  },

  deletePreviewSubtitle: {
    marginTop: responsive(3, 5),
    fontSize: responsive(12.5, 15),
    fontWeight: "700",
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

  deleteButtonLabel: {
    fontSize: responsive(13.5, 16),
    fontWeight: "900",
  },

  skeletonSummaryIcon: {
    width: responsive(39, 52),
    height: responsive(39, 52),
    borderRadius: responsive(14, 18),
    marginRight: responsive(10, 14),
  },

  skeletonSummaryValue: {
    width: "82%",
    height: responsive(17, 22),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonSummaryTitle: {
    width: "62%",
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonProjectIcon: {
    width: responsive(48, 62),
    height: responsive(48, 62),
    borderRadius: responsive(17, 21),
    marginRight: responsive(12, 16),
  },

  skeletonPaymentTitle: {
    width: "78%",
    height: responsive(17, 22),
    borderRadius: 999,
    marginBottom: responsive(8, 11),
  },

  skeletonPaymentSubtitle: {
    width: "58%",
    height: responsive(12, 15),
    borderRadius: 999,
  },

  skeletonStatusChip: {
    width: responsive(92, 122),
    height: responsive(30, 38),
    borderRadius: 999,
    marginBottom: responsive(7, 9),
  },

  skeletonCurrencyPill: {
    width: responsive(58, 74),
    height: responsive(25, 31),
    borderRadius: 999,
  },

  skeletonProgress: {
    height: responsive(7, 9),
    borderRadius: 999,
  },
});