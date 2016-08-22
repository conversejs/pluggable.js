/*
       ____  __                        __    __         _
      / __ \/ /_  __ ___   ___  ____ _/ /_  / /__      (_)____
     / /_/ / / / / / __ \/ __ \/ __/ / __ \/ / _ \    / / ___/
    / ____/ / /_/ / /_/ / /_/ / /_/ / /_/ / /  __/   / (__  )
   /_/   /_/\__,_/\__, /\__, /\__/_/_.___/_/\___(_)_/ /____/
                 /____//____/                    /___/
 */

// Pluggable.js enables you to make your Javascript code pluggable while still
// keeping sensitive objects and data private through closures.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define("pluggable", ["underscore"], factory);
    } else {
        window.pluggable = factory(_);
    }
}(this, function (_) {
    "use strict";

    function PluginSocket (plugged, name) {
        // The PluginSocket class encapsulates the plugin architecture, and gets
        // created whenver `pluggable.enable(obj);` on the object they want
        // to make pluggable.
        // You can also see it as the thing into which the plugins are plugged.
        this.name = name; // Name by which the now pluggable object may be
                          // referenced on the _super obj.
        this.plugged = plugged;
        this.plugged._super = {};
        this.plugins = {};
        this.initialized_plugins = [];
    }

    _.extend(PluginSocket.prototype, {
        // Now we add methods to the PluginSocket class by adding them to its
        // prototype.

        wrappedOverride: function (key, value, super_method) {
            // We create a partially applied wrapper function, that
            // makes sure to set the proper super method when the
            // overriding method is called. This is done to enable
            // chaining of plugin methods, all the way up to the
            // original method.
            if (typeof super_method === "function") {
                if (typeof this._super === "undefined") {
                    // We're not on the context of the plugged object.
                    // This can happen when the overridden method is called via
                    // an event handler. In this case, we simply tack on the
                    // _super obj.
                    this._super = {};
                }
                this._super[key] = super_method.bind(this);
            }
            return value.apply(this, _.rest(arguments, 3));
        },

        _overrideAttribute: function (key, plugin) {
            // Overrides an attribute on the original object (the thing being
            // plugged into).
            //
            // If the attribute being overridden is a function, then the original
            // function will still be available via the _super attribute.
            //
            // If the same function is being overridden multiple times, then
            // the original function will be available at the end of a chain of
            // functions, starting from the most recent override, all the way
            // back to the original function, each being referenced by the
            // previous' _super attribute.
            //
            // For example:
            //
            // `plugin2.MyFunc._super.myFunc => plugin1.MyFunc._super.myFunc => original.myFunc`
            var value = plugin.overrides[key];
            if (typeof value === "function") {
                var wrapped_function = _.partial(
                    this.wrappedOverride, key, value, this.plugged[key]
                );
                this.plugged[key] = wrapped_function;
            } else {
                this.plugged[key] = value;
            }
        },

        _extendObject: function (obj, attributes) {
            if (!obj.prototype._super) {
                obj.prototype._super = {};
                obj.prototype._super[this.name] = this.plugged;
            }
            _.each(attributes, function (value, key) {
                if (key === 'events') {
                    obj.prototype[key] = _.extend(value, obj.prototype[key]);
                } else if (typeof value === 'function') {
                    // We create a partially applied wrapper function, that
                    // makes sure to set the proper super method when the
                    // overriding method is called. This is done to enable
                    // chaining of plugin methods, all the way up to the
                    // original method.
                    var wrapped_function = _.partial(
                        this.wrappedOverride, key, value, obj.prototype[key]
                    );
                    obj.prototype[key] = wrapped_function;
                } else {
                    obj.prototype[key] = value;
                }
            }.bind(this));
        },

        loadOptionalDependencies: function (plugin) {
            _.each(plugin.optional_dependencies, function (name) {
                var dep = this.plugins[name];
                if (dep) {
                    if (_.contains(dep.optional_dependencies, plugin.__name__)) {
                        /* FIXME: circular dependency checking is only one level deep. */
                        throw "Found a circular dependency between the plugins \""+
                              plugin.__name__+"\" and \""+name+"\"";
                    }
                    this.initializePlugin(dep);
                } else {
                    this.throwUndefinedDependencyError(
                        "Could not find optional dependency \""+name+"\" "+
                        "for the plugin \""+plugin.__name__+"\". "+
                        "If it's needed, make sure it's loaded by require.js");
                }
            }.bind(this));
        },

        throwUndefinedDependencyError: function (msg) {
            if (this.plugged.strict_plugin_dependencies) {
                throw msg;
            } else {
                console.log(msg);
                return;
            }
        },

        applyOverrides: function (plugin) {
            // Called by initializePlugin. Applies any and all overrides
            // defined on any of the plugins.
            _.each(Object.keys(plugin.overrides || {}), function (key) {
                // We automatically override all methods and Backbone views and
                // models that are in the "overrides" namespace.
                var override = plugin.overrides[key];
                if (typeof override === "object") {
                    if (typeof this.plugged[key] === 'undefined') {
                        this.throwUndefinedDependencyError("Error: Plugin \""+plugin.__name__+"\" tried to override "+key+" but it's not found.");
                    } else {
                        this._extendObject(this.plugged[key], override);
                    }
                } else {
                    this._overrideAttribute(key, plugin);
                }
            }.bind(this));
        },

        initializePlugin: function (plugin) {
            // Apply the overrides (if any) defined on all the registered
            // plugins and then call the initialize method on each one.
            if (_.contains(this.initialized_plugins, plugin.__name__)) {
                // Don't initialize plugins twice, otherwise we get
                // infinite recursion in overridden methods.
                return;
            }
            _.extend(plugin, this.properties);
            if (plugin.optional_dependencies) {
                this.loadOptionalDependencies(plugin);
            }
            this.applyOverrides(plugin);
            if (typeof plugin.initialize === "function") {
                plugin.initialize.bind(plugin)(this);
            }
            this.initialized_plugins.push(plugin.__name__);
        },

        registerPlugin: function (name, plugin) {
            // Register (or insert) a plugin, but adding it to the `plugins`
            // map on the PluginSocket instance.
            plugin.__name__ = name;
            this.plugins[name] = plugin;
        },

        initializePlugins: function (properties) {
            // The properties variable is an object of attributes and methods
            // which will be attached to the plugins.
            if (!_.size(this.plugins)) {
                return;
            }
            this.properties = properties;
            _.each(_.values(this.plugins), this.initializePlugin.bind(this));
        }
    });
    return {
        'enable': function (object, name, attrname) {
            // Call this method to make the passed in object pluggable
            // It takes three parameters:
            // - object: The object that gets made pluggable.
            // - name: The string name by which the now pluggable object
            //     may be referenced on the _super obj (in overrides).
            //     The default value is "plugged".
            // - attrname: The string name of the attribute on the now
            //     pluggable object, which refers to the PluginSocket instance
            //     that gets created.
            if (typeof attrname === "undefined") {
                attrname = "pluginSocket";
            }
            if (typeof name === 'undefined') {
                name = 'plugged';
            }
            var ref = {};
            ref[attrname] = new PluginSocket(object, name);
            return _.extend(object, ref);
        }
    };
}));
