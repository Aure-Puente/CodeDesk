import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  TextInput,
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

export default function PaymentsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [installmentModalVisible, setInstallmentModalVisible] = useState(false);

  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentMethod, setInstallmentMethod] = useState("");
  const [installmentNote, setInstallmentNote] = useState("");

  const [filter, setFilter] = useState("todos");

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
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

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

      let status = "no_pagado";

      if (paid > 0 && paid < total) status = "parcial";
      if (total > 0 && paid >= total) status = "pagado";

      return {
        ...payment,
        paidAmount: paid,
        pendingAmount: pending,
        paymentStatus: status,
      };
    });
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (filter === "todos") return paymentsWithStatus;
    return paymentsWithStatus.filter((payment) => payment.paymentStatus === filter);
  }, [paymentsWithStatus, filter]);

  const summary = useMemo(() => {
    const totalAgreed = paymentsWithStatus.reduce(
      (acc, payment) => acc + Number(payment.totalAmount || 0),
      0
    );

    const totalPaid = paymentsWithStatus.reduce(
      (acc, payment) => acc + Number(payment.paidAmount || 0),
      0
    );

    return {
      totalAgreed,
      totalPaid,
      totalPending: Math.max(totalAgreed - totalPaid, 0),
      partialCount: paymentsWithStatus.filter(
        (payment) => payment.paymentStatus === "parcial"
      ).length,
    };
  }, [paymentsWithStatus]);

  function getPaidAmount(payment) {
    return (payment.installments || []).reduce(
      (acc, item) => acc + Number(item.amount || 0),
      0
    );
  }

  function formatMoney(value) {
    const number = Number(value || 0);

    return `$${number.toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    })}`;
  }

  function resetPaymentForm() {
    setEditingPayment(null);
    setProjectId(null);
    setTotalAmount("");
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
    setNotes(payment.notes || "");
    setModalVisible(true);
  }

  function openInstallmentModal(payment) {
    setSelectedPayment(payment);
    resetInstallmentForm();
    setInstallmentModalVisible(true);
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
          notes: notes.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "payments"), {
          userId: user.uid,
          projectId,
          projectName: selectedProject?.name || "",
          projectColor: selectedProject?.color || null,
          projectLogoUrl: selectedProject?.logoUrl || null,
          totalAmount: Number(totalAmount),
          installments: [],
          notes: notes.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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

      resetInstallmentForm();
      setSelectedPayment(null);
      setInstallmentModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo agregar el pago.");
    }
  }

  function handleDeletePayment(payment) {
    Alert.alert(
      "Eliminar registro",
      `¿Eliminar el registro de pago de "${payment.projectName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteDoc(doc(db, "payments", payment.id));
          },
        },
      ]
    );
  }

  async function handleDeleteInstallment(payment, installmentId) {
    const updatedInstallments = (payment.installments || []).filter(
      (item) => item.id !== installmentId
    );

    await updateDoc(doc(db, "payments", payment.id), {
      installments: updatedInstallments,
      updatedAt: serverTimestamp(),
    });
  }

  function getStatusLabel(status) {
    if (status === "no_pagado") return "No pagado";
    if (status === "parcial") return "Parcial";
    if (status === "pagado") return "Pagado";
    return "No pagado";
  }

  function getStatusColor(status) {
    if (status === "no_pagado") return "#DC2626";
    if (status === "parcial") return "#EA580C";
    if (status === "pagado") return "#16A34A";
    return "#DC2626";
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
        Pagos
      </Text>

      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Controlá cobros por proyecto, pagos parciales y cuotas.
      </Text>

      <View style={styles.grid}>
        <SummaryCard
          title="Acordado"
          value={formatMoney(summary.totalAgreed)}
          icon="file-document-outline"
          theme={theme}
        />

        <SummaryCard
          title="Cobrado"
          value={formatMoney(summary.totalPaid)}
          icon="cash-check"
          theme={theme}
        />

        <SummaryCard
          title="Pendiente"
          value={formatMoney(summary.totalPending)}
          icon="cash-clock"
          theme={theme}
        />

        <SummaryCard
          title="Parciales"
          value={summary.partialCount}
          icon="chart-donut"
          theme={theme}
        />
      </View>

      <Button mode="contained" style={styles.button} onPress={openCreateModal}>
        Nuevo registro de pago
      </Button>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {["todos", "no_pagado", "parcial", "pagado"].map((item) => (
          <Chip
            key={item}
            selected={filter === item}
            onPress={() => setFilter(item)}
            style={styles.filterChip}
          >
            {item === "todos" ? "Todos" : getStatusLabel(item)}
          </Chip>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : filteredPayments.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No hay pagos para mostrar
            </Text>
            <Text style={{ color: theme.colors.secondary }}>
              Cargá un proyecto y su monto total acordado para comenzar.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.list}>
          {filteredPayments.map((payment) => {
            const color = payment.projectColor || theme.colors.primary;

            return (
              <Card
                key={payment.id}
                style={[styles.paymentCard, { backgroundColor: theme.colors.surface }]}
              >
                <Card.Content>
                  <View style={styles.paymentHeader}>
                    <View style={[styles.projectIcon, { backgroundColor: color }]}>
                      {payment.projectLogoUrl ? (
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={25}
                          color="#FFFFFF"
                        />
                      ) : (
                        <Text style={styles.projectLetter}>
                          {payment.projectName?.charAt(0)?.toUpperCase() || "P"}
                        </Text>
                      )}
                    </View>

                    <View style={styles.paymentInfo}>
                      <Text style={[styles.projectName, { color: theme.colors.text }]}>
                        {payment.projectName}
                      </Text>

                      <Text style={{ color: theme.colors.secondary }}>
                        Total: {formatMoney(payment.totalAmount)}
                      </Text>
                    </View>

                    <Chip
                      compact
                      style={{
                        backgroundColor: getStatusColor(payment.paymentStatus) + "22",
                      }}
                      textStyle={{
                        color: getStatusColor(payment.paymentStatus),
                        fontWeight: "800",
                      }}
                    >
                      {getStatusLabel(payment.paymentStatus)}
                    </Chip>
                  </View>

                  <View style={styles.amountRow}>
                    <AmountBox
                      title="Cobrado"
                      value={formatMoney(payment.paidAmount)}
                      theme={theme}
                    />

                    <AmountBox
                      title="Falta"
                      value={formatMoney(payment.pendingAmount)}
                      theme={theme}
                    />
                  </View>

                  {!!payment.notes && (
                    <Text style={[styles.notes, { color: theme.colors.secondary }]}>
                      {payment.notes}
                    </Text>
                  )}

                  {(payment.installments || []).length > 0 && (
                    <View style={styles.installmentsBox}>
                      <Text style={[styles.installmentsTitle, { color: theme.colors.text }]}>
                        Pagos recibidos
                      </Text>

                      {payment.installments.map((item) => (
                        <View key={item.id} style={styles.installmentItem}>
                          <View style={styles.installmentInfo}>
                            <Text style={[styles.installmentAmount, { color: theme.colors.text }]}>
                              {formatMoney(item.amount)}
                            </Text>

                            <Text style={{ color: theme.colors.secondary }}>
                              {item.method || "Sin método"} ·{" "}
                              {new Date(item.date).toLocaleDateString("es-AR")}
                            </Text>

                            {!!item.note && (
                              <Text style={{ color: theme.colors.secondary }}>
                                {item.note}
                              </Text>
                            )}
                          </View>

                          <IconButton
                            icon="delete-outline"
                            iconColor="#DC2626"
                            onPress={() => handleDeleteInstallment(payment, item.id)}
                          />
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.actionsRow}>
                    <Button
                      mode="text"
                      icon="cash-plus"
                      onPress={() => openInstallmentModal(payment)}
                    >
                      Agregar pago
                    </Button>

                    <Button
                      mode="text"
                      icon="pencil-outline"
                      onPress={() => openEditModal(payment)}
                    >
                      Editar
                    </Button>

                    <Button
                      mode="text"
                      icon="delete-outline"
                      textColor="#DC2626"
                      onPress={() => handleDeletePayment(payment)}
                    >
                      Eliminar
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingPayment ? "Editar registro" : "Nuevo registro de pago"}
              </Text>

              <IconButton
                icon="close"
                onPress={() => {
                  resetPaymentForm();
                  setModalVisible(false);
                }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Proyecto
              </Text>

              <View style={styles.optionWrap}>
                {projects.map((project) => (
                  <Chip
                    key={project.id}
                    selected={projectId === project.id}
                    onPress={() => setProjectId(project.id)}
                    style={styles.optionChip}
                    icon="folder-outline"
                  >
                    {project.name}
                  </Chip>
                ))}
              </View>

              <TextInput
                label="Monto total acordado"
                value={totalAmount}
                onChangeText={setTotalAmount}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Notas"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Button mode="contained" style={styles.saveButton} onPress={handleSavePayment}>
                {editingPayment ? "Guardar cambios" : "Guardar registro"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={installmentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Agregar pago
              </Text>

              <IconButton
                icon="close"
                onPress={() => {
                  resetInstallmentForm();
                  setSelectedPayment(null);
                  setInstallmentModalVisible(false);
                }}
              />
            </View>

            <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
              {selectedPayment?.projectName || ""}
            </Text>

            <TextInput
              label="Monto pagado"
              value={installmentAmount}
              onChangeText={setInstallmentAmount}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Método de pago"
              value={installmentMethod}
              onChangeText={setInstallmentMethod}
              mode="outlined"
              placeholder="Efectivo, transferencia, Mercado Pago..."
              style={styles.input}
            />

            <TextInput
              label="Nota"
              value={installmentNote}
              onChangeText={setInstallmentNote}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <Button mode="contained" style={styles.saveButton} onPress={handleAddInstallment}>
              Guardar pago
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SummaryCard({ title, value, icon, theme }) {
  return (
    <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.summaryHeader}>
          <MaterialCommunityIcons name={icon} size={22} color={theme.colors.primary} />
          <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
            {value}
          </Text>
        </View>

        <Text style={{ color: theme.colors.secondary }}>{title}</Text>
      </Card.Content>
    </Card>
  );
}

function AmountBox({ title, value, theme }) {
  return (
    <View style={[styles.amountBox, { borderColor: theme.colors.outline }]}>
      <Text style={[styles.amountValue, { color: theme.colors.text }]}>
        {value}
      </Text>

      <Text style={{ color: theme.colors.secondary }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 135,
  },

  title: {
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 18,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },

  summaryCard: {
    width: "48%",
    borderRadius: 22,
  },

  summaryHeader: {
    gap: 8,
  },

  summaryValue: {
    fontSize: 21,
    fontWeight: "900",
  },

  button: {
    borderRadius: 16,
    marginBottom: 14,
  },

  filters: {
    marginBottom: 10,
  },

  filterChip: {
    marginRight: 8,
  },

  emptyCard: {
    borderRadius: 22,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  list: {
    gap: 14,
  },

  paymentCard: {
    borderRadius: 22,
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  projectIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  projectLetter: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  paymentInfo: {
    flex: 1,
  },

  projectName: {
    fontSize: 17,
    fontWeight: "800",
  },

  amountRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  amountBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },

  amountValue: {
    fontSize: 18,
    fontWeight: "900",
  },

  notes: {
    marginTop: 12,
    lineHeight: 20,
  },

  installmentsBox: {
    marginTop: 16,
  },

  installmentsTitle: {
    fontWeight: "900",
    marginBottom: 8,
  },

  installmentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    marginTop: 10,
  },

  installmentInfo: {
    flex: 1,
  },

  installmentAmount: {
    fontSize: 16,
    fontWeight: "900",
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  modal: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  sectionTitle: {
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 10,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  optionChip: {
    marginBottom: 4,
  },

  input: {
    marginBottom: 12,
  },

  saveButton: {
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 10,
  },
});