/**
 * Auth: password hashing, sessions, role checks.
 *
 * Workers has no bcrypt, so passwords use PBKDF2-SHA256 via WebCrypto —
 * same primitive family bcrypt would use, with the same role.
 */

import { getDB, one, run, uid } from './db';

const ITERATIONS = 100_000;
const KEY_LEN = 32;
const SALT_LEN = 16;

const enc = new TextEncoder();

function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(str) {
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Return "iterations:salt:hash" */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LEN * 8
  );
  return `${ITERATIONS}:${toB64(salt)}:${toB64(bits)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [iterStr, saltB64, hashB64] = String(stored).split(':');
    const iterations = Number(iterStr);
    const salt = fromB64(saltB64);
    const expected = fromB64(hashB64);

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      expected.length * 8
    );
    const actual = new Uint8Array(bits);

    /* constant-time compare */
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* sessions                                                            */
/* ------------------------------------------------------------------ */

const SESSION_DAYS = 7;
const COOKIE = 'bd_session';

export async function createSession(userId) {
  const token = toB64(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();

  await run(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    token,
    userId,
    expires
  );

  return { token, expires };
}

export async function destroySession(token) {
  await run('DELETE FROM sessions WHERE token = ?', token);
}

export async function getSessionUser(token) {
  if (!token) return null;

  const row = await one(
    `SELECT u.id, u.email, u.name, u.role, u.active, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    token
  );

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await run('DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  if (row.active !== 1) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role
  };
}

export function sessionCookie(token, expires) {
  const maxAge = Math.floor((new Date(expires).getTime() - Date.now()) / 1000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { COOKIE as SESSION_COOKIE };

/* ------------------------------------------------------------------ */
/* roles                                                               */
/* ------------------------------------------------------------------ */

/**
 * Field-level permissions. Cost prices are only visible to admin —
 * sales must not see them, factory staff must not see prices at all.
 */
export const PERMISSIONS = {
  admin: {
    products: 'write', inventory: 'write', pricing: 'write', cost: true,
    content: 'write', media: 'write', inquiries: 'write', users: 'write', settings: 'write'
  },
  sales: {
    products: 'read', inventory: 'read', pricing: 'write', cost: false,
    content: 'read', media: 'read', inquiries: 'write', users: 'none', settings: 'none'
  },
  content: {
    products: 'write', inventory: 'none', pricing: 'read', cost: false,
    content: 'write', media: 'write', inquiries: 'read', users: 'none', settings: 'read'
  },
  factory: {
    products: 'read', inventory: 'write', pricing: 'none', cost: false,
    content: 'none', media: 'none', inquiries: 'none', users: 'none', settings: 'none'
  },
  viewer: {
    products: 'read', inventory: 'read', pricing: 'read', cost: false,
    content: 'read', media: 'read', inquiries: 'none', users: 'none', settings: 'none'
  }
};

export function can(role, area, action = 'read') {
  const perm = PERMISSIONS[role];
  if (!perm) return false;
  if (perm[area] === 'write') return true;
  return perm[area] === action;
}

export function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/** Read the current user from the request cookies. */
export async function currentUser(request) {
  const token = readCookie(request.headers.get('Cookie') || '', COOKIE);
  if (!token) return null;
  return getSessionUser(token);
}

/* ------------------------------------------------------------------ */
/* seeding                                                             */
/* ------------------------------------------------------------------ */

/** Create the first admin account if the table is empty. */
export async function ensureAdminExists(email, password) {
  const existing = await one('SELECT id FROM users LIMIT 1');
  if (existing) return null;

  const id = uid('usr');
  await run(
    'INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    id,
    email,
    'Administrator',
    await hashPassword(password),
    'admin'
  );
  return id;
}