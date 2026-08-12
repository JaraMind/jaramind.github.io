/* =====================================================
   JaraOS 2.0
===================================================== */

const $ = (selector) =>
    document.querySelector(selector);

const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


/* =====================================================
   DATA
===================================================== */

const STORAGE_KEY = "JARAOS_DATA";


const defaultState = {

    users: [
        {
            id: "local",
            name: "Jara",
            password: "1234"
        }
    ],

    currentUser: "local",

    license: false,

    accent: "#7864ff",

    wallpaper: "nebula",

    notes: "",

    folders: []

};


let state =
    JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    );


if (!state) {

    state =
        JSON.parse(
            JSON.stringify(defaultState)
        );

    save();

}


if (!state.users || state.users.length === 0) {

    state.users =
        JSON.parse(
            JSON.stringify(defaultState.users)
        );

}


let zIndex = 20;

let currentFolder = "desktop";

let folderHistory = [];


/* =====================================================
   STORAGE
===================================================== */

function save() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );

}


/* =====================================================
   CURRENT USER
===================================================== */

function getCurrentUser() {

    return (
        state.users.find(
            user =>
                user.id === state.currentUser
        )
        ||
        state.users[0]
    );

}


/* =====================================================
   WINDOWS
===================================================== */

function openWindow(id) {

    const window =
        document.getElementById(id);

    if (!window)
        return;

    window.classList.add("active");

    window.style.zIndex =
        ++zIndex;

    updateTaskbar();


    if (id === "terminal") {

        setTimeout(() => {

            $("#terminalInput").focus();

        }, 100);

    }


    if (id === "files") {

        renderFiles();

    }

}


function closeWindow(id) {

    const window =
        document.getElementById(id);

    window.classList.remove("active");

    window.classList.remove("maximized");

    updateTaskbar();

}


function minimizeWindow(id) {

    document
        .getElementById(id)
        .classList.remove("active");

    updateTaskbar();

}


function clearWindowLayoutClasses(win) {

    win.classList.remove(
        "maximized",
        "snap-left",
        "snap-right"
    );

}


function maximizeWindow(id) {

    const window =
        document.getElementById(id);

    const wasMaximized =
        window.classList.contains("maximized");

    clearWindowLayoutClasses(window);

    if (!wasMaximized) {

        window.classList.add("maximized");

    }

    window.style.zIndex =
        ++zIndex;

}


function snapWindow(id, side) {

    const window =
        document.getElementById(id);

    clearWindowLayoutClasses(window);

    window.classList.add(
        side === "left"
            ? "snap-left"
            : "snap-right"
    );

    window.style.zIndex =
        ++zIndex;

}


$$(".window-buttons button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const id =
                    button.dataset.window;

                const action =
                    button.dataset.action;


                if (action === "close")
                    closeWindow(id);

                if (action === "min")
                    minimizeWindow(id);

                if (action === "max")
                    maximizeWindow(id);

            }
        );

    });


$$(".window")
    .forEach(window => {

        window.addEventListener(
            "mousedown",
            () => {

                window.style.zIndex =
                    ++zIndex;

            }
        );

    });


/* =====================================================
   WINDOW RESIZE (drag bottom-right corner)
===================================================== */

$$(".window")
    .forEach(win => {

        const handle =
            document.createElement("div");

        handle.className =
            "resize-handle";

        win.appendChild(handle);


        handle.addEventListener(
            "mousedown",
            event => {

                event.preventDefault();
                event.stopPropagation();

                const startX = event.clientX;
                const startY = event.clientY;

                const startWidth = win.offsetWidth;
                const startHeight = win.offsetHeight;

                // Switch from centered transform to explicit left/top so
                // resizing doesn't fight the translate(-50%,-50%) centering.
                const rect = win.getBoundingClientRect();

                win.style.left = rect.left + "px";
                win.style.top = rect.top + "px";
                win.style.transform = "none";


                function onMove(moveEvent) {

                    const newWidth =
                        Math.max(360, startWidth + (moveEvent.clientX - startX));

                    const newHeight =
                        Math.max(240, startHeight + (moveEvent.clientY - startY));

                    win.style.width = newWidth + "px";
                    win.style.height = newHeight + "px";

                }


                function onUp() {

                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);

                }


                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);

            }
        );

    });


/* =====================================================
   SNAP LAYOUTS POPUP (hover the maximize button)
===================================================== */

const snapPopup =
    document.createElement("div");

