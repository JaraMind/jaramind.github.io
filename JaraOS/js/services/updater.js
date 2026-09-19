export const Updater = {
    async check() {
        return {
            currentVersion: "3.0",
            latestVersion: "3.0",
            updateAvailable: false,
            checkedAt: new Date().toISOString()
        };
    }
};
