import React, { useEffect, useState } from "react";
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, View } from "react-native";
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

export default function DataBaseScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [firebaseUrl, setFirebaseUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const databasesQuery = query(
      collection(db, "databasesInfo"),
      where("userId", "==", user.uid)
    );

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setProjects(data);
    });

    const unsubscribeDatabases = onSnapshot(databasesQuery, (snapshot) => {
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

      setDatabases(data);
      setLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeDatabases();
    };
  }, [user]);

  function resetForm() {
    setEditingDatabase(null);
    setProjectId(null);
    setFirebaseUrl("");
    setNotes("");
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingDatabase(item);
    setProjectId(item.projectId || null);
    setFirebaseUrl(item.firebaseUrl || "");
    setNotes(item.notes || "");
    setModalVisible(true);
  }

  async function openFirebaseLink(item) {
    if (!item.firebaseUrl) {
      Alert.alert("Sin enlace", "Este proyecto no tiene enlace cargado.");
      return;
    }

    const canOpen = await Linking.canOpenURL(item.firebaseUrl);

    if (!canOpen) {
      Alert.alert("Enlace inválido", "No se pudo abrir el enlace.");
      return;
    }

    await Linking.openURL(item.firebaseUrl);
  }

  async function handleSaveDatabase() {
    if (!projectId) {
      Alert.alert("Falta el proyecto", "Seleccioná un proyecto.");
      return;
    }

    if (!firebaseUrl.trim()) {
      Alert.alert("Falta el enlace", "Pegá el enlace de Firebase.");
      return;
    }

    const selectedProject = projects.find((project) => project.id === projectId);

    try {
      const payload = {
        userId: user.uid,
        projectId,
        projectName: selectedProject?.name || "",
        projectColor: selectedProject?.color || null,
        projectLogoUrl: selectedProject?.logoUrl || null,
        firebaseUrl: firebaseUrl.trim(),
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingDatabase) {
        await updateDoc(doc(db, "databasesInfo", editingDatabase.id), payload);
      } else {
        await addDoc(collection(db, "databasesInfo"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar la base de datos.");
    }
  }

  function handleDeleteDatabase(item) {
    Alert.alert(
      "Eliminar enlace",
      `¿Eliminar el enlace de Firebase de "${item.projectName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteDoc(doc(db, "databasesInfo", item.id));
          },
        },
      ]
    );
  }

  function ProjectIcon({ item }) {
    const color = item?.projectColor || item?.color || theme.colors.primary;
    const logoUrl = item?.projectLogoUrl || item?.logoUrl;

    return (
      <View style={[styles.projectIcon, { backgroundColor: color }]}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.projectLetter}>
            {(item?.projectName || item?.name || "P").charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
        Guardá enlaces directos a Firebase por proyecto.
      </Text>

      <Button mode="contained" style={styles.button} onPress={openCreateModal}>
        Nuevo enlace Firebase
      </Button>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : databases.length === 0 ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Sin bases guardadas
            </Text>

            <Text style={{ color: theme.colors.secondary }}>
              Agregá un proyecto y pegá su enlace de Firebase Console.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.list}>
          {databases.map((item) => (
            <Card
              key={item.id}
              style={[styles.databaseCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => openFirebaseLink(item)}
            >
              <Card.Content>
                <View style={styles.cardRow}>
                  <ProjectIcon item={item} />

                  <View style={styles.cardInfo}>
                    <Text style={[styles.projectName, { color: theme.colors.text }]}>
                      {item.projectName}
                    </Text>

                    <View style={styles.chipsRow}>
                      <Chip compact icon="firebase">
                        Firebase
                      </Chip>

                      <Chip compact icon="open-in-new">
                        Abrir enlace
                      </Chip>
                    </View>

                    {!!item.notes && (
                      <Text
                        style={[styles.notes, { color: theme.colors.secondary }]}
                        numberOfLines={2}
                      >
                        {item.notes}
                      </Text>
                    )}
                  </View>

                  <View style={styles.actionsColumn}>
                    <IconButton
                      icon="pencil-outline"
                      onPress={() => openEditModal(item)}
                    />

                    <IconButton
                      icon="delete-outline"
                      iconColor="#DC2626"
                      onPress={() => handleDeleteDatabase(item)}
                    />
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingDatabase ? "Editar enlace" : "Nuevo enlace Firebase"}
              </Text>

              <IconButton
                icon="close"
                onPress={() => {
                  resetForm();
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
                label="Enlace de Firebase Console"
                value={firebaseUrl}
                onChangeText={setFirebaseUrl}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://console.firebase.google.com/..."
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

              <Button mode="contained" style={styles.saveButton} onPress={handleSaveDatabase}>
                {editingDatabase ? "Guardar cambios" : "Guardar enlace"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
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

  button: {
    borderRadius: 16,
    marginBottom: 18,
  },

  card: {
    borderRadius: 22,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  list: {
    gap: 14,
  },

  databaseCard: {
    borderRadius: 22,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  projectIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  projectLetter: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },

  cardInfo: {
    flex: 1,
  },

  projectName: {
    fontSize: 18,
    fontWeight: "900",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  notes: {
    marginTop: 8,
    lineHeight: 19,
  },

  actionsColumn: {
    alignItems: "center",
    justifyContent: "center",
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