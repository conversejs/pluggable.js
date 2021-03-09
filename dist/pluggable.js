'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.enable = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
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

var _drop = require('lodash-es/drop');

var _drop2 = _interopRequireDefault(_drop);

var _each = require('lodash-es/each');

var _each2 = _interopRequireDefault(_each);

var _extend = require('lodash-es/extend');

var _extend2 = _interopRequireDefault(_extend);

var _includes = require('lodash-es/includes');

var _includes2 = _interopRequireDefault(_includes);

var _isBoolean = require('lodash-es/isBoolean');

var _isBoolean2 = _interopRequireDefault(_isBoolean);

var _isFunction = require('lodash-es/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _isNil = require('lodash-es/isNil');

var _isNil2 = _interopRequireDefault(_isNil);

var _keys = require('lodash-es/keys');

var _keys2 = _interopRequireDefault(_keys);

var _partial = require('lodash-es/partial');

var _partial2 = _interopRequireDefault(_partial);

var _pickBy = require('lodash-es/pickBy');

var _pickBy2 = _interopRequireDefault(_pickBy);

var _size = require('lodash-es/size');

var _size2 = _interopRequireDefault(_size);

var _values = require('lodash-es/values');

var _values2 = _interopRequireDefault(_values);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// The `PluginSocket` class contains the plugin architecture, and gets
// created whenever `pluggable.enable(obj);` is called on the object
// that you want to make pluggable.
// You can also see it as the thing into which the plugins are plugged.
// It takes two parameters, first, the object being made pluggable, and
// then the name by which the pluggable object may be referenced on the
// __super__ object (inside overrides).
function PluginSocket(plugged, name) {
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
(0, _extend2.default)(PluginSocket.prototype, {

    // `wrappedOverride` creates a partially applied wrapper function
    // that makes sure to set the proper super method when the
    // overriding method is called. This is done to enable
    // chaining of plugin methods, all the way up to the
    // original method.
    wrappedOverride: function wrappedOverride(key, value, super_method, default_super) {
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
        return value.apply(this, (0, _drop2.default)(arguments, 4));
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
    _overrideAttribute: function _overrideAttribute(key, plugin) {
        var value = plugin.overrides[key];
        if (typeof value === "function") {
            var default_super = {};
            default_super[this.name] = this.plugged;

            var wrapped_function = (0, _partial2.default)(this.wrappedOverride, key, value, this.plugged[key], default_super);
            this.plugged[key] = wrapped_function;
        } else {
            this.plugged[key] = value;
        }
    },

    _extendObject: function _extendObject(obj, attributes) {
        if (!obj.prototype.__super__) {
            obj.prototype.__super__ = {};
            obj.prototype.__super__[this.name] = this.plugged;
        }
        var that = this;
        (0, _each2.default)(attributes, function (value, key) {
            if (key === 'events') {
                obj.prototype[key] = (0, _extend2.default)(value, obj.prototype[key]);
            } else if (typeof value === 'function') {
                // We create a partially applied wrapper function, that
                // makes sure to set the proper super method when the
                // overriding method is called. This is done to enable
                // chaining of plugin methods, all the way up to the
                // original method.
                var default_super = {};
                default_super[that.name] = that.plugged;

                var wrapped_function = (0, _partial2.default)(that.wrappedOverride, key, value, obj.prototype[key], default_super);
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
    loadPluginDependencies: function loadPluginDependencies(plugin) {
        var _this = this;

        (0, _each2.default)(plugin.dependencies, function (name) {
            var dep = _this.plugins[name];
            if (dep) {
                if ((0, _includes2.default)(dep.dependencies, plugin.__name__)) {
                    /* FIXME: circular dependency checking is only one level deep. */
                    throw "Found a circular dependency between the plugins \"" + plugin.__name__ + "\" and \"" + name + "\"";
                }
                _this.initializePlugin(dep);
            } else {
                _this.throwUndefinedDependencyError("Could not find dependency \"" + name + "\" " + "for the plugin \"" + plugin.__name__ + "\". " + "If it's needed, make sure it's loaded by require.js");
            }
        });
    },

    throwUndefinedDependencyError: function throwUndefinedDependencyError(msg) {
        if (this.plugged.strict_plugin_dependencies) {
            throw msg;
        } else {
            if (console.warn) {
                console.warn(msg);
            } else {
                console.log(msg);
            }
        }
    },

    // `applyOverrides` is called by initializePlugin. It applies any
    // and all overrides of methods or Backbone views and models that
    // are defined on any of the plugins.
    applyOverrides: function applyOverrides(plugin) {
        var _this2 = this;

        (0, _each2.default)(Object.keys(plugin.overrides || {}), function (key) {
            var override = plugin.overrides[key];
            if ((typeof override === 'undefined' ? 'undefined' : _typeof(override)) === "object") {
                if (typeof _this2.plugged[key] === 'undefined') {
                    _this2.throwUndefinedDependencyError('Plugin "' + plugin.__name__ + '" tried to override "' + key + '" but it\'s not found.');
                } else {
                    _this2._extendObject(_this2.plugged[key], override);
                }
            } else {
                _this2._overrideAttribute(key, plugin);
            }
        });
    },

    // `initializePlugin` applies the overrides (if any) defined on all
    // the registered plugins and then calls the initialize method of the plugin
    initializePlugin: function initializePlugin(plugin) {
        if (!(0, _includes2.default)((0, _keys2.default)(this.allowed_plugins), plugin.__name__)) {
            /* Don't initialize disallowed plugins. */
            return;
        }
        if ((0, _includes2.default)(this.initialized_plugins, plugin.__name__)) {
            /* Don't initialize plugins twice, otherwise we get
            * infinite recursion in overridden methods.
            */
            return;
        }
        if ((0, _isBoolean2.default)(plugin.enabled) && plugin.enabled || (0, _isFunction2.default)(plugin.enabled) && plugin.enabled(this.plugged) || (0, _isNil2.default)(plugin.enabled)) {

            (0, _extend2.default)(plugin, this.properties);
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
    registerPlugin: function registerPlugin(name, plugin) {
        if (name in this.plugins) {
            throw new Error('Error: Plugin name ' + name + ' is already taken');
        }
        plugin.__name__ = name;
        this.plugins[name] = plugin;
    },

    // `initializePlugins` should get called once all plugins have been
    // registered. It will then iterate through all the plugins, calling
    // `initializePlugin` for each.
    // The passed in  properties variable is an object with attributes and methods
    // which will be attached to the plugins.
    initializePlugins: function initializePlugins() {
        var properties = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var whitelist = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var blacklist = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

        if (!(0, _size2.default)(this.plugins)) {
            return;
        }
        this.properties = properties;
        this.allowed_plugins = (0, _pickBy2.default)(this.plugins, function (plugin, key) {
            return (!whitelist.length || whitelist.length && (0, _includes2.default)(whitelist, key)) && !(0, _includes2.default)(blacklist, key);
        });
        (0, _each2.default)((0, _values2.default)(this.allowed_plugins), this.initializePlugin.bind(this));
    }
});

function enable(object, name, attrname) {
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
    var ref = {};
    ref[attrname] = new PluginSocket(object, name);
    return (0, _extend2.default)(object, ref);
}

exports.enable = enable;
exports.default = {
    enable: enable
};
