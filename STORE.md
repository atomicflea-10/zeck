# Chrome Web Store submission — copy/paste sheet

Upload file: `docs/zeck.zip` (manifest.json at zip root).

## 1. One-time setup
1. Go to https://chrome.google.com/webstore/devconsole and sign in with the Google account that should own the listing.
2. Accept the developer agreement and pay the **$5 one-time fee**.
3. **Account** tab: set a contact email and verify it (the upload is blocked until verified).

## 2. Upload
**Items → New item →** choose `docs/zeck.zip`.

## 3. Store listing tab
- **Description:**

  > Copy the text of one page element with a keyboard chord.
  >
  > On psssbtyping.com, holding a + f + j + ; together copies the text of one element (a CSS selector you set) to your clipboard and shows a short "Copied" toast.
  >
  > The default element is #sample-paragraph. Change it from the settings page (click the toolbar icon).
  >
  > • Works only on psssbtyping.com
  > • Ignores keys typed in text boxes and form fields
  > • No data leaves your browser: no servers, no analytics, no tracking

- **Category:** Productivity (Tools)
- **Language:** English
- **Store icon:** `zeck/icon128.png`
- **Screenshot (required, at least 1):** 1280×800 or 640×400 PNG/JPEG. Take one of psssbtyping.com showing the green "Copied" toast, or of the settings page. Resize to exactly 1280×800.

## 4. Privacy practices tab
- **Single purpose:**
  > Copy the text of one user-chosen element on psssbtyping.com to the clipboard when the user presses a chosen key combination.
- **storage:** Saves the user's settings (the CSS selector).
- **clipboardWrite:** Writes the chosen element's text to the clipboard when the user presses the trigger keys.
- **scripting:** Registers the content script only on psssbtyping.com.
- **Host permission (psssbtyping.com):** The content script must run on psssbtyping.com to read the chosen element's text when the trigger keys are pressed.
- **Remote code:** No, I am not using remote code.
- **Data usage:** tick nothing (no data collected). Tick all three certifications (not sold, not used for unrelated purposes, not used for creditworthiness).
- **Privacy policy URL:** not required when no user data is collected; if the form insists, use `https://atomicflea-10.github.io/zeck/`.

## 5. Distribution tab
- **Visibility:** **Unlisted** (anyone with the link can install; not searchable). Choose Public if you want it searchable.
- **Regions:** All regions.

## 6. Submit for review
Review usually takes a few days. Once approved, the listing gets a link like
`https://chromewebstore.google.com/detail/<id>` with a one-click **Add to Chrome** button.
Put that link on the GitHub page.

## Updating later
Bump `version` in `manifest.json`, rebuild the zip, then **Package → Upload new package** in the dashboard and submit again. Installed copies update automatically.
