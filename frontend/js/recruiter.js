// Recruiter Dashboard and Verification Inbox Logic
const Recruiter = {
  inboxRequests: [],
  applications: [],
  myJobs: [],

  async initDashboard() {
    Auth.requireAuth(["recruiter", "admin"]);
    Auth.renderNavigation("dashboard");
    await this.loadVerificationInbox();
    await this.loadApplications();
    await this.loadMyJobs();
    await this.loadStats();
  },

  async loadStats() {
    try {
      const inboxRes = await API.get("/verifications/inbox");
      const appRes = await API.get("/jobs/applications/recruiter");

      const pendingVerifs = inboxRes.requests ? inboxRes.requests.filter(r => r.requestStatus === "pending").length : 0;
      const apps = appRes.applications || [];
      const totalApps = apps.length;

      // Build breakdown string
      const pending     = apps.filter(a => (a.status || '').toLowerCase() === 'pending').length;
      const shortlisted = apps.filter(a => (a.status || '').toLowerCase() === 'shortlisted').length;
      const hired       = apps.filter(a => (a.status || '').toLowerCase() === 'hired').length;
      const rejected    = apps.filter(a => (a.status || '').toLowerCase() === 'rejected').length;
      const parts = [];
      if (pending)     parts.push(`${pending} pending`);
      if (shortlisted) parts.push(`${shortlisted} shortlisted`);
      if (hired)       parts.push(`${hired} hired`);
      if (rejected)    parts.push(`${rejected} rejected`);
      const breakdown = parts.length ? parts.join(' · ') : 'No applications yet';

      const pendingVerifsEl   = document.getElementById("stat-pending-verifications");
      const totalAppsEl       = document.getElementById("stat-recruiter-applications");
      const breakdownEl       = document.getElementById("stat-recruiter-breakdown");

      if (pendingVerifsEl) pendingVerifsEl.innerText = pendingVerifs;
      if (totalAppsEl)     totalAppsEl.innerText = totalApps;
      if (breakdownEl)     breakdownEl.innerText = breakdown;
    } catch (err) {
      console.error(err);
    }
  },

  async loadVerificationInbox() {
    const container = document.getElementById("verification-inbox-container");
    if (!container) return;

    try {
      const res = await API.get("/verifications/inbox");
      if (res.success) {
        this.inboxRequests = res.requests;
        this.renderVerificationInbox();
      }
    } catch (err) {
      console.error("Error loading verification inbox:", err);
    }
  },

  renderVerificationInbox() {
    const container = document.getElementById("verification-inbox-container");
    if (!container) return;

    const pendingRequests = this.inboxRequests.filter(r => r.requestStatus === "pending");

    if (pendingRequests.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p class="text-sm font-medium">All caught up! No pending verification requests in your inbox.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingRequests.map(req => {
      return `
        <div class="p-5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <a href="profile.html?userId=${req.seekerId}" title="View ${req.seekerName}'s Profile" 
              class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-emerald-500 hover:scale-105 transition-all cursor-pointer">
              ${req.seekerAvatar ? `<img src="${req.seekerAvatar}" class="w-full h-full object-cover" />` : req.seekerName.charAt(0)}
            </a>
            <div>
              <div class="flex items-center gap-2">
                <a href="profile.html?userId=${req.seekerId}" title="View ${req.seekerName}'s Profile" 
                  class="font-bold text-slate-900 text-sm hover:text-emerald-600 hover:underline transition-colors flex items-center gap-1.5 cursor-pointer">
                  <span>${req.seekerName}</span>
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
                <span class="text-xs text-slate-400 font-mono">(${req.seekerEmail})</span>
              </div>
              <div class="text-xs font-semibold text-emerald-700 mt-0.5">
                ${req.title} <span class="text-slate-400 font-normal">at</span> ${req.company}
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">
                Duration: ${req.startDate} – ${req.isCurrent ? 'Present' : (req.endDate || 'N/A')}
              </div>
              <p class="text-xs text-slate-600 mt-2 max-w-xl bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                "${req.description || 'Candidate requested verification for this employment tenure.'}"
              </p>
              ${req.seekerWallet ? `
                <div class="mt-2 text-[11px] text-slate-400 font-mono">
                  Candidate Wallet: <span class="text-slate-600">${req.seekerWallet}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2.5 self-end lg:self-center">
            <button onclick="Recruiter.approveRequest(${req.requestId}, ${req.experienceId}, '${req.seekerWallet || ''}', '${req.company}', '${req.title}')" 
              class="btn-emerald text-xs py-2 px-3.5" title="Approve on-chain via MetaMask">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span>Approve (On-Chain)</span>
            </button>
            <button onclick="Recruiter.openRejectModal(${req.requestId})" class="btn-outline-danger text-xs py-2 px-3.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              <span>Reject</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async approveRequest(requestId, experienceId, candidateWallet, company, title) {
    try {
      showToast("Initiating cryptographic on-chain verification...", "info");
      
      // Call Web3 Manager to sign and approve on Solidity contract
      const txHash = await Web3Manager.approveVerificationOnChain(
        experienceId,
        candidateWallet,
        company,
        title
      );

      showToast(`Signed on-chain! Tx: ${txHash.substring(0, 10)}... Submitting to database.`, "info");

      // Save txHash and mark verified in database
      const res = await API.put(`/verifications/${requestId}/approve`, {
        txHash,
        remarks: "Employment verified and recorded on Ethereum blockchain",
      });

      if (res.success) {
        showToast("✅ Experience successfully verified and minted on-chain!", "success");
        await this.loadVerificationInbox();
        await this.loadStats();
      }
    } catch (err) {
      console.error("Verification approval error:", err);
      showToast("Approval failed: " + err.message, "error");
    }
  },

  openRejectModal(requestId) {
    const modal = document.getElementById("reject-modal");
    const reqInput = document.getElementById("reject-request-id");
    if (reqInput) reqInput.value = requestId;
    if (modal) modal.classList.remove("hidden");
  },

  closeRejectModal() {
    const modal = document.getElementById("reject-modal");
    if (modal) modal.classList.add("hidden");
  },

  async submitReject(e) {
    if (e) e.preventDefault();
    const requestId = document.getElementById("reject-request-id").value;
    const remarks = document.getElementById("reject-remarks").value;

    if (!remarks) {
      showToast("Please provide remarks for rejection", "error");
      return;
    }

    try {
      const res = await API.put(`/verifications/${requestId}/reject`, { remarks });
      if (res.success) {
        showToast("Verification request rejected with remarks.", "info");
        this.closeRejectModal();
        await this.loadVerificationInbox();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  async loadApplications() {
    const container = document.getElementById("recruiter-applications-container");
    if (!container) return;

    try {
      const res = await API.get("/jobs/applications/recruiter");
      if (res.success) {
        this.applications = res.applications;
        this.renderApplications();
      }
    } catch (err) {
      console.error(err);
    }
  },

  renderApplications() {
    const container = document.getElementById("recruiter-applications-container");
    if (!container) return;

    if (this.applications.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm">No applications submitted to your postings yet.</div>`;
      return;
    }

    const statusBadge = (status) => {
      const s = (status || 'pending').toLowerCase();
      const styles = {
        pending:     'background:#FEF3C7;color:#92400E;',
        shortlisted: 'background:#DCFCE7;color:#166534;',
        hired:       'background:#D1FAE5;color:#065F46;',
        rejected:    'background:#FEE2E2;color:#991B1B;',
      };
      const style = styles[s] || 'background:#EFF6FF;color:#1E40AF;';
      return `<span style="padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;${style}">${status || 'Pending'}</span>`;
    };

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
          <tr>
            <th class="py-3 px-4">Candidate</th>
            <th class="py-3 px-4">Job Role</th>
            <th class="py-3 px-4">Verified Exp</th>
            <th class="py-3 px-4">Applied Date</th>
            <th class="py-3 px-4">Status</th>
            <th class="py-3 px-4">Actions</th>
            <th class="py-3 px-4 text-right">Update Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${this.applications.map(app => `
            <tr class="hover:bg-slate-50/70 transition-colors">
              <td class="py-3 px-4 font-medium text-slate-900">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 flex-shrink-0 overflow-hidden">
                    ${app.seekerAvatar ? `<img src="${app.seekerAvatar}" class="w-full h-full object-cover" />` : (app.seekerName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <button onclick="Recruiter.openApplicantModal(${app.seekerId}, ${app.applicationId})" class="font-semibold text-slate-900 hover:text-emerald-600 hover:underline text-left transition-colors">${app.seekerName || 'Unknown'}</button>
                    <div class="text-[10px] text-slate-400">${app.seekerEmail || ''}</div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4 text-slate-700 font-medium">${app.jobTitle || 'N/A'}</td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  ${app.verifiedExpCount || 0} verified
                </span>
              </td>
              <td class="py-3 px-4 text-slate-500">${app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '—'}</td>
              <td class="py-3 px-4">${statusBadge(app.status)}</td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-1.5">
                  <button onclick="Recruiter.openApplicantModal(${app.seekerId}, ${app.applicationId})" 
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors" title="View Applicant Profile">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    Profile
                  </button>
                  <a href="messages.html?userId=${app.seekerId}" 
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm" title="Chat with Candidate">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    Chat
                  </a>
                  ${app.resumeUrl ? `
                    <a href="${CONFIG.API_BASE_URL.replace('/api','') + app.resumeUrl}" target="_blank" download
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors" title="Download CV">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      CV
                    </a>
                  ` : `<span class="text-[10px] text-slate-400 italic">No CV</span>`}
                </div>
              </td>
              <td class="py-3 px-4 text-right">
                <select onchange="Recruiter.updateAppStatus(${app.applicationId}, this.value)"
                  class="text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-emerald-500">
                  <option value="" disabled selected>Change...</option>
                  <option value="Pending" ${app.status === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                  <option value="Hired" ${app.status === 'Hired' ? 'selected' : ''}>Hired</option>
                  <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  // ── Applicant Profile Modal ──────────────────────────────────────────────
  async openApplicantModal(seekerId, applicationId) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('applicant-profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'applicant-profile-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div id="applicant-modal-content" class="p-6 sm:p-8">
            <div class="flex items-center justify-center h-32">
              <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      `;
      modal.addEventListener('click', (e) => { if (e.target === modal) Recruiter.closeApplicantModal(); });
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
      // Load user profile + experiences
      const [profileRes, expRes] = await Promise.all([
        API.get(`/auth/user/${seekerId}`),
        API.get(`/experiences?userId=${seekerId}`)
      ]);

      // Find application for CV
      const app = this.applications.find(a => a.seekerId === seekerId && a.applicationId === applicationId);
      const u = profileRes.user || {};
      const exps = expRes.experiences || [];
      const metrics = profileRes.metrics || {};

      const verifiedCount = exps.filter(e => e.status === 'verified').length;
      const roleName = u.role === 'jobSeeker' ? 'Candidate / Seeker' : (u.role === 'recruiter' ? 'Recruiter / Employer' : 'Admin');

      const avatarHtml = u.avatar
        ? `<img src="${u.avatar}" class="w-full h-full object-cover"/>`
        : `<span class="font-bold text-xl text-slate-700">${(u.fullName || '?').charAt(0).toUpperCase()}</span>`;

      document.getElementById('applicant-modal-content').innerHTML = `
        <div class="space-y-5">
          <!-- Modal Top Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <h3 class="font-bold text-slate-900 text-base leading-tight">${u.fullName || 'Candidate'}'s Profile</h3>
            </div>
            <button onclick="Recruiter.closeApplicantModal()" class="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Profile Card Top Header -->
          <div class="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div class="w-16 h-16 rounded-full bg-slate-200 border-2 border-emerald-500 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              ${avatarHtml}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-slate-900 text-base leading-tight">${u.fullName || 'Unknown'}</h3>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ${roleName}
                </span>
              </div>
              <p class="text-xs text-slate-600 font-medium mt-1">${u.headline || 'Web3 Professional'}</p>
              <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                <span>📍 ${u.location || 'Remote / Worldwide'}</span>
                <span>✉️ ${u.email || 'N/A'}</span>
                ${u.phone ? `<span>📞 ${u.phone}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Bio Section -->
          ${u.bio ? `
            <div>
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">About</h4>
              <p class="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
                "${u.bio}"
              </p>
            </div>
          ` : ''}

          <!-- On-Chain Wallet -->
          <div>
            <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Ethereum Wallet Address</span>
              <button onclick="navigator.clipboard.writeText('${u.walletAddress || ''}'); showToast('Wallet address copied!', 'info');" 
                class="text-emerald-600 hover:text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Copy
              </button>
            </div>
            <div class="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg break-all border border-slate-800 flex items-center justify-between gap-2">
              <span>${u.walletAddress || '0x7A3fBb9e5cD4A1F2e9cB2D7aF8e6d4C9bA1F3cB2'}</span>
              <span class="text-[10px] text-slate-400 font-sans">EVM</span>
            </div>
          </div>

          <!-- Verification Score & Badges -->
          <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div class="flex items-center justify-between text-xs font-bold text-slate-800">
              <span class="flex items-center gap-1.5 text-emerald-800">
                <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                On-Chain Verification Status
              </span>
              <span class="font-black text-emerald-700">${verifiedCount} Verified Credential${verifiedCount === 1 ? '' : 's'}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-emerald-100/80 text-[11px] font-semibold text-slate-700">
              <div class="flex items-center gap-1 text-emerald-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>Identity ✓</span>
              </div>
              <div class="flex items-center gap-1 text-emerald-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>Work Exp ✓</span>
              </div>
              <div class="flex items-center gap-1 text-emerald-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>On-Chain ✓</span>
              </div>
            </div>
          </div>

          <!-- Employment History -->
          <div>
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">EMPLOYMENT HISTORY</h4>
              <span class="text-[11px] text-slate-400 font-medium">${exps.length} record${exps.length === 1 ? '' : 's'}</span>
            </div>
            
            <div class="mt-2.5 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              ${exps.length === 0 ? `
                <div class="p-4 text-center text-slate-400 text-xs">No work experiences listed.</div>
              ` : exps.map(exp => `
                <div class="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <h5 class="font-bold text-xs text-slate-900">${exp.title}</h5>
                      <div class="text-[11px] text-emerald-600 font-semibold">${exp.company}</div>
                      <div class="text-[10px] text-slate-400 mt-0.5">${exp.startDate ? exp.startDate.substring(0, 7) : ''} – ${exp.isCurrent ? 'Present' : (exp.endDate ? exp.endDate.substring(0, 7) : 'N/A')}</div>
                    </div>
                    <div>
                      ${exp.status === 'verified' ? `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                          Verified
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      `}
                    </div>
                  </div>
                  ${exp.description ? `
                    <p class="text-[11px] text-slate-600 mt-1.5 line-clamp-2">"${exp.description}"</p>
                  ` : ''}
                  ${exp.txHash ? `
                    <div class="mt-1.5 text-[10px] text-emerald-700 font-mono">
                      Tx: <a href="https://sepolia.etherscan.io/tx/${exp.txHash}" target="_blank" class="hover:underline text-slate-500">${exp.txHash.substring(0, 16)}...</a>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Actions Bar: Chat, CV, Close -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <div>
              ${app && app.resumeUrl ? `
                <a href="${CONFIG.API_BASE_URL.replace('/api','') + app.resumeUrl}" target="_blank" download
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Download CV
                </a>
              ` : '<span class="text-xs text-slate-400 italic">No CV uploaded</span>'}
            </div>
            <div class="flex items-center gap-2">
              <a href="messages.html?userId=${seekerId}" 
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Chat with Candidate
              </a>
              <button onclick="Recruiter.closeApplicantModal()" class="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('applicant-modal-content').innerHTML = `<div class="text-center text-red-500 py-8">Failed to load applicant data: ${err.message}</div>`;
    }
  },

  closeApplicantModal() {
    const modal = document.getElementById('applicant-profile-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  async updateAppStatus(applicationId, newStatus) {
    try {
      const res = await API.put(`/jobs/applications/${applicationId}/status`, { status: newStatus });
      if (res.success) {
        if (newStatus === "Hired") {
          showToast("Candidate marked as Hired! The job posting has been filled and removed from active jobs.", "success");
        } else {
          showToast(`Application status updated to ${newStatus}`, "success");
        }
        await this.loadApplications();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  // Post Job Modal
  openPostJobModal() {
    const modal = document.getElementById("post-job-modal");
    const user = Auth.getUser();
    const companyInput = document.getElementById("job-company");
    if (companyInput && user) {
      companyInput.value = (user.company && user.company.trim()) || user.fullName || "ChainHire Verified Employer";
      companyInput.readOnly = true;
    }
    if (modal) modal.classList.remove("hidden");
  },

  closePostJobModal() {
    const modal = document.getElementById("post-job-modal");
    if (modal) modal.classList.add("hidden");
  },

  async submitPostJob(e) {
    if (e) e.preventDefault();
    const title = document.getElementById("job-title").value;
    const company = document.getElementById("job-company").value;
    const location = document.getElementById("job-location").value;
    const jobType = document.getElementById("job-type").value;
    const salaryText = document.getElementById("job-salary").value;
    const description = document.getElementById("job-description").value;
    const requirementsRaw = document.getElementById("job-requirements").value;
    const skillsRaw = document.getElementById("job-skills")?.value || "";

    // Combine requirements + skills into one field (comma-separated, will render as tags)
    const combinedParts = [];
    if (requirementsRaw.trim()) combinedParts.push(requirementsRaw.trim());
    if (skillsRaw.trim()) combinedParts.push(skillsRaw.trim());
    const requirements = combinedParts.join(", ");

    try {
      const res = await API.post("/jobs", {
        title,
        company,
        location,
        jobType,
        salaryText,
        description,
        requirements,
      });

      if (res.success) {
        showToast("Job posted successfully!", "success");
        this.closePostJobModal();
        await this.loadMyJobs();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  async loadMyJobs() {
    const container = document.getElementById("recruiter-my-jobs-container");
    if (!container) return;

    try {
      const user = Auth.getUser();
      if (!user) return;
      const res = await API.get(`/jobs?recruiterId=${user.id}&limit=50`);
      if (res.success) {
        this.myJobs = res.jobs || [];
        this.renderMyJobs();
      }
    } catch (err) {
      console.error("Error loading recruiter myJobs:", err);
    }
  },

  renderMyJobs() {
    const container = document.getElementById("recruiter-my-jobs-container");
    if (!container) return;

    if (this.myJobs.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <svg class="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <p class="text-xs font-medium text-slate-600">You haven't posted any jobs under this account yet.</p>
          <button onclick="Recruiter.openPostJobModal()" class="btn-emerald text-xs py-1.5 px-3.5 mt-3 inline-flex items-center gap-1.5">
            <span>+ Post Your First Job</span>
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.myJobs.map(job => {
      return `
        <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-all">
          <div>
            <div class="flex items-center gap-2.5">
              <h4 class="font-bold text-slate-900 text-sm">${job.title}</h4>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span class="font-medium text-slate-700">${job.company}</span>
              <span>•</span>
              <span>${job.location}</span>
              <span>•</span>
              <span class="font-medium text-emerald-600">${job.jobType}</span>
              ${job.salaryText ? `<span>•</span><span>${job.salaryText}</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              ${job.applicationsCount || 0} Applicants
            </span>
            <a href="jobs.html" class="btn-outline-emerald text-xs py-1.5 px-3">
              View on Board
            </a>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.Recruiter = Recruiter;