snapPopup.className = "snap-popup";

snapPopup.innerHTML = `
    <button class="snap-option snap-left-opt" title="Слева"><i></i></button>
    <button class="snap-option snap-full-opt" title="Во весь экран"><i></i></button>
    <button class="snap-option snap-right-opt" title="Справа"><i></i></button>
`;

document.body.appendChild(snapPopup);


let snapTargetId = null;
let snapHideTimeout = null;


function hideSnapPopupSoon() {

    snapHideTimeout =
        setTimeout(
            () => snapPopup.classList.remove("open"),
            200
        );

}


$$('[data-action="max"]')
    .forEach(button => {

        button.addEventListener(
            "mouseenter",
            () => {

                clearTimeout(snapHideTimeout);

                snapTargetId =
                    button.dataset.window;

                const rect =
                    button.getBoundingClientRect();

                snapPopup.style.left =
                    (rect.left - 50) + "px";

                snapPopup.style.top =
                    (rect.bottom + 6) + "px";

                snapPopup.classList.add("open");

            }
        );

        button.addEventListener(
            "mouseleave",
            hideSnapPopupSoon
        );

    });


snapPopup.addEventListener(
    "mouseenter",
    () => clearTimeout(snapHideTimeout)
);

snapPopup.addEventListener(
    "mouseleave",
    hideSnapPopupSoon
);


snapPopup.querySelector(".snap-left-opt")
    .addEventListener("click", () => {

        if (snapTargetId)
            snapWindow(snapTargetId, "left");

        snapPopup.classList.remove("open");

    });


snapPopup.querySelector(".snap-right-opt")
    .addEventListener("click", () => {

        if (snapTargetId)
            snapWindow(snapTargetId, "right");

        snapPopup.classList.remove("open");

    });


snapPopup.querySelector(".snap-full-opt")
    .addEventListener("click", () => {

        if (snapTargetId)
            maximizeWindow(snapTargetId);

        snapPopup.classList.remove("open");

    });


/* =====================================================
   TASKBAR
===================================================== */

function updateTaskbar() {

    const container =
        $("#taskApps");

    container.innerHTML = "";


    const applications = [

        ["files", "📁"],

        ["terminal", "⌘"],

        ["notes", "📝"],

        ["settings", "⚙"]

    ];


    applications.forEach(
        ([id, icon]) => {

            const window =
                document.getElementById(id);


            if (!window.classList.contains("active"))
                return;


            const button =
                document.createElement("button");


            button.className =
                "task-app";

            button.textContent =
                icon;


            button.onclick = () => {

                window.classList.add("active");

                window.style.zIndex =
                    ++zIndex;

            };


            container.appendChild(button);

        }
    );

}


/* =====================================================
   START MENU
===================================================== */

$("#startButton")
    .addEventListener(
        "click",
        () => {

            $("#startMenu")
                .classList.toggle("open");

        }
    );


$$(".apps button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openWindow(
                    button.dataset.app
                );

                $("#startMenu")
                    .classList.remove("open");

            }
        );

    });


$("#lockFromMenu")
    .addEventListener(
        "click",
        () => {

            $("#startMenu")
                .classList.remove("open");

            lockOS();

        }
    );


document.addEventListener(
    "click",
    event => {

        const menu =
            $("#startMenu");

        const start =
            $("#startButton");


        if (
            menu.classList.contains("open")
            &&
            !menu.contains(event.target)
            &&
            !start.contains(event.target)
        ) {

            menu.classList.remove(
                "open"
            );

        }

    }
);


/* =====================================================
   CLOCK
===================================================== */

function updateClock() {

    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    $("#clock").textContent =
        time;

    $("#lockClock").textContent =
        time;

    const dateElement =
        $("#trayDate");

    if (dateElement) {

        dateElement.textContent =
            now.toLocaleDateString(
                "ru-RU",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

    }

    const lockDateElement =
        $("#lockDate");

    if (lockDateElement) {

        lockDateElement.textContent =
            now.toLocaleDateString(
                "ru-RU",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                }
            );

    }

}


updateClock();

setInterval(
    updateClock,
    1000
);


/* =====================================================
   LOCK SCREEN
===================================================== */

function lockOS() {

    $("#lockScreen")
        .style.display = "flex";


    $("#lockPassword")
        .value = "";


    $("#lockError")
        .textContent = "";


    const user =
        getCurrentUser();


    $("#lockTitle")
        .textContent =
        "Добро пожаловать, "
        + user.name;


    $("#lockAccount")
        .textContent =
        "JaraID · "
        + user.name;

}


