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

vpaid.attach({
    container: container,
    player: player,
    swfVpaid: '//domain.com/VPAIDFlash.swf',
    swfObject: '//domain.com/swfobject.js'
});

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

* 1.2.7: Have to show overlay prior to init otherwise it can fail viewability tests
* 1.2.6: Timeout if ad is never loaded
* 1.2.5: Support autoplay and trigger events on player
* 1.2.4: fix case sensitivity
* 1.2.3: Play video on ad error
* 1.2.2: Fix parameters and add timeout if unit doesn't play in time
* 1.2.1: Preload vPAID ad to prevent delay on play
* 1.2.0: API change, lazy load swfobject, edge cases and styling
* 1.1.1: Ability to timeout if ad hasn't loaded
* 1.1.0: Flash support
* 1.0.2: Fix iframe showing under play button
* 1.0.1: Dependency tweaks for easier downstream builds
* 1.0.0: Initial release