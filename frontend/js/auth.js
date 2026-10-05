// Authentication and Navigation Core
const Auth = {
  getUser() {
    const userStr = localStorage.getItem("chainhire_user");
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken() {
    return localStorage.getItem("chainhire_token");
  },

  setAuth(user, token) {
    localStorage.setItem("chainhire_user", JSON.stringify(user));
    localStorage.setItem("chainhire_token", token);
  },

  updateUser(updatedFields) {
    const current = this.getUser() || {};
    const merged = { ...current, ...updatedFields };
    localStorage.setItem("chainhire_user", JSON.stringify(merged));
    return merged;
  },

  logout() {
    localStorage.removeItem("chainhire_user");
    localStorage.removeItem("chainhire_token");
    window.location.href = "login.html";
  },

  redirectByRole(role) {
    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else if (role === "recruiter") {
      window.location.href = "recruiter-dashboard.html";
    } else {
      window.location.href = "seeker-dashboard.html";
    }
  },

  requireAuth(allowedRoles = []) {
    const user = this.getUser();
    const token = this.getToken();

    if (!token || !user) {
      window.location.href = "login.html";
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      this.redirectByRole(user.role);
      return null;
    }

    return user;
  },

  // Renders the unified Sidebar and Topbar matching the exact design mockups
  renderNavigation(activeKey) {
    const user = this.getUser() || {
      fullName: "Alex Morgan",
      role: "jobSeeker",
      walletAddress: "0x7A3fBb9e5cD4A1F2e9cB2D7aF8e6d4C9bA1F3cB2"
    };

    // 1. Sidebar HTML
    const sidebarEl = document.getElementById("sidebar-container");
    if (sidebarEl) {
      let menuItems = [];

      if (user.role === "admin") {
        menuItems = [
          { key: "overview", label: "Overview", href: "admin-dashboard.html", icon: "squares" },
          { key: "users", label: "Users", href: "admin-dashboard.html#users-section", icon: "users" },
          { key: "messages", label: "Messages", href: "messages.html", icon: "chat" },
        ];
      } else if (user.role === "recruiter") {
        menuItems = [
          { key: "dashboard", label: "Dashboard", href: "recruiter-dashboard.html", icon: "squares" },
          { key: "profile", label: "Profile", href: "profile.html", icon: "user" },
          { key: "jobs", label: "Jobs", href: "jobs.html", icon: "briefcase" },
          { key: "applications", label: "Applications", href: "recruiter-dashboard.html#applications-tab", icon: "document-text" },
          { key: "contracts", label: "Contracts", href: "contracts.html", icon: "document-check" },
          { key: "messages", label: "Messages", href: "messages.html", icon: "chat" },
          { key: "settings", label: "Settings", href: "settings.html", icon: "cog" },
        ];
      } else {
        // Job Seeker Navigation (Matches Screenshots)
        menuItems = [
          { key: "profile", label: "Profile", href: "profile.html", icon: "user" },
          { key: "dashboard", label: "Dashboard", href: "seeker-dashboard.html", icon: "squares" },
          { key: "jobs", label: "Jobs", href: "jobs.html", icon: "briefcase" },
          { key: "applications", label: "Applications", href: "applications.html", icon: "document-text" },
          { key: "messages", label: "Messages", href: "messages.html", icon: "chat" },
          { key: "contracts", label: "Contracts", href: "contracts.html", icon: "document-check" },
          { key: "settings", label: "Settings", href: "settings.html", icon: "cog" },
        ];
      }

      sidebarEl.innerHTML = `
        <div class="sidebar flex flex-col justify-between h-screen fixed left-0 top-0 z-30 shadow-xl select-none">
          <div>
            <!-- Logo with link to Home -->
            <a href="index.html" class="px-6 py-6 flex items-center gap-3 border-b border-slate-800/80 group hover:bg-slate-800/30 transition-colors" title="Go to Home Page">
              <div class="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
              </div>
              <div>
                <span class="text-xl font-bold text-white tracking-tight">Chain<span class="text-emerald-400">Hire</span></span>
                <span class="block text-[11px] font-medium text-slate-400 tracking-wide">
                  ${user.role === 'admin' ? 'Admin Portal' : (user.role === 'recruiter' ? 'Employer Hub' : 'Job Seeker')}
                </span>
              </div>
            </a>

            <!-- Navigation Links -->
            <nav class="mt-4 space-y-1">
              ${menuItems.map(item => `
                <a href="${item.href}" class="sidebar-item ${activeKey === item.key ? 'active' : ''}">
                  ${this.getMenuIcon(item.icon)}
                  <span>${item.label}</span>
                </a>
              `).join('')}
            </nav>
          </div>

          <!-- Bottom Card & Logout -->
          <div class="p-4 border-t border-slate-800/80">
            ${user.role === 'jobSeeker' ? `
              <div class="p-3 mb-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-slate-300">
                <div class="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  <span>Verified Professional</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">Build trust. Unlock on-chain career opportunities.</p>
              </div>
            ` : ''}

            <button onclick="Auth.logout()" class="sidebar-item w-full text-left text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span>Logout</span>
            </button>
            <div class="mt-2 text-center text-[10px] text-slate-500">
              © 2026 ChainHire. All rights reserved.
            </div>
          </div>
        </div>
      `;
    }

    // 2. Topbar Header HTML
    const headerEl = document.getElementById("topbar-container");
    if (headerEl) {
      const walletDisplay = user.walletAddress 
        ? `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`
        : "Connect Wallet";

      headerEl.innerHTML = `
        <div class="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 relative">
          <!-- Left Search Bar -->
          <div class="flex-1 max-w-md">
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </span>
              <input type="text" id="global-search-input" placeholder="Search jobs, skills, or verified credentials..." 
                class="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"/>
              <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-mono">⌘K</span>
            </div>
          </div>

          <!-- Right Action Controls -->
          <div class="flex items-center gap-4">
            <!-- Home shortcut button -->
            <a href="index.html" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all" title="Go to Public Landing Page">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Home</span>
            </a>

            <!-- Wallet Pill -->
            <button id="topbar-wallet-btn" onclick="Web3Manager.toggleWallet()" 
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${user.walletAddress ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}">
              <svg class="w-4 h-4 ${user.walletAddress ? 'text-slate-600' : 'text-emerald-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              <span id="wallet-text-display">${walletDisplay}</span>
              ${user.walletAddress ? `
                <span class="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              ` : ''}
            </button>

            <!-- Working Real-Time Notifications Center -->
            <div class="relative">
              <button id="notif-bell-btn" onclick="Auth.toggleNotifications(event)" class="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all" title="Notifications">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span id="notif-badge-pill" class="hidden absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">0</span>
              </button>

              <!-- Notifications Dropdown Popover -->
              <div id="notif-dropdown-menu" class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div class="p-3.5 px-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-slate-900">Notifications</span>
                    <span id="notif-unread-count-text" class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">0 new</span>
                  </div>
                  <button onclick="Auth.markAllNotificationsRead(event)" class="text-[11px] font-medium text-slate-500 hover:text-emerald-600 transition-colors">
                    Mark all read
                  </button>
                </div>
                <div id="notif-items-container" class="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <div class="p-4 text-center text-slate-400">Loading notifications...</div>
                </div>
                <div class="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <a href="messages.html" class="text-[11px] font-semibold text-emerald-600 hover:underline">
                    View all messages & activity
                  </a>
                </div>
              </div>
            </div>

            <!-- User Avatar & Profile Dropdown -->
            <a href="profile.html" class="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div id="topbar-avatar-container" class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 overflow-hidden border border-slate-300">
                ${user.avatar ? `<img src="${user.avatar}" class="w-full h-full object-cover" />` : user.fullName.charAt(0)}
              </div>
              <div class="text-left hidden md:block">
                <div class="text-xs font-semibold text-slate-800 leading-tight">${user.fullName}</div>
                <div class="text-[10px] text-slate-400 capitalize">${user.role}</div>
              </div>
            </a>
          </div>
        </div>
      `;

      // Automatically fetch notifications count on load
      this.loadNotifications();
    }
  },

  async loadNotifications() {
    try {
      const res = await API.get("/chat/notifications");
      if (res.success) {
        const badgeEl = document.getElementById("notif-badge-pill");
        const countTextEl = document.getElementById("notif-unread-count-text");
        const listEl = document.getElementById("notif-items-container");

        const unreadCount = res.unreadCount || 0;
        if (badgeEl) {
          if (unreadCount > 0) {
            badgeEl.innerText = unreadCount;
            badgeEl.classList.remove("hidden");
          } else {
            badgeEl.classList.add("hidden");
          }
        }

        if (countTextEl) {
          countTextEl.innerText = `${unreadCount} unread`;
        }

        if (listEl) {
          if (res.notifications.length === 0) {
            listEl.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No notifications yet.</div>`;
          } else {
            listEl.innerHTML = res.notifications.slice(0, 10).map(n => {
              const isUnread = !n.isRead;
              return `
                <div class="p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${isUnread ? 'bg-emerald-50/40' : ''}">
                  <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-xs text-slate-900 ${isUnread ? 'text-emerald-900' : ''}">${n.title}</span>
                      <span class="text-[10px] text-slate-400">${new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">${n.message}</p>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
      }
    } catch (err) {
      console.warn("Could not load notifications:", err);
    }
  },

  toggleNotifications(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("notif-dropdown-menu");
    if (dropdown) {
      dropdown.classList.toggle("hidden");
      if (!dropdown.classList.contains("hidden")) {
        this.loadNotifications();
      }
    }
  },

  async markAllNotificationsRead(e) {
    if (e) e.stopPropagation();
    try {
      const res = await API.put("/chat/notifications/read", {});
      if (res.success) {
        showToast("All notifications marked as read", "info");
        await this.loadNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  },

  getMenuIcon(type) {
    const icons = {
      squares: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`,
      user: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
      briefcase: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
      "document-text": `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
      chat: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,
      "document-check": `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
      cog: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
      users: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
      home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    };
    return icons[type] || icons.squares;
  }
};

// Close notification dropdown when clicking outside
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("notif-dropdown-menu");
  const btn = document.getElementById("notif-bell-btn");
  if (dropdown && !dropdown.classList.contains("hidden")) {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  }
});

window.Auth = Auth;
