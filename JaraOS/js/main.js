import { Storage } from "./services/storage.js";
import { JaraFS } from "./services/filesystem.js";
import { Accounts } from "./services/accounts.js";
import { Settings } from "./services/settings.js";
import { License } from "./services/license.js";
import { Updater } from "./services/updater.js";
import { WindowManager } from "./core/window-manager.js";
import { AppManager } from "./core/app-manager.js";
import { NotificationService } from "./core/notifications.js";
import { TaskbarController } from "./core/taskbar.js";
import { StartMenuController } from "./core/start-menu.js";
import { ContextMenuController } from "./core/context-menu.js";
import { DialogService } from "./core/dialogs.js";
import { DesktopController } from "./core/desktop.js";
import { SystemBootManager } from "./core/boot-manager.js";
import { SessionController } from "./core/session.js";
import { ExplorerApp } from "./apps/explorer.js";
import { TerminalApp } from "./apps/terminal.js";
import { NotesApp } from "./apps/notes.js";
import { SettingsApp } from "./apps/settings-app.js";

const boot = new SystemBootManager(
    document.getElementById("bootScreen"),
    document.getElementById("bootStatus")
);

let session;
let settingsApp;

async function initializeInterface() {
    const windowManager = new WindowManager().initialize();
    const appManager = new AppManager(windowManager);
    const notifications = new NotificationService(document.getElementById("notificationCenter"));
    const contextMenu = new ContextMenuController(document.getElementById("contextMenu")).initialize();
    const dialogs = new DialogService();

    const notes = new NotesApp({ fs: JaraFS, notifications }).initialize();
    const openFile = item => appManager.launch("notes", { fileId: item.id });
    const explorer = new ExplorerApp({ fs: JaraFS, dialogs, notifications, openFile }).initialize();

    settingsApp = new SettingsApp({
        settings: Settings,
        accounts: Accounts,
        license: License,
        updater: Updater,
        notifications,
        lock: () => session.lock()
    }).initialize();

    session = new SessionController({
        accounts: Accounts,
        openAccounts: () => settingsApp.openAccounts()
    }).initialize();

    const terminal = new TerminalApp({
        fs: JaraFS,
        accounts: Accounts,
        license: License,
        lock: () => session.lock()
    }).initialize();

    appManager.registerApp({
        id: "explorer",
        name: "Проводник",
        icon: "📁",
        singleton: true,
        launch: ({ options }) => explorer.launch(options),
        activate: ({ options }) => {
            if (options.folderId) explorer.openFolder(options.folderId, false);
        }
    });
    appManager.registerApp({
        id: "terminal",
        name: "Terminal",
        icon: "⌘",
        singleton: true,
        launch: () => terminal.launch()
    });
    appManager.registerApp({
        id: "notes",
        name: "Заметки",
        icon: "📝",
        singleton: true,
        launch: ({ options }) => {
            if (options.fileId) notes.openFile(JaraFS.getItem(options.fileId));
            else notes.openScratchpad();
            return notes.launch();
        },
        activate: ({ options }) => {
            if (options.fileId) notes.openFile(JaraFS.getItem(options.fileId));
        }
    });
    appManager.registerApp({
        id: "settings",
        name: "Параметры",
        icon: "⚙",
        singleton: true,
        launch: ({ options }) => settingsApp.launch(options),
        activate: ({ options }) => {
            if (options.tab) settingsApp.switchTab(options.tab);
        }
    });

    new TaskbarController(document.getElementById("taskApps"), appManager, windowManager).initialize();
    new StartMenuController({
        menu: document.getElementById("startMenu"),
        button: document.getElementById("startButton"),
        appsContainer: document.getElementById("startApps"),
        search: document.getElementById("appSearch"),
        appManager,
        onLock: () => session.lock()
    }).initialize();

    new DesktopController({
        container: document.getElementById("desktopIcons"),
        desktop: document.getElementById("desktop"),
        fs: JaraFS,
        appManager,
        contextMenu,
        dialogs,
        notifications,
        openItem: item => {
            if (item.type === "folder") appManager.launch("explorer", { folderId: item.id });
            else openFile(item);
        }
    }).initialize();

    Settings.apply();
    session.lock();

    globalThis.JaraOS = Object.freeze({
        version: "3.0",
        Storage,
        JaraFS,
        Accounts,
        Settings,
        License,
        Notifications: notifications,
        AppManager: appManager,
        WindowManager: windowManager,
        registerApp: definition => appManager.registerApp(definition),
        launchApp: (id, options) => appManager.launch(id, options)
    });
}

boot.run([
    { label: "Инициализация Storage…", run: () => Storage.initialize() },
    { label: "Инициализация JaraFS…", run: () => JaraFS.initialize() },
    { label: "Загрузка настроек…", run: () => Settings.initialize() },
    { label: "Загрузка JaraID…", run: () => Accounts.initialize() },
    { label: "Проверка лицензии…", run: () => License.initialize() },
    { label: "Запуск интерфейса…", run: () => initializeInterface() }
]).catch(error => {
    console.error("JaraOS boot failed", error);
});
