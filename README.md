        ____  __                        __    __         _
       / __ \/ /_  __ ___   ___  ____ _/ /_  / /__      (_)____
      / /_/ / / / / / __ \/ __ \/ __/ / __ \/ / _ \    / / ___/
     / ____/ / /_/ / /_/ / /_/ / /_/ / /_/ / /  __/   / (__  )
    /_/   /_/\__,_/\__, /\__, /\__/_/_.___/_/\___(_)_/ /____/
                  /____//____/                    /___/ 

# Introduction

pluggable.js enables you to make your Javascript code pluggable while still
keeping sensitive objects and data private through closures.

It was originally written for [converse.js](https://conversejs.org), to provide
a plugin architecture that allows 3rd party developers to extend and override
private [backbone.js](http://backbonejs.org) classes, but it does not require
nor depend on either library.

# Usage

Suppose you have the following module, containing a private method (for
whatever reason) `showNotification` which you'd like to make overridable:

    (function () {
        var private = {
            showNotification: function (title, text) {
                n = new Notification(title, { body: text });
                setTimeout(n.close.bind(n), 5000);
            }
        };

        pluggable.enable(private);
        private.pluggable.initializePlugins();

        var public = {
            'registerPlugin': private.pluggable.register(name, plugin)
        }
        window.myApp = public;
    })();

## Overrides

Private (closured) objects can be overridden or modified by plugins. When multiple
plugins override a method of a private object, then a method call can travel up
through all the overrides all the way to the original overridden method.

This is possible because pluggable.js enables the calling of a super method
through the `_super` attribute.

For example, imagine we have an object being overridden which has a method
`showNotification`. In our override we want to also play a sound, and then call
the original method so that the notification is displayed.

Here's what that would look like:

    window.myapp.registerplugin('my-plugin', {

        overrides: {
            // Overrides mentioned here will be picked up by pluggable.js
            // and they will replace existing methods on the relevant objects.
            //
            // New functions which don't exist yet can also be added.

            playSound: function () {
                // Please imagine there's code to play a sound here...
                // This method doesn't exist on the original object being
                // overriden here.
            },

            showNotification: function () {
                /* Override showNotification to also play a sound
                 */
                playSound();
                // Call the super method so that the notification is also shown.
                this._super.showNotification.applyt(this, arguments);
            }
    });

## Custom plugin code

Besides overriding private objects and methods, plugins might also want to
create their own objects and functions independent of the overridden object but
still having access to it.

For that, there is the `initialize` method, which if available on the plugin,
will be called once the closured object calls `initializePlugins`.


    myapp.registerplugin('my-plugin', {

        overrides: {
            // overrides mentioned here will be picked up by Pluggable's
            // plugin architecture, they will replace existing methods on the
            // relevant objects or classes.
            // 
            // When overriding a method or function, you can still call the
            // original as an attribute on `this._super`. To properly call it
            // as if it was never overridden, you can call it with
            // `.apply(this, arguments)`.
            //
            // New functions which don't exist yet can also be added.

            shownotification: function () {
                /* override shownotification to also play a sound
                 */
                playsound();
                // call the super method so that the notification is also shown.
                this._super.shownotification.apply(this, arguments);
            },
        },

        initialize: function () {
        }
    });

    
