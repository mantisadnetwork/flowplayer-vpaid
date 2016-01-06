# flowplayer-vpaid
VPAID 2.0 (Flash/JS) support within Flowplayer 6 HTML

**Note**: This project is a work in progress and may not fulfill all of the VPAID 2.0 spec yet.

## Behavior

1. Create a flowplayer instance like you normally would.
2. Invoke the attach method to listen for the vpaid_js event.
3. When the event is fired, a vpaid container will overlap the video when the user attempts to play the video.
4. After the vpaid container is closed/skipped/etc, it will disappear and the video will start.

## Usage

If you do not want to fire the vpaid_js event your self (because you parsed your own VAST response), consider using the [flowplayer-vast](https://github.com/mantisadnetwork/flowplayer-vast) project.

**Note**: [SWFObject](https://github.com/swfobject/swfobject/blob/master/swfobject/swfobject.js) is required to show flash creatives and you will need to host the [VPAIDFlash.swf](https://github.com/MailOnline/VPAIDFLASHClient/blob/master/bin/VPAIDFlash.swf) file.

```
var vast = require('flowplayer-vpaid');

var container = document.getElementById('div');

var player = flowplayer(container);

vpaid.attach(container, player, '//domain.com/VPAIDFlash.swf');

player.trigger('vpaid_js', [{
    src: 'http://site.com/file.js',
    attributes: '',
    tracker: {} // should be a DMVAST.tracker instance from the vast-client-js project
}]);

player.trigger('vpaid_swf', [{
    src: 'http://site.com/file.swf',
    attributes: '',
    tracker: {} // should be a DMVAST.tracker instance from the vast-client-js project
}]);
```

## Changelog

* 1.1.0: Flash support
* 1.0.2: Fix iframe showing under play button
* 1.0.1: Dependency tweaks for easier downstream builds
* 1.0.0: Initial release