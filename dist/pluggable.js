(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', 'lodash'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('lodash'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global._);
        global.pluggable = mod.exports;
    }
})(this, function (exports, _lodash) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.enable = undefined;

    var _ = _interopRequireWildcard(_lodash);

    function _interopRequireWildcard(obj) {
        if (obj && obj.__esModule) {
            return obj;
        } else {
            var newObj = {};

            if (obj != null) {
                for (var key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
                }
            }

            newObj.default = obj;
            return newObj;
        }
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };

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
    _.extend(PluginSocket.prototype, {

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
            return value.apply(this, _.drop(arguments, 4));
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

                var wrapped_function = _.partial(this.wrappedOverride, key, value, this.plugged[key], default_super);
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
            _.each(attributes, function (value, key) {
                if (key === 'events') {
                    obj.prototype[key] = _.extend(value, obj.prototype[key]);
                } else if (typeof value === 'function') {
                    // We create a partially applied wrapper function, that
                    // makes sure to set the proper super method when the
                    // overriding method is called. This is done to enable
                    // chaining of plugin methods, all the way up to the
                    // original method.
                    var default_super = {};
                    default_super[that.name] = that.plugged;

                    var wrapped_function = _.partial(that.wrappedOverride, key, value, obj.prototype[key], default_super);
                    obj.prototype[key] = wrapped_function;
                } else {
                    obj.prototype[key] = value;
                }
            });
        },

        // Plugins can specify optional dependencies (by means of the
        // `optional_dependencies` list attribute) which refers to dependencies
        // which will be initialized first, before the plugin itself gets initialized.
        // They are optional in the sense that if they aren't available, an
        // error won't be thrown.
        // However, if you want to make these dependencies strict (i.e.
        // non-optional), you can set the `strict_plugin_dependencies` attribute to `true`
        // on the object being made pluggable (i.e. the object passed to
        // `pluggable.enable`).
        loadOptionalDependencies: function loadOptionalDependencies(plugin) {
            var _this = this;

            _.each(plugin.optional_dependencies, function (name) {
                var dep = _this.plugins[name];
                if (dep) {
                    if (_.includes(dep.optional_dependencies, plugin.__name__)) {
                        /* FIXME: circular dependency checking is only one level deep. */
                        throw "Found a circular dependency between the plugins \"" + plugin.__name__ + "\" and \"" + name + "\"";
                    }
                    _this.initializePlugin(dep);
                } else {
                    _this.throwUndefinedDependencyError("Could not find optional dependency \"" + name + "\" " + "for the plugin \"" + plugin.__name__ + "\". " + "If it's needed, make sure it's loaded by require.js");
                }
            });
        },

        throwUndefinedDependencyError: function throwUndefinedDependencyError(msg) {
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
        applyOverrides: function applyOverrides(plugin) {
            var _this2 = this;

            _.each(Object.keys(plugin.overrides || {}), function (key) {
                var override = plugin.overrides[key];
                if ((typeof override === 'undefined' ? 'undefined' : _typeof(override)) === "object") {
                    if (typeof _this2.plugged[key] === 'undefined') {
                        _this2.throwUndefinedDependencyError("Error: Plugin \"" + plugin.__name__ + "\" tried to override " + key + " but it's not found.");
                    } else {
                        _this2._extendObject(_this2.plugged[key], override);
                    }
                } else {
                    _this2._overrideAttribute(key, plugin);
                }
            });
        },

        // `initializePlugin` applies the overrides (if any) defined on all
        // the registered plugins and then calls the initialize method for each plugin.
        initializePlugin: function initializePlugin(plugin) {
            if (!_.includes(_.keys(this.allowed_plugins), plugin.__name__)) {
                /* Don't initialize disallowed plugins. */
                return;
            }
            if (_.includes(this.initialized_plugins, plugin.__name__)) {
                /* Don't initialize plugins twice, otherwise we get
                * infinite recursion in overridden methods.
                */
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

            if (!_.size(this.plugins)) {
                return;
            }
            this.properties = properties;
            this.allowed_plugins = _.pickBy(this.plugins, function (plugin, key) {
                return (!whitelist.length || whitelist.length && _.includes(whitelist, key)) && !_.includes(blacklist, key);
            });
            _.each(_.values(this.allowed_plugins), this.initializePlugin.bind(this));
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
        return _.extend(object, ref);
    }

    exports.enable = enable;
    exports.default = {
        enable: enable
    };
});

//# sourceMappingURL=pluggable.js.map