const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  warehouse: true,
  invoice: true,
  forms: true,
  iso: true,
  catalog: true,
  suppliers: true,
  buyers: true,
  community: true,
};

function requireString(value, label) {
  const text = String(value || '').trim();
  if (!text) throw new HttpsError('invalid-argument', `${label} is required.`);
  return text;
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  );
}

function profileRef(appId, uid) {
  return db.doc(`artifacts/${appId}/userProfiles/${uid}`);
}

function masterEmail() {
  return String(process.env.MASTER_EMAIL || process.env.VITE_MASTER_EMAIL || '').trim().toLowerCase();
}

async function promoteMaster(appId, uid, email) {
  await profileRef(appId, uid).set(cleanObject({
    uid,
    email: email || '',
    role: 'master',
    status: 'active',
    disabled: false,
    permissions: DEFAULT_PERMISSIONS,
    subscriptionEndsAt: null,
    updatedAt: Date.now(),
  }), { merge: true });

  try {
    await auth.setCustomUserClaims(uid, { master: true, admin: true });
  } catch (err) {
    console.warn('Could not set master custom claims:', err);
  }
}

async function assertMaster(request, appId) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }

  const token = request.auth.token || {};
  if (token.admin === true || token.master === true) return request.auth.uid;

  const email = String(token.email || '').trim().toLowerCase();
  const configuredMasterEmail = masterEmail();
  if (configuredMasterEmail && email === configuredMasterEmail) {
    await promoteMaster(appId, request.auth.uid, token.email);
    return request.auth.uid;
  }

  const snap = await profileRef(appId, request.auth.uid).get();
  if (snap.exists && snap.data()?.role === 'master') return request.auth.uid;

  const masterSnap = await db
    .collection(`artifacts/${appId}/userProfiles`)
    .where('role', '==', 'master')
    .limit(1)
    .get();
  if (masterSnap.empty) {
    await promoteMaster(appId, request.auth.uid, token.email);
    return request.auth.uid;
  }

  throw new HttpsError('permission-denied', 'Only master account can manage users.');
}

function mapAdminError(err) {
  if (err instanceof HttpsError) return err;
  const code = String(err?.code || '');
  const message = String(err?.message || 'Admin operation failed.');
  if (code === 'auth/email-already-exists') {
    return new HttpsError('already-exists', 'This email already exists in Firebase Authentication.');
  }
  if (code === 'auth/user-not-found') {
    return new HttpsError('not-found', 'Firebase Auth user was not found.');
  }
  if (code === 'auth/invalid-password' || code === 'auth/weak-password') {
    return new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }
  if (code === 'auth/invalid-email' || code === 'auth/email-already-in-use') {
    return new HttpsError('invalid-argument', message);
  }
  console.error('Managed auth function failed:', err);
  return new HttpsError('internal', `${code || 'internal'}: ${message}`);
}

function adminCallable(handler) {
  return onCall(async (request) => {
    try {
      return await handler(request);
    } catch (err) {
      throw mapAdminError(err);
    }
  });
}

function authUserToProfile(userRecord, existing, createdBy) {
  const now = Date.now();
  const current = existing || {};
  const role = current.role === 'master' ? 'master' : 'user';
  const authCreatedAt = userRecord.metadata?.creationTime
    ? Date.parse(userRecord.metadata.creationTime)
    : now;
  const authLastLoginAt = userRecord.metadata?.lastSignInTime
    ? Date.parse(userRecord.metadata.lastSignInTime)
    : current.lastLoginAt;
  return cleanObject({
    uid: userRecord.uid,
    email: userRecord.email || current.email || '',
    displayName: userRecord.displayName || current.displayName || '',
    role,
    status: userRecord.disabled ? 'disabled' : (current.status || 'active'),
    disabled: userRecord.disabled === true,
    permissions: role === 'master' ? DEFAULT_PERMISSIONS : (current.permissions || DEFAULT_PERMISSIONS),
    subscriptionStartsAt: current.subscriptionStartsAt || now,
    subscriptionEndsAt: current.subscriptionEndsAt === undefined ? null : current.subscriptionEndsAt,
    createdAt: current.createdAt || authCreatedAt || now,
    updatedAt: now,
    lastLoginAt: authLastLoginAt,
    createdBy: current.createdBy || createdBy,
    notes: current.notes || '',
  });
}

