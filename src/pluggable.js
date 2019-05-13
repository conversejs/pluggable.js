/*
       ____  __                        __    __         _
      / __ \/ /_  __ ___   ___  ____ _/ /_  / /__      (_)____
     / /_/ / / / / / __ \/ __ \/ __/ / __ \/ / _ \    / / ___/
    / ____/ / /_/ / /_/ / /_/ / /_/ / /_/ / /  __/   / (__  )
   /_/   /_/\__,_/\__, /\__, /\__/_/_.___/_/\___(_)_/ /____/
                 /____//____/                    /___/
 */

// Pluggable.js lets you to make your Javascript code pluggable while still
// keeping sensitive objects and data private through closures.

/*global console */

import drop from 'lodash/drop';
import each from 'lodash/each';
import extend from 'lodash/extend';
import includes from 'lodash/includes';
import isBoolean from 'lodash/isBoolean';
import isFunction from 'lodash/isFunction';
import isNil from 'lodash/isNil';
import keys from 'lodash/keys';
import partial from 'lodash/partial';
import pickBy from 'lodash/pickBy';
import size from 'lodash/size';
import values from 'lodash/values';


// The `PluginSocket` class contains the plugin architecture, and gets
// created whenever `pluggable.enable(obj);` is called on the object
// that you want to make pluggable.
// You can also see it as the thing into which the plugins are plugged.
// It takes two parameters, first, the object being made pluggable, and
// then the name by which the pluggable object may be referenced on the
// __super__ object (inside overrides).
function PluginSocket (plugged, name) {
    this.name = name;
    this.plugged = plugged;
    if (typeof this.plugged.__super__ === 'undefined') {
        this.plugged.__super__ = {};
    } else if (typeof this.plugged.__super__ === 'string') {
        this.plugged.__super__ = { '__string__': this.plugged.__super__ };
    }
    this.plugged.__super__[name] = this.plugged;
    this.plugins = {};
    this.initialized_plugins = [];
}

