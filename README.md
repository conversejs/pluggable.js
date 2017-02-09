        ____  __                        __    __         _
       / __ \/ /_  __ ___   ___  ____ _/ /_  / /__      (_)____
      / /_/ / / / / / __ \/ __ \/ __/ / __ \/ / _ \    / / ___/
     / ____/ / /_/ / /_/ / /_/ / /_/ / /_/ / /  __/   / (__  )
    /_/   /_/\__,_/\__, /\__, /\__/_/_.___/_/\___(_)_/ /____/
                  /____//____/                    /___/ 

[![Travis](https://api.travis-ci.org/jcbrand/pluggable.js.png?branch=master)](https://travis-ci.org/jcbrand/pluggable.js)

# Introduction

pluggable.js lets you make your JS project extendable via plugins, while still
keeping sensitive objects and data private through closures.

It was originally written for [converse.js](https://conversejs.org), to provide
a plugin architecture that allows 3rd party developers to extend and override
private objects and [backbone.js](http://backbonejs.org) classes, but it does not
require nor depend on either library.

# Size and dependencies

Pluggable.js depends on 8 [lodash](https://lodash.com) functions and
provides a custom lodash build with only these functions in the
[3rdparty](https://github.com/jcbrand/pluggable.js/tree/master/3rdparty) directory.

Pluggable.js itself is only 2.5KB when minified and the custom lodash build
is 26KB when minified (both without gzip compression).

# Documentation

To understand how it works under the hood, read the [annotated source code](
https://jcbrand.github.io/pluggable.js/docs/pluggable.html).

## Live demo of the example code

You can try out the [live demo](https://jcbrand.github.io/pluggable.js/example)
of the example code given below.

The files themselves are in the [example folder of the
repo](https://github.com/jcbrand/pluggable.js/tree/master/example).

## Running the tests

Simply run `make check`

## Usage

*Please note: The examples to follow use the ES5 version of Javascript.
 Pluggable.js however also works with ES2015 modules.*

Suppose you have a module with a private scope and two private methods,
`_showNotification` and `_fadeOut`. Let's just assume for the sake of
illustration that there's a good reason why these methods are private.

What we want to do, is to make this module pluggable. In other words, we want
people to be able to write plugins for this module, in which they can:

- Access the private or closured scope of this module.
- Add new methods to the module.
- Override or extend existng methods (private or public) on this module.

To make the module pluggable, we simply call `pluggable.enable(module);`.
Once we've made this call, the `module` object will have a new property
`pluginSocket`, which you can think of as the thing into which the plugins are
plugged into. It is an instance of `PluginSocket`, which represents the plugin
architecture and manages all the plugins.

Additionally, we need to expose some way for plugins to register themselves.
Since the module itself is private, we'll need to expose the `registerPlugin`
method on the `pluginSocket` via a public method.

And then finally, once all plugins have been registered, they need to be
initialized by calling `initializePlugins` on the `PluginSocket` instance.

For example:

``` Javascript
    module.pluginSocket.initializePlugins();
```

### Example code of a module to be made pluggable

Let's now look at the code for our module (which will go into a file called `app.js`):

``` Javascript
// An example application, used to demonstrate how pluggable.js can
// allow a module to be made pluggable.
(function () {
    var module = this;

    // A private method, not available outside the scope of this module.
    module._showNotification = function (text) {
        /* Displays a notification message */
        var el = document.createElement('p');
        el.setAttribute('class', 'notification');
        el.appendChild(document.createTextNode(text));
        el = document.getElementById('notifications').appendChild(el);
        setTimeout(_.partial(module._fadeOut, el), 3000);
        return el;
    };

    // Another private method, not available outside the scope of this module.
    module._fadeOut = function (el) {
        /* Fades out the passed in DOM element. */
        el.style.opacity = 1;
        (function fade() {
            if ((el.style.opacity -= 0.1) < 0) {
                el.remove();
            } else {
                setTimeout(fade, 25);
            }
        })();
    };

    // Initialize this module.
    // -----------------------
    // There are two buttons for which we register event handlers.
    //
    // This will be a public method.
    module.initialize = function () {
        var notify_el = document.getElementById('notify');
        notify_el.addEventListener('click', function () {
            module._showNotification('This is a notification.');
        });

        var enable_el = document.getElementById('enable');
        enable_el.addEventListener('click', function () {
            this.setAttribute('disabled', 'disabled');
            module.pluginSocket.initializePlugins();
        });
    };

    // Register a plugin for this module.
    // ----------------------------------
    // This is a wrapper method which defers to the `registerPlugin` method
    // of pluggable.js, which is on the `pluginSocket` property of the
    // private `module` object that was made pluggable, via
    // `pluggable.enable(module).
    //
    // This will be a public method.
    module.registerPlugin = function (name, plugin) {
        module.pluginSocket.registerPlugin(name, plugin);
    };

    // Calling `pluggable.enable` on the closured `module` object, will make it
    // pluggable. Additionally, it will get the `pluginSocket` attribute, which
    // refers to the object that the plugins get plugged into.
    pluggable.enable(module);

    // Declare the two public methods
    var _public = {
        'initialize': module.initialize,
        'registerPlugin': module.registerPlugin
    };
    window.myApp = _public;
    return _public;
})();
```

### Creating the plugin

So, as you can see in the example above, the module has a private method
`_showNotification`, which will show a notification message in the page.

Let's now create a plugin which overrides this method, so that we can modify the
way the notification message will be displayed.

By the way, multiple plugins can override the same method. As long as
each overriding method calls the original method, via the `__super__` property,
the method call will travel up through all the overrides (in the reverse order
in which the plugins were registered) back to the original method.

The way to call the method being overridden, is like this:

``` Javascript
    this.__super__.methodName.apply(this, arguments);
```

where `methodName` is the name of the method. In our example, this will be
`showNotification`.

### Example plugin code

So, with that said, here's what the plugin code (which goes into the file `plugin.js`)
will look like:

``` Javascript
(function () {
    // We call the public `registerPlugin` method from our module in app.js
    window.myApp.registerPlugin('my-plugin', {

        overrides: {
            // Here you specify your overrides of methods or objects on the
            // module that has been made pluggable.

            // Override _showNotification to change the color of notification
            // messages.
            _showNotification: function (text) {
                // When overriding a method, you can still call the original method
                // via `this.__super__`. To properly call with the proper `this`
                // context and parameters, use `.apply(this, arguments)`.
                var el = this.__super__._showNotification.apply(this, arguments);

                // Now we simply set another class on the element containing
                // the notifications, so that they'll appear in a different
                // color.
                el.setAttribute('class', el.getAttribute('class')+' extra');
            }

            // BTW, new methods which don't exist yet can also be added here.
        },

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

            // Here, once this plugin is initialized, we show a notification.
            socket.plugged._showNotification(
                "The plugin has been enabled. Notifications are now a different color."
            );
        }
    });
})();
```
### Custom plugin code

The plugin has three important parts to it. Firstly, a call to register the
plugin must be made, and then passed in with this call is an object which
represents the plugin itself.

This plugin object has an `overrides` key, which is another object containing methods
and objects that will override similarly named methods and object properties on the
module itself.

Additionally, the `initializePlugins` method has been called on the
`pluginSocket` instance.

This happens inside our module in app.js and this methods should generally be
called once, after all plugins have been registered and after the module being
made pluggable has itself been initialized.

In the `initialize` method, you have access the module's scope, which would
otherwise not be available to you.

So, as you can see, the plugin lets us achieve our three goals stated earlier:

### Access the closured scope of this module.

We have access to the module and all its properties and methods inside the
`initialize` method of our plugin.

### Add new methods to the module.

We can add new methods to our module, either inside the `initialize` method of
our plugin, or by stating them declaratively in `overrides` object.

### Override or extend existng methods (private or public) on this module.

We can override existing methods and object properties via the `overrides`
object.

# Contact

For issues and requests, please use the project's [issue tracker](https://github.com/jcbrand/pluggable.js/issues).

You can reach me via my website's [contact form](http://opkode.com/contact.html) and you can also [follow me on twitter](https://twitter.com/jcopkode).

