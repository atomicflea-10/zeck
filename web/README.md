# eOffice noting

A web page with a box for checking keyboard keys, and a bookmark that adds the Dark extension's keys to the site. No extension needed.

Page: **https://eoffice-noting.vercel.app**

## On a new computer

1. Open Chrome and press **Ctrl+Shift+B** (Mac: **Cmd+Shift+B**) to show the bookmarks bar.
2. Open **eoffice-noting.vercel.app**.
3. Drag the blue **eOffice noting** button onto the bookmarks bar.
4. Open the site and click the bookmark. A small **On** appears in the corner.
5. After every reload of the site, click the bookmark again.

No bookmarks bar? Press **Ctrl+Shift+O**, choose **⋮ → Add new bookmark**, and paste the text of `bookmarklet/bookmarklet.url.txt` as the URL.

Don't:

- **click the button on the eOffice noting page.** Drag it.
- **press Ctrl+D on the site.** That bookmarks the site, not the keys.
- **paste `javascript:` into the address bar.** Chrome removes it from pasted text.

## Keys on the site

Click outside the site's typing box first.

| Keys | What happens |
|---|---|
| Hold ੌ ੀ (Q R) | Copies `#sample-paragraph` to the clipboard |
| Hold ੌ ੀ ਜ (Q R P) | Replaces the typing box `#input-box` with that text |
| ← → ↓ | Next → fill the box with the new text → Next |
| ← → → ↓ | The same for two segments |

These are the extension's keys and timings. Clicking the bookmark twice doesn't add the keys twice.

## Changing the target (for example to the eOffice noting text area)

1. Edit `CONFIG` at the top of `bookmarklet/raw.js`: `siteHosts`, `selector`, `input` and `next`.
2. Run `node bookmarklet/build.mjs`. It updates `bookmarklet/bookmarklet.url.txt` and the button in `web/index.html`.
3. Deploy (see below). Then drag the new button to the bar and delete the old bookmark.

## Deploying

```
cd web
vercel deploy --prod
```

The folder is already linked to the Vercel project `eoffice-noting`. Any static host works too, because the bookmark doesn't depend on the page's address.

## Testing locally

```
node bookmarklet/serve.mjs
```

Open http://localhost:8080/web/ and drag the button. Then open http://127.0.0.1:8080/bookmarklet/test-target.html, which has the same element ids as the site, and click the bookmark there.

## Not the same as the extension

- **The bookmark doesn't start by itself.** Click it after each page load.
- **The selector is fixed in `raw.js`.** The extension let you change it on its options page.
- **There's no special clipboard permission.** After a slow ← → ↓, Chrome may refuse the copy, but the box still gets filled.
- **Errors show a toast.** When an element is missing or the clipboard is blocked, a red toast appears. The extension stayed silent.
