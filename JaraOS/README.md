# JaraOS 3.0

JaraOS — браузерная desktop-like оболочка на чистых HTML, CSS и JavaScript. Версия 3.0 сохраняет интерфейс и функции JaraOS 2.0, но переносит системную логику из монолитного `script.js` в небольшое платформенное ядро.

Проект не использует React, Vue, Electron или серверный backend. Все данные остаются локальными в браузере.

> JaraID — локальная система профилей JaraOS. Пароли и остальные данные находятся в хранилище браузера и не являются безопасной сетевой авторизацией.

## Запуск

Готовую версию можно открыть двойным кликом по `index.html`: browser bundle в `dist/` поддерживает запуск через `file://`.

Для разработки также можно использовать локальный HTTP-сервер:

```bash
python -m http.server 8000
```

Откройте `http://localhost:8000`. Тестовый пароль исходного профиля Jara — `1234`.

После изменения файлов в `js/` пересоберите браузерные bundle-файлы:

```bash
node tools/build-bundles.mjs
```

`dist/jaraos.js` и `dist/store.js` являются генерируемыми файлами совместимости. Архитектурные исходники остаются разделёнными в `js/core`, `js/services` и `js/apps`.

## Архитектура

```text
index.html / style.css
        ↓
js/main.js                 boot и сборка системы
        ↓
js/core/                   App Manager, Window Manager, desktop, taskbar, session
        ↓
js/services/               Storage, JaraFS, Accounts, Settings, License, Updater
        ↓
js/apps/                   Explorer, Terminal, Notes, Settings, Store
```

### Core

- `app-manager.js` — реестр приложений, запуск, singleton и экземпляры.
- `window-manager.js` — жизненный цикл окон, focus/z-index, drag, resize, minimize, maximize, Snap Left/Right и восстановление.
- `desktop.js` — ярлыки приложений и содержимое `JaraFS/Desktop`.
- `taskbar.js` и `start-menu.js` — динамически строятся из App Manager.
- `context-menu.js`, `notifications.js`, `session.js`, `boot-manager.js` — общие системные контроллеры.

### Services

- `storage.js` — единственная точка доступа к `localStorage`, версия данных `jaraos.storage.version`.
- `filesystem.js` — JaraFS с папками и файлами.
- `accounts.js` — локальные профили JaraID отдельно от UI.
- `settings.js` — тема, акцент, обои, системные и пользовательские настройки.
- `license.js` — совместимая проверка старых и Store-ключей.
- `updater.js` — интерфейс центра обновлений.

### Apps

- Explorer использует только JaraFS и поддерживает навигацию, создание, переименование и удаление.
- Terminal работает с той же JaraFS: `pwd`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `echo`, `rm`.
- Notes сохраняет прежний блокнот и умеет открывать текстовые файлы JaraFS.
- Settings управляет Settings, Accounts и License Services.
- Store сохраняет историю ключей через Storage Service.

## Регистрация приложения

После загрузки доступен публичный фасад `window.JaraOS`:

```js
const element = document.getElementById("my-app-window");

JaraOS.registerApp({
    id: "my-app",
    name: "Моё приложение",
    icon: "🚀",
    singleton: true,
    launch() {
        return { element, persistent: true };
    }
});

JaraOS.launchApp("my-app");
```

Для `singleton: false` функция `launch()` должна возвращать новый DOM-элемент окна при каждом запуске. App Manager зарегистрирует отдельный экземпляр и добавит его на панель задач.

## JaraFS

Стандартные папки имеют идентификаторы `desktop`, `documents`, `downloads`, `pictures`.

```js
const file = JaraOS.JaraFS.createFile("documents", "hello.txt", "Hello JaraOS");
JaraOS.JaraFS.readFile(file.id);
JaraOS.JaraFS.writeFile(file.id, "Updated");
JaraOS.JaraFS.renameItem(file.id, "welcome.txt");
JaraOS.JaraFS.moveItem(file.id, "desktop");
JaraOS.JaraFS.getChildren("desktop");
JaraOS.JaraFS.deleteItem(file.id);
```

Также доступны `createFolder()`, `getItem()`, `resolvePath()` и `getPath()`. Событие `change` позволяет приложениям сразу обновлять интерфейс.

## Уведомления

```js
JaraOS.Notifications.show({
    title: "Готово",
    message: "Файл сохранён",
    icon: "✓",
    timeout: 3000
});
```

## Совместимость и миграция

При первом старте JaraOS 3.0 читает прежний `JARAOS_DATA` и переносит:

- JaraID и выбранного пользователя;
- акцент, обои и настройки;
- заметки;
- статус лицензии;
- старые папки рабочего стола.

Старый ключ не удаляется. История `JARAOS_STORE_KEYS` также переносится. Новые данные имеют префикс `jaraos.` и проходят только через Storage Service.

## Ограничения

JaraOS остаётся локальной браузерной системой. JaraID и клиентская лицензия подходят для демонстрации интерфейса, но не обеспечивают серверную безопасность. Terminal выполняет только виртуальные команды JaraFS и не имеет доступа к ОС пользователя.

## Лицензия

См. [LICENSE](./LICENSE).
