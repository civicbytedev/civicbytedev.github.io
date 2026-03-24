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

// ── requireAuth ────────────────────────────────────────────
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

// ── createUserProfile ──────────────────────────────────────
function createUserProfile(user, displayName) {
        return db.doc('users/' + user.uid).set({
                  uid: user.uid,
                  email: user.email,
                  displayName: displayName || '',
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
}

// ── _injectNavUser ─────────────────────────────────────────
// Replaces sign-in area with a person-icon button + dropdown
function _injectNavUser(user) {
        var links = document.querySelector('.nav-links');
        if (!links) return;

  var name = user.displayName || user.email.split('@')[0];
        var initials = name.charAt(0).toUpperCase();

  // Build the user menu widget
  var wrapper = document.createElement('div');
        wrapper.className = 'nav-user-menu';
        wrapper.setAttribute('style',
                                 'position:relative;display:inline-flex;align-items:center;margin-left:0.25rem;');

  wrapper.innerHTML =
            '<button class="nav-user-btn" aria-label="Account menu" onclick="' +
              'var d=this.nextElementSibling;' +
              'd.classList.toggle(\'open\');' +
              'event.stopPropagation();' +
            '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="8" r="4"/>' +
                '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
              '</svg>' +
            '</button>' +
            '<div class="nav-user-dropdown">' +
              '<div class="nav-user-dropdown-name">' + _esc(name) + '</div>' +
              '<a href="#" class="nav-user-dropdown-item signout" onclick="firebase.auth().signOut();return false;">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
                  '<polyline points="16 17 21 12 16 7"/>' +
                  '<line x1="21" y1="12" x2="9" y2="12"/>' +
                '</svg>' +
                'Sign out' +
              '</a>' +
            '</div>';

  links.appendChild(wrapper);

  // Close dropdown on outside click
  document.addEventListener('click', function() {
            var d = document.querySelector('.nav-user-dropdown');
            if (d) d.classList.remove('open');
  });
}

function _esc(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g,  '&lt;')
          .replace(/>/g,  '&gt;')
          .replace(/"/g,  '&quot;');
}
