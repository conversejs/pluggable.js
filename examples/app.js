(function () {
    var _private = {
        showNotification: function (text) {
            /* Displays a notification message */
            var el = document.createElement('p');
            el.setAttribute('class', 'notification');
            el.appendChild(document.createTextNode(text));
            el = document.getElementById('notifications').appendChild(el);
            setTimeout(_.partial(this.fadeOut, el), 3000);
            return el;
        },

        fadeOut: function (el) {
            /* Fades out the passed in DOM element. */
            el.style.opacity = 1;
            (function fade() {
                if ((el.style.opacity -= 0.1) < 0) {
                    el.remove();
                } else {
                    setTimeout(fade, 25);
                }
            })();
        }
    };

    var _initialize = function () {
        var notify_el = document.getElementById('notify');
        notify_el.addEventListener('click', function () {
            _private.showNotification('This is a notification.');
        });
    };

    var _registerPlugin = function (name, plugin) {
        _private.pluginSocket.registerPlugin(name, plugin);
    };

   var _enableThePlugin = function () {
        document.getElementById('enable').setAttribute('disabled', 'disabled');
        _private.pluginSocket.initializePlugins();
    };

    // Calling `pluggable.enable` on the `_private` object, will make it
    // pluggable. Additionally, it will get the `pluginSocket` attribute, which
    // refers to the object that the plugins get plugged into.
    pluggable.enable(_private);

    var _public = {
        'initialize': _initialize,
        'enableThePlugins': _enableThePlugin,
        'registerPlugin': _registerPlugin
    };
    window.myApp = _public;
})();
