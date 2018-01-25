/* global importScripts */
'use strict';

// NOTE: rev hashed core assets from build will be included as global `var serviceworkerOption = { assets: [...] }` see https://www.npmjs.com/package/serviceworker-webpack-plugin

importScripts('./assets/idb.js');

const CORE_CACHE_NAME = 'core-cache';
const CORE_ASSETS = [
	'/offline/'
].concat(serviceWorkerOption.assets);

self.addEventListener('install', event => {
	console.log('Installing service worker');
	event.waitUntil(caches.open(CORE_CACHE_NAME)
		.then(cache => cache.addAll(CORE_ASSETS))
		.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', event => {
	console.log('Activating service worker');
	event.waitUntil(
		caches.open(CORE_CACHE_NAME).then(cache => {
			return cache.keys().then(requests => {
					return Promise.all(
						requests.filter(request => {
							return !CORE_ASSETS.includes(getPathName(request.url));
						}).map(cacheName => {
							return cache.delete(cacheName)
						})
					)
				}
			).then(() => self.clients.claim())
		})
	)
});

self.addEventListener('fetch', event => {
	console.log('Fetch event for:', event.request.url);
	const request = event.request;
	if (isCoreGetRequest(request)) {
		console.info('Core get request: ', request.url);
		event.respondWith(caches.open(CORE_CACHE_NAME)
			.then(cache => cache.match(request.url))
		)
	} else if (isHtmlGetRequest(request)) {
		console.info('HTML get request', request.url);
		event.respondWith(
			tryCacheThenNetwork(request, 'html-cache').catch((error) => {
				console.info('HTML fetch failed. Return offline fallback', error);
				return caches.open(CORE_CACHE_NAME).then(cache => cache.match('/offline/'))
			})
		)
	} else if (isImageGetRequest(request)) {
		event.respondWith(tryCacheThenNetwork(request, 'image-cache'));
	} else if (isApiGetRequest(request)) {
		console.info('Api get request: ', request.url);
		event.respondWith(tryCacheThenNetwork(request, 'api-cache'));
	}
});

self.addEventListener('message', event => {
	let newMessage = JSON.parse(event.data);
	newMessage.status = 'Sent'; // this is cheating

	caches.open('api-cache')
		.then(cache => {
			return cache.match('/messages?ajax=true')
				.then(response => {
					return response.json()
						.then(messages => {
							messages.push(newMessage);
							return messages;
						})
						.then(newMessages => createResponseObject(response, newMessages))
						.then(newResponse => cache.put('/messages?ajax=true', newResponse))
				})
		})
});

// TODO: Add an event listener for the `sync` event and add a tag.
// TODO: In your sync event handler send queued chats(use `sendChats` helper)
// TODO: When done sending queued chat messages send a post message to the client(use the `postMessage` helper)

/**
 * Sends all chat messages from local message database to server
 *
 * @returns {Promise}
 */
function sendChats() {
	return getAllMessagesFromStore()
		.then(entries => {
			return Promise.all(entries.map(entry => {
				const message = entry.data;
				return sendSingleChat(message)
					.then(response => {
						if (response.ok) {
							return chatDb
						} else {
							const err = new Error(`Couldn’t send ${message.id} :(`);
							err.status = response.status;
							err.statusText = response.statusText;
							throw err;
						}
					})
					.then(db => db.transaction('messages', 'readwrite').objectStore('messages').delete(message.id))
					.then(() => console.info(`Sent ${message.id} to server, deleted from local db!`))
					.then(() => ({id: message.id, status: 'Sent'}))
					.catch(err => {
						console.error(err);
						return {id: message.id, status: 'Failed'};
					})
			}))
		});
}

/**
 * Send a chat message to the server
 *
 * @param  {Object} message Chat message, as defined in message-form.js
 * @returns {Promise}
 */
function sendSingleChat(message) {
	return fetch('/messages/send?ajax=true', {
		method: 'post',
		headers: new Headers({
			'content-type': 'application/json'
		}),
		body: JSON.stringify(message),
		credentials: 'include'
	});
}

/**
 * Creates an HTML response object
 *
 * @param {Object} response        The response object
 * @param {String} body            The body that needs to be added to the response
 * @returns {Promise}            Resolves with the created response object
 */
function createResponseObject(response, body) {
	const init = {
		status: response.status,
		statusText: response.statusText,
		headers: {'content-type': 'application/json'}
	};

	return Promise.resolve(new Response([JSON.stringify(body, null, 2)], {type: 'application/json'}, init))
}

/**
 * Tries to get a response for a request from cache storage. If it can't find one, get the response from the network.
 *
 * @param {Object} request        The request object
 * @param {String} cacheName    The unique cache key in cache storage
 * @returns {Promise}            Resolves with response object
 */
function tryCacheThenNetwork(request, cacheName) {
	if (!cacheName) {
		return fetch(request);
	}
	return caches.open(cacheName)
		.then(cache => cache.match(request))
		.then(response => response ? response : fetchAndCache(request, cacheName))
}

/**
 * Fetch a request from the network an save it in cache storage
 *
 * @param {Object} request        The request object
 * @param {String} cacheName    The unique cache key in cache storage
 * @returns {Promise}            Resolves with response object
 */
function fetchAndCache(request, cacheName) {
	return fetch(request).then(response => {
		if (response.type !== 'opaqueredirect') { // filter out unauthenticated redirects
			return caches.open(cacheName)
				.then(cache => cache.put(request, response.clone()))
				.then(() => response);
		} else {
			return response;
		}
	})
}

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
 * Checks if a request is a GET and API request
 *
 * @param {Object} request        The request object
 * @returns {Boolean}            Boolean value indicating whether the request is a GET and API request
 */
function isApiGetRequest(request) {
	return request.method === 'GET' && request.url.indexOf('?ajax=true') > -1;
}

/**
 * Checks if a request is a GET and image request
 *
 * @param {Object} request        The request object
 * @returns {Boolean}            Boolean value indicating whether the request is a GET and image request
 */
function isImageGetRequest(request) {
	return request.method === 'GET' && request.headers.get('accept').indexOf('image/*') > -1;
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
