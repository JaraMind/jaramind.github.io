import { Storage } from "./storage.js";

const FILESYSTEM_KEY = "filesystem";
const PROTECTED_IDS = new Set(["root", "desktop", "documents", "downloads", "pictures"]);

function copy(value) {
    return value ? JSON.parse(JSON.stringify(value)) : value;
}

function now() {
    return new Date().toISOString();
}

function makeId(prefix) {
    if (globalThis.crypto?.randomUUID) return prefix + "_" + crypto.randomUUID();
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2);
}

function cleanName(name) {
    const result = String(name || "").trim();
    if (!result || result === "." || result === ".." || /[\\/]/.test(result)) {
        throw new Error("Недопустимое имя");
    }
    return result;
}

function initialData() {
    const timestamp = now();
    return {
        version: 1,
        rootId: "root",
        nodes: {
            root: { id: "root", name: "", type: "folder", children: ["desktop", "documents", "downloads", "pictures"], createdAt: timestamp, modifiedAt: timestamp },
            desktop: { id: "desktop", name: "Desktop", type: "folder", parentId: "root", children: [], createdAt: timestamp, modifiedAt: timestamp },
            documents: { id: "documents", name: "Documents", type: "folder", parentId: "root", children: [], createdAt: timestamp, modifiedAt: timestamp },
            downloads: { id: "downloads", name: "Downloads", type: "folder", parentId: "root", children: [], createdAt: timestamp, modifiedAt: timestamp },
            pictures: { id: "pictures", name: "Pictures", type: "folder", parentId: "root", children: [], createdAt: timestamp, modifiedAt: timestamp }
        }
    };
}

class JaraFileSystem extends EventTarget {
    constructor() {
        super();
        this.data = null;
    }

    initialize() {
        if (this.data) return this;
        this.data = Storage.get(FILESYSTEM_KEY, null);
        if (!this.isValid(this.data)) {
            this.data = initialData();
            this.importLegacyFolders(Storage.get("migration.legacyFolders", []));
            this.persist("initialize");
        }
        return this;
    }

    isValid(data) {
        return Boolean(data && data.nodes && data.nodes.root && data.nodes.desktop);
    }

    importLegacyFolders(folders) {
        if (!Array.isArray(folders) || folders.length === 0) return;
        let pending = folders.map(item => ({ ...item }));
        let guard = pending.length + 1;

        while (pending.length && guard > 0) {
            const next = [];
            let imported = 0;
            pending.forEach(folder => {
                const requestedParent = folder.parent === "desktop" ? "desktop" : folder.parent;
                const parent = this.data.nodes[requestedParent];
                if (!parent || parent.type !== "folder") {
                    next.push(folder);
                    return;
                }

                const id = this.data.nodes[folder.id] ? makeId("folder") : (folder.id || makeId("folder"));
                const timestamp = now();
                this.data.nodes[id] = {
                    id,
                    name: String(folder.name || "Папка"),
                    type: "folder",
                    parentId: parent.id,
                    children: [],
                    createdAt: timestamp,
                    modifiedAt: timestamp
                };
                parent.children.push(id);
                imported += 1;
            });
            if (!imported) break;
            pending = next;
            guard -= 1;
        }

        pending.forEach(folder => {
            const id = this.data.nodes[folder.id] ? makeId("folder") : (folder.id || makeId("folder"));
            const timestamp = now();
            this.data.nodes[id] = {
                id,
                name: String(folder.name || "Папка"),
                type: "folder",
                parentId: "desktop",
                children: [],
                createdAt: timestamp,
                modifiedAt: timestamp
            };
            this.data.nodes.desktop.children.push(id);
        });
    }

    persist(action, itemId = null) {
        Storage.set(FILESYSTEM_KEY, this.data);
        this.dispatchEvent(new CustomEvent("change", { detail: { action, itemId } }));
    }

    requireItem(id) {
        const item = this.data?.nodes[id];
        if (!item) throw new Error("Объект не найден: " + id);
        return item;
    }

    requireFolder(id) {
        const folder = this.requireItem(id);
        if (folder.type !== "folder") throw new Error("Указанный путь не является папкой");
        return folder;
    }

