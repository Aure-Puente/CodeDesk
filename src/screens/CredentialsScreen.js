import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, View } from "react-native";
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
import * as Clipboard from "expo-clipboard";

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

const TYPES = ["General", "Firebase", "GitHub", "Vercel", "Railway", "Hosting", "Admin"];

export default function CredentialsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const [editingCredential, setEditingCredential] = useState(null);
  const [selectedCredential, setSelectedCredential] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [type, setType] = useState("General");

  const [productionEmail, setProductionEmail] = useState("");
  const [productionPassword, setProductionPassword] = useState("");
  const [productionUrl, setProductionUrl] = useState("");

  const [localEmail, setLocalEmail] = useState("");
  const [localPassword, setLocalPassword] = useState("");

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const credentialsQuery = query(
      collection(db, "credentials"),
      where("userId", "==", user.uid)
    );

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setProjects(data);
    });

    const unsubscribeCredentials = onSnapshot(credentialsQuery, (snapshot) => {
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

      setCredentials(data);
      setLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeCredentials();
    };
  }, [user]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectId);
  }, [projects, projectId]);

  function resetForm() {
    setEditingCredential(null);
    setProjectId(null);
    setType("General");

    setProductionEmail("");
    setProductionPassword("");
    setProductionUrl("");

    setLocalEmail("");
    setLocalPassword("");

    setNotes("");
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function openEditModal(credential) {
    setEditingCredential(credential);
    setProjectId(credential.projectId || null);
    setType(credential.type || "General");

    setProductionEmail(credential.production?.email || "");
    setProductionPassword(credential.production?.password || "");
    setProductionUrl(credential.production?.url || "");

    setLocalEmail(credential.local?.email || "");
    setLocalPassword(credential.local?.password || "");

    setNotes(credential.notes || "");
    setModalVisible(true);
  }

  function openDetails(credential) {
    setSelectedCredential(credential);
    setDetailsVisible(true);
  }

  async function copyValue(value, label) {
    if (!value) {
      Alert.alert("Sin dato", `No hay ${label} para copiar.`);
      return;
    }

    await Clipboard.setStringAsync(value);
    Alert.alert("Copiado", `${label} copiado al portapapeles.`);
  }

  async function handleSaveCredential() {
    if (!projectId) {
      Alert.alert("Falta el proyecto", "Seleccioná un proyecto.");
      return;
    }

    try {
      const payload = {
        userId: user.uid,
        projectId,
        projectName: selectedProject?.name || "",
        projectColor: selectedProject?.color || null,
        projectLogoUrl: selectedProject?.logoUrl || null,
        type,
        production: {
          email: productionEmail.trim(),
          password: productionPassword.trim(),
          url: productionUrl.trim(),
        },
        local: {
          email: localEmail.trim(),
          password: localPassword.trim(),
        },
        notes: notes.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingCredential) {
        await updateDoc(doc(db, "credentials", editingCredential.id), payload);
      } else {
        await addDoc(collection(db, "credentials"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudieron guardar las credenciales.");
    }
  }

  function handleDeleteCredential(credential) {
    Alert.alert(
      "Eliminar credenciales",
      `¿Eliminar las credenciales de "${credential.projectName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteDoc(doc(db, "credentials", credential.id));
            setDetailsVisible(false);
            setSelectedCredential(null);
          },
        },
      ]
    );
  }

  function ProjectIcon({ item, size = 58 }) {
    const color = item?.projectColor || item?.color || theme.colors.primary;
    const logoUrl = item?.projectLogoUrl || item?.logoUrl;

    return (
      <View
        style={[
          styles.projectIcon,
          {
            width: size,
            height: size,
            borderRadius: size / 3,
            backgroundColor: color,
          },
        ]}
      >
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
        Guardá accesos locales y de producción por proyecto.
      </Text>

      <Button mode="contained" style={styles.button} onPress={openCreateModal}>
        Nueva credencial
      </Button>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : credentials.length === 0 ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Sin credenciales todavía
            </Text>
            <Text style={{ color: theme.colors.secondary }}>
              Agregá credenciales por proyecto para local y producción.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.list}>
          {credentials.map((credential) => (
            <Card
              key={credential.id}
              style={[styles.credentialCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => openDetails(credential)}
            >
              <Card.Content>
                <View style={styles.cardRow}>
                  <ProjectIcon item={credential} />

                  <View style={styles.cardInfo}>
                    <Text style={[styles.projectName, { color: theme.colors.text }]}>
                      {credential.projectName}
                    </Text>

                    <Text style={{ color: theme.colors.secondary }}>
                      {credential.type || "General"}
                    </Text>

                    <View style={styles.chipsRow}>
                      <Chip compact icon="server">
                        Producción
                      </Chip>

                      <Chip compact icon="laptop">
                        Local
                      </Chip>
                    </View>
                  </View>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={28}
                    color={theme.colors.secondary}
                  />
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
                {editingCredential ? "Editar credenciales" : "Nueva credencial"}
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

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Tipo
              </Text>

              <View style={styles.optionWrap}>
                {TYPES.map((item) => (
                  <Chip
                    key={item}
                    selected={type === item}
                    onPress={() => setType(item)}
                    style={styles.optionChip}
                  >
                    {item}
                  </Chip>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Producción
              </Text>

              <TextInput
                label="URL producción"
                value={productionUrl}
                onChangeText={setProductionUrl}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Email / usuario producción"
                value={productionEmail}
                onChangeText={setProductionEmail}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Contraseña producción"
                value={productionPassword}
                onChangeText={setProductionPassword}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Local
              </Text>

              <TextInput
                label="Email / usuario local"
                value={localEmail}
                onChangeText={setLocalEmail}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Contraseña local"
                value={localPassword}
                onChangeText={setLocalPassword}
                mode="outlined"
                autoCapitalize="none"
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

              <Button mode="contained" style={styles.saveButton} onPress={handleSaveCredential}>
                {editingCredential ? "Guardar cambios" : "Guardar credencial"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Credenciales
              </Text>

              <IconButton
                icon="close"
                onPress={() => {
                  setDetailsVisible(false);
                  setSelectedCredential(null);
                }}
              />
            </View>

            {selectedCredential && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsHeader}>
                  <ProjectIcon item={selectedCredential} size={64} />

                  <View style={styles.cardInfo}>
                    <Text style={[styles.projectName, { color: theme.colors.text }]}>
                      {selectedCredential.projectName}
                    </Text>

                    <Text style={{ color: theme.colors.secondary }}>
                      {selectedCredential.type}
                    </Text>
                  </View>
                </View>

                <CredentialBlock
                  title="Producción"
                  icon="server"
                  data={selectedCredential.production}
                  theme={theme}
                  onCopy={copyValue}
                />

                <CredentialBlock
                  title="Local"
                  icon="laptop"
                  data={selectedCredential.local}
                  theme={theme}
                  onCopy={copyValue}
                  showUrl={false}
                />

                {!!selectedCredential.notes && (
                  <Card style={[styles.infoCard, { backgroundColor: theme.colors.background }]}>
                    <Card.Content>
                      <Text style={[styles.blockTitle, { color: theme.colors.text }]}>
                        Notas
                      </Text>
                      <Text style={{ color: theme.colors.secondary }}>
                        {selectedCredential.notes}
                      </Text>
                    </Card.Content>
                  </Card>
                )}

                <View style={styles.detailsActions}>
                  <Button
                    mode="outlined"
                    icon="pencil-outline"
                    style={styles.actionButton}
                    onPress={() => {
                      setDetailsVisible(false);
                      openEditModal(selectedCredential);
                    }}
                  >
                    Editar
                  </Button>

                  <Button
                    mode="outlined"
                    icon="delete-outline"
                    textColor="#DC2626"
                    style={styles.actionButton}
                    onPress={() => handleDeleteCredential(selectedCredential)}
                  >
                    Eliminar
                  </Button>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

  function CredentialBlock({ title, icon, data, theme, onCopy, showUrl = true }) {
    return (
      <Card style={[styles.infoCard, { backgroundColor: theme.colors.background }]}>
        <Card.Content>
          <View style={styles.blockHeader}>
            <MaterialCommunityIcons name={icon} size={22} color={theme.colors.primary} />

            <Text style={[styles.blockTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
          </View>

          {showUrl && (
            <CopyRow label="URL" value={data?.url} theme={theme} onCopy={onCopy} />
          )}

          <CopyRow label="Email / usuario" value={data?.email} theme={theme} onCopy={onCopy} />
          <CopyRow label="Contraseña" value={data?.password} theme={theme} onCopy={onCopy} />
        </Card.Content>
      </Card>
    );
  }

function CopyRow({ label, value, theme, onCopy }) {
  return (
    <View style={styles.copyRow}>
      <View style={styles.copyInfo}>
        <Text style={[styles.copyLabel, { color: theme.colors.secondary }]}>
          {label}
        </Text>

        <Text style={[styles.copyValue, { color: theme.colors.text }]} numberOfLines={1}>
          {value || "Sin dato"}
        </Text>
      </View>

      <IconButton
        icon="content-copy"
        onPress={() => onCopy(value, label)}
      />
    </View>
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

  credentialCard: {
    borderRadius: 22,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  projectIcon: {
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

  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },

  infoCard: {
    borderRadius: 22,
    marginBottom: 14,
  },

  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  blockTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    marginTop: 10,
  },

  copyInfo: {
    flex: 1,
  },

  copyLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },

  copyValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  detailsActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },

  actionButton: {
    flex: 1,
    borderRadius: 16,
  },
});