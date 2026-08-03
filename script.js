document.addEventListener('DOMContentLoaded', function () {

  /* ==========================================================
     THEME TOGGLE (light / dark)
     ========================================================== */
  var THEME_KEY = 'roomiefind_theme';
  var root = document.documentElement;
  var themeToggleButtons = document.querySelectorAll('#themeToggle, #themeToggleAuth');

  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (err) {
      /* localStorage unavailable */
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    themeToggleButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* localStorage unavailable — theme won't persist across visits */
    }
  }

  applyTheme(getPreferredTheme());

  themeToggleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  /* ==========================================================
     0. LOGIN / SIGN UP GATE
     ========================================================== */
  var AUTH_KEY = 'roomiefind_auth';

  var authScreen = document.getElementById('authScreen');
  var siteContent = document.getElementById('siteContent');

  var loginTab = document.getElementById('loginTab');
  var signupTab = document.getElementById('signupTab');
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  var switchToSignup = document.getElementById('switchToSignup');
  var switchToLogin = document.getElementById('switchToLogin');
  var logoutLink = document.getElementById('logoutLink');

  function showSite() {
    authScreen.classList.add('auth-screen--hidden');
    siteContent.classList.add('site-content--visible');
  }

  function showAuthScreen() {
    siteContent.classList.remove('site-content--visible');
    authScreen.classList.remove('auth-screen--hidden');
    showTab('login');
  }

  function showTab(which) {
    var isLogin = which === 'login';
    loginTab.classList.toggle('auth-tab--active', isLogin);
    signupTab.classList.toggle('auth-tab--active', !isLogin);
    loginForm.classList.toggle('auth-form--active', isLogin);
    signupForm.classList.toggle('auth-form--active', !isLogin);
  }

  loginTab.addEventListener('click', function () { showTab('login'); });
  signupTab.addEventListener('click', function () { showTab('signup'); });
  switchToSignup.addEventListener('click', function (e) { e.preventDefault(); showTab('signup'); });
  switchToLogin.addEventListener('click', function (e) { e.preventDefault(); showTab('login'); });

  function setError(id, message) {
    var el = document.getElementById(id);
    if (el) el.textContent = message || '';
  }

  function clearErrors(ids) {
    ids.forEach(function (id) { setError(id, ''); });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // ---- Log In ----
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors(['loginEmailError', 'loginPasswordError']);

    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var hasError = false;

    if (!email) {
      setError('loginEmailError', 'Email is required.');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setError('loginEmailError', 'Enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      setError('loginPasswordError', 'Password is required.');
      hasError = true;
    }

    if (hasError) return;

    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ email: email }));
    } catch (err) {
      /* localStorage unavailable — continue without persistence */
    }

    showSite();
  });

  // ---- Sign Up ----
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors([
      'signupNameError',
      'signupEmailError',
      'signupPasswordError',
      'signupConfirmPasswordError',
      'agreeTermsError'
    ]);

    var name = document.getElementById('signupName').value.trim();
    var email = document.getElementById('signupEmail').value.trim();
    var password = document.getElementById('signupPassword').value;
    var confirmPassword = document.getElementById('signupConfirmPassword').value;
    var agreeTerms = document.getElementById('agreeTerms').checked;
    var hasError = false;

    if (!name) {
      setError('signupNameError', 'Full name is required.');
      hasError = true;
    }

    if (!email) {
      setError('signupEmailError', 'Email is required.');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setError('signupEmailError', 'Enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      setError('signupPasswordError', 'Password is required.');
      hasError = true;
    } else if (password.length < 8) {
      setError('signupPasswordError', 'Use at least 8 characters.');
      hasError = true;
    }

    if (confirmPassword !== password || !confirmPassword) {
      setError('signupConfirmPasswordError', 'Passwords do not match.');
      hasError = true;
    }

    if (!agreeTerms) {
      setError('agreeTermsError', 'You must agree to continue.');
      hasError = true;
    }

    if (hasError) return;

    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ name: name, email: email }));
    } catch (err) {
      /* localStorage unavailable — continue without persistence */
    }

    showSite();
  });

  // Skip the gate if already "logged in" from a previous visit
  try {
    if (localStorage.getItem(AUTH_KEY)) {
      showSite();
    }
  } catch (err) {
    /* localStorage unavailable — always show the gate */
  }

  /* ==========================================================
     1. USER MENU DROPDOWN
     ========================================================== */
  var button = document.getElementById('userMenuButton');
  var dropdown = document.getElementById('userDropdown');

  if (button && dropdown) {
    var openDropdown = function () {
      dropdown.classList.add('user-dropdown--open');
      button.setAttribute('aria-expanded', 'true');
    };

    var closeDropdown = function () {
      dropdown.classList.remove('user-dropdown--open');
      button.setAttribute('aria-expanded', 'false');
    };

    var isOpen = function () {
      return dropdown.classList.contains('user-dropdown--open');
    };

    button.addEventListener('click', function (event) {
      event.stopPropagation();
      isOpen() ? closeDropdown() : openDropdown();
    });

    document.addEventListener('click', function (event) {
      if (isOpen() && !dropdown.contains(event.target) && !button.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        closeDropdown();
        button.focus();
      }
    });

    if (logoutLink) {
      logoutLink.addEventListener('click', function (event) {
        event.preventDefault();
        closeDropdown();
        try {
          localStorage.removeItem(AUTH_KEY);
        } catch (err) {
          /* localStorage unavailable */
        }
        showAuthScreen();
      });
    }
  }

  /* ==========================================================
     2. BOOKING DETAILS / SCHEDULE A TOUR MODAL
     ========================================================== */
  var bookingModal = document.getElementById('bookingModal');
  var scheduleTourBtn = document.getElementById('scheduleTourBtn');
  var viewBookingDetailsBtn = document.getElementById('viewBookingDetailsBtn');
  var bookingModalClose = document.getElementById('bookingModalClose');
  var tourTab = document.getElementById('tourTab');
  var detailsTab = document.getElementById('detailsTab');
  var tourPane = document.getElementById('tourPane');
  var detailsPane = document.getElementById('detailsPane');
  var tourForm = document.getElementById('tourForm');
  var tourSuccess = document.getElementById('tourSuccess');
  var tourSuccessClose = document.getElementById('tourSuccessClose');

  function showBookingTab(which) {
    var isTour = which === 'tour';
    tourTab.classList.toggle('modal-tab--active', isTour);
    detailsTab.classList.toggle('modal-tab--active', !isTour);
    tourPane.classList.toggle('modal-pane--active', isTour);
    detailsPane.classList.toggle('modal-pane--active', !isTour);
  }

  function resetTourForm() {
    tourForm.style.display = '';
    tourSuccess.classList.remove('modal-success--visible');
    tourForm.reset();
    ['tourDateError', 'tourTimeError', 'tourPhoneError'].forEach(function (id) {
      setError(id, '');
    });
  }

  function openBookingModal(tab) {
    resetTourForm();
    showBookingTab(tab || 'tour');
    bookingModal.classList.add('modal-overlay--open');
  }

  function closeBookingModal() {
    bookingModal.classList.remove('modal-overlay--open');
  }

  if (bookingModal) {
    if (scheduleTourBtn) {
      scheduleTourBtn.addEventListener('click', function () { openBookingModal('tour'); });
    }
    if (viewBookingDetailsBtn) {
      viewBookingDetailsBtn.addEventListener('click', function () { openBookingModal('details'); });
    }
    if (bookingModalClose) {
      bookingModalClose.addEventListener('click', closeBookingModal);
    }
    tourTab.addEventListener('click', function () { showBookingTab('tour'); });
    detailsTab.addEventListener('click', function () { showBookingTab('details'); });

    bookingModal.addEventListener('click', function (event) {
      if (event.target === bookingModal) closeBookingModal();
    });

    tourForm.addEventListener('submit', function (e) {
      e.preventDefault();
      setError('tourDateError', '');
      setError('tourTimeError', '');
      setError('tourPhoneError', '');

      var date = document.getElementById('tourDate').value;
      var time = document.getElementById('tourTime').value;
      var phone = document.getElementById('tourPhone').value.trim();
      var hasError = false;

      if (!date) {
        setError('tourDateError', 'Pick a date for your tour.');
        hasError = true;
      }
      if (!time) {
        setError('tourTimeError', 'Choose a preferred time.');
        hasError = true;
      }
      if (!phone) {
        setError('tourPhoneError', 'A contact phone helps the host reach you.');
        hasError = true;
      }

      if (hasError) return;

      tourForm.style.display = 'none';
      tourSuccess.classList.add('modal-success--visible');
    });

    if (tourSuccessClose) {
      tourSuccessClose.addEventListener('click', closeBookingModal);
    }
  }

  /* ==========================================================
     3. CHAT WITH OWNER MODAL
     ========================================================== */
  var chatModal = document.getElementById('chatModal');
  var chatWithHostBtn = document.getElementById('chatWithHostBtn');
  var chatModalClose = document.getElementById('chatModalClose');
  var chatThread = document.getElementById('chatThread');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');

  var HOST_REPLIES = [
    "Thanks for the message! I'll get back to you shortly.",
    "Great question — the room is available for a tour this week if you'd like to see it in person.",
    "Sure thing, let me check and confirm with you soon!"
  ];
  var replyIndex = 0;

  function scrollChatToBottom() {
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function formatTime() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + period;
  }

  function appendMessage(text, mine) {
    var message = document.createElement('div');
    message.className = 'chat-message ' + (mine ? 'chat-message--mine' : 'chat-message--theirs');

    var avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.alt = mine ? 'You' : 'Sarah Jenkins';
    avatar.src = mine
      ? 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=100&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

    var wrap = document.createElement('div');

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    var meta = document.createElement('div');
    meta.className = 'chat-meta';
    meta.textContent = (mine ? 'You' : 'Sarah Jenkins') + ' • ' + formatTime();

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    message.appendChild(avatar);
    message.appendChild(wrap);
    chatThread.appendChild(message);
    scrollChatToBottom();
  }

  if (chatModal) {
    if (chatWithHostBtn) {
      chatWithHostBtn.addEventListener('click', function () {
        chatModal.classList.add('modal-overlay--open');
        scrollChatToBottom();
        chatInput.focus();
      });
    }
    if (chatModalClose) {
      chatModalClose.addEventListener('click', function () {
        chatModal.classList.remove('modal-overlay--open');
      });
    }
    chatModal.addEventListener('click', function (event) {
      if (event.target === chatModal) chatModal.classList.remove('modal-overlay--open');
    });

    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = chatInput.value.trim();
      if (!text) return;

      appendMessage(text, true);
      chatInput.value = '';

      window.setTimeout(function () {
        appendMessage(HOST_REPLIES[replyIndex % HOST_REPLIES.length], false);
        replyIndex += 1;
      }, 900);
    });
  }
});