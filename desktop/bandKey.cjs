'use strict';
/**
 * KAWSAY desktop — one-time Zepp sign-in that fetches the band's pairing key (P1).
 *
 * The crew signs in on the Connect screen; the main process (this file) talks to Zepp's
 * servers over Node's own TLS and returns the band key. It runs only when the user submits
 * the form, so it stays outside the app's offline guarantee (the renderer never reaches the
 * network). The password is sent to Zepp exactly as the official app sends it — encrypted —
 * and is never stored, logged, or kept after the request.
 *
 * HTTP flow reimplemented from the MIT-licensed huami-token
 * (https://codeberg.org/argrento/huami-token, © 2025 Kirill Snezhko). No code was copied.
 */
const https = require('node:https');
const { createCipheriv, randomUUID, randomBytes } = require('node:crypto');

const ZEPP = {
  tokens: 'https://api-user-us2.zepp.com/v2/registrations/tokens',
  login: 'https://api-mifit-us2.zepp.com/v2/client/login',
  devices: (userId) => `https://api-mifit.zepp.com/users/${userId}/devices`,
};
// Fixed key/iv the Zepp app uses to wrap the login payload (public, from the app).
const ENC_KEY = Buffer.from('xeNtBVqzDc6tuNTh');
const ENC_IV = Buffer.from('MAAAYAAAAAAAAABg');

const form = (obj) =>
  Object.entries(obj)
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

function encryptPayload(text) {
  const cipher = createCipheriv('aes-128-cbc', ENC_KEY, ENC_IV); // PKCS#7 padding on by default
  return Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]);
}

/** Minimal HTTPS call over Node's TLS, so it never goes through Electron's offline filter. */
function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    const h = { ...headers };
    if (payload) h['content-length'] = payload.length;
    const req = https.request(url, { method, headers: h }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('Zepp did not answer. Check the internet connection and try again.')));
    if (payload) req.write(payload);
    req.end();
  });
}

async function getAccessToken(email, password) {
  const body = encryptPayload(
    form({
      emailOrPhone: email,
      state: 'REDIRECTION',
      client_id: 'HuaMi',
      password,
      redirect_uri: 'https://s3-us-west-2.amazonaws.com/hm-registration/successsignin.html',
      region: 'us-west-2',
      token: ['access', 'refresh'],
      country_code: 'US',
    }),
  );
  const res = await request(ZEPP.tokens, {
    method: 'POST',
    headers: {
      appname: 'com.huami.midong',
      app_name: 'com.huami.midong',
      cv: '151689_9.12.5',
      v: '2.0',
      appplatform: 'android_phone',
      vn: '9.12.5',
      'x-hm-ekv': '1',
      'user-agent': 'Zepp/9.12.5 (Pixel 4; Android 12; Density/2.75)',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body,
  });
  const location = res.headers.location;
  if (res.status !== 303 || !location) {
    throw new Error('Zepp did not accept the sign-in. Check the email and password for the account your Zepp Life app uses.');
  }
  const access = new URL(location).searchParams.get('access');
  if (!access) throw new Error(location.includes('error') ? 'Wrong email or password for that Zepp account.' : 'Zepp replied without a sign-in token.');
  return access;
}

async function login(access) {
  const res = await request(ZEPP.login, {
    method: 'POST',
    headers: {
      appname: 'com.huami.webapp',
      app_name: 'com.huami.webapp',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
    },
    body: form({
      code: access,
      device_id: randomUUID(),
      device_model: 'android_phone',
      app_version: '9.12.5',
      third_name: 'huami',
      app_name: 'com.huami.midong',
      country_code: 'US',
      grant_type: 'access_token',
      allow_registration: 'false',
      lang: 'en',
    }),
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Zepp sign-in failed (HTTP ${res.status}).`);
  const info = (JSON.parse(res.text).token_info) ?? {};
  if (!info.app_token || !info.user_id) throw new Error('Zepp did not return an account token.');
  return { appToken: info.app_token, userId: info.user_id };
}

async function getDevices({ appToken, userId }) {
  const params = new URLSearchParams({
    userid: userId,
    appid: String(randomBytes(8).readBigUInt64BE()),
    country: 'US',
    cv: '151689_9.12.5',
    device: 'android_32',
    device_type: 'android_phone',
    enableMultiDevice: 'true',
    lang: 'en_US',
    v: '2.0',
  });
  params.append('r', randomUUID());
  const res = await request(`${ZEPP.devices(userId)}?${params}`, {
    headers: {
      appname: 'com.huami.midong',
      apptoken: appToken,
      country: 'US',
      cv: '151689_9.12.5',
      v: '2.0',
      'user-agent': 'Zepp/9.12.5 (Pixel 4; Android 12; Density/2.75)',
    },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`Could not read your devices (HTTP ${res.status}).`);
  const items = (JSON.parse(res.text).items) ?? [];
  return items.map((d) => {
    let authKey = null;
    try {
      authKey = JSON.parse(d.additionalInfo ?? '{}').auth_key ?? null;
    } catch {
      authKey = null;
    }
    return { mac: d.macAddress ?? '??', active: Boolean(d.activeStatus), name: d.deviceSource ?? d.deviceType ?? 'device', authKey };
  });
}

/**
 * Sign in to Zepp and return the band key(s). Resolves to a plain, serialisable result so it
 * can cross the IPC boundary: { ok: true, keys: [{ mac, key }] } or { ok: false, error }.
 */
async function fetchBandKey(email, password) {
  try {
    if (!email || !password) return { ok: false, error: 'Enter the email and password of your Zepp Life account.' };
    const devices = await getDevices(await login(await getAccessToken(String(email).trim(), String(password))));
    const keys = devices
      .filter((d) => d.authKey && /^[0-9a-f]{32}$/i.test(d.authKey))
      .map((d) => ({ mac: d.mac, name: d.name, active: d.active, key: '0x' + d.authKey.toLowerCase() }));
    if (keys.length === 0) {
      return { ok: false, error: 'Signed in, but no band with a key was found on this account. Use the account your Zepp Life / Mi Fitness app is signed into.' };
    }
    return { ok: true, keys };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Zepp.' };
  }
}

module.exports = { fetchBandKey };
