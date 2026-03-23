// ============================================================
//  CivicByte — Firebase Auth + Guard
//  Fill in firebaseConfig below with your project credentials.
//  Get them from: Firebase Console → Project Settings → Your apps
// ============================================================

const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID"
};

// Prevent double-init when auth.js is loaded on multiple navigations
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();

// ── requireAuth ──────────────────────────────────────────────
// Call once at the top of every protected page's <body>.
// Hides content until auth state resolves to prevent flash.
function requireAuth() {
    document.documentElement.style.visibility = 'hidden';

    auth.onAuthStateChanged(function (user) {
        if (!user) {
            sessionStorage.setItem('cb_redirect', window.location.href);
            window.location.replace('/login.html');
        } else {
            // Update lastLogin (non-blocking)
            db.doc('users/' + user.uid)
              .set({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
              .catch(function () {}); // silently ignore if rules not yet set

            // Inject user badge + sign-out into nav
            _injectNavUser(user);

            document.documentElement.style.visibility = 'visible';
        }
    });
}

// ── createUserProfile ────────────────────────────────────────
// Call after a successful registration to persist the profile.
function createUserProfile(user, displayName) {
    return db.doc('users/' + user.uid).set({
        uid:         user.uid,
        email:       user.email,
        displayName: displayName || '',
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin:   firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

// ── _injectNavUser ────────────────────────────────────────────
// Appends a user pill + sign-out link to .nav-links on every page.
function _injectNavUser(user) {
    var links = document.querySelector('.nav-links');
    if (!links) return;

    var name = user.displayName || user.email.split('@')[0];

    var pill = document.createElement('span');
    pill.className = 'nav-user-pill';
    pill.innerHTML =
        '<span class="nav-user-name">' + _esc(name) + '</span>' +
        '<a href="#" class="nav-signout" onclick="firebase.auth().signOut();return false;">Sign out</a>';
    links.appendChild(pill);
}

function _esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
