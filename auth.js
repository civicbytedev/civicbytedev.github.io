// ============================================================
//  CivicByte — Firebase Auth + Guard
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyA-i19VebFlGHrcyQ5htRqxxb7iRSawhPE",
  authDomain:        "civicbyte-account.firebaseapp.com",
  projectId:         "civicbyte-account",
  storageBucket:     "civicbyte-account.firebasestorage.app",
  messagingSenderId: "360954712807",
  appId:             "1:360954712807:web:444c0ca954a56d87534842"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

const auth = firebase.auth();
const db   = firebase.firestore();

// ── requireAuth ──────────────────────────────────────────────
function requireAuth() {
  document.documentElement.style.visibility = 'hidden';
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      sessionStorage.setItem('cb_redirect', window.location.href);
      window.location.replace('/login.html');
    } else {
      db.doc('users/' + user.uid)
        .set({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        .catch(function () {});
      _injectNavUser(user);
      document.documentElement.style.visibility = 'visible';
    }
  });
}

// ── createUserProfile ────────────────────────────────────────
function createUserProfile(user, displayName) {
  return db.doc('users/' + user.uid).set({
    uid:         user.uid,
    email:       user.email,
    displayName: displayName || '',
    createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin:   firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// ── _injectNavUser ───────────────────────────────────────────
// Desktop: person-icon button + dropdown appended to .nav (hidden on mobile via CSS)
// Mobile:  name label + sign-out button appended inside .nav-links
function _injectNavUser(user) {
  var nav      = document.querySelector('.nav');
  var navLinks = document.querySelector('.nav-links');
  if (!nav || !navLinks) return;

  var name    = user.displayName || user.email.split('@')[0];
  var escaped = _esc(name);

  // ── 1. Desktop user icon + dropdown ──────────────────────
  var wrapper = document.createElement('div');
  wrapper.className = 'nav-user-menu';
  wrapper.innerHTML =
    '<button class="nav-user-btn" aria-label="Account menu" aria-haspopup="true" aria-expanded="false">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="8" r="4"/>' +
        '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
      '</svg>' +
    '</button>' +
    '<div class="nav-user-dropdown" role="menu">' +
      '<div class="nav-user-dropdown-name">' + escaped + '</div>' +
      '<button class="nav-user-dropdown-item signout" role="menuitem">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
          '<polyline points="16 17 21 12 16 7"/>' +
          '<line x1="21" y1="12" x2="9" y2="12"/>' +
        '</svg>' +
        'Sign out' +
      '</button>' +
    '</div>';

  nav.appendChild(wrapper);

  var btn        = wrapper.querySelector('.nav-user-btn');
  var dropdown   = wrapper.querySelector('.nav-user-dropdown');
  var signoutBtn = wrapper.querySelector('.nav-user-dropdown-item.signout');

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  if (signoutBtn) {
    signoutBtn.addEventListener('click', function () {
      firebase.auth().signOut();
    });
  }
  document.addEventListener('click', function () {
    dropdown.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });

  // ── 2. Mobile user section (inside .nav-links, hidden on desktop) ──
  var mobileUser = document.createElement('div');
  mobileUser.className = 'nav-mobile-user';
  mobileUser.innerHTML =
    '<div class="nav-mobile-user-name">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="8" r="4"/>' +
        '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
      '</svg>' +
      '<span>' + escaped + '</span>' +
    '</div>' +
    '<button class="nav-mobile-signout">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
        '<polyline points="16 17 21 12 16 7"/>' +
        '<line x1="21" y1="12" x2="9" y2="12"/>' +
      '</svg>' +
      'Sign out' +
    '</button>';

  navLinks.appendChild(mobileUser);

  mobileUser.querySelector('.nav-mobile-signout').addEventListener('click', function () {
    firebase.auth().signOut();
  });
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}
