import test from 'tape';
import pluggable from '../src/pluggable';
import * as app from './app';
import plugin from './plugin';


test('Plugin registration', (assert) => {
    assert.ok(
        _.isUndefined(app.getPluginSocket()) === true,
        "Non-pluggable modules don't have the 'pluginSocket' attribute"
    );
    app.makePluggable();
    assert.ok(
        _.isUndefined(app.getPluginSocket()) === false,
        "Pluggable modules have the 'pluginSocket' attribute"
    );

    assert.ok(
        Object.keys(app.getPluginSocket().plugins).length === 0,
        "By default there aren't any registerd pugins"
    );
    app.registerPlugin('my-plugin', plugin);
    assert.ok(
        Object.keys(app.getPluginSocket().plugins).length === 1,
        'A plugin is registered by calling registerPlugin'
    );
    assert.ok(
        app.getPluginSocket().plugins['my-plugin'] === plugin,
        'The object passed in to registerPlugin is saved as a plugin'
    );
    assert.throws(
        _.partial(app.registerPlugin, 'my-plugin', {}),
        Error,
        'Registering a plugin under an already taken name results in an Error exception'
    );
    assert.end();
});

test('disable initialization', (assert) => {
    app.makePluggable();
    let disabled_plugin_initialized = false;
    let enabled_plugin_initialized = false;

    app.registerPlugin('disabled-plugin', {
        enabled () { return false },
        overrides: {
            foo: 'bar'
        },
        initialize () {
            disabled_plugin_initialized = true;
        }
    });
    app.registerPlugin('enabled-plugin', {
        enabled () { return true },
        overrides: {
            baz () { return 'buz' }
        },
        initialize () {
            enabled_plugin_initialized = true;
        }
    });
    app.initialize();

    assert.ok(
        enabled_plugin_initialized === true &&
        disabled_plugin_initialized === false,
        "A plugin with an 'enable' method which returns false, is not initialized"
    )
    assert.ok(
        app.getClosuredApp().baz() === 'buz' && _.has(app.getClosuredApp(), 'foo') === false,
        "A plugin with an 'enable' method which returns false, does not have its overrides applied"
    )
    assert.end();
});

test('blacklisting of plugins', (assert) => {
    app.makePluggable();
    app.registerPlugin('allowed-plugin', {});
    app.registerPlugin('blacklisted-plugin', {});
    app.initialize([], ['blacklisted-plugin']);

    let allowed_plugins = app.getPluginSocket().allowed_plugins;
    assert.ok(
        _.has(allowed_plugins, 'blacklisted-plugin') === false &&
        _.has(allowed_plugins, 'allowed-plugin') === true,
        "A blacklisted plugin will be excluded from the allowed_plugins list"
    );

    let initialized_plugins = app.getPluginSocket().initialized_plugins;
    assert.ok(
        _.includes(initialized_plugins, 'blacklisted-plugin') === false &&
        _.includes(initialized_plugins, 'allowed-plugin') === true,
        "A blacklisted plugin won't be initialized"
    );
    assert.end();
});

test('whitelisting of plugins', (assert) => {
    app.makePluggable();
    app.registerPlugin('whitelisted-plugin', {});
    app.registerPlugin('nonlisted-plugin', {});
    app.initialize(['whitelisted-plugin'], []);

    let allowed_plugins = app.getPluginSocket().allowed_plugins;
    assert.ok(
        _.has(allowed_plugins, 'nonlisted-plugin') === false &&
        _.has(allowed_plugins, 'whitelisted-plugin') === true,
        "A non-whitelisted plugin will not be in the allowed_plugins list"
    );

    let initialized_plugins = app.getPluginSocket().initialized_plugins;
    assert.ok(
        _.includes(initialized_plugins, 'nonlisted-plugin') === false &&
        _.includes(initialized_plugins, 'whitelisted-plugin') === true,
        "A non-whitelisted plugin won't be initialized"
    );
    assert.end();
});

test('white- and blacklisting of plugins', (assert) => {
    app.makePluggable();
    app.registerPlugin('allowed-plugin', {});
    app.registerPlugin('blacklisted-plugin', {});
    app.initialize(['allowed-plugin', 'blacklisted-plugin'], ['blacklisted-plugin']);

    let allowed_plugins = app.getPluginSocket().allowed_plugins;
    assert.ok(
        _.has(allowed_plugins, 'blacklisted-plugin') === false &&
        _.has(allowed_plugins, 'allowed-plugin') === true,
        "A whitelisted plugin that's also blacklisted won't be in the allowed_plugins list"
    );

    let initialized_plugins = app.getPluginSocket().initialized_plugins;
    assert.ok(
        _.includes(initialized_plugins, 'blacklisted-plugin') === false &&
        _.includes(initialized_plugins, 'allowed-plugin') === true,
        "A whitelisted plugin that's also blacklisted won't be initialized"
    );
    assert.end();
});