function unlockOS() {

    const password =
        $("#lockPassword")
            .value;


    const user =
        getCurrentUser();


    if (
        password ===
        user.password
    ) {

        $("#lockScreen")
            .style.display = "none";


        $("#lockPassword")
            .value = "";


        $("#lockError")
            .textContent = "";

    }

    else {

        $("#lockError")
            .textContent =
            "Неверный пароль JaraOS";

    }

}


$("#unlockBtn")
    .addEventListener(
        "click",
        unlockOS
    );


$("#lockPassword")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                unlockOS();

            }

        }
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey
            &&
            event.altKey
            &&
            event.key.toLowerCase() === "l"
        ) {

            lockOS();

        }

    }
);


/* =====================================================
   CONTEXT MENU
===================================================== */

const contextMenu =
    $("#contextMenu");


function showContextMenu(
    x,
    y
) {

    contextMenu.style.left =
        Math.min(
            x,
            window.innerWidth - 230
        ) + "px";


    contextMenu.style.top =
        Math.min(
            y,
            window.innerHeight - 220
        ) + "px";


    contextMenu.classList.add(
        "open"
    );

}


function hideContextMenu() {

    contextMenu.classList.remove(
        "open"
    );

}


document.addEventListener(
    "contextmenu",
    event => {

        if (
            event.target.closest(
                ".window"
            )
            ||
            event.target.closest(
                ".taskbar"
            )
            ||
            event.target.closest(
                ".start-menu"
            )
        ) {

            return;

        }


        event.preventDefault();


        showContextMenu(
            event.clientX,
            event.clientY
        );

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                "#contextMenu"
            )
        ) {

            hideContextMenu();

        }

    }
);


contextMenu.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button)
            return;


        const action =
            button.dataset.action;


        if (
            action ===
            "new-folder"
        ) {

            createFolder(
                "desktop"
            );

        }


        if (
            action ===
            "refresh"
        ) {

            renderDesktop();

        }


        if (
            action ===
            "settings"
        ) {

            openWindow(
                "settings"
            );

        }


        if (
            action ===
            "personalize"
        ) {

            openWindow(
                "settings"
            );

            switchSettingsTab(
                "personalization"
            );

        }


        hideContextMenu();

    }
);


/* =====================================================
   FOLDERS
===================================================== */

function createFolder(
    parent
) {

    const name =
        prompt(
            "Введите название папки:",
            "Новая папка"
        );


    if (!name)
        return;


    const cleanName =
        name.trim();


    if (!cleanName)
        return;


    state.folders.push({

        id:
            "folder_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .slice(2),

        name:
            cleanName,

        parent:
            parent

    });


    save();

    renderDesktop();

    renderFiles();

}


function renderDesktop() {

    const container =
        $("#desktopIcons");


    container.innerHTML = "";


    const apps = [

        ["files", "📁", "Проводник"],

        ["terminal", "⌘", "Terminal"],

        ["notes", "📝", "Заметки"],

        ["settings", "⚙", "Параметры"]

    ];


    apps.forEach(
        app => {

            const icon =
                document.createElement(
                    "div"
                );


            icon.className =
                "desktop-icon";


            icon.innerHTML = `

                <div class="icon">
                    ${app[1]}
                </div>

                <span>
                    ${app[2]}
                </span>

            `;


            icon.addEventListener(
                "dblclick",
                () => {

                    openWindow(
                        app[0]
                    );

                }
            );


            container.appendChild(
                icon
            );

        }
    );


    state.folders
        .filter(
            folder =>
                folder.parent ===
                "desktop"
        )
        .forEach(
            folder => {

                const icon =
                    document.createElement(
                        "div"
                    );


                icon.className =
                    "desktop-icon";


                icon.innerHTML = `

                    <div class="icon">
                        📁
                    </div>

                    <span>
                        ${escapeHTML(
                            folder.name
                        )}
                    </span>

                `;


                icon.addEventListener(
                    "dblclick",
                    () => {

                        folderHistory = [];

                        currentFolder =
                            folder.id;

                        openWindow(
                            "files"
                        );

                        renderFiles();

                    }
                );


                container.appendChild(
                    icon
                );

            }
        );

}


/* =====================================================
   FILE EXPLORER
===================================================== */

