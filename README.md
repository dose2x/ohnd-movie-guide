# The OHND Movie Guide

A single-page "pit sheet" for looking up a movie or show before movie night — synopsis, cast, director, and a red/green flag call based on its Rotten Tomatoes score.

Live site: https://dose2x.github.io/ohnd-movie-guide/

## How it works

`index.html` is a static page with no build step. When you search a title, it calls a Cloudflare Worker proxy (`ohnd-movie-proxy`) rather than the OMDb API directly, so the OMDb API key never ships to the browser. The Worker forwards the request to OMDb and returns the JSON response as-is.

```
browser (dose2x.github.io) → Cloudflare Worker (ohnd-movie-proxy) → OMDb API
```

The Worker only accepts requests from origins in its `ALLOWED_ORIGINS` allowlist (`https://dose2x.github.io` and `http://localhost:4173` for local dev).

> The Worker's source isn't in this repo — it's edited and deployed directly from the Cloudflare dashboard (Workers & Pages → `ohnd-movie-proxy` → Edit code).

## Rotten Tomatoes fallback

OMDb's `Ratings` array frequently omits Rotten Tomatoes, especially for TV series, shorts, and older or less mainstream titles. When that happens, the Worker falls back to Rotten Tomatoes itself:

1. Fetch `rottentomatoes.com/search?search=<title>` — RT server-renders results with the Tomatometer score already in the HTML (`tomatometer-score="93"` for movies, `tomatometerscore="93"` for TV — RT uses inconsistent attribute naming between the two).
2. Pick the best-matching result by title, media type (movie `/m/` vs. TV `/tv/`, using OMDb's `Type` field), and release year.
3. If RT has a real Tomatometer score for that match, append it to the response's `Ratings` array as `{ Source: "Rotten Tomatoes", Value: "93%" }` and set `RottenTomatoesFallback: true` on the response.

If RT itself has no critic score for a title (not enough reviews), no fallback value is added — the guide just shows whatever OMDb provided (usually just IMDb).

This is best-effort scraping of RT's public search page, not an official API, so it can break if RT changes their markup again.

## Local development

Serve `index.html` with any static server on port 4173 (already allowlisted on the Worker), e.g.:

```
npx serve -l 4173
```
