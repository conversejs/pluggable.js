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


// `wrappedOverride` creates a partially applied wrapper function
// that makes sure to set the proper super method when the
// overriding method is called. This is done to enable
// chaining of plugin methods, all the way up to the
// original method.
function wrappedOverride (key, value, super_method, default_super, ...args) {
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
    return value.apply(this, args);
}


// The `PluginSocket` class contains the plugin architecture, and gets
// created whenever `pluggable.enable(obj);` is called on the object
// that you want to make pluggable.
// You can also see it as the thing into which the plugins are plugged.
// It takes two parameters, first, the object being made pluggable, and
// then the name by which the pluggable object may be referenced on the
// __super__ object (inside overrides).
class PluginSocket {

    constructor (plugged, name) {
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
    _overrideAttribute (key, plugin) {
        const value = plugin.overrides[key];
        if (typeof value === "function") {
            const default_super = {};
            default_super[this.name] = this.plugged;
            const super_method = this.plugged[key];
            this.plugged[key] = function (...args) {
                return wrappedOverride.apply(this, [key, value, super_method,  default_super, ...args]);
            }
        } else {
            this.plugged[key] = value;
        }
    }

    _extendObject (obj, attributes) {
        if (!obj.prototype.__super__) {
            obj.prototype.__super__ = {};
            obj.prototype.__super__[this.name] = this.plugged;
        }
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'events') {
                obj.prototype[key] = Object.assign(value, obj.prototype[key]);
            } else if (typeof value === 'function') {
                // We create a partially applied wrapper function, that
                // makes sure to set the proper super method when the
                // overriding method is called. This is done to enable
                // chaining of plugin methods, all the way up to the
                // original method.
                const default_super = {};
                default_super[this.name] = this.plugged;
                const super_method = obj.prototype[key];
                obj.prototype[key] = function (...args) {
                    return wrappedOverride.apply(this, [key, value, super_method, default_super, ...args]);
                }
            } else {
                obj.prototype[key] = value;
            }
        }
    }

    // Plugins can specify dependencies (by means of the
    // `dependencies` list attribute) which refers to dependencies
    // which will be initialized first, before the plugin itself gets initialized.
    //
    // If `strict_plugin_dependencies` is set to `false` (on the object being
    // made pluggable), then no error will be thrown if any of these plugins aren't
    // available.
    loadPluginDependencies (plugin) {
        plugin.dependencies?.forEach(name => {
            const dep = this.plugins[name];
            if (dep) {
                if (dep.dependencies?.includes(plugin.__name__)) {
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
    }

    throwUndefinedDependencyError (msg) {
        if (this.plugged.strict_plugin_dependencies) {
            throw msg;
        } else {
            if (console.warn) {
                console.warn(msg);
            } else {
                console.log(msg);
            }
        }
    }

    // `applyOverrides` is called by initializePlugin. It applies any
    // and all overrides of methods or Backbone views and models that
    // are defined on any of the plugins.
    applyOverrides (plugin) {
        Object.keys(plugin.overrides || {}).forEach(key => {
            const override = plugin.overrides[key];
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
    }

    // `initializePlugin` applies the overrides (if any) defined on all
    // the registered plugins and then calls the initialize method of the plugin
    initializePlugin (plugin) {
        if (!Object.keys(this.allowed_plugins).includes(plugin.__name__)) {
            /* Don't initialize disallowed plugins. */
            return;
        }
        if (this.initialized_plugins.includes(plugin.__name__)) {
            /* Don't initialize plugins twice, otherwise we get
            * infinite recursion in overridden methods.
            */
            return;
        }
        if (typeof plugin.enabled === 'boolean' && plugin.enabled ||
            plugin.enabled?.(this.plugged) ||
            plugin.enabled == null) { // isNil

            Object.assign(plugin, this.properties);
            if (plugin.dependencies) {
                this.loadPluginDependencies(plugin);
            }
            this.applyOverrides(plugin);
            if (typeof plugin.initialize === "function") {
                plugin.initialize.bind(plugin)(this);
            }
            this.initialized_plugins.push(plugin.__name__);
        }
    }

    // `registerPlugin` registers (or inserts, if you'd like) a plugin,
    // by adding it to the `plugins` map on the PluginSocket instance.
    registerPlugin (name, plugin) {
        if (name in this.plugins) {
            throw new Error('Error: Plugin name '+name+' is already taken');
        }
        plugin.__name__ = name;
        this.plugins[name] = plugin;
    }

    // `initializePlugins` should get called once all plugins have been
    // registered. It will then iterate through all the plugins, calling
    // `initializePlugin` for each.
    // The passed in  properties variable is an object with attributes and methods
    // which will be attached to the plugins.
    initializePlugins (properties={}, whitelist=[], blacklist=[]) {
        if (!Object.keys(this.plugins).length) {
            return;
        }
        this.properties = properties;
        this.allowed_plugins = {};

        for (const [key, plugin] of Object.entries(this.plugins)) {
            if ((!whitelist.length || whitelist.includes(key)) && !blacklist.includes(key)) {
                this.allowed_plugins[key] = plugin;
            }
        }
        Object.values(this.allowed_plugins).forEach(o => this.initializePlugin(o));
    }
}

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
    object[attrname] = new PluginSocket(object, name);
    return object;
}

export {
    enable
};
export default {
    enable
};
