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

    const projectSoft = theme.dark
      ? hexToRgba(projectColor, 0.18)
      : hexToRgba(projectColor, 0.1);

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
            <View style={[styles.projectIcon, { backgroundColor: projectSoft }]}>
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
                <CurrencyPill
                  currency={paymentCurrency}
                  theme={theme}
                  small
                />

                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={23}
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
                  size={18}
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
                  size={18}
                  color={theme.colors.secondary}
                />

                <Text
                  style={[styles.notesText, { color: theme.colors.secondary }]}
                >
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
                  size={21}
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
                      size={18}
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
                    size={19}
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
                      size={17}
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
                  size={20}
                  mode="contained-tonal"
                  iconColor={theme.colors.primary}
                  containerColor={theme.colors.primarySoft}
                  style={styles.actionIcon}
                  onPress={() => openEditModal(payment)}
                />

                <IconButton
                  icon="delete-outline"
                  size={20}
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
            Pagos
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Controlá cobros por proyecto, pagos parciales y saldos pendientes.
        </Text>
      </View>

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
            item === "todos" ? theme.colors.primarySoft : getStatusSoft(theme, item);

          return (
            <FilterChip
              key={item}
              label={item === "todos" ? "Todos" : getStatusLabel(item)}
              icon={item === "todos" ? "format-list-bulleted" : getStatusIcon(item)}
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
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
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
                size={26}
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
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Elegí el proyecto, moneda y monto total acordado.
                </Text>
              </View>

              <IconButton
                icon="close"
                size={21}
                iconColor={theme.colors.secondary}
                style={styles.closeButton}
                onPress={() => {
                  resetPaymentForm();
                  setModalVisible(false);
                }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                    size={22}
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
                <View style={styles.optionWrap}>
                  {projects.map((project) => {
                    const selected = projectId === project.id;
                    const color = project.color || theme.colors.primary;

                    return (
                      <ProjectOptionChip
                        key={project.id}
                        label={project.name}
                        selected={selected}
                        color={color}
                        theme={theme}
                        onPress={() => setProjectId(project.id)}
                      />
                    );
                  })}
                </View>
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
                          size={20}
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
      </Modal>

      <Modal visible={installmentModalVisible} animationType="slide" transparent>
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
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                  numberOfLines={1}
                >
                  {selectedPayment?.projectName || "Registro seleccionado"}
                </Text>
              </View>

              <IconButton
                icon="close"
                size={21}
                iconColor={theme.colors.secondary}
                style={styles.closeButton}
                onPress={() => {
                  resetInstallmentForm();
                  setSelectedPayment(null);
                  setInstallmentModalVisible(false);
                }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                    size={20}
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
                          name={selected ? "check-circle-outline" : "circle-outline"}
                          size={18}
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
          <MaterialCommunityIcons name={icon} size={20} color={color} />
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
        <MaterialCommunityIcons name={icon} size={18} color={color} />
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
      <MaterialCommunityIcons name={icon} size={14} color={color} />

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
          height: small ? 25 : 30,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={info.icon}
        size={small ? 12 : 14}
        color={theme.colors.primary}
      />

      <Text
        style={[
          styles.currencyPillText,
          {
            color: theme.colors.primary,
            fontSize: small ? 10.5 : 11.5,
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

function ProjectOptionChip({ label, selected, color, theme, onPress }) {
  const bg = selected
    ? theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.09)
    : theme.colors.surfaceSoft;

  return (
    <Chip
      compact
      icon="folder-outline"
      selected={selected}
      onPress={onPress}
      style={[
        styles.optionChip,
        {
          backgroundColor: bg,
          borderColor: selected
            ? hexToRgba(color, theme.dark ? 0.34 : 0.18)
            : theme.colors.borderSoft,
        },
      ]}
      textStyle={[
        styles.optionChipText,
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
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
      {title}
    </Text>
  );
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
                size={29}
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
    maxWidth: 340,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },

  summaryCard: {
    width: "48%",
    borderRadius: 22,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  summaryContent: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  summaryIconBox: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  summaryText: {
    flex: 1,
  },

  summaryValue: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  summaryTitle: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "800",
  },

  createButton: {
    width: "100%",
    borderRadius: 18,
    elevation: 0,
    marginBottom: 12,
  },

  createButtonContent: {
    height: 50,
  },

  createButtonLabel: {
    fontSize: 14,
    fontWeight: "900",
  },

  filtersScroll: {
    marginBottom: 12,
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

  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  emptyContent: {
    alignItems: "center",
    padding: 22,
  },

  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.25,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  emptyButton: {
    borderRadius: 16,
  },

  list: {
    gap: 12,
  },

  paymentCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  paymentHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },

  projectLogo: {
    width: "100%",
    height: "100%",
  },

  projectLetter: {
    fontSize: 20,
    fontWeight: "900",
  },

  paymentInfo: {
    flex: 1,
    paddingRight: 8,
  },

  projectName: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  paymentSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
  },

  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },

  headerMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },

  chevron: {
    marginLeft: 4,
    opacity: 0.75,
  },

  statusChip: {
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 120,
  },

  statusChipText: {
    marginLeft: 5,
    fontSize: 11.5,
    fontWeight: "900",
  },

  currencyPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  currencyPillText: {
    marginLeft: 4,
    fontWeight: "900",
  },

  progressWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  accordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  currencyInfoBox: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  currencyInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  currencyInfoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },

  amountRow: {
    flexDirection: "row",
    gap: 10,
  },

  amountBox: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  amountIconBox: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  amountText: {
    flex: 1,
  },

  amountValue: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  amountTitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
  },

  notesBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notesText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 19,
  },

  installmentsHeader: {
    marginTop: 15,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  installmentsTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  installmentsCount: {
    fontSize: 12,
    fontWeight: "800",
  },

  emptyInstallments: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  emptyInstallmentsText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  installmentItem: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  installmentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  installmentInfo: {
    flex: 1,
    paddingRight: 6,
  },

  installmentAmount: {
    fontSize: 15,
    fontWeight: "900",
  },

  installmentMeta: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "700",
  },

  installmentNote: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
  },

  smallActionIcon: {
    margin: 0,
  },

  cardDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 10,
  },

  actionsRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  addPaymentButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },

  addPaymentContent: {
    height: 42,
    paddingLeft: 7,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  addPaymentIconBox: {
    width: 29,
    height: 29,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  addPaymentText: {
    fontSize: 12.5,
    fontWeight: "900",
  },

  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    margin: 0,
    marginLeft: 4,
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

  modalTitleBox: {
    flex: 1,
    paddingRight: 10,
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    marginBottom: 2,
  },

  optionChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  noProjectsBox: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  noProjectsText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  currencyOptions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  currencyOption: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },

  currencyOptionContent: {
    flex: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  currencyOptionTextWrap: {
    marginLeft: 9,
  },

  currencyOptionTitle: {
    fontSize: 13.5,
    fontWeight: "900",
  },

  currencyOptionSubtitle: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: "800",
  },

  modalCurrencyBox: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  modalCurrencyText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "900",
  },

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
  },

  methodOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  methodOption: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },

  methodOptionContent: {
    height: 36,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  methodOptionText: {
    marginLeft: 6,
    fontSize: 12.5,
    fontWeight: "900",
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

  deletePreview: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },

  deletePreviewTitle: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  deletePreviewSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
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

  deleteButtonLabel: {
    fontSize: 13.5,
    fontWeight: "900",
  },
});