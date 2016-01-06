var html5Client = require('vpaid-html5-client/js/VPAIDHTML5Client.js');
var flashClient = require('vpaid-flash-client/js/VPAIDFlashClient.js');

module.exports = {
	attach: function (container, player, swf) {
		var played = false;
		var js = null;
		var flash = null;
		var params = null;
		var tracker = null;

		var vpaidContainer = document.createElement('div');
		vpaidContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:0;visibility:none;overflow:hidden;z-index:4999';
		container.appendChild(vpaidContainer);

		var onError = function (err) {
			if (console && console.error && err) {
				console.error(err);
			}
		};

		var showVpaid = function () {
			vpaidContainer.style.visibility = 'visible';
			vpaidContainer.style.height = '100%';
			vpaidContainer.style.background = 'white';
		};

		var playVideo = function () {
			container.removeChild(vpaidContainer);

			player.play();
		};

		player.on('vpaid_js', function (e, config) {
			js = config.src;
			params = config.parameters;
			tracker = config.tracker;
		});

		player.on('vpaid_swf', function (e, config) {
			flash = config.src;
			params = config.parameters;
			tracker = config.tracker;
		});

		player.on('resume', function () {
			if ((!js && (!flash || !swf)) || played) {
				return;
			}

			player.stop();
			played = true;

			var createClient = null;
			var params = null;

			if (js) {
				createClient = function (callback) {
					callback(new html5Client(vpaidContainer, null, {extraOptions: {zIndex: 4999}}));
				}
			} else if (swf) {
				createClient = function (callback) {
					var fc = new flashClient(vpaidContainer, function (err) {
						onError(err);

						callback(err ? null : fc);
					}, {
						data: swf,
						width: vpaidContainer.offsetWidth,
						height: vpaidContainer.offsetHeight
					});
				}
			}

			createClient(function (client) {
				if (!client) {
					return playVideo();
				}

				client.loadAdUnit(js || flash, function (err, unit) {
					if (err) {
						onError(err);

						return playVideo();
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
							showVpaid();

							unit.startAd();
						},
						AdStarted: function () {
							tracker.load();

							unit.getAdVolume(function (err, val) {
								// TODO: handle error
								lastVolume = val;
							});
						},
						AdVideoComplete: function(){
							tracker.complete();

							playVideo();
						},
						AdSkipped: function () {
							tracker.skip();

							playVideo();
						},
						AdImpression: function () {
							// TODO: tracker.load needs to load impression and creativeView sep
						},
						AdVolumeChange: function () {
							// TODO: is value passed in?
							unit.getAdVolume(function (err, val) {
								// TODO: handle error
								if (val == 0 && lastVolume > 0) {
									tracker.setMuted(true);
								} else if (val > 0 && lastVolume == 0) {
									tracker.setMuted(false);
								}
							});
						},
						AdClickThru: function () {
							// TODO: tracker needs to implement (ClickTracking is a VAST element under<VideoClicks>)
						},
						AdError: function () {
							tracker.errorWithCode(901)
						}
					};

					Object.keys(vastVpaidMap).forEach(function (key) {
						return unit[js ? 'subscribe' : 'on'](key, function () {
							var val = vastVpaidMap[key];

							if (typeof val == 'string') {
								return tracker.track(val);
							}

							val(arguments);
						});
					});

					unit.handshakeVersion('2.0', function onHandShake(err) {
						if (err) {
							onError(err);

							return playVideo();
						}

						unit.initAd(vpaidContainer.offsetWidth, vpaidContainer.offsetHeight, 'normal', -1, {AdParameters: params}, {});
					});
				});
			});
		});
	}
};