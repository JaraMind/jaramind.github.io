// Compatibility entry point for file:// and HTTP launches.
// The maintainable source remains split into modules under /js.
(function loadJaraCoreBundle() {
    var bundle = document.createElement("script");
    bundle.src = "dist/jaraos.js";
    bundle.async = false;
    bundle.onerror = function showBootError() {
        var status = document.getElementById("bootStatus");
        if (status) status.textContent = "Не удалось загрузить JaraCore";
    };
    document.head.appendChild(bundle);
})();
