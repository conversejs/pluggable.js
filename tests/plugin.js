const plugin = { 
    overrides: {},

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
    }
};

export default plugin;
