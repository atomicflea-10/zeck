# Dark

A Chrome extension (Manifest V3). On psssbtyping.com, holding ੌ + ੀ (the Q R keys) copies the text of one page element to the clipboard. Holding ੌ + ੀ + ਜ (Q R P) puts that text into the typing box, replacing what is there. Pressing ← → ↓ moves to the next segment, types its text into the typing box and moves on again; ← → → ↓ does that for two segments.

- It runs only in Chrome, and only on psssbtyping.com (and its subdomains).
- It ignores keys typed in `input`, `textarea`, `select` and contenteditable elements, and keys pressed with Ctrl, Alt or Meta.
- It sends nothing over the network. There is no analytics, no remote code and no `eval`.
- It reads the live page only at the moment you press the trigger. It never polls.

## 1. Install (Load unpacked)

1. Unzip `zeck.zip` into a folder you will keep. Chrome loads the extension from that folder, so don't delete it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
5. Done. It comes preset for psssbtyping.com: hold `ੌ` `ੀ` together (the `Q` `R` keys) to copy `#sample-paragraph`.
6. To copy a different element, click the toolbar icon, change the CSS selector and click **Save**. The site and keys are fixed.

Tabs on that site that are already open start working right away, without a reload.

Chrome may show a "Disable developer mode extensions" notice at startup. This is normal for unpacked extensions.

## 2. Copying a CSS selector from DevTools

1. On the target page, right-click the element and choose **Inspect**.
2. In the Elements panel, right-click the highlighted node and choose **Copy → Copy selector**.
3. Paste it into the **CSS selector** field.

Selectors that DevTools generates can be brittle (for example `#root > div:nth-child(3) > span`). Prefer a stable id or attribute when one exists, such as `#price` or `[data-testid="price"]`. You can test a selector in the DevTools Console with `document.querySelector("...")`.

## Behaviour and limits

- Hold `ੌ` `ੀ` down together to copy. On the Punjabi InScript keyboard these are the `Q` `R` keys, and keys are matched by position, so the same keys also work with the English keyboard. With other Punjabi layouts, the characters ੌ ੀ themselves also count. The default element is `#sample-paragraph`.
- Hold `ੌ` `ੀ` `ਜ` (the `Q` `R` `P` keys) together to paste: whatever is in the typing box (`#input-box`) is replaced with the element's text, and the cursor is left at the end of it in the box. The held keys are kept from typing into the box until you release them. As with the other keys, start with the cursor outside the typing box; to use it again, click outside the box first.
- Press ← → ↓ (one after another, each within 1.5 s) to: click **Next** (`#next-segment-btn`), wait up to 3 s for the element's text to change, copy the new text, type it into the typing box (`#input-box`), then click **Next** again.
- Press ← → → ↓ to do it for two segments: Next → fill → Next → fill → Next.
- If the button or box is missing, Next is disabled, or the text does not change, it stops without doing anything else. Focus is put back where it was afterwards. Arrow keys pressed in the typing box are ignored.
- Click outside the typing box first, because keys typed into form fields are ignored.
- Keys are case-insensitive. Held-key auto-repeat and IME composition are ignored.
- The trigger fires at most once every 600 ms.
- The copied text is `(innerText || textContent).trim()` of the first element that matches the selector.
- Copying is silent: nothing appears on the page, whether it worked or not. To check, paste (Ctrl+V) somewhere.
- Only the top frame is checked. Elements inside iframes or closed shadow roots are not reachable.
- Chrome does not allow extensions on `chrome://` pages, the Chrome Web Store or other extensions' pages.

## 3. Publishing to the Chrome Web Store (outline)

1. Register at the Chrome Web Store Developer Dashboard. There is a **one-time $5 developer fee**.
2. Upload `zeck.zip`, which has `manifest.json` at the zip root.
3. Choose the visibility:
   - **Public**: listed and searchable.
   - **Unlisted**: installable by anyone who has the link, but not searchable. This is a good fit for a personal or small-team tool.
   - **Private**: limited to your Google Workspace domain or to named testers.
4. Store listing: a description, a 128×128 icon (add `"icons"` to the manifest), at least one 1280×800 or 640×400 screenshot, and a category.
5. Privacy tab:
   - Single purpose: "Copy the text of one user-chosen element on psssbtyping.com when the user presses a chosen key combination."
   - `storage`: saves the user's settings.
   - `clipboardWrite`: writes the element text to the clipboard.
   - `scripting`: registers the content script only on psssbtyping.com.
   - Host permission: psssbtyping.com only.
   - Remote code: **No**. Data collection: **None**.
6. Submit for review. Review usually takes a few days.

## 4. Hosting on your own website

Upload the `docs/` folder to any static host (this repo serves it with GitHub Pages). Its `index.html` tells visitors to download the zip, unzip it and use **Load unpacked**.

**A `.crx` file on a public website will NOT one-click install for normal users on Windows or Mac Chrome.** Chrome blocks off-store installs there. It either refuses the file or installs it disabled. For normal users, the realistic options are the zip with Load unpacked, or the Chrome Web Store (unlisted is fine).

## 5. Enterprise-only self-hosting (managed devices)

This works only on machines whose Chrome is managed by policy: Windows joined to Active Directory or enrolled in Chrome Browser Cloud Management, Mac enrolled in MDM, or Linux.

1. Add `"update_url": "https://YOUR-HOST/updates.xml"` to `manifest.json`.
2. In `chrome://extensions`, use **Pack extension** to build `zeck.crx` and a `.pem` key. Keep the key private, because it fixes the extension ID. Note the ID.
3. Fill in `docs/updates.xml` with the ID, the version and the `.crx` URL, then upload the `.crx` and `updates.xml` over HTTPS.
4. Set these policies through GPO, the Admin console or an MDM profile:
   - `ExtensionInstallSources`: `["https://YOUR-HOST/*"]`
   - `ExtensionInstallAllowlist`: `["EXTENSION_ID"]`, so users may install it.
   - or `ExtensionInstallForcelist`: `["EXTENSION_ID;https://YOUR-HOST/updates.xml"]`, which installs it silently and pins it.
5. For every update, bump `version` in both `manifest.json` and `updates.xml`, repack with the same `.pem`, and upload.