function renderFiles() {

    const grid =
        $("#fileGrid");


    grid.innerHTML = "";


    const folders =
        state.folders.filter(
            folder =>
                folder.parent ===
                currentFolder
        );


    folders.forEach(
        folder => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "file";


            element.innerHTML = `

                <div>
                    📁
                </div>

                <span>
                    ${escapeHTML(
                        folder.name
                    )}
                </span>

            `;


            element.addEventListener(
                "dblclick",
                () => {

                    folderHistory.push(
                        currentFolder
                    );

                    currentFolder =
                        folder.id;

                    renderFiles();

                }
            );


            grid.appendChild(
                element
            );

        }
    );


    $("#currentPath")
        .textContent =
        currentFolder === "desktop"
            ? "Рабочий стол"
            : getFolderPath(
                currentFolder
            );

}


function getFolderPath(id) {

    const folder =
        state.folders.find(
            f => f.id === id
        );


    if (!folder)
        return "Рабочий стол";


    return "📁 " + folder.name;

}


$("#backFolder")
    .addEventListener(
        "click",
        () => {

            if (
                folderHistory.length
            ) {

                currentFolder =
                    folderHistory.pop();

            }

            else {

                currentFolder =
                    "desktop";

            }


            renderFiles();

        }
    );


$("#newFolderExplorer")
    .addEventListener(
        "click",
        () => {

            createFolder(
                currentFolder
            );

        }
    );


/* =====================================================
   SETTINGS
===================================================== */

function switchSettingsTab(
    tab
) {

    $$(".setting-tab")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.tab ===
                    tab
                );

            }
        );


    $$(".setting-page")
        .forEach(
            page => {

                page.classList.toggle(
                    "active",
                    page.id ===
                    "tab-" + tab
                );

            }
        );

}


$$(".setting-tab")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    switchSettingsTab(
                        button.dataset.tab
                    );

                }
            );

        }
    );


/* =====================================================
   PERSONALIZATION
===================================================== */

function applyTheme() {

    document.documentElement
        .style
        .setProperty(
            "--accent",
            state.accent
        );


    const wallpaper =
        $(".wallpaper");


    wallpaper.className =
        "wallpaper";


    if (
        state.wallpaper ===
        "blue"
    ) {

        wallpaper.classList.add(
            "blue"
        );

    }


    if (
        state.wallpaper ===
        "purple"
    ) {

        wallpaper.classList.add(
            "purple"
        );

    }

}


$("#accentPicker")
    .addEventListener(
        "input",
        event => {

            state.accent =
                event.target.value;

            save();

            applyTheme();

        }
    );


$("#wallpaperSelect")
    .addEventListener(
        "change",
        event => {

            state.wallpaper =
                event.target.value;

            save();

            applyTheme();

        }
    );


/* =====================================================
   JARA ID
===================================================== */

function renderJaraID() {

    const user =
        getCurrentUser();


    $("#jaraIdPanel")
        .innerHTML = `

            <div class="info-card">

                <b>
                    👤
                    ${escapeHTML(
                        user.name
                    )}
                </b>

                <span>
                    JaraID:
                    ${escapeHTML(
                        user.id
                    )}
                </span>

                <span>
                    Статус:
                    LOCAL ACCOUNT
                </span>

            </div>

            <button
                id="manageAccounts"
                class="secondary"
            >
                Управление аккаунтами
            </button>

        `;


    $("#manageAccounts")
        .addEventListener(
            "click",
            () => {

                $("#accountModal")
                    .classList.remove(
                        "hidden"
                    );

                renderAccounts();

            }
        );

}


/* =====================================================
   ACCOUNT MODAL
===================================================== */

function renderAccounts() {

    const list =
        $("#accountList");


    list.innerHTML =
        "<h3>Аккаунты</h3>";


    state.users.forEach(
        user => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "account-item";


            item.innerHTML = `

                <span>
                    👤
                    ${escapeHTML(
                        user.name
                    )}
                </span>

                <button>
                    Войти
                </button>

            `;


            item
                .querySelector("button")
                .addEventListener(
                    "click",
                    () => {

                        state.currentUser =
                            user.id;

                        save();

                        $("#accountModal")
                            .classList.add(
                                "hidden"
                            );

                        renderUI();

                        lockOS();

                    }
                );


            list.appendChild(
                item
            );

        }
    );

}


