'use strict';

// NOTE: rev hashed core assets from build will be included as global `var serviceworkerOption = { assets: [...] }` see https://www.npmjs.com/package/serviceworker-webpack-plugin

self.addEventListener('install', event => {
	console.log('Installing service worker');
	return self.skipWaiting();
});

self.addEventListener('activate', event => {
	console.log('Activating service worker');
	return self.clients.claim();
});

self.addEventListener('fetch', event => {
	console.log('Fetch event for:', event.request.url);

	// This line will return a string for all responses.
	// event.respondWith(new Response('highjack!'));

	if (request.headers.get('accept').indexOf('images/*') > -1) {
		event.respondWith(fetch('https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500'))

		// event.respondWith(fetch('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlvdvMoGYKcfaOx2ejvmlFm479Qfcdkd0AccjIYUMXWcye19EW'))
	}
});
