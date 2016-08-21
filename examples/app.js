(function () {
    var _private = {
        showNotification: function (title, text) {
            var el = document.createElement('p');
            el.setAttribute('class', 'notification');
            el.appendChild(document.createTextNode('This is a notification!'));
            document.getElementById('notifications').appendChild(el);
        }
    };

    var _initialize = function () {
        var notify_el = document.getElementById('notify');
        notify_el.addEventListener('click', function () {
            _private.showNotification("Hello world", ":)");
        });
    };

   var _enableThePlugin = function () {
        document.getElementById('enable').setAttribute('disabled', 'disabled');
        _private.pluggable.initializePlugins();
    };

    pluggable.enable(_private);

    var _public = {
        'registerPlugin': function (name, plugin) {
            _private.pluggable.registerPlugin(name, plugin);
        },
        'initialize': _initialize,
        'enableThePlugins': _enableThePlugin
    };
    window.myApp = _public;
})();
