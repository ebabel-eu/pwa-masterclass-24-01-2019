# De Voorhoede Progressive Web App

## Native share
Use `navigator.share()` to natively give all share options available on mobile devices. On desktops it's supported by Safari only.

## Install to Homescreen
On iOS, it is never possible, on any browser, to prompt the user, like on Android. This is a feature of iOS. Non Safari browsers will still use the Safari engine, so even Chrome won't install.

## Windows 10 Apps
A PWA can be submitted to the Windows 10 Apps.

## PWA Stats
Lots of info about making the case to convince managers we should switch to a Progressive Web App:
- Faster
- Works offline
- Increased revenue

Also see Pinterest case study for Progressive web Apps.

## !!! Important !!!

- Make sure to call `registration.update()` when the code service worker is registered.
- In service worker install event , always run `self.skipWaiting()` and in activate event always run `self.clients.claim()`, otherwise there can be conflicts between tabs running the same PWA.


## Server side templates
In the code of De Voorhoede, the html pages are server-side templates, but that isn't relevant to PWA which is 100% client-side.

## Userful links

https://www.pwabuilder.com/

Create all the icon files from one icon file.
https://app-manifest.firebaseapp.com/

## Lunch conversations

- It's possible to publish a PWA directly to the Google Play store and the Windows 10 app store! Only iOS app store needs a wrapper, like Cordova.


