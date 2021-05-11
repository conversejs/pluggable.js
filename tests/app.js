const app = {};

import pluggable from '../dist/pluggable-with-lodash.js';

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

function getClosuredApp () {
    // Normally this wouldn't be exposed, but we do so here for testing
    // purposes.
    return app;
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
    getClosuredApp,
    getPluginSocket,
    makePluggable
};
