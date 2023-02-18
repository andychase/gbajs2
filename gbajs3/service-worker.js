var VERSION = 'v2';
var CACHE_NAME = 'gbajs3-' + VERSION;

const pre_cache_urls = [
	'/',
	'/favicon.ico',
	'/index.html',
	'/resources/main.css',
	'/resources/init-main.js',
	'/emulator/gbajs/js/util.js',
	'/emulator/gbajs/js/core.js',
	'/emulator/gbajs/js/arm.js',
	'/emulator/gbajs/js/thumb.js',
	'/emulator/gbajs/js/mmu.js',
	'/emulator/gbajs/js/io.js',
	'/emulator/gbajs/js/audio.js',
	'/emulator/gbajs/js/video.js',
	'/emulator/gbajs/js/video/proxy.js',
	'/emulator/gbajs/js/video/software.js',
	'/emulator/gbajs/js/irq.js',
	'/emulator/gbajs/js/keypad.js',
	'/emulator/gbajs/js/sio.js',
	'/emulator/gbajs/js/savedata.js',
	'/emulator/gbajs/js/gpio.js',
	'/emulator/gbajs/js/gba.js',
	'/emulator/gbajs/js/video/worker.js',
	'/resources/xhr.js',
	'/resources/biosbin.js',
	'/resources/gba-api.js',
	'/emulator/mGBA/wasm/mgba.js',
	'/emulator/mGBA/mGBAEmulator.js',
	'/emulator/gbajs/GBAJsEmulator.js',
	'/emulator/emulator.js'
];

// service worker code

//pre-cache urls on installation
self.addEventListener('install', function (e) {
	e.waitUntil(
		caches.open(CACHE_NAME).then(function (cache) {
			return cache.addAll(pre_cache_urls);
		})
	);
});

//destroys existing caches managed by
// this page that we no longer need
self.addEventListener('activate', (event) => {
	console.log('service worker has been activated');
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return cacheNames.filter(
					(cacheName) => CACHE_NAME !== cacheName
				);
			})
			.then((unusedCaches) => {
				console.log('DESTROYING CACHE', unusedCaches.join(','));
				return Promise.all(
					unusedCaches.map((unusedCache) => {
						return caches.delete(unusedCache);
					})
				);
			})
			.then(() => self.clients.claim())
	);
});

//return precached url, or attempt to
//fetch from network and refresh cache,
//if no network, respond from cache if possible
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}
	var loc = new URL(event.request.url);

	if (pre_cache_urls.includes(loc.pathname + loc.search)) {
		event.respondWith(
			caches.match(event.request).then((cachedResponse) => {
				if (cachedResponse) {
					// We did have a cached version, display it
					return cachedResponse;
				}
			})
		);
	} else {
		event.respondWith(
			// Always try to download from server first if not precache
			fetch(event.request)
				.then((response) => {
					// When a download is successful cache the result
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, response);
					});
					// And of course display it
					return response.clone();
				})
				.catch((_err) => {
					// A failure probably means network access issues
					// See if we have a cached version
					return caches
						.match(event.request, { ignoreVary: true })
						.then((cachedResponse) => {
							if (cachedResponse) {
								// We did have a cached version, display it
								return cachedResponse;
							}
							//console.log('no cache entry');
						});
				})
		);
	}
});
