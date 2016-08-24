// An example application, used to demonstrate how pluggable.js can
// allow a module to be made pluggable.
(function () {
    var module = this;

    // A private method, not available outside the scope of this module.
    module._showNotification = function (text) {
        /* Displays a notification message */
        var el = document.createElement('p');
        el.setAttribute('class', 'notification');
        el.appendChild(document.createTextNode(text));
        el = document.getElementById('notifications').appendChild(el);
        setTimeout(_.partial(module._fadeOut, el), 3000);
        return el;
    };

    // Another private method, not available outside the scope of this module.
    module._fadeOut = function (el) {
        /* Fades out the passed in DOM element. */
        el.style.opacity = 1;
        (function fade() {
            if ((el.style.opacity -= 0.1) < 0) {
                el.remove();
            } else {
                setTimeout(fade, 25);
            }
        })();
    };

    // Initialize this module.
    // -----------------------
    // There are two buttons for which we register event handlers.
    //
    // This will be a public method.
    module.initialize = function () {
        var notify_el = document.getElementById('notify');
        notify_el.addEventListener('click', function () {
            module._showNotification('This is a notification.');
        });

        var enable_el = document.getElementById('enable');
        enable_el.addEventListener('click', function () {
            this.setAttribute('disabled', 'disabled');
            module.pluginSocket.initializePlugins();
        });
    };

    // Register a plugin for this module.
    // ----------------------------------
    // This is a wrapper method which defers to the `registerPlugin` method
    // of pluggable.js, which is on the `pluginSocket` property of the
    // private `module` object that was made pluggable, via
    // `pluggable.enable(module).
    //
    // This will be a public method.
    module.registerPlugin = function (name, plugin) {
        module.pluginSocket.registerPlugin(name, plugin);
    };

    // Calling `pluggable.enable` on the closured `module` object, will make it
    // pluggable. Additionally, it will get the `pluginSocket` attribute, which
    // refers to the object that the plugins get plugged into.
    pluggable.enable(module);

    // Declare the two public methods
    var _public = {
        'initialize': module.initialize,
        'registerPlugin': module.registerPlugin
    };
    window.myApp = _public;
    return _public;
})();
