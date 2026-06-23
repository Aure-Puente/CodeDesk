//Importaciones:
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
  TouchableRipple,
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

//JS:
const TYPES = [
  "Todos",
  "General",
  "Firebase",
  "GitHub",
  "Vercel",
  "Railway",
  "Hosting",
  "Admin",
];

const CREDENTIAL_TYPES = TYPES.filter((item) => item !== "Todos");

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

function getTypeIcon(type) {
  if (type === "Firebase") return "firebase";
  if (type === "GitHub") return "github";
  if (type === "Vercel") return "triangle-outline";
  if (type === "Railway") return "train";
  if (type === "Hosting") return "server-network";
  if (type === "Admin") return "shield-account-outline";
  return "key-variant";
}

function hasProductionData(credential) {
  return Boolean(
    credential?.production?.email ||
      credential?.production?.password ||
      credential?.production?.url
  );
}

function hasLocalData(credential) {
  return Boolean(credential?.local?.email || credential?.local?.password);
}

export default function CredentialsScreen({ theme }) {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingCredential, setEditingCredential] = useState(null);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [credentialToDelete, setCredentialToDelete] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [type, setType] = useState("General");
  const [filterType, setFilterType] = useState("Todos");

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

  const filteredCredentials = useMemo(() => {
    if (filterType === "Todos") return credentials;

    return credentials.filter(
      (credential) => (credential.type || "General") === filterType
    );
  }, [credentials, filterType]);

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

  function openDeleteModal(credential) {
    setCredentialToDelete(credential);
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    setCredentialToDelete(null);
    setDeleteModalVisible(false);
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

  async function confirmDeleteCredential() {
    if (!credentialToDelete?.id) return;

    try {
      await deleteDoc(doc(db, "credentials", credentialToDelete.id));

      if (selectedCredential?.id === credentialToDelete.id) {
        setDetailsVisible(false);
        setSelectedCredential(null);
      }

      closeDeleteModal();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudieron eliminar las credenciales.");
    }
  }

  function ProjectIcon({ item, size = 56 }) {
    const color = item?.projectColor || item?.color || theme.colors.primary;
    const logoUrl = item?.projectLogoUrl || item?.logoUrl;
    const softColor = theme.dark
      ? hexToRgba(color, 0.18)
      : hexToRgba(color, 0.1);

    return (
      <View
        style={[
          styles.projectIcon,
          {
            width: size,
            height: size,
            borderRadius: size / 3,
            backgroundColor: softColor,
          },
        ]}
      >
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={[styles.projectLetter, { color }]}>
            {(item?.projectName || item?.name || "P").charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
    );
  }

  function renderCredentialCard(credential) {
    const projectColor = credential.projectColor || theme.colors.primary;
    const typeValue = credential.type || "General";

    return (
      <Card
        key={credential.id}
        mode="contained"
        style={[
          styles.credentialCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}
      >
        <TouchableRipple
          rippleColor={theme.colors.primarySoft}
          onPress={() => openDetails(credential)}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardRow}>
              <ProjectIcon item={credential} />

              <View style={styles.cardInfo}>
                <Text
                  style={[styles.projectName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {credential.projectName || "Proyecto sin nombre"}
                </Text>

                <View style={styles.typeRow}>
                  <MaterialCommunityIcons
                    name={getTypeIcon(typeValue)}
                    size={15}
                    color={projectColor}
                  />

                  <Text
                    style={[styles.typeText, { color: theme.colors.secondary }]}
                    numberOfLines={1}
                  >
                    {typeValue}
                  </Text>
                </View>

                <View style={styles.chipsRow}>
                  <SmallInfoChip
                    label="Producción"
                    icon="server"
                    active={hasProductionData(credential)}
                    color={theme.colors.info}
                    softColor={theme.colors.infoSoft}
                    theme={theme}
                  />

                  <SmallInfoChip
                    label="Local"
                    icon="laptop"
                    active={hasLocalData(credential)}
                    color={theme.colors.warning}
                    softColor={theme.colors.warningSoft}
                    theme={theme}
                  />
                </View>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={25}
                color={theme.colors.secondary}
                style={styles.chevron}
              />
            </View>
          </View>
        </TouchableRipple>
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
            Credenciales
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Guardá mails, usuarios y contraseñas para mantenimiento local o
          producción.
        </Text>
      </View>

      <Button
        mode="contained"
        icon="plus"
        style={styles.createButton}
        contentStyle={styles.createButtonContent}
        labelStyle={styles.createButtonLabel}
        onPress={openCreateModal}
      >
        Nueva credencial
      </Button>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {TYPES.map((item) => {
          const selected = filterType === item;
          const color = item === "Todos" ? theme.colors.primary : theme.colors.info;
          const softColor =
            item === "Todos" ? theme.colors.primarySoft : theme.colors.infoSoft;

          return (
            <FilterChip
              key={item}
              label={item}
              icon={item === "Todos" ? "format-list-bulleted" : getTypeIcon(item)}
              selected={selected}
              color={color}
              softColor={softColor}
              theme={theme}
              onPress={() => setFilterType(item)}
            />
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : filteredCredentials.length === 0 ? (
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
                name="key-plus"
                size={26}
                color={theme.colors.primary}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Sin credenciales todavía
            </Text>

            <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
              Agregá accesos por proyecto para local y producción.
            </Text>

            <Button
              mode="contained"
              icon="plus"
              style={styles.emptyButton}
              onPress={openCreateModal}
            >
              Nueva credencial
            </Button>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>
          {filteredCredentials.map(renderCredentialCard)}
        </View>
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
                  {editingCredential ? "Editar credenciales" : "Nueva credencial"}
                </Text>

                <Text
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Cargá accesos para producción y local.
                </Text>
              </View>

              <IconButton
                icon="close"
                size={21}
                iconColor={theme.colors.secondary}
                style={styles.closeButton}
                onPress={() => {
                  resetForm();
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

              <FormSection title="Tipo" theme={theme} />

              <View style={styles.optionWrap}>
                {CREDENTIAL_TYPES.map((item) => {
                  const selected = type === item;

                  return (
                    <FilterChip
                      key={item}
                      label={item}
                      icon={getTypeIcon(item)}
                      selected={selected}
                      color={theme.colors.info}
                      softColor={theme.colors.infoSoft}
                      theme={theme}
                      onPress={() => setType(item)}
                    />
                  );
                })}
              </View>

              <CredentialFormSection
                title="Producción"
                icon="server"
                color={theme.colors.info}
                softColor={theme.colors.infoSoft}
                theme={theme}
              />

              <TextInput
                label="URL producción"
                value={productionUrl}
                onChangeText={setProductionUrl}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <TextInput
                label="Email / usuario producción"
                value={productionEmail}
                onChangeText={setProductionEmail}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <TextInput
                label="Contraseña producción"
                value={productionPassword}
                onChangeText={setProductionPassword}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <CredentialFormSection
                title="Local"
                icon="laptop"
                color={theme.colors.warning}
                softColor={theme.colors.warningSoft}
                theme={theme}
              />

              <TextInput
                label="Email / usuario local"
                value={localEmail}
                onChangeText={setLocalEmail}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <TextInput
                label="Contraseña local"
                value={localPassword}
                onChangeText={setLocalPassword}
                mode="outlined"
                autoCapitalize="none"
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
                icon={editingCredential ? "content-save-outline" : "plus"}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                labelStyle={styles.saveButtonLabel}
                onPress={handleSaveCredential}
              >
                {editingCredential ? "Guardar cambios" : "Guardar credencial"}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsVisible} animationType="slide" transparent>
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
                  Credenciales
                </Text>

                <Text
                  style={[styles.modalSubtitle, { color: theme.colors.secondary }]}
                >
                  Detalle de accesos guardados.
                </Text>
              </View>

              <IconButton
                icon="close"
                size={21}
                iconColor={theme.colors.secondary}
                style={styles.closeButton}
                onPress={() => {
                  setDetailsVisible(false);
                  setSelectedCredential(null);
                }}
              />
            </View>

            {selectedCredential && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View
                  style={[
                    styles.detailsHeader,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.borderSoft,
                    },
                  ]}
                >
                  <ProjectIcon item={selectedCredential} size={62} />

                  <View style={styles.cardInfo}>
                    <Text
                      style={[styles.projectName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {selectedCredential.projectName || "Proyecto sin nombre"}
                    </Text>

                    <View style={styles.typeRow}>
                      <MaterialCommunityIcons
                        name={getTypeIcon(selectedCredential.type || "General")}
                        size={15}
                        color={theme.colors.primary}
                      />

                      <Text
                        style={[
                          styles.typeText,
                          { color: theme.colors.secondary },
                        ]}
                      >
                        {selectedCredential.type || "General"}
                      </Text>
                    </View>
                  </View>
                </View>

                <CredentialBlock
                  title="Producción"
                  icon="server"
                  data={selectedCredential.production}
                  theme={theme}
                  onCopy={copyValue}
                  color={theme.colors.info}
                  softColor={theme.colors.infoSoft}
                />

                <CredentialBlock
                  title="Local"
                  icon="laptop"
                  data={selectedCredential.local}
                  theme={theme}
                  onCopy={copyValue}
                  color={theme.colors.warning}
                  softColor={theme.colors.warningSoft}
                  showUrl={false}
                />

                {!!selectedCredential.notes && (
                  <View
                    style={[
                      styles.notesCard,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderColor: theme.colors.borderSoft,
                      },
                    ]}
                  >
                    <View style={styles.blockHeader}>
                      <View
                        style={[
                          styles.blockIconBox,
                          { backgroundColor: theme.colors.primarySoft },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="note-text-outline"
                          size={18}
                          color={theme.colors.primary}
                        />
                      </View>

                      <Text
                        style={[styles.blockTitle, { color: theme.colors.text }]}
                      >
                        Notas
                      </Text>
                    </View>

                    <Text style={[styles.notesText, { color: theme.colors.secondary }]}>
                      {selectedCredential.notes}
                    </Text>
                  </View>
                )}

                <View style={styles.detailsActions}>
                  <Button
                    mode="contained"
                    icon="pencil-outline"
                    buttonColor={theme.colors.primary}
                    textColor="#FFFFFF"
                    style={styles.editActionButton}
                    contentStyle={styles.actionButtonContent}
                    labelStyle={styles.actionButtonLabel}
                    onPress={() => {
                      setDetailsVisible(false);
                      openEditModal(selectedCredential);
                    }}
                  >
                    Editar
                  </Button>

                  <Button
                    mode="contained-tonal"
                    icon="delete-outline"
                    textColor={theme.colors.danger}
                    buttonColor={theme.colors.dangerSoft}
                    style={styles.actionButton}
                    contentStyle={styles.actionButtonContent}
                    labelStyle={styles.actionButtonLabel}
                    onPress={() => openDeleteModal(selectedCredential)}
                  >
                    Eliminar
                  </Button>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <DeleteModal
        visible={deleteModalVisible}
        theme={theme}
        title="Eliminar credenciales"
        text="¿Seguro que querés eliminar estas credenciales? Esta acción no se puede deshacer."
        previewTitle={credentialToDelete?.projectName}
        previewSubtitle={credentialToDelete?.type || "General"}
        icon="key-remove"
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteCredential}
      />
    </ScrollView>
  );
}

function CredentialFormSection({ title, icon, color, softColor, theme }) {
  return (
    <View style={styles.formBlockHeader}>
      <View style={[styles.formBlockIcon, { backgroundColor: softColor }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>

      <Text style={[styles.formBlockTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
    </View>
  );
}

function CredentialBlock({
  title,
  icon,
  data,
  theme,
  onCopy,
  color,
  softColor,
  showUrl = true,
}) {
  return (
    <View
      style={[
        styles.infoCard,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <View style={styles.blockHeader}>
        <View style={[styles.blockIconBox, { backgroundColor: softColor }]}>
          <MaterialCommunityIcons name={icon} size={18} color={color} />
        </View>

        <Text style={[styles.blockTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
      </View>

      {showUrl && (
        <CopyRow label="URL" value={data?.url} theme={theme} onCopy={onCopy} />
      )}

      <CopyRow
        label="Email / usuario"
        value={data?.email}
        theme={theme}
        onCopy={onCopy}
      />

      <CopyRow
        label="Contraseña"
        value={data?.password}
        theme={theme}
        onCopy={onCopy}
      />
    </View>
  );
}

function CopyRow({ label, value, theme, onCopy }) {
  return (
    <View style={[styles.copyRow, { borderTopColor: theme.colors.borderSoft }]}>
      <View style={styles.copyInfo}>
        <Text style={[styles.copyLabel, { color: theme.colors.secondary }]}>
          {label}
        </Text>

        <Text
          style={[styles.copyValue, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {value || "Sin dato"}
        </Text>
      </View>

      <IconButton
        icon="content-copy"
        size={20}
        mode="contained-tonal"
        iconColor={theme.colors.primary}
        containerColor={theme.colors.primarySoft}
        style={styles.copyButton}
        onPress={() => onCopy(value, label)}
      />
    </View>
  );
}

function SmallInfoChip({ label, icon, active, color, softColor, theme }) {
  return (
    <View
      style={[
        styles.smallInfoChip,
        {
          backgroundColor: active ? softColor : theme.colors.surfaceSoft,
          borderColor: active ? softColor : theme.colors.borderSoft,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={13}
        color={active ? color : theme.colors.secondary}
      />

      <Text
        style={[
          styles.smallInfoChipText,
          {
            color: active ? color : theme.colors.secondary,
          },
        ]}
      >
        {label}
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

  credentialCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 0,
    overflow: "hidden",
  },

  cardContent: {
    padding: 14,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 24,
    fontWeight: "900",
  },

  cardInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },

  projectName: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
  },

  typeRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
  },

  typeText: {
    marginLeft: 5,
    fontSize: 12.5,
    fontWeight: "800",
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 9,
  },

  smallInfoChip: {
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  smallInfoChipText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "900",
  },

  chevron: {
    opacity: 0.75,
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

  formBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  formBlockIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  formBlockTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
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

  detailsHeader: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },

  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  blockIconBox: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  blockTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },

  copyInfo: {
    flex: 1,
    paddingRight: 8,
  },

  copyLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },

  copyValue: {
    fontSize: 14.5,
    fontWeight: "800",
  },

  copyButton: {
    margin: 0,
  },

  notesCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },

  notesText: {
    fontSize: 13,
    lineHeight: 19,
  },

  detailsActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
    marginBottom: 10,
  },

  editActionButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },

  actionButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 0,
  },

  actionButtonContent: {
    height: 46,
  },

  actionButtonLabel: {
    fontSize: 13.5,
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