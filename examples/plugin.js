(function () {
    window.myApp.registerPlugin('my-plugin', {
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

            playSound: function () {
                // Please imagine there's code to play a sound here...
                // This method doesn't exist on the original object being
                // overriden here.
            },

            showNotification: function () {
                /* Override showNotification to also play a sound
                    */
                // Call the super method first
                this._super.showNotification.apply(this, arguments);
                // Then we add our custom code

                var el = document.createElement('p');
                el.setAttribute('class', 'notification extra');
                el.appendChild(document.createTextNode(
                    "Here's another notification that was added by the plugin!"));
                document.getElementById('notifications').appendChild(el);
            }
        },

        initialize: function () {
            // The initialize function gets called as soon as the plugin is
            // loaded by pluggable.js's plugin machinery.
        }
    });
})();
