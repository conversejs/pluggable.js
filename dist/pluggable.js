"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.enable = enable;
exports["default"] = void 0;

var _extend = _interopRequireDefault(require("lodash-es/extend.js"));

var _isBoolean = _interopRequireDefault(require("lodash-es/isBoolean.js"));

var _isFunction = _interopRequireDefault(require("lodash-es/isFunction.js"));

var _isNil = _interopRequireDefault(require("lodash-es/isNil.js"));

var _partial = _interopRequireDefault(require("lodash-es/partial.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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
    this.plugged.__super__ = {
      '__string__': this.plugged.__super__
    };
  }

  this.plugged.__super__[name] = this.plugged;
  this.plugins = {};
  this.initialized_plugins = [];
} // Now we add methods to the PluginSocket by adding them to its
// prototype.


(0, _extend["default"])(PluginSocket.prototype, {
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

    return value.apply(this, Array.from(arguments).slice(4));
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
      var wrapped_function = (0, _partial["default"])(this.wrappedOverride, key, value, this.plugged[key], default_super);
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

    for (var _i = 0, _Object$entries = Object.entries(attributes); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
          key = _Object$entries$_i[0],
          value = _Object$entries$_i[1];

      if (key === 'events') {
        obj.prototype[key] = (0, _extend["default"])(value, obj.prototype[key]);
      } else if (typeof value === 'function') {
        // We create a partially applied wrapper function, that
        // makes sure to set the proper super method when the
        // overriding method is called. This is done to enable
        // chaining of plugin methods, all the way up to the
        // original method.
        var default_super = {};
        default_super[this.name] = this.plugged;
        var wrapped_function = (0, _partial["default"])(this.wrappedOverride, key, value, obj.prototype[key], default_super);
        obj.prototype[key] = wrapped_function;
      } else {
        obj.prototype[key] = value;
      }
    }
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

    plugin.dependencies.forEach(function (name) {
      var dep = _this.plugins[name];

      if (dep) {
        if (dep.dependencies.includes(plugin.__name__)) {
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

    Object.keys(plugin.overrides || {}).forEach(function (key) {
      var override = plugin.overrides[key];

      if (_typeof(override) === "object") {
        if (typeof _this2.plugged[key] === 'undefined') {
          _this2.throwUndefinedDependencyError("Plugin \"".concat(plugin.__name__, "\" tried to override \"").concat(key, "\" but it's not found."));
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

    if ((0, _isBoolean["default"])(plugin.enabled) && plugin.enabled || (0, _isFunction["default"])(plugin.enabled) && plugin.enabled(this.plugged) || (0, _isNil["default"])(plugin.enabled)) {
      (0, _extend["default"])(plugin, this.properties);

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
    var _this3 = this;

    var properties = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var whitelist = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var blacklist = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

    if (!Object.keys(this.plugins).length) {
      return;
    }

    this.properties = properties;
    this.allowed_plugins = {};

    for (var _i2 = 0, _Object$entries2 = Object.entries(this.plugins); _i2 < _Object$entries2.length; _i2++) {
      var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
          key = _Object$entries2$_i[0],
          plugin = _Object$entries2$_i[1];

      if ((!whitelist.length || whitelist.includes(key)) && !blacklist.includes(key)) {
        this.allowed_plugins[key] = plugin;
      }
    }

    Object.values(this.allowed_plugins).forEach(function (o) {
      return _this3.initializePlugin(o);
    });
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
  return (0, _extend["default"])(object, ref);
}

var _default = {
  enable: enable
};
exports["default"] = _default;