$("#switchAccountBtn")
    .addEventListener(
        "click",
        () => {

            $("#accountModal")
                .classList.remove(
                    "hidden"
                );

            renderAccounts();

        }
    );


$("#closeAccountModal")
    .addEventListener(
        "click",
        () => {

            $("#accountModal")
                .classList.add(
                    "hidden"
                );

        }
    );


$("#createAccount")
    .addEventListener(
        "click",
        () => {

            const name =
                $("#accountName")
                    .value
                    .trim();


            const password =
                $("#accountPass")
                    .value;


            if (
                !name ||
                !password
            ) {

                alert(
                    "Введите имя и пароль."
                );

                return;

            }


            const user = {

                id:
                    "jaraid_" +
                    Date.now(),

                name:
                    name,

                password:
                    password

            };


            state.users.push(
                user
            );


            state.currentUser =
                user.id;


            save();

            renderAccounts();

            renderUI();

            $("#accountName")
                .value = "";

            $("#accountPass")
                .value = "";

        }
    );


/* =====================================================
   SYSTEM
===================================================== */

$("#lockNow")
    .addEventListener(
        "click",
        lockOS
    );


$("#checkUpdates")
    .addEventListener(
        "click",
        () => {

            const status =
                $("#updateStatus");


            status.textContent =
                "Проверяем сервер JaraOS...";


            setTimeout(
                () => {

                    status.textContent =
                        "Установлена последняя версия.";

                },
                1500
            );

        }
    );


/* =====================================================
   LICENSE
===================================================== */

// Тот же алгоритм, что и в keygen.py (JARAOS_KEY_CHARSET/checksumBlock),
// перенесённый на JS, чтобы ключи со страницы магазина принимались тут.
const JARAOS_KEY_CHARSET =
    "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const JARAOS_KEY_PREFIX = "JARA";
const JARAOS_KEY_BLOCK_LENGTH = 4;
const JARAOS_KEY_CHECKSUM_LENGTH = 4;


function jaraosChecksumBlock(payload, charset, length) {

    const charsetLength =
        charset.length;

    const modulus =
        Math.pow(charsetLength, length);

    let checksum = 0;

    for (let i = 0; i < payload.length; i++) {

        checksum =
            (checksum + payload.charCodeAt(i) * (i + 1)) % modulus;

    }


    const result = [];

    for (let i = 0; i < length; i++) {

        result.push(
            charset[checksum % charsetLength]
        );

        checksum =
            Math.floor(checksum / charsetLength);

    }


    return result.reverse().join("");

}


function validateJaraosKey(rawKey) {

    const parts =
        rawKey.trim().toUpperCase().split("-");

    if (parts[0] !== JARAOS_KEY_PREFIX)
        return false;

    const blockParts = parts.slice(1);

    if (blockParts.length < 2)
        return false;


    const checksum =
        blockParts[blockParts.length - 1];

    const randomBlocks =
        blockParts.slice(0, -1);


    if (
        randomBlocks.some(
            block => block.length !== JARAOS_KEY_BLOCK_LENGTH
        )
    )
        return false;

    if (checksum.length !== JARAOS_KEY_CHECKSUM_LENGTH)
        return false;


    const payload =
        randomBlocks.join("");

    for (const ch of payload + checksum) {

        if (!JARAOS_KEY_CHARSET.includes(ch))
            return false;

    }


    const expected =
        jaraosChecksumBlock(
            payload,
            JARAOS_KEY_CHARSET,
            JARAOS_KEY_CHECKSUM_LENGTH
        );

    return checksum === expected;

}


function updateLicenseUI() {

    $("#licenseStatus")
        .textContent =
        state.license
            ? "✓ JaraOS АКТИВИРОВАНА"
            : "○ JaraOS работает в DEMO-режиме";


    $("#systemLicense")
        .textContent =
        "Лицензия: " +
        (
            state.license
                ? "АКТИВИРОВАНА"
                : "НЕ АКТИВИРОВАНА"
        );

}


$("#activateLicense")
    .addEventListener(
        "click",
        activateLicense
    );


$("#licenseInput")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                activateLicense();

            }

        }
    );


function activateLicense() {

    const key =
        $("#licenseInput")
            .value
            .trim();


    const isValid =
        key === "JARA-2026-DEMO-ACCESS"
        ||
        validateJaraosKey(key);


    if (isValid) {

        state.license =
            true;

        save();

        updateLicenseUI();

        alert(
            "Лицензия JaraOS успешно активирована!"
        );

    }

    else {

        alert(
            "Неверный лицензионный ключ."
        );

    }

}


