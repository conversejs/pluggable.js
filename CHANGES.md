# Changelog

## 3.0.1 (2021-05-12)

- Bugfix. Plugin `dependencies` attributes might not be defined
- Bugfix. `this` value is wrong in overridden functions

## 3.0.0 (2021-05-12)

- Remove lodash and use native methods instead

## 2.0.1 (2019-05-13)

- Import lodash methods individually
- Log not-found dependency messages as warnings.

## 2.0.0 (2018-01-10)

- Rename the `optional_dependencies` option to `dependencies`, since they're
  not necessarily optional and the original name is misleading.

## 1.0.1 (2017-11-05)

- Ensure that `plugged` obj is also available in overriden constructors
- Plugins now can have an `enabled` attribute (either a method or a property)
  which determines whether the plugin should be initialized or not.

## 1.0.0 (2017-02-25)

- Use lodash instead of underscore.
- Update pluggable.js to ES2015 syntax.
- Add unit tests and integrate into TravisCI.
- Throw an error when reusing an already taken plugin name.

## 0.0.3 (15 January 2017)
- Ensure that pluggable obj is reachable in overridden functions

## 0.0.2 (24 August 2016)
- Rename `_super` attribute to `__super__`.
- Renamed `Pluggable` class to `PluginSocket`.
- Allow the attribute name referring to the `PluginSocket` instance to be
  specified when calling `pluggable.enable`.

## 0.0.1
- Initial release
