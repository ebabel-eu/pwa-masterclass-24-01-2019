'use strict';

// NOTE: rev hashed core assets from build will be included as global `var serviceworkerOption = { assets: [...] }` see https://www.npmjs.com/package/serviceworker-webpack-plugin

const CORE_CACHE_NAME = 'webchat-cache-v1.0.0';
const CORE_ASSETS = [
	'/offline/',
	'assets/images/avatar.svg',
	'assets/images/bell-off.svg',
	'assets/images/bell-ring.svg',
	'assets/images/icon-72x72.png',
	'assets/images/icon-96x96.png',
	'assets/images/icon-128x128.png',
	'assets/images/icon-144x144.png',
	'assets/images/icon-152x152.png',
	'assets/images/icon-192x192.png',
	'assets/images/icon-384x384.png',
	'assets/images/icon-512x512.png',
	'assets/images/logout.svg',
].concat(serviceWorkerOption.assets);

self.addEventListener('install', event => {
	console.log('Installing service worker');
	// precache static assets and offline fallback
	event.waitUntil(caches.open(CORE_CACHE_NAME)
		.then(cache => cache.addAll(CORE_ASSETS))
		.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', event => {
	console.log('Activating service worker');
	// TODO: invalidate outdated caches
	return self.clients.claim();
});

self.addEventListener('fetch', event => {
	console.log('Fetch event for:', event.request.url);
	// serve precached static assets(you can use the isCoreGetRequest helper)
	const request = event.request;
	if (isCoreGetRequest(request)) {
		event.respondWith(caches.open(CORE_CACHE_NAME).then(cache => cache.match(request.url)));
	}
	// serve cached offline fallback when an HTML request fails(you can use the isHtmlGetRequest helper)
	else if (isHtmlGetRequest(request)) {
		event.respondWith(
			fetch(request).catch(error => {
				console.error(error);
				return caches.open(CORE_CACHE_NAME).then(cache => cache.match('/offline/'))
			})
		)
	}
});

/**
 * Checks if a request is a core GET request
 *
 * @param {Object} request        The request object
 * @returns {Boolean}            Boolean value indicating whether the request is in the core mapping
 */
function isCoreGetRequest(request) {
	return request.method === 'GET' && CORE_ASSETS.includes(getPathName(request.url));
}

/**
 * Checks if a request is a GET and HTML request
 *
 * @param {Object} request        The request object
 * @returns {Boolean}            Boolean value indicating whether the request is a GET and HTML request
 */
function isHtmlGetRequest(request) {
	return request.method === 'GET' && (request.headers.get('accept') !== null && request.headers.get('accept').indexOf('text/html') > -1);
}

/**
 * Get a pathname from a full URL by stripping off domain
 *
 * @param {Object} requestUrl        The request object, e.g. https://www.mydomain.com/index.css
 * @returns {String}                Relative url to the domain, e.g. index.css
 */
function getPathName(requestUrl) {
	const url = new URL(requestUrl);
	return url.pathname;
}
