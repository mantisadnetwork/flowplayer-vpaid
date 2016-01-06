# flowplayer-vpaid
VPAID 2.0 support within Flowplayer 6 HTML

**Note**: This project is a work in progress and may not fulfill all of the VPAID 2.0 spec yet.

## Behavior

1. Create a flowplayer instance like you normally would.
2. Invoke the attach method to listen for the vpaid_js event.
3. When the event is fired, a vpaid container will overlap the video when the user attempts to play the video.
4. After the vpaid container is closed/skipped/etc, it will disappear and the video will start.

## Usage

If you do not want to fire the vpaid_js event your self (because you parsed your own VAST response), consider using the [flowplayer-vast](https://github.com/mantisadnetwork/flowplayer-vast) project.

```
var vast = require('flowplayer-vpaid');

var container = document.getElementById('div');

var player = flowplayer(container);

vpaid.attach(container, player);

player.trigger('vpaid_js', [{
    src: 'http://site.com/js',
    attributes: '',
    tracker: {} // should be a DMVAST.tracker instance from the vast-client-js project
}]);
```

## Changelog

* 1.0.1: Dependency tweaks for easier downstream builds
* 1.0.0: Initial release