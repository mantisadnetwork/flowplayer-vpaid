var html5Client = require('vpaid-html5-client/js/VPAIDHTML5Client.js');
var flashClient = require('vpaid-flash-client/js/VPAIDFlashClient.js');

module.exports = {
	attach: function (config) {
		var played = false;
		var timeout = config.timeout || 5000;
		var vpaidUnit = undefined;
		var loaded = false;
		var vpaidDetected = false;
		var vpaidStarted = false;
		var videoPlayed = false;

		var vpaidContainer = document.createElement('div');
		vpaidContainer.className = 'vpaid';
		vpaidContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:0;visibility:none;overflow:hidden;z-index:4999;display:flex;align-items:center;justify-content:center;';
		vpaidContainer.innerHTML = '<span style="color:white;">Loading, please wait..</span>';
		config.container.appendChild(vpaidContainer);

		var onError = function (err) {
			if (console && console.error && err) {
				console.error(err);
			}

			return playVideo();
		};

		var showVpaid = function () {
			vpaidContainer.style.visibility = 'visible';
			vpaidContainer.style.height = '100%';
			vpaidContainer.style.background = 'black';
		};

		var playVideo = function () {
			if(videoPlayed){
				return;
			}

			videoPlayed = true;

			try {
				config.container.removeChild(vpaidContainer);
			} catch (ex) {

			}

			config.player.play();
		};

		var onUnit = function (config, event) {
			return function (err, unit) {
				if (err) {
					return onError(err);
				}

				vpaidUnit = unit;

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
						playVideo();
					},
					AdLoaded: function () {
						loaded = true;
					},
					AdStarted: function () {
						vpaidStarted = true;
						config.tracker.load();

						unit.getAdVolume(function (err, val) {
							// TODO: handle error
							lastVolume = val;
						});
					},
					AdVideoComplete: function () {
						config.tracker.complete();

						playVideo();
					},
					AdSkipped: function () {
						config.tracker.skip();

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
								config.tracker.setMuted(true);
							} else if (val > 0 && lastVolume == 0) {
								config.tracker.setMuted(false);
							}
						});
					},
					AdClickThru: function () {
						// TODO: tracker needs to implement (ClickTracking is a VAST element under<VideoClicks>)
					},
					AdError: function () {
						config.tracker.errorWithCode(901);

						playVideo();
					}
				};

				Object.keys(vastVpaidMap).forEach(function (key) {
					return unit[event](key, function () {
						var val = vastVpaidMap[key];

						if (typeof val == 'string') {
							return config.tracker.track(val);
						}

						val(arguments);
					});
				});

				unit.handshakeVersion('2.0', function onHandShake(err) {
					if (err) {
						return onError(err);
					}

					unit.initAd(config.width, config.height, 'normal', -1, {AdParameters: config.parameters}, {});
				});
			}
		};

		config.player.on('vpaid_js', function (e, config) {
			vpaidDetected = true;

			var client = new html5Client(vpaidContainer, null, {extraOptions: {zIndex: 4999}});
			client.loadAdUnit(config.src, onUnit(config, 'subscribe'));
		});

		config.player.on('vpaid_swf', function (e, flashConfig) {
			if (!config.swfVpaid) {
				throw new Error('You must define a url for config.swfVpaid');
			}

			vpaidDetected = true;

			var buildFlashClient = function () {
				var fc = new flashClient(vpaidContainer, function (err) {
					if (err) {
						return onError(err);
					}

					fc.loadAdUnit(flashConfig.src, onUnit(flashConfig, 'on'));
				}, {
					data: config.swfVpaid,
					width: flashConfig.width || vpaidContainer.offsetWidth,
					height: flashConfig.height || vpaidContainer.offsetHeight
				});
			};

			if (window.swfobject) {
				return buildFlashClient();
			}

			if (!config.swfObject) {
				throw new Error('You must define config.swfObject or include it on the page');
			}

			var head = document.getElementsByTagName('head')[0];

			var script = document.createElement("script");
			script.type = "text/javascript";
			script.async = true;
			script.src = config.swfObject;

			var done = false;

			script.onload = script.onreadystatechange = function () {
				if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					done = true;

					buildFlashClient();

					// Handle memory leak in IE
					script.onload = script.onreadystatechange = null;
					head.removeChild(script);
				}
			};

			head.appendChild(script);
		});

		config.player.on('resume', function () {
			if (!vpaidDetected || played) {
				return;
			}

			played = true;

			showVpaid();

			config.player.stop();

			var getUnit = function (callback) {
				if (vpaidUnit && loaded) {
					return callback(vpaidUnit);
				}

				var checkClient = setInterval(function () {
					if (vpaidUnit && loaded) {
						return callback(vpaidUnit);
					}
				}, 100);

				setTimeout(function () {
					if (!vpaidUnit || !loaded) {
						clearInterval(checkClient);

						callback();
					}
				}, timeout);
			};

			getUnit(function (unit) {
				if (!unit) {
					return playVideo();
				}

				unit.startAd();

				// in case ad does not start
				setTimeout(function () {
					if (!vpaidStarted) {
						playVideo();
					}
				}, timeout);
			});
		});
	}
};