/* =====================================================
   TERMINAL
===================================================== */

const terminalInput =
    $("#terminalInput");


const terminalOutput =
    $("#terminalOutput");


function terminalPrint(
    text
) {

    const line =
        document.createElement(
            "div"
        );


    line.innerHTML =
        text;


    terminalOutput.insertBefore(
        line,
        terminalOutput.querySelector(
            ".terminal-line"
        )
    );

}


terminalInput
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Enter"
            )
                return;


            const command =
                terminalInput
                    .value
                    .trim();


            terminalInput.value =
                "";


            if (!command)
                return;


            terminalPrint(
                `
                <span style="color:#6aff9a">
                    jara@JaraOS:~$
                </span>
                ${escapeHTML(
                    command
                )}
                `
            );


            executeCommand(
                command
            );

        }
    );


function executeCommand(
    command
) {

    const parts =
        command.split(" ");

    const cmd =
        parts[0].toLowerCase();


    switch (cmd) {


        case "help":

            terminalPrint(
                "help — список команд"
            );

            terminalPrint(
                "clear — очистить терминал"
            );

            terminalPrint(
                "time — текущее время"
            );

            terminalPrint(
                "whoami — текущий JaraID"
            );

            terminalPrint(
                "neofetch — информация о JaraOS"
            );

            terminalPrint(
                "lock — заблокировать систему"
            );

            terminalPrint(
                "license — состояние лицензии"
            );

            terminalPrint(
                "mkdir — создать папку"
            );

            break;


        case "clear":

            terminalOutput
                .querySelectorAll(
                    "div"
                )
                .forEach(
                    element => {

                        if (
                            !element.classList
                                .contains(
                                    "terminal-line"
                                )
                        ) {

                            element.remove();

                        }

                    }
                );

            break;


        case "time":

            terminalPrint(
                new Date()
                    .toLocaleTimeString()
            );

            break;


        case "whoami":

            terminalPrint(
                "JaraID: " +
                escapeHTML(
                    getCurrentUser()
                        .name
                )
            );

            break;


        case "lock":

            lockOS();

            break;


        case "license":

            terminalPrint(
                state.license
                    ? "LICENSE: VALID"
                    : "LICENSE: DEMO"
            );

            break;


        case "mkdir":

            createFolder(
                currentFolder
            );

            break;


        case "neofetch":

            terminalPrint(
                "███████╗ JaraOS"
            );

            terminalPrint(
                "Version: 2.0"
            );

            terminalPrint(
                "Kernel: JaraCore"
            );

            terminalPrint(
                "JaraID: " +
                escapeHTML(
                    getCurrentUser()
                        .name
                )
            );

            terminalPrint(
                "License: " +
                (
                    state.license
                        ? "ACTIVE"
                        : "DEMO"
                )
            );

            break;


        default:

            terminalPrint(
                "Команда не найдена."
            );

            terminalPrint(
                "Введите help."
            );

    }

}


/* =====================================================
   NOTES
===================================================== */

$("#notesArea")
    .value =
    state.notes || "";


$("#notesArea")
    .addEventListener(
        "input",
        event => {

            state.notes =
                event.target.value;

            save();

        }
    );


/* =====================================================
   SEARCH
===================================================== */

$("#appSearch")
    .addEventListener(
        "input",
        event => {

            const search =
                event.target.value
                    .toLowerCase();


            $$(".apps button")
                .forEach(
                    button => {

                        button.style.display =
                            button.textContent
                                .toLowerCase()
                                .includes(
                                    search
                                )
                                ? "flex"
                                : "none";

                    }
                );

        }
    );


/* =====================================================
   SYSTEM INFO
===================================================== */

function renderUI() {

    const user =
        getCurrentUser();


    $("#startUser")
        .textContent =
        "JaraID · " +
        user.name;


    $("#systemUser")
        .textContent =
        "JaraID: " +
        user.name;


    renderJaraID();

    updateLicenseUI();

    renderDesktop();

    renderFiles();

}


function escapeHTML(
    text
) {

    return String(text)
        .replace(
            /[&<>"']/g,
            char =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[char]
        );

}


/* =====================================================
   STARTUP
===================================================== */

applyTheme();

$("#accentPicker")
    .value =
    state.accent;

$("#wallpaperSelect")
    .value =
    state.wallpaper;

renderUI();

lockOS();