// Now we add methods to the PluginSocket by adding them to its
// prototype.
extend(PluginSocket.prototype, {

    // `wrappedOverride` creates a partially applied wrapper function
    // that makes sure to set the proper super method when the
    // overriding method is called. This is done to enable
    // chaining of plugin methods, all the way up to the
    // original method.
    wrappedOverride: function (key, value, super_method, default_super) {
        if (typeof super_method === "function") {
            if (typeof this.__super__ === "undefined") {
                /* We're not on the context of the plugged object.
                 * This can happen when the overridden method is called via
                 * an event handler or when it's a constructor.
                 *
                 * In this case, we simply tack on the  __super__ obj.
                 */
                this.__super__ = default_super;
            }
            this.__super__[key] = super_method.bind(this);
        }
        return value.apply(this, drop(arguments, 4));
    },

    // `_overrideAttribute` overrides an attribute on the original object
    // (the thing being plugged into).
    //
    // If the attribute being overridden is a function, then the original
    // function will still be available via the `__super__` attribute.
    //
    // If the same function is being overridden multiple times, then
    // the original function will be available at the end of a chain of
    // functions, starting from the most recent override, all the way
    // back to the original function, each being referenced by the
    // previous' __super__ attribute.
    //
    // For example:
    //
    // `plugin2.MyFunc.__super__.myFunc => plugin1.MyFunc.__super__.myFunc => original.myFunc`
    _overrideAttribute: function (key, plugin) {
        let value = plugin.overrides[key];
        if (typeof value === "function") {
            let default_super = {};
            default_super[this.name] = this.plugged;

            let wrapped_function = partial(
                this.wrappedOverride, key, value, this.plugged[key],  default_super
            );
            this.plugged[key] = wrapped_function;
        } else {
            this.plugged[key] = value;
        }
    },

    _extendObject: function (obj, attributes) {
        if (!obj.prototype.__super__) {
            obj.prototype.__super__ = {};
            obj.prototype.__super__[this.name] = this.plugged;
        }
        let that = this;
        each(attributes, function (value, key) {
            if (key === 'events') {
                obj.prototype[key] = extend(value, obj.prototype[key]);
            } else if (typeof value === 'function') {
                // We create a partially applied wrapper function, that
                // makes sure to set the proper super method when the
                // overriding method is called. This is done to enable
                // chaining of plugin methods, all the way up to the
                // original method.
                let default_super = {};
                default_super[that.name] = that.plugged;

                let wrapped_function = partial(
                    that.wrappedOverride, key, value, obj.prototype[key], default_super
                );
                obj.prototype[key] = wrapped_function;
            } else {
                obj.prototype[key] = value;
            }
        });
    },

    // Plugins can specify dependencies (by means of the
    // `dependencies` list attribute) which refers to dependencies
    // which will be initialized first, before the plugin itself gets initialized.
    //
    // If `strict_plugin_dependencies` is set to `false` (on the object being
    // made pluggable), then no error will be thrown if any of these plugins aren't
    // available.
    loadPluginDependencies: function (plugin) {
        each(plugin.dependencies, (name) => {
            let dep = this.plugins[name];
            if (dep) {
                if (includes(dep.dependencies, plugin.__name__)) {
                    /* FIXME: circular dependency checking is only one level deep. */
                    throw "Found a circular dependency between the plugins \""+
                        plugin.__name__+"\" and \""+name+"\"";
                }
                this.initializePlugin(dep);
            } else {
                this.throwUndefinedDependencyError(
                    "Could not find dependency \""+name+"\" "+
                    "for the plugin \""+plugin.__name__+"\". "+
                    "If it's needed, make sure it's loaded by require.js");
            }
        });
    },

    throwUndefinedDependencyError: function (msg) {
        if (this.plugged.strict_plugin_dependencies) {
            throw msg;
        } else {
            console.log(msg);
            return;
        }
    },

    // `applyOverrides` is called by initializePlugin. It applies any
    // and all overrides of methods or Backbone views and models that
    // are defined on any of the plugins.
    applyOverrides: function (plugin) {
        each(Object.keys(plugin.overrides || {}), (key) => {
            let override = plugin.overrides[key];
            if (typeof override === "object") {
                if (typeof this.plugged[key] === 'undefined') {
                    this.throwUndefinedDependencyError(
                        `Plugin "${plugin.__name__}" tried to override "${key}" but it's not found.`);
                } else {
                    this._extendObject(this.plugged[key], override);
                }
            } else {
                this._overrideAttribute(key, plugin);
            }
        });
    },

    // `initializePlugin` applies the overrides (if any) defined on all
    // the registered plugins and then calls the initialize method of the plugin
    initializePlugin: function (plugin) {
        if (!includes(keys(this.allowed_plugins), plugin.__name__)) {
            /* Don't initialize disallowed plugins. */
            return;
        }
        if (includes(this.initialized_plugins, plugin.__name__)) {
            /* Don't initialize plugins twice, otherwise we get
            * infinite recursion in overridden methods.
            */
            return;
        }
        if (isBoolean(plugin.enabled) && plugin.enabled ||
            isFunction(plugin.enabled) && plugin.enabled(this.plugged) ||
            isNil(plugin.enabled)) {

            extend(plugin, this.properties);
            if (plugin.dependencies) {
                this.loadPluginDependencies(plugin);
            }
            this.applyOverrides(plugin);
            if (typeof plugin.initialize === "function") {
                plugin.initialize.bind(plugin)(this);
            }
            this.initialized_plugins.push(plugin.__name__);
        }
    },

    // `registerPlugin` registers (or inserts, if you'd like) a plugin,
    // by adding it to the `plugins` map on the PluginSocket instance.
    registerPlugin: function (name, plugin) {
        if (name in this.plugins) {
            throw new Error('Error: Plugin name '+name+' is already taken');
        }
        plugin.__name__ = name;
        this.plugins[name] = plugin;
    },

    // `initializePlugins` should get called once all plugins have been
    // registered. It will then iterate through all the plugins, calling
    // `initializePlugin` for each.
    // The passed in  properties variable is an object with attributes and methods
    // which will be attached to the plugins.
    initializePlugins: function (properties={}, whitelist=[], blacklist=[]) {
        if (!size(this.plugins)) {
            return;
        }
        this.properties = properties;
        this.allowed_plugins  = pickBy(this.plugins,
            function (plugin, key) {
                return (!whitelist.length || (whitelist.length && includes(whitelist, key))) &&
                    !includes(blacklist, key);
            }
        );
        each(values(this.allowed_plugins), this.initializePlugin.bind(this));
    }
});

function enable (object, name, attrname) {
    // Call the `enable` method to make an object pluggable
    //
    // It takes three parameters:
    // - `object`: The object that gets made pluggable.
    // - `name`: The string name by which the now pluggable object
    //     may be referenced on the __super__ obj (in overrides).
    //     The default value is "plugged".
    // - `attrname`: The string name of the attribute on the now
    //     pluggable object, which refers to the PluginSocket instance
    //     that gets created.
    if (typeof attrname === "undefined") {
        attrname = "pluginSocket";
    }
    if (typeof name === 'undefined') {
        name = 'plugged';
    }
    let ref = {};
    ref[attrname] = new PluginSocket(object, name);
    return extend(object, ref);
}

export {
    enable
};
export default {
    enable
};
