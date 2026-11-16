/*
 * UPRIGHT — band key via the browser (no install), for bands on a Xiaomi / phone-number
 * account that the Node tool can't sign into.
 *
 * HOW TO USE:
 *   1. Open https://watchface.zepp.com/ and sign in with the SAME account your band is
 *      linked to (the account the Xiaomi / Zepp Life / Amazfit app uses).
 *   2. Open the browser console: press F12 (or Ctrl+Shift+I) and click "Console".
 *   3. Paste this whole file and press Enter.
 *   4. It prints your band's key as 0x... and copies the first one to the clipboard.
 *      Paste it into UPRIGHT -> Connect -> Band key.
 *
 * This runs inside your logged-in Zepp session and only calls Zepp's own servers, using
 * the login you already made. It reuses the Gadgetbridge community approach
 * (https://gadgetbridge.org/basics/pairing/huami-xiaomi-server/) and adds key extraction.
 * Nothing is sent anywhere else; UPRIGHT never sees your password.
 */
(async () => {
  const cookie = (name) => document.cookie.match(new RegExp(`${name}=(.*?)(;|$)`))?.[1];
  const info = cookie('hm-user-login-info');

  let userId, appToken;
  if (info) {
    const t = JSON.parse(decodeURIComponent(info).replaceAll('%2C', ',')).token_info ?? {};
    userId = t.user_id;
    appToken = t.app_token;
  } else {
    userId = cookie('userid')?.replaceAll('%2C', ',');
    appToken = cookie('apptoken')?.replaceAll('%2C', ',');
  }
  if (!userId || !appToken) {
    alert('Not signed in. Open https://watchface.zepp.com/, sign in with the account your band is linked to, then run this again.');
    return;
  }

  // The account's data may live in any region; try the common API hosts.
  const hosts = ['api-mifit-us2.zepp.com', 'api-mifit-us3.zepp.com', 'api-mifit.zepp.com', 'api-mifit-de2.zepp.com'];
  const params = new URLSearchParams({
    appid: '2882303761517383915', channel: 'play', enableMultiDevice: 'true', device_type: 'android_phone',
    cv: '151262_8.7.1-play', device: 'android_33', v: '2.0', lang: 'en_US', country: 'US',
  });
  const headers = {
    apptoken: appToken, channel: 'play', appname: 'com.huami.midong', appplatform: 'android_phone',
    cv: '151262_8.7.1-play', v: '2.0', lang: 'en_US', country: 'US',
    'hm-privacy-diagnostics': 'false', 'hm-privacy-ceip': 'true',
  };

  let items = null;
  for (const host of hosts) {
    try {
      const res = await fetch(`https://${host}/users/${userId}/devices?${params}`, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length) { items = data.items; break; }
    } catch {
      /* try the next host */
    }
  }
  if (!items) {
    alert('Signed in, but no band was found on this account. Make sure the band is bound to THIS account.');
    return;
  }

  const keys = [];
  for (const d of items) {
    let authKey = null;
    try {
      authKey = JSON.parse(d.additionalInfo ?? '{}').auth_key ?? null;
    } catch {
      authKey = null;
    }
    if (authKey && /^[0-9a-f]{32}$/i.test(authKey)) {
      const mac = d.macAddress ?? '??';
      keys.push({ mac, key: '0x' + authKey.toLowerCase() });
    }
  }
  if (!keys.length) {
    alert('Found a device but no usable key. It may be a watch that uses a different key — try the other methods in tools/README-band-key.md.');
    return;
  }

  console.log('%cYour UPRIGHT band key(s):', 'font-size:14px;font-weight:bold');
  for (const k of keys) console.log(`${k.mac}:  ${k.key}`);
  try {
    await navigator.clipboard.writeText(keys[0].key);
    alert(`Band key copied to the clipboard:\n\n${keys[0].key}\n\nPaste it into UPRIGHT -> Connect -> Band key. Save it somewhere safe too.`);
  } catch {
    alert(`Your band key is:\n\n${keys[0].key}\n\nCopy it into UPRIGHT -> Connect -> Band key, and save it somewhere safe.`);
  }
})();
