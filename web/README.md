# Dark without the extension: bookmark + typing page

This does what the Dark extension does, without installing an extension. It has two parts:

- **The bookmark** (a `javascript:` bookmarklet). You click it on the target site (psssbtyping.com). It adds the same keys as the extension to that tab and opens the typing page. It doesn't navigate the tab away.
- **The typing page** (`web/index.html`). It has a large box to type in and buttons for every action. It talks to the bookmark's script with `postMessage`. It can't see or change the target page until you click the bookmark there.

Everything that reads or changes the target page runs inside the bookmark. The typing page is plain static files.

## Daily use

1. Open the target site.
2. Click the **Dark ⇢ typing** bookmark. The toast says "listening" and the typing page opens in a new tab (or comes to the front if it's already open).
3. The typing page says **Connected to psssbtyping.com**.
4. Type in the big box, then press **Ctrl+Enter** (or click **Send to typing box**). The text goes into the site's typing box.
5. The extension's keys still work on the site itself, and the typing page shows what they did.

If you **reload the target page**, click the bookmark again. A reload removes the script.
If you **close the typing page**, the site shows "control page closed". Click the bookmark to reopen it.
If you open the typing page on its own, you can still type in it like a notepad. The status line says "Waiting for target" until you click the bookmark on the site.

Tip: drag the typing page's tab out into its own window next to the site. Chrome slows down timers in background tabs, so the **Next** actions run faster when the site stays visible.

## Adding the bookmark

**Drag (easiest):** Show the bookmarks bar with **Ctrl+Shift+B** (Mac: **Cmd+Shift+B**). Open the typing page and drag the blue **Dark ⇢ typing** link onto the bar.

**Bookmark manager:** On the typing page, click **Copy bookmark URL**. Then press **Ctrl+Shift+O** (bookmark manager), choose **⋮ → Add new bookmark**, give it any name and paste the copied text as the URL. The same text is in `bookmarklet/bookmarklet.url.txt`.

Don't:

- **click the link on the typing page.** That runs it on the typing page, where there's nothing to control. Drag it instead.
- **press Ctrl+D on the target site.** That bookmarks the site, not the script.
- **type or paste `javascript:` into the address bar.** Chrome removes `javascript:` from pasted text, and a URL this long can't be typed by hand anyway. Only a bookmark works.

## Hosting the typing page

The `web/` folder is static: `index.html`, `app.js` and `styles.css`. Any static host works, but it must use **https**.

- **GitHub Pages (this repo, already set up):** Pages serves `docs/` from `main`. Run `node bookmarklet/build.mjs --publish`, which builds the bookmark and copies the page to `docs/typing/`. Then commit and push. The address is https://atomicflea-10.github.io/zeck/typing/.
- **Netlify Drop:** Open https://app.netlify.com/drop and drop the `web` folder onto it. You get a URL like `https://something.netlify.app/`.
- **Any other static host:** Upload the three files.

**If you host it anywhere else, point the bookmark at that address and rebuild it:**

1. In `bookmarklet/raw.js`, set `hostUrl` at the top to the page's full address. It's currently `https://atomicflea-10.github.io/zeck/typing/`.
   You can also skip editing and run `node bookmarklet/build.mjs --host https://YOUR_DOMAIN/`.
2. Run `node bookmarklet/build.mjs`. It updates `bookmarklet/bookmarklet.url.txt` and the drag link in `web/index.html`.
3. Upload `web/index.html` again. Then drag the new link to the bar and delete the old bookmark.

The typing page warns you in the Install section when its drag link opens a different address than the page's own.

## Testing locally

```
node bookmarklet/build.mjs --host http://localhost:8080/web/   # a bookmark that opens the local page
node bookmarklet/serve.mjs                                     # static server for the repo on port 8080
```

1. Open `http://localhost:8080/web/` and drag the link to the bookmarks bar.
2. Open `http://127.0.0.1:8080/bookmarklet/test-target.html`. This test page has the same element ids as the real site and runs on a different origin, as the real site does.
3. Click the bookmark on the test page. Then try every button, and on the test page itself try Q R, Q R P, ← → ↓ and ← → → ↓. Click outside its typing box first.

When you're done, run `node bookmarklet/build.mjs` (no `--host`) so `web/index.html` points at the published page again. `docs/typing/` only changes with `--publish`, so a local build never reaches the live site.

Opening `index.html` straight from disk (`file://`) doesn't work: Chrome won't let a website open a `file://` page.

## Feature parity with the extension

| Extension | Bookmark + typing page |
|---|---|
| Hold ੌ ੀ (Q R): copy `#sample-paragraph` to the clipboard, silently, at most every 600 ms | Same keys, same behavior on the site. The text also appears in the typing page's box. **Copy** button / Alt+C does the same from the typing page. |
| Hold ੌ ੀ ਜ (Q R P): replace `#input-box` with the text, held keys don't type into the box | Same. The text also appears on the typing page. **Paste** button / Alt+P. |
| ← → ↓: Next → wait up to 3 s for new text → copy + fill box → wait 200 ms → Next | Same, including the 1.5 s gap and the cursor left in the box. **Next, 1 segment** / Alt+1. |
| ← → → ↓: the same for two segments | Same. **Next, 2 segments** / Alt+2. |
| Keys matched by position (e.code), plus the Gurmukhi characters; ignored in form fields and with Ctrl/Alt/Meta; auto-repeat and IME ignored | Same code. |
| Fill: focus, select, `insertText`, fallback `value =` + `input` | Same, and the fallback uses the native value setter plus bubbling `input` and `change` events (safe for React). |
| Only on psssbtyping.com (and subdomains) | The keys only turn on there (and on 127.0.0.1 for testing). |
| Selector set on the options page, stored in `chrome.storage.sync` | Selector field on the typing page, kept in that browser's storage and sent to the site when it connects. |
| Starts on its own on every page load; already-open tabs get it right away | Click the bookmark after each load. |
| Copying from the keys is silent | Still silent when it works. Errors (element missing, clipboard blocked) now show a small toast. |
| — | New: **Send to typing box** (Ctrl+Enter) puts what you typed on the typing page into `#input-box`. |
| Idempotent re-injection (`sec:reset` event) | Clicking the bookmark again doesn't add a second set of keys. It also turns off the extension's keys on that tab if both are present, so nothing fires twice. |

## What didn't carry over

- **Starting automatically** (`chrome.scripting.registerContentScripts`): a bookmark only runs when you click it. Click it again after every reload.
- **`chrome.storage.sync`**: settings stay in the typing page's browser storage and don't sync across computers.
- **The `clipboardWrite` permission**: the site's own clipboard rules apply. The Q R keys still copy, since a key press allows it. After a slow **Next** (more than about 5 s after the key press), Chrome may refuse the clipboard. The text still lands in the box and on the typing page.
- **Sites that forbid window links** (`Cross-Origin-Opener-Policy`): the typing page can't connect there. The toast says so, and the keys on the site still work.
- **The extension's "sequence" mode**: the code has it, but the extension always forces chord mode, so no one could use it. It isn't ported.

## Messages between the two pages

All messages carry `ns: 'dark'`. The bookmark sends only to the exact typing-page origin, and accepts messages only from that origin and window. The typing page accepts messages only from the sites listed in `TARGET_HOSTS` at the top of `app.js`.

| Direction | Type | Meaning |
|---|---|---|
| site → page | `TARGET_READY` | Bookmark clicked. Sent every second until the page answers. |
| page → site | `HOST_READY` | Answer. Includes your saved selector. |
| page → site | `PING` | Every 2 s. The site answers with `STATUS {alive}`. |
| page → site | `PASTE_TO_TARGET {text}` | Put this text in `#input-box`. |
| page → site | `COPY_FROM_TARGET` | Read the source element. |
| site → page | `COPY_FROM_TARGET {text, via}` | The text read, from a button or the Q R keys. |
| page → site | `APPLY_MAPPING {action}` | `paste`, `next1` or `next2`. |
| site → page | `APPLY_MAPPING {action, text, step}` | Each text the site put in its box. |
| page → site | `SET_SELECTOR {selector}` | Change the source element. |
| site → page | `STATUS` / `ERROR {message}` | Results and problems. |

## On a new computer

1. Open Chrome and press **Ctrl+Shift+B** so the bookmarks bar shows.
2. Open the typing page: https://atomicflea-10.github.io/zeck/typing/
3. Drag **Dark ⇢ typing** onto the bookmarks bar.
4. Open psssbtyping.com.
5. Click the bookmark. The typing page opens and says **Connected**.
6. Type, then press **Ctrl+Enter**.