exports.listManagedAuthUsers = adminCallable(async (request) => {
  const appId = requireString(request.data?.appId, 'appId');
  const callerUid = await assertMaster(request, appId);

  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const refs = users.map((u) => profileRef(appId, u.uid));
  const existingSnaps = refs.length ? await db.getAll(...refs) : [];
  const batch = db.batch();

  users.forEach((userRecord, index) => {
    const existing = existingSnaps[index]?.exists ? existingSnaps[index].data() : null;
    batch.set(refs[index], authUserToProfile(userRecord, existing, callerUid), { merge: true });
  });

  if (users.length) await batch.commit();

  return {
    count: users.length,
    users: users.map((u) => ({
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || '',
      disabled: u.disabled === true,
    })),
  };
});

exports.createManagedAuthUser = adminCallable(async (request) => {
  const appId = requireString(request.data?.appId, 'appId');
  const callerUid = await assertMaster(request, appId);
  const email = requireString(request.data?.email, 'email');
  const password = requireString(request.data?.password, 'password');
  const displayName = String(request.data?.displayName || '').trim();
  const now = Date.now();

  const userRecord = await auth.createUser({
    email,
    password,
    displayName: displayName || undefined,
    disabled: false,
  });

  const subscriptionEndsAt =
    typeof request.data?.subscriptionEndsAt === 'number'
      ? request.data.subscriptionEndsAt
      : null;

  const profile = cleanObject({
    uid: userRecord.uid,
    email,
    displayName,
    role: 'user',
    status: 'active',
    disabled: false,
    permissions: request.data?.permissions || DEFAULT_PERMISSIONS,
    subscriptionStartsAt: now,
    subscriptionEndsAt,
    createdAt: now,
    updatedAt: now,
    createdBy: callerUid,
    notes: String(request.data?.notes || ''),
  });

  await profileRef(appId, userRecord.uid).set(profile, { merge: true });

  return { uid: userRecord.uid, email };
});

exports.updateManagedAuthUser = adminCallable(async (request) => {
  const appId = requireString(request.data?.appId, 'appId');
  await assertMaster(request, appId);
  const uid = requireString(request.data?.uid, 'uid');
  if (request.auth.uid === uid && request.data?.disabled === true) {
    throw new HttpsError('failed-precondition', 'Master cannot disable itself.');
  }

  const authPatch = cleanObject({
    email: request.data?.email ? String(request.data.email).trim() : undefined,
    displayName: request.data?.displayName !== undefined ? String(request.data.displayName || '').trim() : undefined,
    password: request.data?.password ? String(request.data.password) : undefined,
    disabled: typeof request.data?.disabled === 'boolean' ? request.data.disabled : undefined,
  });

  if (Object.keys(authPatch).length) {
    await auth.updateUser(uid, authPatch);
  }

  const profilePatch = cleanObject({
    email: authPatch.email,
    displayName: authPatch.displayName,
    disabled: typeof request.data?.disabled === 'boolean' ? request.data.disabled : undefined,
    status: typeof request.data?.disabled === 'boolean'
      ? (request.data.disabled ? 'disabled' : 'active')
      : request.data?.status,
    permissions: request.data?.permissions,
    subscriptionEndsAt: request.data?.subscriptionEndsAt === undefined ? undefined : request.data.subscriptionEndsAt,
    notes: request.data?.notes === undefined ? undefined : String(request.data.notes || ''),
    updatedAt: Date.now(),
  });

  await profileRef(appId, uid).set(profilePatch, { merge: true });

  return { uid };
});

exports.deleteManagedAuthUser = adminCallable(async (request) => {
  const appId = requireString(request.data?.appId, 'appId');
  await assertMaster(request, appId);
  const uid = requireString(request.data?.uid, 'uid');
  if (request.auth.uid === uid) {
    throw new HttpsError('failed-precondition', 'Master cannot delete itself.');
  }

  try {
    await auth.deleteUser(uid);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
  }

  await profileRef(appId, uid).delete();
  return { uid };
});
