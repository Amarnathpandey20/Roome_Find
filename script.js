document.addEventListener('DOMContentLoaded', function () {

  /* ==========================================================
     CONFIG & STATE
     ========================================================== */
  var THEME_KEY = 'roomiefind_theme';
  var TOKEN_KEY = 'roomiefind_token';
  var USER_KEY = 'roomiefind_user';
  var AUTH_LEGACY_KEY = 'roomiefind_auth';

  var root = document.documentElement;
  var currentSelectedListing = null;
  var allListings = [];
  var currentFilters = {
    search: '',
    minPrice: '',
    maxPrice: '',
    roomType: '',
    petFriendly: false,
    furnished: false,
    privateBath: false,
    verifiedLandlord: false,
    utilitiesIncluded: false,
    vibe: '',
    moveIn: ''
  };

  /* ==========================================================
     HELPERS & TOASTS
     ========================================================== */
  function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast--visible');
    });

    setTimeout(function () {
      toast.classList.remove('toast--visible');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3500);
  }

  function getInitials(name) {
    if (!name) return 'RF';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAuthToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function getAuthUser() {
    try {
      var saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function setAuthSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_LEGACY_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  function clearAuthSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(AUTH_LEGACY_KEY);
    } catch (e) {}
  }

  function apiFetch(url, options) {
    options = options || {};
    var headers = options.headers || {};
    var token = getAuthToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    options.headers = headers;
    return fetch(url, options);
  }

  /* ==========================================================
     THEME TOGGLE
     ========================================================== */
  var themeToggleButtons = document.querySelectorAll('#themeToggle, #themeToggleAuth');

  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (err) {}
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
    } catch (err) {}
  }

  applyTheme(getPreferredTheme());

  themeToggleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  });

  /* ==========================================================
     AUTH FLOW (login.html)
     ========================================================== */
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  var loginTab = document.getElementById('loginTab');
  var signupTab = document.getElementById('signupTab');
  var switchToSignup = document.getElementById('switchToSignup');
  var switchToLogin = document.getElementById('switchToLogin');

  function setFormError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg || '';
  }

  if (loginForm && signupForm) {
    function showTab(which) {
      var isLogin = which === 'login';
      if (loginTab) loginTab.classList.toggle('auth-tab--active', isLogin);
      if (signupTab) signupTab.classList.toggle('auth-tab--active', !isLogin);
      loginForm.classList.toggle('auth-form--active', isLogin);
      signupForm.classList.toggle('auth-form--active', !isLogin);
    }

    if (loginTab) loginTab.addEventListener('click', function () { showTab('login'); });
    if (signupTab) signupTab.addEventListener('click', function () { showTab('signup'); });
    if (switchToSignup) switchToSignup.addEventListener('click', function (e) { e.preventDefault(); showTab('signup'); });
    if (switchToLogin) switchToLogin.addEventListener('click', function (e) { e.preventDefault(); showTab('login'); });

    // Handle Login
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      setFormError('loginEmailError', '');
      setFormError('loginPasswordError', '');

      var email = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;
      var submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email) {
        setFormError('loginEmailError', 'Please enter your email.');
        return;
      }
      if (!password) {
        setFormError('loginPasswordError', 'Please enter your password.');
        return;
      }

      var origText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email: email, password: password }
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Login failed');
          return data;
        });
      })
      .then(function (data) {
        setAuthSession(data.token, data.user);
        window.location.href = 'index.html';
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
        if (err.message.toLowerCase().includes('email')) {
          setFormError('loginEmailError', err.message);
        } else {
          setFormError('loginPasswordError', err.message);
        }
      });
    });

    // Handle Sign Up
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      ['signupNameError', 'signupEmailError', 'signupPasswordError', 'signupConfirmPasswordError', 'agreeTermsError'].forEach(function (id) {
        setFormError(id, '');
      });

      var name = document.getElementById('signupName').value.trim();
      var email = document.getElementById('signupEmail').value.trim();
      var password = document.getElementById('signupPassword').value;
      var confirmPassword = document.getElementById('signupConfirmPassword').value;
      var agreeTerms = document.getElementById('agreeTerms').checked;
      var submitBtn = signupForm.querySelector('button[type="submit"]');

      var hasErr = false;
      if (!name) {
        setFormError('signupNameError', 'Full name is required.');
        hasErr = true;
      }
      if (!email) {
        setFormError('signupEmailError', 'Email is required.');
        hasErr = true;
      }
      if (!password || password.length < 8) {
        setFormError('signupPasswordError', 'Password must be at least 8 characters.');
        hasErr = true;
      }
      if (confirmPassword !== password) {
        setFormError('signupConfirmPasswordError', 'Passwords do not match.');
        hasErr = true;
      }
      if (!agreeTerms) {
        setFormError('agreeTermsError', 'You must agree to the Terms to continue.');
        hasErr = true;
      }
      if (hasErr) return;

      var origText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      apiFetch('/api/auth/register', {
        method: 'POST',
        body: { name: name, email: email, password: password }
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Registration failed');
          return data;
        });
      })
      .then(function (data) {
        setAuthSession(data.token, data.user);
        window.location.href = 'index.html';
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
        setFormError('signupEmailError', err.message);
      });
    });

    return; // Done with login page initialization
  }

  /* ==========================================================
     PROTECTED HOME PAGE INITIALIZATION (index.html)
     ========================================================== */
  var siteContent = document.getElementById('siteContent');
  if (!siteContent) return;

  var token = getAuthToken();
  var authUser = getAuthUser();

  if (!token && !authUser) {
    window.location.href = 'login.html';
    return;
  }

  siteContent.classList.add('site-content--visible');

  // Verify auth session against backend
  apiFetch('/api/auth/me')
    .then(function (res) {
      if (!res.ok) {
        clearAuthSession();
        window.location.href = 'login.html';
        return null;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      updateUserUI(data.user, data.stats);
    })
    .catch(function () {
      // Offline or network glitch — continue with cached user if present
      if (authUser) updateUserUI(authUser, null);
    });

  function updateUserUI(user, stats) {
    if (!user) return;
    var initials = getInitials(user.name);

    var navUserAvatar = document.getElementById('navUserAvatar');
    if (navUserAvatar) navUserAvatar.textContent = initials;

    var dropdownUserAvatar = document.getElementById('dropdownUserAvatar');
    if (dropdownUserAvatar) dropdownUserAvatar.textContent = initials;

    var dropdownUserName = document.getElementById('dropdownUserName');
    if (dropdownUserName) dropdownUserName.textContent = user.name;

    var dropdownUserEmail = document.getElementById('dropdownUserEmail');
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email;

    // Profile modal
    var profileModalAvatar = document.getElementById('profileModalAvatar');
    if (profileModalAvatar) profileModalAvatar.textContent = initials;

    var profileModalName = document.getElementById('profileModalName');
    if (profileModalName) profileModalName.textContent = user.name;

    var profileModalEmail = document.getElementById('profileModalEmail');
    if (profileModalEmail) profileModalEmail.textContent = user.email;

    if (stats) {
      var statSaved = document.getElementById('statSaved');
      if (statSaved) statSaved.textContent = stats.savedCount;
      var statTours = document.getElementById('statTours');
      if (statTours) statTours.textContent = stats.bookingsCount;
      var statListings = document.getElementById('statListings');
      if (statListings) statListings.textContent = stats.listingsCount;

      var savedBadge = document.getElementById('savedCountBadge');
      if (savedBadge) savedBadge.textContent = stats.savedCount;
    }
  }

  /* ==========================================================
     USER DROPDOWN
     ========================================================== */
  var userMenuButton = document.getElementById('userMenuButton');
  var userDropdown = document.getElementById('userDropdown');

  if (userMenuButton && userDropdown) {
    var openDropdown = function () {
      userDropdown.classList.add('user-dropdown--open');
      userMenuButton.setAttribute('aria-expanded', 'true');
    };
    var closeDropdown = function () {
      userDropdown.classList.remove('user-dropdown--open');
      userMenuButton.setAttribute('aria-expanded', 'false');
    };
    var isDropdownOpen = function () {
      return userDropdown.classList.contains('user-dropdown--open');
    };

    userMenuButton.addEventListener('click', function (e) {
      e.stopPropagation();
      isDropdownOpen() ? closeDropdown() : openDropdown();
    });

    document.addEventListener('click', function (e) {
      if (isDropdownOpen() && !userDropdown.contains(e.target) && !userMenuButton.contains(e.target)) {
        closeDropdown();
      }
    });

    var logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        clearAuthSession();
        window.location.href = 'login.html';
      });
    }
  }

  /* ==========================================================
     LISTINGS & DETAIL VIEW RENDERING
     ========================================================== */
  var listingsGrid = document.getElementById('listingsGrid');

  function renderListings(listings) {
    if (!listingsGrid) return;
    listingsGrid.innerHTML = '';

    if (!listings || listings.length === 0) {
      listingsGrid.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__icon">🏠</div>' +
          '<h4>No matching rooms found</h4>' +
          '<p>Try adjusting your filters, location, or budget range to see more verified places.</p>' +
        '</div>';
      return;
    }

    listings.forEach(function (room) {
      var card = document.createElement('div');
      card.className = 'listing-card' + (currentSelectedListing && currentSelectedListing.id === room.id ? ' listing-card--active' : '');
      card.setAttribute('data-id', room.id);

      var mainImg = (room.images && room.images.length > 0)
        ? room.images[0]
        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80';

      var hostImg = room.host_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

      var heartActive = room.is_saved ? ' save-toggle--active' : '';

      card.innerHTML =
        '<div class="listing-card__image">' +
          '<img src="' + mainImg + '" alt="' + room.title + '" loading="lazy">' +
          '<button class="save-toggle' + heartActive + '" type="button" aria-label="Save listing" data-id="' + room.id + '">' +
            '<svg fill="' + (room.is_saved ? 'currentColor' : 'none') + '" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' +
          '</button>' +
          '<div class="price-badge">$' + room.price + '<span>/mo</span></div>' +
        '</div>' +
        '<div class="listing-card__body">' +
          '<div>' +
            '<div class="listing-meta">' +
              '<span>' + room.bedrooms + ' Bed • ' + room.bathrooms + (room.furnished ? ' • Furnished' : ' • Unfurnished') + '</span>' +
              '<span>' + (room.neighborhood || room.location) + '</span>' +
            '</div>' +
            '<h4 class="listing-title">' + room.title + '</h4>' +
          '</div>' +
          '<div class="host-row">' +
            '<div class="host-info">' +
              '<img src="' + hostImg + '" alt="' + room.host_name + '">' +
              '<span>' + room.host_name + '</span>' +
            '</div>' +
            '<span class="badge-verified">Verified Host</span>' +
          '</div>' +
        '</div>';

      // Card click -> load detail view
      card.addEventListener('click', function (e) {
        if (e.target.closest('.save-toggle')) return;
        selectListing(room);
      });

      // Save toggle button
      var saveBtn = card.querySelector('.save-toggle');
      if (saveBtn) {
        saveBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleSaveListing(room.id, saveBtn);
        });
      }

      listingsGrid.appendChild(card);
    });
  }

  function selectListing(room) {
    currentSelectedListing = room;

    // Highlight card
    document.querySelectorAll('.listing-card').forEach(function (c) {
      c.classList.toggle('listing-card--active', c.getAttribute('data-id') == room.id);
    });

    // Populate Detailed Room View
    var titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = room.title;

    var addrEl = document.getElementById('detailAddress');
    if (addrEl) addrEl.textContent = room.address + ' • ' + (room.neighborhood || room.location);

    var descEl = document.getElementById('detailDescription');
    if (descEl) descEl.textContent = room.description || 'Newly listed room in a quiet and well-maintained apartment.';

    var priceEl = document.getElementById('detailPrice');
    if (priceEl) priceEl.textContent = '$' + room.price;

    var availEl = document.getElementById('detailAvailability');
    if (availEl) availEl.textContent = 'Available ' + (room.move_in_date || 'Now');

    var rentCostEl = document.getElementById('detailRentCost');
    if (rentCostEl) rentCostEl.textContent = '$' + room.price;

    var depositCostEl = document.getElementById('detailDepositCost');
    if (depositCostEl) depositCostEl.textContent = '$' + (room.deposit || room.price);

    var utilCostEl = document.getElementById('detailUtilitiesCost');
    if (utilCostEl) utilCostEl.textContent = room.utilities_est || '~$60/mo';

    var matchBadgeEl = document.getElementById('detailMatchBadge');
    if (matchBadgeEl) matchBadgeEl.textContent = (room.match_score || 94) + '% Match';

    var hostNameEl = document.getElementById('detailHostName');
    if (hostNameEl) hostNameEl.textContent = 'Hosted by ' + room.host_name;

    var hostDetailsEl = document.getElementById('detailHostDetails');
    if (hostDetailsEl) hostDetailsEl.textContent = room.host_details || 'Verified Host';

    var hostAvatarEl = document.getElementById('detailHostAvatar');
    if (hostAvatarEl) hostAvatarEl.src = room.host_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

    var cleanEl = document.getElementById('detailCleanliness');
    if (cleanEl) cleanEl.textContent = room.cleanliness || '5/5 (Immaculate)';

    var schedEl = document.getElementById('detailSchedule');
    if (schedEl) schedEl.textContent = room.schedule || 'Early Bird';

    var lifeEl = document.getElementById('detailLifestyle');
    if (lifeEl) lifeEl.textContent = room.lifestyle || 'Quiet & Professional';

    // Photos
    var galleryMain = document.getElementById('detailGalleryMain');
    var gallerySub = document.getElementById('detailGallerySub');
    if (galleryMain && room.images && room.images.length > 0) {
      galleryMain.innerHTML = '<img src="' + room.images[0] + '" alt="' + room.title + '">';
    }
    if (gallerySub) {
      gallerySub.innerHTML = '';
      var subPhotos = (room.images && room.images.length > 1) ? room.images.slice(1, 5) : [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=400&q=80'
      ];
      subPhotos.forEach(function (src, idx) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = 'Photo ' + (idx + 2);
        gallerySub.appendChild(img);
      });
    }

    // Amenities
    var amenitiesContainer = document.getElementById('detailAmenities');
    if (amenitiesContainer && room.amenities) {
      amenitiesContainer.innerHTML = '';
      var icons = {
        'Wi-Fi': '📶',
        'AC': '❄️',
        'Laundry': '🧺',
        'Parking': '🚗',
        'Gym': '🏋️',
        'Kitchen': '🍳',
        'Balcony': '🌿',
        'Dishwasher': '🍽️'
      };
      room.amenities.forEach(function (amenity) {
        var icon = '✨';
        for (var k in icons) {
          if (amenity.indexOf(k) !== -1) { icon = icons[k]; break; }
        }
        var div = document.createElement('div');
        div.className = 'amenity';
        div.innerHTML = '<span class="icon">' + icon + '</span> ' + amenity;
        amenitiesContainer.appendChild(div);
      });
    }

    // House Rules
    var rulesContainer = document.getElementById('detailRules');
    if (rulesContainer && room.rules) {
      rulesContainer.innerHTML = '';
      room.rules.forEach(function (rule) {
        var div = document.createElement('div');
        div.className = 'rule';
        div.textContent = '• ' + rule;
        rulesContainer.appendChild(div);
      });
    }

    // Save button state in detail
    var detailSaveText = document.getElementById('detailSaveBtnText');
    if (detailSaveText) {
      detailSaveText.textContent = room.is_saved ? 'Saved' : 'Save';
    }

    // Update Modals with this listing's info
    var modalTitle = document.getElementById('modalListingTitle');
    if (modalTitle) modalTitle.textContent = room.title;
    var modalAddr = document.getElementById('modalListingAddress');
    if (modalAddr) modalAddr.textContent = room.address;
    var modalMoveIn = document.getElementById('modalMoveIn');
    if (modalMoveIn) modalMoveIn.textContent = room.move_in_date || 'Immediate';
    var modalMinLease = document.getElementById('modalMinLease');
    if (modalMinLease) modalMinLease.textContent = room.min_lease || '6 months';
    var modalRent = document.getElementById('modalRentCost');
    if (modalRent) modalRent.textContent = '$' + room.price;
    var modalDep = document.getElementById('modalDepositCost');
    if (modalDep) modalDep.textContent = '$' + (room.deposit || room.price);
    var modalUtil = document.getElementById('modalUtilitiesCost');
    if (modalUtil) modalUtil.textContent = room.utilities_est || '~$60/mo';
    var modalTotal = document.getElementById('modalTotalDue');
    if (modalTotal) modalTotal.textContent = '$' + (room.price + (room.deposit || room.price));

    // Update Chat modal host info
    var chatHostName = document.getElementById('chatHostName');
    if (chatHostName) chatHostName.textContent = room.host_name;
    var chatHostAvatar = document.getElementById('chatHostAvatar');
    if (chatHostAvatar && room.host_avatar) chatHostAvatar.src = room.host_avatar;
  }

  function fetchListings() {
    var params = new URLSearchParams();
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.minPrice) params.append('minPrice', currentFilters.minPrice);
    if (currentFilters.maxPrice) params.append('maxPrice', currentFilters.maxPrice);
    if (currentFilters.roomType) params.append('roomType', currentFilters.roomType);
    if (currentFilters.petFriendly) params.append('petFriendly', '1');
    if (currentFilters.furnished) params.append('furnished', '1');
    if (currentFilters.privateBath) params.append('privateBath', '1');
    if (currentFilters.verifiedLandlord) params.append('verifiedLandlord', '1');
    if (currentFilters.utilitiesIncluded) params.append('utilitiesIncluded', '1');
    if (currentFilters.vibe) params.append('vibe', currentFilters.vibe);
    if (currentFilters.moveIn) params.append('moveIn', currentFilters.moveIn);

    apiFetch('/api/listings?' + params.toString())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allListings = data.listings || [];
        renderListings(allListings);
        if (allListings.length > 0) {
          // If no selection or previous selection is gone, select the first
          var found = currentSelectedListing
            ? allListings.find(function (r) { return r.id === currentSelectedListing.id; })
            : null;
          selectListing(found || allListings[0]);
        }
      })
      .catch(function (err) {
        console.error('Failed to fetch listings:', err);
      });
  }

  // Load initial listings from backend
  fetchListings();

  /* ==========================================================
     HERO SEARCH & FILTERS
     ========================================================== */
  var heroSearchLocation = document.getElementById('heroSearchLocation');
  var heroSearchBudget = document.getElementById('heroSearchBudget');
  var heroSearchType = document.getElementById('heroSearchType');
  var heroSearchBtn = document.getElementById('heroSearchBtn');

  function applyHeroSearch() {
    currentFilters.search = heroSearchLocation ? heroSearchLocation.value.trim() : '';
    currentFilters.roomType = heroSearchType ? heroSearchType.value : '';

    var budgetVal = heroSearchBudget ? heroSearchBudget.value : '';
    if (budgetVal === '0-800') {
      currentFilters.minPrice = '0';
      currentFilters.maxPrice = '800';
    } else if (budgetVal === '800-1200') {
      currentFilters.minPrice = '800';
      currentFilters.maxPrice = '1200';
    } else if (budgetVal === '1200-2000') {
      currentFilters.minPrice = '1200';
      currentFilters.maxPrice = '2000';
    } else if (budgetVal === '2000+') {
      currentFilters.minPrice = '2000';
      currentFilters.maxPrice = '';
    } else {
      currentFilters.minPrice = '';
      currentFilters.maxPrice = '';
    }

    fetchListings();

    var exploreSec = document.getElementById('explore');
    if (exploreSec) exploreSec.scrollIntoView({ behavior: 'smooth' });
  }

  if (heroSearchBtn) heroSearchBtn.addEventListener('click', applyHeroSearch);
  if (heroSearchLocation) {
    heroSearchLocation.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyHeroSearch();
    });
  }

  // Quick filter chips
  var filterChipsContainer = document.getElementById('filterChips');
  if (filterChipsContainer) {
    filterChipsContainer.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;

      var filterType = chip.getAttribute('data-filter');
      if (filterType === 'all') {
        filterChipsContainer.querySelectorAll('.chip').forEach(function (c) {
          c.classList.remove('chip--active');
        });
        chip.classList.add('chip--active');
        currentFilters.petFriendly = false;
        currentFilters.furnished = false;
        currentFilters.privateBath = false;
        currentFilters.verifiedLandlord = false;
        currentFilters.utilitiesIncluded = false;
      } else {
        var allChip = filterChipsContainer.querySelector('[data-filter="all"]');
        if (allChip) allChip.classList.remove('chip--active');

        var isActive = chip.classList.toggle('chip--active');
        currentFilters[filterType] = isActive;
      }
      fetchListings();
    });
  }

  // Sidebar filters
  var sidebarMoveInDate = document.getElementById('sidebarMoveInDate');
  if (sidebarMoveInDate) {
    sidebarMoveInDate.addEventListener('change', function () {
      currentFilters.moveIn = sidebarMoveInDate.value;
      fetchListings();
    });
  }

  document.querySelectorAll('.sidebar-vibe').forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      var selectedVibes = [];
      document.querySelectorAll('.sidebar-vibe:checked').forEach(function (cb) {
        selectedVibes.push(cb.value);
      });
      currentFilters.vibe = selectedVibes.join(',');
      fetchListings();
    });
  });

  var resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', function () {
      currentFilters = {
        search: '',
        minPrice: '',
        maxPrice: '',
        roomType: '',
        petFriendly: false,
        furnished: false,
        privateBath: false,
        verifiedLandlord: false,
        utilitiesIncluded: false,
        vibe: '',
        moveIn: ''
      };
      if (heroSearchLocation) heroSearchLocation.value = '';
      if (heroSearchBudget) heroSearchBudget.value = '';
      if (heroSearchType) heroSearchType.value = '';
      if (sidebarMoveInDate) sidebarMoveInDate.value = '';
      document.querySelectorAll('.sidebar-vibe').forEach(function (cb) { cb.checked = false; });
      if (filterChipsContainer) {
        filterChipsContainer.querySelectorAll('.chip').forEach(function (c) {
          c.classList.toggle('chip--active', c.getAttribute('data-filter') === 'all');
        });
      }
      fetchListings();
      showToast('Filters cleared', 'success');
    });
  }

  /* ==========================================================
     SAVE / FAVORITES LOGIC
     ========================================================== */
  function toggleSaveListing(listingId, btnEl) {
    apiFetch('/api/saved/' + listingId, { method: 'POST' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var isSaved = data.saved;
        if (btnEl) {
          btnEl.classList.toggle('save-toggle--active', isSaved);
          var svg = btnEl.querySelector('svg');
          if (svg) svg.setAttribute('fill', isSaved ? 'currentColor' : 'none');
        }

        // Update in memory listing
        var found = allListings.find(function (r) { return r.id == listingId; });
        if (found) found.is_saved = isSaved;

        if (currentSelectedListing && currentSelectedListing.id == listingId) {
          currentSelectedListing.is_saved = isSaved;
          var detailSaveText = document.getElementById('detailSaveBtnText');
          if (detailSaveText) detailSaveText.textContent = isSaved ? 'Saved' : 'Save';
        }

        showToast(data.message, isSaved ? 'success' : 'error');
        refreshUserStats();
      })
      .catch(function (err) {
        showToast('Could not update saved status: ' + err.message, 'error');
      });
  }

  function refreshUserStats() {
    apiFetch('/api/auth/me')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.stats) {
          var savedBadge = document.getElementById('savedCountBadge');
          if (savedBadge) savedBadge.textContent = data.stats.savedCount;
          var statSaved = document.getElementById('statSaved');
          if (statSaved) statSaved.textContent = data.stats.savedCount;
        }
      });
  }

  var detailSaveBtn = document.getElementById('detailSaveBtn');
  if (detailSaveBtn) {
    detailSaveBtn.addEventListener('click', function () {
      if (!currentSelectedListing) return;
      toggleSaveListing(currentSelectedListing.id, null);
    });
  }

  var detailShareBtn = document.getElementById('detailShareBtn');
  if (detailShareBtn) {
    detailShareBtn.addEventListener('click', function () {
      if (!currentSelectedListing) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.origin + '/#room-' + currentSelectedListing.id);
        showToast('Listing link copied to clipboard!');
      } else {
        showToast('Shared: ' + currentSelectedListing.title);
      }
    });
  }

  /* ==========================================================
     SAVED ROOMS MODAL
     ========================================================== */
  var savedModal = document.getElementById('savedModal');
  var openSavedBtn = document.getElementById('openSavedBtn');
  var openSavedDropdownLink = document.getElementById('openSavedDropdownLink');
  var savedModalClose = document.getElementById('savedModalClose');
  var savedListContainer = document.getElementById('savedListContainer');

  function openSavedRoomsModal() {
    if (!savedModal || !savedListContainer) return;
    savedListContainer.innerHTML = '<p style="color: var(--color-gray-500); text-align: center; padding: 2rem;">Loading saved rooms...</p>';
    savedModal.classList.add('modal-overlay--open');

    apiFetch('/api/saved')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var listings = data.listings || [];
        savedListContainer.innerHTML = '';
        if (listings.length === 0) {
          savedListContainer.innerHTML =
            '<div style="text-align: center; padding: 2rem; color: var(--color-gray-500);">' +
              '<p>No saved rooms yet.</p>' +
              '<p style="font-size: 0.8125rem; margin-top: 0.25rem;">Click the heart icon on any listing to save it here for quick access!</p>' +
            '</div>';
          return;
        }

        listings.forEach(function (item) {
          var row = document.createElement('div');
          row.className = 'saved-item';
          var img = (item.images && item.images.length > 0) ? item.images[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=200&q=80';

          row.innerHTML =
            '<img class="saved-item__img" src="' + img + '" alt="' + item.title + '">' +
            '<div class="saved-item__info">' +
              '<h4 class="saved-item__title">' + item.title + '</h4>' +
              '<div class="saved-item__price">$' + item.price + '/month</div>' +
              '<div class="saved-item__loc">' + item.address + '</div>' +
            '</div>' +
            '<div class="saved-item__actions">' +
              '<button type="button" class="btn btn-primary btn-sm view-saved-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">View</button>' +
              '<button type="button" class="btn btn-outline btn-sm remove-saved-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; color: var(--color-rose-500);">Remove</button>' +
            '</div>';

          row.querySelector('.view-saved-btn').addEventListener('click', function () {
            savedModal.classList.remove('modal-overlay--open');
            selectListing(item);
            var detailSection = document.getElementById('detailSection');
            if (detailSection) detailSection.scrollIntoView({ behavior: 'smooth' });
          });

          row.querySelector('.remove-saved-btn').addEventListener('click', function () {
            toggleSaveListing(item.id, null);
            row.remove();
            if (savedListContainer.children.length === 0) {
              openSavedRoomsModal();
            }
          });

          savedListContainer.appendChild(row);
        });
      });
  }

  if (openSavedBtn) {
    openSavedBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openSavedRoomsModal();
    });
  }
  if (openSavedDropdownLink) {
    openSavedDropdownLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (userDropdown) userDropdown.classList.remove('user-dropdown--open');
      openSavedRoomsModal();
    });
  }
  if (savedModalClose) {
    savedModalClose.addEventListener('click', function () {
      savedModal.classList.remove('modal-overlay--open');
    });
  }
  if (savedModal) {
    savedModal.addEventListener('click', function (e) {
      if (e.target === savedModal) savedModal.classList.remove('modal-overlay--open');
    });
  }

  /* ==========================================================
     USER PROFILE & BOOKINGS MODAL
     ========================================================== */
  var profileModal = document.getElementById('profileModal');
  var openProfileLink = document.getElementById('openProfileLink');
  var profileModalClose = document.getElementById('profileModalClose');
  var profileBookingsList = document.getElementById('profileBookingsList');

  function openProfileModal() {
    if (!profileModal) return;
    profileModal.classList.add('modal-overlay--open');

    // Fetch user bookings
    apiFetch('/api/bookings')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!profileBookingsList) return;
        profileBookingsList.innerHTML = '';
        var bookings = data.bookings || [];
        if (bookings.length === 0) {
          profileBookingsList.innerHTML = '<p style="color: var(--color-gray-500); font-size: 0.8125rem;">No tours scheduled yet. Use "Schedule a Tour" on any room to book a visit.</p>';
          return;
        }

        bookings.forEach(function (b) {
          var item = document.createElement('div');
          item.style.padding = '0.625rem';
          item.style.backgroundColor = 'var(--color-gray-50)';
          item.style.borderRadius = 'var(--radius-xl)';
          item.style.border = '1px solid var(--color-gray-200)';
          item.style.fontSize = '0.8125rem';

          item.innerHTML =
            '<div style="font-weight: 700; color: var(--color-dark);">' + b.listing_title + '</div>' +
            '<div style="color: var(--color-gray-500); margin-top: 0.2rem;">📅 ' + b.tour_date + ' at ' + b.tour_time + ' (' + b.guests + ')</div>' +
            '<div style="color: var(--color-primary); font-weight: 600; margin-top: 0.2rem;">Status: ' + b.status + ' • Host: ' + b.host_name + '</div>';

          profileBookingsList.appendChild(item);
        });
      });
  }

  if (openProfileLink) {
    openProfileLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (userDropdown) userDropdown.classList.remove('user-dropdown--open');
      openProfileModal();
    });
  }
  if (profileModalClose) {
    profileModalClose.addEventListener('click', function () {
      profileModal.classList.remove('modal-overlay--open');
    });
  }
  if (profileModal) {
    profileModal.addEventListener('click', function (e) {
      if (e.target === profileModal) profileModal.classList.remove('modal-overlay--open');
    });
  }

  /* ==========================================================
     LIST YOUR SPACE (4-STEP FORM WIZARD)
     ========================================================== */
  var currentPostStep = 1;
  var postBackBtn = document.getElementById('postBackBtn');
  var postNextBtn = document.getElementById('postNextBtn');
  var postErrorMsg = document.getElementById('postErrorMsg');

  function updateStepperUI(step) {
    currentPostStep = step;
    for (var i = 1; i <= 4; i++) {
      var pane = document.getElementById('stepPane' + i);
      var circle = document.getElementById('stepCircle' + i);
      var line = document.getElementById('stepLine' + i);

      if (pane) pane.classList.toggle('step-pane--active', i === step);
      if (circle) circle.classList.toggle('step-circle--active', i <= step);
      if (line) line.classList.toggle('step-line--active', i < step);
    }

    if (postBackBtn) postBackBtn.disabled = step === 1;
    if (postNextBtn) {
      postNextBtn.textContent = step === 4 ? 'Publish Listing' : 'Next Step';
    }
    if (postErrorMsg) postErrorMsg.textContent = '';
  }

  if (postBackBtn) {
    postBackBtn.addEventListener('click', function () {
      if (currentPostStep > 1) {
        updateStepperUI(currentPostStep - 1);
      }
    });
  }

  if (postNextBtn) {
    postNextBtn.addEventListener('click', function () {
      if (postErrorMsg) postErrorMsg.textContent = '';

      // Validate Step 1
      if (currentPostStep === 1) {
        var title = document.getElementById('postTitle').value.trim();
        var address = document.getElementById('postAddress').value.trim();
        if (!title) {
          postErrorMsg.textContent = 'Please enter a title for your room.';
          return;
        }
        if (!address) {
          postErrorMsg.textContent = 'Please enter the street address.';
          return;
        }
        updateStepperUI(2);
        return;
      }

      // Validate Step 2
      if (currentPostStep === 2) {
        var price = document.getElementById('postPrice').value;
        if (!price || Number(price) <= 0) {
          postErrorMsg.textContent = 'Please enter a valid monthly rent price.';
          return;
        }
        updateStepperUI(3);
        return;
      }

      // Validate Step 3
      if (currentPostStep === 3) {
        updateStepperUI(4);
        return;
      }

      // Step 4: Submit to API
      if (currentPostStep === 4) {
        var postTitle = document.getElementById('postTitle').value.trim();
        var postAddress = document.getElementById('postAddress').value.trim();
        var postRoomType = document.getElementById('postRoomType').value;
        var postBathrooms = document.getElementById('postBathrooms').value;
        var postPrice = Number(document.getElementById('postPrice').value);
        var postDeposit = Number(document.getElementById('postDeposit').value) || postPrice;
        var postUtilities = document.getElementById('postUtilities').value.trim() || '~$50/mo';
        var postMoveIn = document.getElementById('postMoveIn').value;
        var postMinLease = document.getElementById('postMinLease').value;
        var postVibe = document.getElementById('postVibe').value;
        var postFurnished = document.getElementById('postFurnished').checked;
        var postPetFriendly = document.getElementById('postPetFriendly').checked;
        var postUtilitiesIncluded = document.getElementById('postUtilitiesIncluded').checked;
        var postDescription = document.getElementById('postDescription').value.trim();
        var postImage = document.getElementById('postImage').value.trim();
        var postRules = document.getElementById('postRules').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

        var selectedAmenities = [];
        document.querySelectorAll('.post-amenity:checked').forEach(function (cb) {
          selectedAmenities.push(cb.value);
        });

        var payload = {
          title: postTitle,
          address: postAddress,
          room_type: postRoomType,
          bathrooms: postBathrooms,
          price: postPrice,
          deposit: postDeposit,
          utilities_est: postUtilities,
          move_in_date: postMoveIn || 'Immediate',
          min_lease: postMinLease,
          vibe: postVibe,
          furnished: postFurnished,
          pet_friendly: postPetFriendly,
          utilities_included: postUtilitiesIncluded,
          description: postDescription,
          rules: postRules,
          amenities: selectedAmenities,
          images: postImage ? [postImage] : []
        };

        var origText = postNextBtn.textContent;
        postNextBtn.disabled = true;
        postNextBtn.textContent = 'Publishing...';

        apiFetch('/api/listings', {
          method: 'POST',
          body: payload
        })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || 'Failed to publish listing');
            return data;
          });
        })
        .then(function (data) {
          postNextBtn.disabled = false;
          postNextBtn.textContent = origText;
          showToast('🎉 Your room listing has been published!', 'success');

          // Reset wizard
          document.getElementById('postListingForm').reset();
          updateStepperUI(1);

          // Refresh listings and select the newly created one
          fetchListings();
          refreshUserStats();

          // Smooth scroll to explore
          var exploreSec = document.getElementById('explore');
          if (exploreSec) exploreSec.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(function (err) {
          postNextBtn.disabled = false;
          postNextBtn.textContent = origText;
          postErrorMsg.textContent = err.message;
        });
      }
    });
  }

  /* ==========================================================
     BOOKING / SCHEDULE TOUR MODAL
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
  var tourSuccessMsg = document.getElementById('tourSuccessMsg');

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
      setFormError(id, '');
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
    if (scheduleTourBtn) scheduleTourBtn.addEventListener('click', function () { openBookingModal('tour'); });
    if (viewBookingDetailsBtn) viewBookingDetailsBtn.addEventListener('click', function () { openBookingModal('details'); });
    if (bookingModalClose) bookingModalClose.addEventListener('click', closeBookingModal);
    if (tourTab) tourTab.addEventListener('click', function () { showBookingTab('tour'); });
    if (detailsTab) detailsTab.addEventListener('click', function () { showBookingTab('details'); });

    bookingModal.addEventListener('click', function (e) {
      if (e.target === bookingModal) closeBookingModal();
    });

    if (tourForm) {
      tourForm.addEventListener('submit', function (e) {
        e.preventDefault();
        setFormError('tourDateError', '');
        setFormError('tourTimeError', '');
        setFormError('tourPhoneError', '');

        var date = document.getElementById('tourDate').value;
        var time = document.getElementById('tourTime').value;
        var guests = document.getElementById('tourGuests').value;
        var phone = document.getElementById('tourPhone').value.trim();
        var notes = document.getElementById('tourNotes').value.trim();
        var hasErr = false;

        if (!date) {
          setFormError('tourDateError', 'Pick a date for your tour.');
          hasErr = true;
        }
        if (!time) {
          setFormError('tourTimeError', 'Choose a preferred time.');
          hasErr = true;
        }
        if (!phone) {
          setFormError('tourPhoneError', 'A contact phone helps the host reach you.');
          hasErr = true;
        }
        if (hasErr) return;

        var confirmBtn = document.getElementById('confirmTourBtn');
        var origText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Scheduling...';

        apiFetch('/api/bookings', {
          method: 'POST',
          body: {
            listingId: currentSelectedListing ? currentSelectedListing.id : 1,
            tourDate: date,
            tourTime: time,
            guests: guests,
            phone: phone,
            notes: notes
          }
        })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || 'Failed to book tour');
            return data;
          });
        })
        .then(function (data) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = origText;
          tourForm.style.display = 'none';
          tourSuccess.classList.add('modal-success--visible');
          if (tourSuccessMsg && currentSelectedListing) {
            tourSuccessMsg.textContent = currentSelectedListing.host_name + ' will confirm your tour time shortly. You will receive an SMS and email notification.';
          }
          refreshUserStats();
          showToast('Tour request submitted!', 'success');
        })
        .catch(function (err) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = origText;
          setFormError('tourPhoneError', err.message);
        });
      });
    }

    if (tourSuccessClose) tourSuccessClose.addEventListener('click', closeBookingModal);
  }

  /* ==========================================================
     CHAT WITH HOST MODAL
     ========================================================== */
  var chatModal = document.getElementById('chatModal');
  var chatWithHostBtn = document.getElementById('chatWithHostBtn');
  var chatModalClose = document.getElementById('chatModalClose');
  var chatThread = document.getElementById('chatThread');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');

  function scrollChatToBottom() {
    if (chatThread) chatThread.scrollTop = chatThread.scrollHeight;
  }

  function appendChatMessage(msg, mine) {
    if (!chatThread) return;
    var message = document.createElement('div');
    message.className = 'chat-message ' + (mine ? 'chat-message--mine' : 'chat-message--theirs');

    var avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.alt = msg.sender_name || 'Sender';
    avatar.src = msg.sender_avatar || (mine
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
    );

    var wrap = document.createElement('div');

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = msg.message;

    var meta = document.createElement('div');
    meta.className = 'chat-meta';
    var timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
    meta.textContent = (mine ? 'You' : msg.sender_name) + ' • ' + timeStr;

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    message.appendChild(avatar);
    message.appendChild(wrap);
    chatThread.appendChild(message);
    scrollChatToBottom();
  }

  function loadChatHistory(listingId) {
    if (!chatThread) return;
    chatThread.innerHTML = '<p style="color: var(--color-gray-500); text-align: center; margin: auto;">Loading messages...</p>';

    apiFetch('/api/messages/' + listingId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        chatThread.innerHTML = '';
        var messages = data.messages || [];
        if (messages.length === 0) {
          chatThread.innerHTML =
            '<div style="text-align: center; color: var(--color-gray-500); margin: auto;">' +
              '<p>No messages yet.</p>' +
              '<p style="font-size: 0.8125rem; margin-top: 0.25rem;">Send a message to introduce yourself to the host!</p>' +
            '</div>';
          return;
        }
        messages.forEach(function (m) {
          appendChatMessage(m, m.sender_type === 'user');
        });
      })
      .catch(function () {
        chatThread.innerHTML = '<p style="color: var(--color-rose-500); text-align: center; margin: auto;">Could not load messages.</p>';
      });
  }

  if (chatModal) {
    if (chatWithHostBtn) {
      chatWithHostBtn.addEventListener('click', function () {
        chatModal.classList.add('modal-overlay--open');
        var listingId = currentSelectedListing ? currentSelectedListing.id : 1;
        loadChatHistory(listingId);
        if (chatInput) chatInput.focus();
      });
    }
    if (chatModalClose) {
      chatModalClose.addEventListener('click', function () {
        chatModal.classList.remove('modal-overlay--open');
      });
    }
    chatModal.addEventListener('click', function (e) {
      if (e.target === chatModal) chatModal.classList.remove('modal-overlay--open');
    });

    if (chatForm) {
      chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = chatInput.value.trim();
        if (!text) return;
        var listingId = currentSelectedListing ? currentSelectedListing.id : 1;
        chatInput.value = '';

        // Clear placeholder if first message
        if (chatThread.querySelector('p')) {
          chatThread.innerHTML = '';
        }

        apiFetch('/api/messages/' + listingId, {
          method: 'POST',
          body: { message: text }
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.userMessage) appendChatMessage(data.userMessage, true);
          if (data.hostMessage) {
            setTimeout(function () {
              appendChatMessage(data.hostMessage, false);
            }, 700);
          }
        })
        .catch(function (err) {
          showToast('Failed to send message: ' + err.message, 'error');
        });
      });
    }
  }

});