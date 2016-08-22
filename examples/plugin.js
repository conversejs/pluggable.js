(function () {
    window.myApp.registerPlugin('my-plugin', {
        overrides: {
            // overrides mentioned here will be picked up by Pluggable's
            // plugin architecture, they will replace existing methods on the
            // relevant objects or classes.
            // 
            // When overriding a method or function, you can still call the
            // original as an attribute on `this.__super__`. To properly call it
            // as if it was never overridden, you can call it with
            // `.apply(this, arguments)`.

            showNotification: function (text) {
                /* Override showNotification to change the color */
                var el = this.__super__.showNotification.apply(this, arguments);
                el.setAttribute('class', el.getAttribute('class')+' extra');
            }

            // BTW, new functions which don't exist yet can also be added.
        },

        initialize: function (socket) {
            // The initialize function gets called as soon as the plugin is
            // loaded by pluggable.js's plugin machinery.

            // We are passed in an instance of the  `PluginSocket`, which
            // encapsulates the plugin architecture and gets created when
            // `pluggable.enable` is called on an object.

            // It's also accessible via the `pluginSocket` attribute, on the
            // object that was passed to `pluggable.enable`.

            // You can get hold of the private object which is made pluggable
            // via the socket, with the the `plugged` attribute.
            // Once you have hold of this object, you can call it's methods,
            // which are otherwise not available.
            socket.plugged.showNotification(
                "The plugin has been enabled. Notifications are now a different color."
            );
        }
    });
})();
