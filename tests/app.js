import pluggable from '../src/pluggable';

const app = {
    // A private method, not available outside the scope of this app.
    _showNotification: function (text) {
        /* Displays a notification message */
        var el = document.createElement('p');
        el.setAttribute('class', 'notification');
        el.appendChild(document.createTextNode(text));
        el = document.getElementById('notifications').appendChild(el);
        setTimeout(_.partial(app._fadeOut, el), 3000);
        return el;
    },

    // Another private method, not available outside the scope of this app.
    _fadeOut: function (el) {
        /* Fades out the passed in DOM element. */
        el.style.opacity = 1;
        (function fade() {
            if ((el.style.opacity -= 0.1) < 0) {
                el.remove();
            } else {
                setTimeout(fade, 25);
            }
        })();
    }
};

// Initialize this app.
// -----------------------
// This will be a public method.
function initialize (whitelist=[], blacklist=[]) {
    app.pluginSocket.initializePlugins({}, whitelist, blacklist);
}

// Register a plugin for this app.
// ----------------------------------
// This is a wrapper method which defers to the `registerPlugin` method
// of pluggable.js, which is on the `pluginSocket` property of the
// private `app` object that was made pluggable, via
// `pluggable.enable(app).
//
// This will be a public method.
function registerPlugin (name, plugin) {
    app.pluginSocket.registerPlugin(name, plugin);
}

// Normally this wouldn't be exposed, but we do so here for testing
// purposes.
function getPluginSocket () {
    return app.pluginSocket;
}

// Calling `pluggable.enable` on the closured `app` object, will make it
// pluggable. Additionally, it will get the `pluginSocket` attribute, which
// refers to the object that the plugins get plugged into.
function makePluggable () {
    pluggable.enable(app);
}

// Declare the two public methods
export {
    initialize,
    registerPlugin,
    getPluginSocket,
    makePluggable
};
