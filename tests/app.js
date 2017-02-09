import pluggable from '../src/pluggable';

const app = {};

function initialize (whitelist=[], blacklist=[]) {
    app.pluginSocket.initializePlugins({}, whitelist, blacklist);
}

function registerPlugin (name, plugin) {
    app.pluginSocket.registerPlugin(name, plugin);
}

function getPluginSocket () {
    // Normally this wouldn't be exposed, but we do so here for testing
    // purposes.
    return app.pluginSocket;
}

// Calling `pluggable.enable` on the private `app` object, will make it
// pluggable. Additionally, it will get the `pluginSocket` attribute, which
// refers to the object that the plugins get plugged into.
function makePluggable () {
    pluggable.enable(app);
}

export {
    initialize,
    registerPlugin,
    getPluginSocket,
    makePluggable
};
