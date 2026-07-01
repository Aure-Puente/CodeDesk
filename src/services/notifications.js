//Importaciones:
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

//JS:
const TASK_REMINDER_IDENTIFIER = "codedesk-task-reminder";
const TASK_REMINDER_CHANNEL_ID = "task-reminders";
const MINIMUM_SAFE_MINUTES = 2;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
    });

    export async function prepareNotifications() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL_ID, {
        name: "Recordatorios de tareas",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
        });
    }

    const currentPermissions = await Notifications.getPermissionsAsync();

    let finalStatus = currentPermissions.status;

    if (currentPermissions.status !== "granted") {
        const requestedPermissions = await Notifications.requestPermissionsAsync();
        finalStatus = requestedPermissions.status;
    }

    return finalStatus === "granted";
    }

    export async function cancelTaskReminderNotification() {
    const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

    const taskReminderNotifications = scheduledNotifications.filter(
        (notification) =>
        notification.content?.data?.identifier === TASK_REMINDER_IDENTIFIER
    );

    await Promise.all(
        taskReminderNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
        )
    );
    }

    function getNextReminderDate({ hour, minute }) {
    const now = new Date();

    const reminderDate = new Date();
    reminderDate.setHours(hour);
    reminderDate.setMinutes(minute);
    reminderDate.setSeconds(0);
    reminderDate.setMilliseconds(0);

    const minimumSafeDate = new Date(
        now.getTime() + MINIMUM_SAFE_MINUTES * 60 * 1000
    );

    if (reminderDate <= minimumSafeDate) {
        reminderDate.setDate(reminderDate.getDate() + 1);
    }

    return reminderDate;
    }

    export async function scheduleTaskReminderNotification({
    task,
    hour,
    minute,
    }) {
    await cancelTaskReminderNotification();

    if (!task?.title) {
        return null;
    }

    const hasPermission = await prepareNotifications();

    if (!hasPermission) {
        return null;
    }

    const taskTitle = task.title?.trim() || "Tarea pendiente";
    const projectName = task.projectName?.trim() || "Tarea personal";
    const reminderDate = getNextReminderDate({ hour, minute });

    return Notifications.scheduleNotificationAsync({
        content: {
        title: "Tenés una tarea pendiente",
        body: `${taskTitle} · Proyecto: ${projectName}`,
        sound: "default",
        data: {
            identifier: TASK_REMINDER_IDENTIFIER,
            taskId: task.id,
            projectId: task.projectId || null,
            reminderDate: reminderDate.toISOString(),
        },
        },
        trigger: {
        date: reminderDate,
        channelId: TASK_REMINDER_CHANNEL_ID,
        },
    });
}