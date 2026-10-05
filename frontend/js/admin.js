// Admin Dashboard Logic
const Admin = {
  users: [],

  async initDashboard() {
    Auth.requireAuth(["admin"]);
    Auth.renderNavigation("overview");
    await this.loadStats();
    await this.loadUsers();
  },

  async loadStats() {
    try {
      const res = await API.get("/admin/stats");
      if (res.success && res.stats) {
        const s = res.stats;
        this.safeSetText("admin-total-users", s.totalUsers.toLocaleString());
        this.safeSetText("admin-total-users-trend", s.totalUsersChange);

        this.safeSetText("admin-verified-credentials", s.verifiedCredentials.toLocaleString());
        this.safeSetText("admin-verified-credentials-trend", s.verifiedCredentialsChange);

        this.safeSetText("admin-active-jobs", s.activeJobs.toLocaleString());
        this.safeSetText("admin-active-jobs-trend", s.activeJobsChange);

        this.safeSetText("admin-blocked-accounts", s.blockedAccounts.toLocaleString());
        this.safeSetText("admin-blocked-accounts-trend", s.blockedAccountsChange);
      }
    } catch (err) {
      console.error("Error loading admin stats:", err);
    }
  },

  async loadUsers() {
    const search = document.getElementById("admin-search-users")?.value || "";
    const role = document.getElementById("admin-role-filter")?.value || "";

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (role && role !== "All Roles") params.append("role", role);

      const res = await API.get(`/admin/users?${params.toString()}`);
      if (res.success) {
        this.users = res.users;
        this.renderUsersTable();
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  },

  renderUsersTable() {
    const tbody = document.getElementById("admin-users-tbody");
    if (!tbody) return;

    if (this.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 text-sm">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.users.map(u => {
      let roleBadge = "";
      if (u.role === "jobSeeker") {
        roleBadge = `<span class="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Candidate</span>`;
      } else if (u.role === "recruiter") {
        roleBadge = `<span class="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Employer</span>`;
      } else {
        roleBadge = `<span class="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Admin</span>`;
      }

      const statusHtml = u.isBlocked
        ? `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-red-600"><span class="w-2 h-2 rounded-full bg-red-500"></span> Blocked</span>`
        : `<span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Active</span>`;

      const actionBtn = u.isBlocked
        ? `<button onclick="Admin.toggleBlockUser(${u.id})" class="btn-outline-emerald text-xs py-1.5 px-3">
             <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
             <span>Unblock</span>
           </button>`
        : `<button onclick="Admin.toggleBlockUser(${u.id})" class="btn-outline-danger text-xs py-1.5 px-3">
             <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
             <span>Block</span>
           </button>`;

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <td class="py-3.5 px-6 flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden">
              ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover"/>` : u.fullName.charAt(0)}
            </div>
            <div class="font-medium text-slate-900 text-sm">${u.fullName}</div>
          </td>
          <td class="py-3.5 px-6 text-slate-500 text-sm font-mono">${u.email}</td>
          <td class="py-3.5 px-6">${roleBadge}</td>
          <td class="py-3.5 px-6">${statusHtml}</td>
          <td class="py-3.5 px-6 text-right">
            <div class="inline-flex items-center gap-2">
              <a href="messages.html?contactId=${u.id}" class="btn-outline-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1 hover:border-emerald-500 hover:text-emerald-700" title="Message ${u.fullName}">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Message</span>
              </a>
              ${actionBtn}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async toggleBlockUser(userId) {
    try {
      const res = await API.put(`/admin/users/${userId}/toggle-block`);
      if (res.success) {
        showToast(res.message, res.isBlocked ? "error" : "success");
        await this.loadUsers();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }
};

window.Admin = Admin;
