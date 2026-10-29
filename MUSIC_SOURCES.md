# Asylum music sources

## Audius (default)
Asylum uses the official Audius REST API for search and trending, with two documented discovery hosts as fallback. Most read-only catalog requests do not require a listener account. Streaming availability depends on each track and provider.

## Jamendo (optional second catalog)
Jamendo can be enabled with a developer `client_id` (this is an application API credential, not an account system for listeners). Copy `.env.example` to `.env.local`, then set `VITE_JAMENDO_CLIENT_ID` to your own client ID from https://devportal.jamendo.com/. Restart Vite after changing the environment file.

Jamendo focuses on independent/licensed music and is not a replacement for the complete commercial catalogs of Spotify or YouTube Music. Respect the API terms and each track's license. Never use an unofficial scraper or bypass a paid service's access controls to extract audio.

## Local library
Favorites and playlists are stored in this browser's `localStorage`. There is no login, account database, or cross-device sync. Clearing browser site data can remove this local library.
