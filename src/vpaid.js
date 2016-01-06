var vpaid = require('vpaid-html5-client/js/VPAIDHTML5Client.js');

module.exports = {
	attach: function (container, player) {
		var played = false;
		var js = null;

		player.on('vpaid_js', function (e, config) {
			js = config;
		});

		player.on('resume', function () {
			if (!js || played) {
				return;
			}

			player.stop();
			played = true;

			(new vpaid(container, null, {})).loadAdUnit(js.src, function (err, unit) {
				if (err) {
					return player.play();
				}

				var lastVolume = null;
				var vastVpaidMap = {
					AdVideoStart: 'start',
					AdVideoFirstQuartile: 'firstQuartile',
					AdVideoMidpoint: 'midpoint',
					AdVideoThirdQuartile: 'thirdQuartile',
					AdVideoComplete: 'complete',
					AdUserAcceptInvitation: 'acceptInvitation',
					AdUserMinimize: 'collapse',
					AdUserClose: 'close',
					AdPaused: 'pause',
					AdPlaying: 'resume',
					AdStopped: function () {
						player.play();
					},
					AdLoaded: function () {
						unit.startAd();
					},
					AdStarted: function () {
						js.tracker.load();

						unit.getAdVolume(function (err, val) {
							// TODO: handle error
							lastVolume = val;
						});
					},
					AdSkipped: function () {
						js.tracker.skip();

						player.play();
					},
					AdImpression: function () {
						// TODO: js.tracker.load needs to load impression and creativeView sep
					},
					AdVolumeChange: function () {
						// TODO: is value passed in?
						unit.getAdVolume(function (err, val) {
							// TODO: handle error
							if (val == 0 && lastVolume > 0) {
								js.tracker.setMuted(true);
							} else if (val > 0 && lastVolume == 0) {
								js.tracker.setMuted(false);
							}
						});
					},
					AdClickThru: function () {
						// TODO: js.tracker needs to implement (ClickTracking is a VAST element under<VideoClicks>)
					},
					AdError: function () {
						js.tracker.errorWithCode(901)
					}
				};

				Object.keys(vastVpaidMap).forEach(function (key) {
					return unit.subscribe(key, function () {
						var val = vastVpaidMap[key];

						if (typeof val == 'string') {
							return js.tracker.track(val);
						}

						val(arguments);
					});
				});

				unit.handshakeVersion('2.0', function onHandShake(err) {
					if (err) {
						return player.play();
					}

					unit.initAd(container.offsetWidth, container.offsetHeight, 'normal', -1, {AdParameters: js.parameters}, {});
				});
			});
		});
	}
};