// Jobs Module Logic (Matching Screenshot 4)
const Jobs = {
  jobs: [],
  currentPage: 1,
  totalPages: 1,

  recruiterFilter: "mine", // 'mine' | 'others' | 'all'

  async init() {
    Auth.requireAuth();
    Auth.renderNavigation("jobs");

    const user = Auth.getUser();
    const tabsContainer = document.getElementById("recruiter-job-tabs");
    if (user && user.role === "recruiter") {
      this.recruiterFilter = "mine";
      if (tabsContainer) tabsContainer.classList.remove("hidden");
      this.updateRecruiterTabStyles();
      this.loadMyJobsCount();
    } else {
      this.recruiterFilter = "all";
      if (tabsContainer) tabsContainer.classList.add("hidden");
    }

    await this.loadJobs();
  },

  async loadMyJobsCount() {
    try {
      const user = Auth.getUser();
      if (!user) return;
      const res = await API.get(`/jobs?recruiterId=${user.id}&limit=1`);
      const badge = document.getElementById("tab-my-jobs-badge");
      if (badge && res.pagination) {
        badge.innerText = res.pagination.total || 0;
      }
    } catch (err) {
      console.error(err);
    }
  },

  setRecruiterFilter(filter) {
    this.recruiterFilter = filter;
    this.updateRecruiterTabStyles();
    this.loadJobs(1);
  },

  updateRecruiterTabStyles() {
    const tabMine = document.getElementById("tab-my-jobs");
    const tabOthers = document.getElementById("tab-other-jobs");
    const tabAll = document.getElementById("tab-all-jobs");

    const activeClasses = ["border-b-2", "border-emerald-500", "text-emerald-600"];
    const inactiveClasses = ["border-b-2", "border-transparent", "text-slate-500"];

    [tabMine, tabOthers, tabAll].forEach(tab => {
      if (!tab) return;
      activeClasses.forEach(c => tab.classList.remove(c));
      inactiveClasses.forEach(c => tab.classList.remove(c));
    });

    if (this.recruiterFilter === "mine" && tabMine) {
      activeClasses.forEach(c => tabMine.classList.add(c));
      inactiveClasses.forEach(c => tabOthers?.classList.add(c));
      inactiveClasses.forEach(c => tabAll?.classList.add(c));
    } else if (this.recruiterFilter === "others" && tabOthers) {
      activeClasses.forEach(c => tabOthers.classList.add(c));
      inactiveClasses.forEach(c => tabMine?.classList.add(c));
      inactiveClasses.forEach(c => tabAll?.classList.add(c));
    } else if (tabAll) {
      activeClasses.forEach(c => tabAll.classList.add(c));
      inactiveClasses.forEach(c => tabMine?.classList.add(c));
      inactiveClasses.forEach(c => tabOthers?.classList.add(c));
    }
  },

  async loadJobs(page = 1) {
    this.currentPage = page;
    const keyword = document.getElementById("job-search-input")?.value || "";
    const location = document.getElementById("job-location-filter")?.value || "";
    const jobType = document.getElementById("job-type-filter")?.value || "";

    const params = new URLSearchParams({
      page: this.currentPage,
      limit: 6,
    });

    const user = Auth.getUser();
    if (user && user.role === "recruiter") {
      if (this.recruiterFilter === "mine") {
        params.append("recruiterId", user.id);
      } else if (this.recruiterFilter === "others") {
        params.append("excludeRecruiterId", user.id);
      }
    }

    if (keyword) params.append("keyword", keyword);
    if (location && location !== "All Locations") params.append("location", location);
    if (jobType && jobType !== "All Types") params.append("jobType", jobType);

    try {
      const res = await API.get(`/jobs?${params.toString()}`);
      if (res.success) {
        this.jobs = res.jobs;
        this.totalPages = res.pagination.totalPages || 1;
        this.renderJobGrid();
        this.renderPagination(res.pagination);
      }
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
  },

  renderJobGrid() {
    const container = document.getElementById("jobs-grid-container");
    if (!container) return;

    if (this.jobs.length === 0) {
      const isMyFilter = this.recruiterFilter === "mine";
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <p class="text-base font-semibold text-slate-700">${isMyFilter ? "You have not posted any jobs yet" : "No open positions match your filters"}</p>
          <p class="text-xs text-slate-400 mt-1">${isMyFilter ? "Post a new opening from your Recruiter Hub to see it here." : "Try resetting your filters or searching for another keyword."}</p>
          ${isMyFilter ? `<a href="recruiter-dashboard.html" class="btn-emerald text-xs py-2 px-4 inline-flex items-center gap-2 mt-4 shadow-sm">+ Post Job Now</a>` : ''}
        </div>
      `;
      return;
    }

    const currentUser = Auth.getUser();

    container.innerHTML = this.jobs.map(job => {
      const companyLogoBg = job.logoBg || "#0F172A";
      const companyInitial = job.company.substring(0, 1).toUpperCase();

      // Custom company SVG glyphs for top brands
      let companyIcon = `<span class="text-white font-bold text-lg">${companyInitial}</span>`;
      if (job.company.toLowerCase().includes("defi")) {
        companyIcon = `<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 3.5l6.5 6.5L12 18.5 5.5 12 12 5.5z"/></svg>`;
      } else if (job.company.toLowerCase().includes("chainlink")) {
        companyIcon = `<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L4 7.5v9L12 21l8-4.5v-9L12 3zm0 3l5 2.8v5.4L12 17l-5-2.8V8.8L12 6z"/></svg>`;
      } else if (job.company.toLowerCase().includes("aave")) {
        companyIcon = `<span class="text-white font-black text-xl tracking-tighter">A</span>`;
      }

      // Check recruiter / own post logic for Apply button
      let actionHtml = "";
      if (currentUser && currentUser.role === "recruiter") {
        if (job.recruiterId === currentUser.id) {
          actionHtml = `
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              <span>Your Posting</span>
            </span>
          `;
        } else {
          actionHtml = `
            <span class="text-xs text-slate-400 font-medium">
              Recruiter
            </span>
          `;
        }
      } else {
        const safeTitle = (job.title || "").replace(/'/g, "\\'");
        const safeCompany = (job.company || "").replace(/'/g, "\\'");
        actionHtml = `
          <button onclick="Jobs.openApplyModal(${job.id}, '${safeTitle}', '${safeCompany}')" 
            class="btn-emerald text-xs py-2 px-3.5">
            <span>Apply</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        `;
      }

      return `
        <div class="chain-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group" onclick="Jobs.openJobDetail(${job.id})">
          <div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style="background-color: ${companyLogoBg};">
                ${companyIcon}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors">${job.title}</h3>
                <div class="text-sm text-slate-500 font-medium mt-0.5">${job.company}</div>
              </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap items-center gap-2 mt-5">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-600 bg-slate-100 font-medium">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                ${job.location}
              </span>
              <span class="px-2.5 py-1 rounded-md text-xs font-medium ${job.jobType === 'Full-time' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'}">
                ${job.jobType}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                ${job.applicationsCount || 0} applicants
              </span>
            </div>
          </div>

          <!-- Bottom Row: Salary & Apply / Status -->
          <div class="flex items-center justify-between pt-6 mt-6 border-t border-slate-100" onclick="event.stopPropagation()">
            <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>${job.salaryText || '$100,000 – $150,000'}</span>
            </div>

            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');
  },

  // ── Job Detail Modal ────────────────────────────────────────────────────
  async openJobDetail(jobId) {
    // Ensure modal exists
    let modal = document.getElementById('job-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'job-detail-modal';
      modal.className = 'fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div id="job-detail-content" class="p-8">
            <div class="flex items-center justify-center h-32">
              <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      `;
      modal.addEventListener('click', (e) => { if (e.target === modal) Jobs.closeJobDetail(); });
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
      const res = await API.get(`/jobs/${jobId}`);
      if (!res.success) throw new Error('Job not found');
      const job = res.job;
      const currentUser = Auth.getUser();

      const companyLogoBg = job.logoBg || '#0F172A';
      const companyInitial = (job.company || '?').substring(0, 1).toUpperCase();

      // Skills from requirements field - parse as comma/newline separated
      let skillsHtml = '';
      if (job.requirements && job.requirements.trim()) {
        const skills = job.requirements.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
        skillsHtml = `
          <div class="mb-6">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Requirements & Skills</h3>
            <div class="flex flex-wrap gap-2">
              ${skills.map(skill => `
                <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ${skill}
                </span>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Apply button
      let applyHtml = '';
      if (currentUser && currentUser.role === 'recruiter') {
        if (job.recruiterId === currentUser.id) {
          applyHtml = `<span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200">Your Posting</span>`;
        } else {
          applyHtml = `<span class="text-sm text-slate-400 font-medium">Recruiter view</span>`;
        }
      } else {
        const safeTitle = (job.title || '').replace(/'/g, "\\'");
        const safeCompany = (job.company || '').replace(/'/g, "\\'");
        applyHtml = `
          <button onclick="Jobs.closeJobDetail(); Jobs.openApplyModal(${job.id}, '${safeTitle}', '${safeCompany}')" 
            class="btn-emerald text-sm py-2.5 px-6">
            Apply Now
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        `;
      }

      document.getElementById('job-detail-content').innerHTML = `
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style="background-color: ${companyLogoBg};">
              <span class="text-white font-bold text-xl">${companyInitial}</span>
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900 leading-tight">${job.title}</h2>
              <p class="text-sm font-semibold text-emerald-600 mt-0.5">${job.company}</p>
              ${job.recruiterName ? `<p class="text-xs text-slate-400">Posted by ${job.recruiterName}</p>` : ''}
            </div>
          </div>
          <button onclick="Jobs.closeJobDetail()" class="text-slate-400 hover:text-slate-600 transition-colors p-1 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Quick Info Tags -->
        <div class="flex flex-wrap gap-2 mb-6">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            ${job.location}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${job.jobType === 'Full-time' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
            ${job.jobType || 'Full-time'}
          </span>
          ${job.salaryText ? `
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ${job.salaryText}
          </span>` : ''}
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            ${job.applicationsCount || 0} applicants
          </span>
        </div>

        <!-- Description -->
        ${job.description ? `
        <div class="mb-6">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Job Description</h3>
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">${job.description}</p>
        </div>` : ''}

        <!-- Skills / Requirements -->
        ${skillsHtml}

        <!-- Divider -->
        <div class="border-t border-slate-100 pt-4 flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            ${job.recruiterId && (!currentUser || currentUser.id !== job.recruiterId) ? `
              <a href="messages.html?userId=${job.recruiterId}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                Chat with Recruiter
              </a>
            ` : ''}
            ${job.recruiterEmail ? `<span class="text-xs text-slate-400">Contact: <span class="text-slate-600 font-medium">${job.recruiterEmail}</span></span>` : ''}
          </div>
          <div class="flex items-center gap-2">
            ${applyHtml}
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('job-detail-content').innerHTML = `<div class="text-center text-red-500 py-8">Failed to load job details: ${err.message}</div>`;
    }
  },

  closeJobDetail() {
    const modal = document.getElementById('job-detail-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  renderPagination(p) {
    const textEl = document.getElementById("pagination-summary-text");
    const container = document.getElementById("pagination-buttons-container");
    if (!container) return;

    if (textEl) {
      const start = (p.page - 1) * p.limit + 1;
      const end = Math.min(p.page * p.limit, p.total);
      textEl.innerText = `Showing ${p.total > 0 ? start : 0} – ${end} of ${p.total} jobs`;
    }

    let buttons = `
      <button onclick="Jobs.loadJobs(${Math.max(1, p.page - 1)})" class="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors ${p.page <= 1 ? 'opacity-40 cursor-not-allowed' : ''}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>
    `;

    for (let i = 1; i <= p.totalPages; i++) {
      if (i === p.page) {
        buttons += `<button class="w-8 h-8 rounded-lg bg-emerald-600 text-white font-semibold text-xs">${i}</button>`;
      } else {
        buttons += `<button onclick="Jobs.loadJobs(${i})" class="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition-colors">${i}</button>`;
      }
    }

    buttons += `
      <button onclick="Jobs.loadJobs(${Math.min(p.totalPages, p.page + 1)})" class="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors ${p.page >= p.totalPages ? 'opacity-40 cursor-not-allowed' : ''}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
    `;

    container.innerHTML = buttons;
  },

  openApplyModal(jobId, jobTitle, company) {
    const currentUser = Auth.getUser();
    if (currentUser && currentUser.role === "recruiter") {
      showToast("Recruiters cannot apply to jobs.", "error");
      return;
    }
    const modal = document.getElementById("apply-job-modal");
    const jobIdInput = document.getElementById("apply-job-id");
    const titleEl = document.getElementById("apply-modal-title");
    const compEl = document.getElementById("apply-modal-company");

    if (jobIdInput) jobIdInput.value = jobId;
    if (titleEl) titleEl.innerText = jobTitle;
    if (compEl) compEl.innerText = company;
    if (modal) modal.classList.remove("hidden");
  },

  closeApplyModal() {
    const modal = document.getElementById("apply-job-modal");
    if (modal) modal.classList.add("hidden");
  },

  async submitApplication(e) {
    if (e) e.preventDefault();
    const jobId = document.getElementById("apply-job-id").value;
    const coverNote = document.getElementById("apply-cover-note").value;
    const resumeFile = document.getElementById("apply-resume-file").files[0];

    const formData = new FormData();
    formData.append("coverNote", coverNote);
    if (resumeFile) {
      formData.append("resume", resumeFile);
    }

    try {
      const res = await API.post(`/jobs/${jobId}/apply`, formData);
      if (res.success) {
        showToast("Application submitted successfully!", "success");
        this.closeApplyModal();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  resetFilters() {
    const kw = document.getElementById("job-search-input");
    const loc = document.getElementById("job-location-filter");
    const type = document.getElementById("job-type-filter");
    if (kw) kw.value = "";
    if (loc) loc.value = "All Locations";
    if (type) type.value = "All Types";
    this.loadJobs(1);
  }
};

window.Jobs = Jobs;
