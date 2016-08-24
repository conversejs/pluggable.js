(function () {
    // We call the public `registerPlugin` method from our module in app.js
    window.myApp.registerPlugin('my-plugin', {
        overrides: {
            // Here you specify your overrides of methods or objects on the
            // module that has been made pluggable.

            // Override _showNotification to change the color of notification
            // messages.
            _showNotification: function (text) {
                // When overriding a method, you can still call the original method
                // via `this.__super__`. To properly call with the proper `this`
                // context and parameters, use `.apply(this, arguments)`.
                var el = this.__super__._showNotification.apply(this, arguments);
                el.setAttribute('class', el.getAttribute('class')+' extra');
            }

            // BTW, new functions which don't exist yet can also be added.
        },

        initialize: function (socket) {
            // The initialize function gets called as soon as the plugin is
            // loaded by pluggable.js's plugin machinery.

            // We are passed in an instance of the  `PluginSocket`, which
            // represents the plugin architecture and gets created when
            // `pluggable.enable` is called on an object.

            // The `PluginSocket` instance is also accessible via the `pluginSocket`
            // attribute, on the module that was passed to `pluggable.enable`.

            // You can get hold of the module which was made pluggable
            // via the `plugged` property of the `PluginSocket` instance.

            // Once you have the module, you can access its private properties
            // and call its private methods.

            // Here, once this plugin is initialized, we show a notification.
            socket.plugged._showNotification(
                "The plugin has been enabled. Notifications are now a different color."
            );
        }
    });
})();
