# Site Element Copy

A Chrome extension (Manifest V3). On one site you choose, pressing 2–6 keys you choose copies the text of one page element to the clipboard.

- It runs only in Chrome, and only on the host you configure (and its subdomains).
- It ignores keys typed in `input`, `textarea`, `select` and contenteditable elements, and keys pressed with Ctrl, Alt or Meta.
- It sends nothing over the network. There is no analytics, no remote code and no `eval`.
- It reads the live page only at the moment you press the trigger. It never polls.

## 1. Install (Load unpacked)

1. Unzip `chrome-element-copy.zip` into a folder you will keep. Chrome loads the extension from that folder, so don't delete it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
5. Done. It comes preset for psssbtyping.com: hold `a` `f` `j` `;` together to copy `#sample-paragraph`.
6. To use a different site, click the toolbar icon, change the fields and click **Save**. When Chrome asks for access to the new site, click **Allow**.

Tabs on that site that are already open start working right away, without a reload.

Chrome may show a "Disable developer mode extensions" notice at startup. This is normal for unpacked extensions.

## 2. Copying a CSS selector from DevTools

1. On the target page, right-click the element and choose **Inspect**.
2. In the Elements panel, right-click the highlighted node and choose **Copy → Copy selector**.
3. Paste it into the **CSS selector** field.

Selectors that DevTools generates can be brittle (for example `#root > div:nth-child(3) > span`). Prefer a stable id or attribute when one exists, such as `#price` or `[data-testid="price"]`. You can test a selector in the DevTools Console with `document.querySelector("...")`.

## Behaviour and limits

- **Sequence** mode: press the keys in order, with no more than 1.5 s between presses. **Chord** mode: hold all the keys down together.
- Example: host `psssbtyping.com`, selector `#sample-paragraph`, keys `afj;`, Chord. Click outside the typing box first, because keys typed into form fields are ignored.
- Keys are case-insensitive. Held-key auto-repeat and IME composition are ignored.
- The trigger fires at most once every 600 ms.
- The copied text is `(innerText || textContent).trim()` of the first element that matches the selector.
- Toasts: green **Copied**, or red **Not configured**, **Invalid selector**, **Element missing**, **Element empty** or **Clipboard blocked**.
- Only the top frame is checked. Elements inside iframes or closed shadow roots are not reachable.
- Chrome does not allow extensions on `chrome://` pages, the Chrome Web Store or other extensions' pages.
- The host field is also matched as a substring of the full URL, so `example.com/shop` limits the extension to URLs that contain that text.

## 3. Publishing to the Chrome Web Store (outline)

1. Register at the Chrome Web Store Developer Dashboard. There is a **one-time $5 developer fee**.
2. Upload `chrome-element-copy.zip`, which has `manifest.json` at the zip root.
3. Choose the visibility:
   - **Public**: listed and searchable.
   - **Unlisted**: installable by anyone who has the link, but not searchable. This is a good fit for a personal or small-team tool.
   - **Private**: limited to your Google Workspace domain or to named testers.
4. Store listing: a description, a 128×128 icon (add `"icons"` to the manifest), at least one 1280×800 or 640×400 screenshot, and a category.
5. Privacy tab:
   - Single purpose: "Copy the text of one user-chosen element on one user-chosen site when the user presses a chosen key combination."
   - `storage`: saves the user's settings.
   - `clipboardWrite`: writes the element text to the clipboard.
   - `scripting`: registers the content script only on the site the user grants.
   - Optional host permissions: requested at runtime for the single host the user enters. No host access is granted at install.
   - Remote code: **No**. Data collection: **None**.
6. Submit for review. Review usually takes a few days.

## 4. Hosting on your own website

Upload the `docs/` folder to any static host (this repo serves it with GitHub Pages). Its `index.html` tells visitors to download the zip, unzip it and use **Load unpacked**.

**A `.crx` file on a public website will NOT one-click install for normal users on Windows or Mac Chrome.** Chrome blocks off-store installs there. It either refuses the file or installs it disabled. For normal users, the realistic options are the zip with Load unpacked, or the Chrome Web Store (unlisted is fine).

## 5. Enterprise-only self-hosting (managed devices)

This works only on machines whose Chrome is managed by policy: Windows joined to Active Directory or enrolled in Chrome Browser Cloud Management, Mac enrolled in MDM, or Linux.

1. Add `"update_url": "https://YOUR-HOST/updates.xml"` to `manifest.json`.
2. In `chrome://extensions`, use **Pack extension** to build `chrome-element-copy.crx` and a `.pem` key. Keep the key private, because it fixes the extension ID. Note the ID.
3. Fill in `docs/updates.xml` with the ID, the version and the `.crx` URL, then upload the `.crx` and `updates.xml` over HTTPS.
4. Set these policies through GPO, the Admin console or an MDM profile:
   - `ExtensionInstallSources`: `["https://YOUR-HOST/*"]`
   - `ExtensionInstallAllowlist`: `["EXTENSION_ID"]`, so users may install it.
   - or `ExtensionInstallForcelist`: `["EXTENSION_ID;https://YOUR-HOST/updates.xml"]`, which installs it silently and pins it.
5. For every update, bump `version` in both `manifest.json` and `updates.xml`, repack with the same `.pem`, and upload.
