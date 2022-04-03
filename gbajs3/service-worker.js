var VERSION = 'v1';
var CACHE_NAME = 'gbajs3-' + VERSION;

const pre_cache_urls = [
	'/',
	'/favicon.ico',
	'/index.html',
	'/resources/main.css',
	'/resources/init-main.js',
	'/js/util.js',
	'/js/core.js',
	'/js/arm.js',
	'/js/thumb.js',
	'/js/mmu.js',
	'/js/io.js',
	'/js/audio.js',
	'/js/video.js',
	'/js/video/proxy.js',
	'/js/video/software.js',
	'/js/irq.js',
	'/js/keypad.js',
	'/js/sio.js',
	'/js/savedata.js',
	'/js/gpio.js',
	'/js/gba.js',
	'/js/video/worker.js',
	'/resources/xhr.js',
	'/resources/biosbin.js',
	'/resources/gba-api.js'
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