    ensureUnique(parent, name, ignoreId = null) {
        const duplicate = parent.children
            .map(id => this.data.nodes[id])
            .find(item => item && item.id !== ignoreId && item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        if (duplicate) throw new Error("Объект с таким именем уже существует");
    }

    createFolder(parentId, name) {
        return this.createItem(parentId, name, "folder");
    }

    createFile(parentId, name, content = "") {
        return this.createItem(parentId, name, "file", content);
    }

    createItem(parentId, name, type, content = "") {
        const parent = this.requireFolder(parentId);
        const validName = cleanName(name);
        this.ensureUnique(parent, validName);
        const timestamp = now();
        const id = makeId(type);
        const item = {
            id,
            name: validName,
            type,
            parentId,
            createdAt: timestamp,
            modifiedAt: timestamp
        };

        if (type === "folder") item.children = [];
        if (type === "file") {
            const dot = validName.lastIndexOf(".");
            item.extension = dot > 0 ? validName.slice(dot + 1).toLocaleLowerCase() : "";
            item.content = String(content);
        }

        this.data.nodes[id] = item;
        parent.children.push(id);
        parent.modifiedAt = timestamp;
        this.persist("create", id);
        return copy(item);
    }

    deleteItem(id) {
        if (PROTECTED_IDS.has(id)) throw new Error("Системную папку удалить нельзя");
        const item = this.requireItem(id);
        const parent = this.requireFolder(item.parentId);
        const removeTree = itemId => {
            const node = this.data.nodes[itemId];
            if (node?.type === "folder") [...node.children].forEach(removeTree);
            delete this.data.nodes[itemId];
        };
        removeTree(id);
        parent.children = parent.children.filter(childId => childId !== id);
        parent.modifiedAt = now();
        this.persist("delete", id);
        return true;
    }

    renameItem(id, name) {
        if (PROTECTED_IDS.has(id)) throw new Error("Системную папку переименовать нельзя");
        const item = this.requireItem(id);
        const parent = this.requireFolder(item.parentId);
        const validName = cleanName(name);
        this.ensureUnique(parent, validName, id);
        item.name = validName;
        if (item.type === "file") {
            const dot = validName.lastIndexOf(".");
            item.extension = dot > 0 ? validName.slice(dot + 1).toLocaleLowerCase() : "";
        }
        item.modifiedAt = now();
        this.persist("rename", id);
        return copy(item);
    }

    moveItem(id, targetFolderId) {
        if (PROTECTED_IDS.has(id)) throw new Error("Системную папку переместить нельзя");
        const item = this.requireItem(id);
        const source = this.requireFolder(item.parentId);
        const target = this.requireFolder(targetFolderId);
        if (id === targetFolderId || (item.type === "folder" && this.isDescendant(targetFolderId, id))) {
            throw new Error("Папку нельзя переместить внутрь самой себя");
        }
        this.ensureUnique(target, item.name);
        source.children = source.children.filter(childId => childId !== id);
        target.children.push(id);
        item.parentId = targetFolderId;
        item.modifiedAt = now();
        source.modifiedAt = item.modifiedAt;
        target.modifiedAt = item.modifiedAt;
        this.persist("move", id);
        return copy(item);
    }

    isDescendant(id, possibleAncestorId) {
        let current = this.data.nodes[id];
        while (current?.parentId) {
            if (current.parentId === possibleAncestorId) return true;
            current = this.data.nodes[current.parentId];
        }
        return false;
    }

    getItem(id) {
        return copy(this.data?.nodes[id] || null);
    }

    getChildren(folderId) {
        const folder = this.requireFolder(folderId);
        return folder.children.map(id => copy(this.data.nodes[id])).filter(Boolean);
    }

    readFile(id) {
        const file = this.requireItem(id);
        if (file.type !== "file") throw new Error("Указанный объект не является файлом");
        return file.content;
    }

    writeFile(id, content) {
        const file = this.requireItem(id);
        if (file.type !== "file") throw new Error("Указанный объект не является файлом");
        file.content = String(content);
        file.modifiedAt = now();
        this.persist("write", id);
        return copy(file);
    }

    findChild(folderId, name) {
        return this.getChildren(folderId).find(item => item.name.toLocaleLowerCase() === String(name).toLocaleLowerCase()) || null;
    }

    resolvePath(path, cwdId = "desktop") {
        const input = String(path || "").trim();
        if (!input || input === ".") return this.getItem(cwdId);
        let current = input.startsWith("/") ? this.requireFolder("root") : this.requireFolder(cwdId);
        const parts = input.split("/").filter(Boolean);

        for (const part of parts) {
            if (part === ".") continue;
            if (part === "..") {
                current = current.parentId ? this.requireFolder(current.parentId) : current;
                continue;
            }
            if (current.type !== "folder") return null;
            const child = current.children
                .map(id => this.data.nodes[id])
                .find(item => item && item.name.toLocaleLowerCase() === part.toLocaleLowerCase());
            if (!child) return null;
            current = child;
        }
        return copy(current);
    }

    getPath(id) {
        let item = this.requireItem(id);
        if (item.id === "root") return "/";
        const names = [];
        while (item && item.id !== "root") {
            names.unshift(item.name);
            item = this.data.nodes[item.parentId];
        }
        return "/" + names.join("/");
    }
}

export const JaraFS = new JaraFileSystem();
