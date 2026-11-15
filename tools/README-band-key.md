# Getting your Xiaomi band key for KAWSAY

KAWSAY talks to a Xiaomi/Huami band (Mi Band 4, 5, 6; Amazfit) directly over Bluetooth, with
no Xiaomi app and no internet during use. To do that it needs the band's **pairing key** once.

## Why a key is needed, and why it can't come over Bluetooth

The key is a 16-byte secret Xiaomi creates when the band is first bound in its app, and keeps
on Xiaomi's servers. When KAWSAY connects, the band sends a random number and checks that
KAWSAY can encrypt it with the key — **the band never sends the key itself**, so it cannot be
read over Bluetooth. Mi Band 4 and newer also refuse a key invented by a third-party app
(older Mi Band 2/3 allowed that). So the key has to be fetched once from your account. After
that, KAWSAY ↔ band is pure Bluetooth — the Xiaomi app is never needed again.

You only do this once per band. Resetting or re-pairing the band in the Xiaomi app changes the
key, so you would fetch it again.

## Method 1 — the bundled tool (band on a Zepp / Zepp Life / Amazfit email account)

Needs Node 20+ and internet, once:

```bash
node tools/get-band-key.mjs
```

Enter the email and password of the account the band is bound to. It prints the band's MAC and
a key like `0x1a2b3c…`. Paste that into KAWSAY → **Connect** → **Band key**. Your password goes
only to Zepp's own servers (encrypted, the same way the app sends it) and is never stored.

## Method 2 — browser, no install (band on a Xiaomi phone-number account)

If Method 1 says it found no band, your band is probably on a Xiaomi account. Use the
bundled browser script instead — it runs on Zepp's own site using the login you already have:

1. Open <https://watchface.zepp.com/> and sign in with the account the band is linked to.
2. Open the browser console: press **F12** (or `Ctrl + Shift + I`) and click **Console**.
3. Open `tools/get-band-key-browser.js`, copy the whole file, paste it into the console, press Enter.
4. It prints your band's key as `0x…` and copies it to the clipboard. Paste it into
   KAWSAY → **Connect** → **Band key**, and save it somewhere safe.

This reuses your signed-in Zepp session and only calls Zepp's servers; KAWSAY never sees your
password. It is an extended version of the community snippet from the
[Gadgetbridge guide](https://gadgetbridge.org/basics/pairing/huami-xiaomi-server/).

## Method 3 — from the phone (last resort)

The key is also in the Xiaomi app's own files on the phone (fields `auth_key`, `authKey`,
`encryptKey`). The Gadgetbridge guide above describes reading it from the app logs or, on a
rooted phone, the app database.

## No key at all

Any standard Bluetooth **heart-rate chest strap or armband** (Polar H9/H10, CooSpo, Wahoo,
Magene, and similar) works in KAWSAY with no key and no account — just open **Connect** and pick
it. For a demo where setup has to be instant, that is the simplest path.

---

The cloud flow in `get-band-key.mjs` is reimplemented from the MIT-licensed
[huami-token](https://codeberg.org/argrento/huami-token) (© 2025 Kirill Snezhko); no code was
copied. KAWSAY never stores the key in the repository — you paste it into the app, where it
stays in that computer's local storage only.
