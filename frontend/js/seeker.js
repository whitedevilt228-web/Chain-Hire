// Job Seeker Dashboard and Profile Logic
const Seeker = {
  experiences: [],

  async initDashboard() {
    Auth.requireAuth(["jobSeeker", "admin"]);
    Auth.renderNavigation("dashboard");
    await this.loadStats();
    await this.loadExperiences();
    await this.loadRecentApplications();
  },

  async initProfile() {
    Auth.requireAuth(["jobSeeker", "recruiter", "admin"]);
    Auth.renderNavigation("profile");

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get("userId") || urlParams.get("id");

    await this.loadProfileData(targetUserId);

    if (targetUserId) {
      await this.loadExperiences(targetUserId);
    } else {
      const user = Auth.getUser();
      if (user && user.role === "jobSeeker") {
        await this.loadExperiences();
      } else if (user && user.role === "recruiter") {
        await this.loadRecruiterProfileJobs();
      }
    }

    // Restrict full name input to alphabets only
    const nameField = document.getElementById("field-fullname");
    if (nameField) {
      nameField.addEventListener("keydown", (e) => {
        const allowedKeys = ["Backspace", "Tab", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete"];
        if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^[A-Za-z\s]$/.test(e.key)) {
          e.preventDefault();
          showToast("Only alphabetic letters (A-Z, a-z)", "warning");
        }
      });
      nameField.addEventListener("input", function() {
        const sanitized = this.value.replace(/[^A-Za-z\s]/g, "");
        if (this.value !== sanitized) {
          this.value = sanitized;
          showToast("Only alphabetic letters (A-Z, a-z)", "warning");
        }
      });
    }
  },

  async uploadAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (PNG, JPG, WEBP)", "error");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      showToast("Uploading profile picture...", "info");
      const res = await API.put("/auth/profile", formData);
      if (res.success) {
        Auth.updateUser(res.user);
        showToast("Profile picture updated successfully!", "success");
        await this.loadProfileData();

        // Update topbar avatar
        const topbarAvatar = document.getElementById("topbar-avatar-container");
        if (topbarAvatar && res.user.avatar) {
          topbarAvatar.innerHTML = `<img src="${res.user.avatar}" class="w-full h-full object-cover" />`;
        }
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  async loadRecruiterProfileJobs() {
    const container = document.getElementById("experiences-list-container");
    const titleEl = document.getElementById("profile-bottom-title");
    const descEl = document.getElementById("profile-bottom-desc");
    const addBtn = document.getElementById("profile-bottom-btn");

    if (titleEl) titleEl.innerText = "Posted Job Opportunities";
    if (descEl) descEl.innerText = "Manage openings posted under your employer account.";
    if (addBtn) {
      addBtn.innerText = "+ Post New Job";
      addBtn.onclick = () => window.location.href = "recruiter-dashboard.html";
    }

    try {
      const res = await API.get("/jobs/applications/recruiter");
      const jobsRes = await API.get("/jobs");
      if (jobsRes.success && container) {
        const user = Auth.getUser();
        const myJobs = jobsRes.jobs.filter(j => j.recruiterId === user.id || j.recruiterEmail === user.email);
        if (myJobs.length === 0) {
          container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">No jobs posted yet. <a href="recruiter-dashboard.html" class="text-emerald-600 font-semibold underline">Post a job</a></div>`;
        } else {
          container.innerHTML = myJobs.map(j => `
            <div class="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 class="font-bold text-slate-800 text-sm">${j.title}</h4>
                <div class="text-xs text-emerald-600 font-medium">${j.company} • ${j.location} • ${j.jobType}</div>
                <div class="text-[11px] text-slate-400 mt-1">${j.salaryText || 'Competitive salary'}</div>
              </div>
              <a href="recruiter-dashboard.html#applications-tab" class="btn-outline-emerald text-xs py-1 px-3">View Applicants</a>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  },

  async loadStats() {
    try {
      const res = await API.get("/auth/me");
      if (res.success && res.metrics) {
        const { totalExperiences, verifiedCount, pendingCount } = res.metrics;
        
        const totalEl = document.getElementById("stat-total-exp");
        const verifiedEl = document.getElementById("stat-verified-exp");
        const pendingEl = document.getElementById("stat-pending-exp");

        if (totalEl) totalEl.innerText = totalExperiences || 0;
        if (verifiedEl) verifiedEl.innerText = verifiedCount || 0;
        if (pendingEl) pendingEl.innerText = pendingCount || 0;

        // Profile score
        const scoreEl = document.getElementById("verification-score-display");
        const scoreBarEl = document.getElementById("verification-score-bar");
        if (scoreEl) {
          const score = Math.min(verifiedCount || 0, 3);
          scoreEl.innerText = `${score}/3`;
          if (scoreBarEl) {
            scoreBarEl.style.width = `${(score / 3) * 100}%`;
          }
        }
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  },

  async loadProfileData(targetUserId = null) {
    try {
      const currentUserId = Auth.getUser()?.id;
      const isViewingOther = targetUserId && parseInt(targetUserId, 10) !== currentUserId;
      const endpoint = isViewingOther ? `/auth/user/${targetUserId}` : "/auth/me";

      const res = await API.get(endpoint);
      if (res.success && res.user) {
        const u = res.user;

        // If viewing someone else's profile
        if (isViewingOther) {
          this.safeSetText("page-main-title", `${u.fullName}'s Profile`);
          this.safeSetText("page-main-subtitle", `Verified credentials and professional overview on ChainHire`);

          // Message action button
          const actionContainer = document.getElementById("profile-action-links");
          if (actionContainer) {
            actionContainer.innerHTML = `
              <a href="messages.html?contactId=${u.id}" class="btn-emerald text-xs py-2 px-4 flex items-center gap-2 shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Send Message</span>
              </a>
            `;
          }

          // Hide edit/save controls
          const saveBtn = document.getElementById("btn-save-profile");
          if (saveBtn) saveBtn.classList.add("hidden");

          const addBtn = document.getElementById("profile-bottom-btn");
          if (addBtn) addBtn.classList.add("hidden");

          // Hide avatar upload label
          const uploadLabels = document.querySelectorAll('label[for="profile-avatar-file"]');
          uploadLabels.forEach(el => el.classList.add("hidden"));

          // Make inputs readonly
          ["field-fullname", "field-email", "field-phone", "field-location", "field-headline", "field-bio"].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
              input.readOnly = true;
              input.classList.add("bg-slate-50", "cursor-default");
            }
          });
        }
        
        // Populate display labels
        this.safeSetText("profile-hero-name", u.fullName);
        const roleLabel = u.role === "jobSeeker" ? "Job Seeker" : (u.role === "recruiter" ? "Employer / Recruiter" : "Administrator");
        this.safeSetText("profile-hero-role", roleLabel);
        this.safeSetText("profile-wallet-address", u.walletAddress || "Not connected");

        // Avatar display
        const avatarDisplay = document.getElementById("profile-avatar-display");
        if (avatarDisplay) {
          if (u.avatar) {
            avatarDisplay.innerHTML = `<img src="${u.avatar}" class="w-full h-full object-cover" />`;
          } else {
            avatarDisplay.innerHTML = `<span class="text-3xl font-black text-slate-600">${u.fullName.charAt(0)}</span>`;
          }
        }

        // Form fields
        this.safeSetValue("field-fullname", u.fullName);
        this.safeSetValue("field-email", u.email);
        this.safeSetValue("field-phone", u.phone || "Not provided");
        this.safeSetValue("field-location", u.location || "Worldwide");
        this.safeSetValue("field-headline", u.headline || (u.role === "recruiter" ? "Head of Talent Acquisition & Verification" : "Full Stack Developer | Blockchain & Web3 Enthusiast"));
        this.safeSetValue("field-bio", u.bio || (u.role === "recruiter" ? "Recruiting top Web3 engineering and cryptography talent." : "Passionate full stack developer with experience building decentralized applications."));

        // ─── Dynamic Verified Information section ───────────────────────────
        const verifiedCount = res.metrics ? (parseInt(res.metrics.verifiedCount, 10) || 0) : 0;
        const score = Math.min(verifiedCount, 3);

        // Update score display
        this.safeSetText("verification-score-display", `${score}/3`);
        const scoreBar = document.getElementById("verification-score-bar");
        if (scoreBar) scoreBar.style.width = `${(score / 3) * 100}%`;

        // Dynamically rebuild the Verified Information checklist
        const verifiedSection = document.querySelector(".verified-info-section");
        if (verifiedSection) {
          const items = [
            { label: "Identity Verified",   checked: verifiedCount >= 1 },
            { label: "Experience Verified",  checked: verifiedCount >= 2 },
            { label: "Education Verified",   checked: verifiedCount >= 3 },
          ];
          // Keep the header row, rebuild item rows
          const header = verifiedSection.querySelector('.verified-info-header');
          const existingItems = verifiedSection.querySelectorAll('.verified-info-item');
          existingItems.forEach(el => el.remove());

          items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'verified-info-item flex items-center justify-between text-xs text-slate-700';
            div.innerHTML = `
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 ${item.checked ? 'text-emerald-500' : 'text-slate-300'}" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                ${item.label}
              </span>
              <svg class="w-3.5 h-3.5 ${item.checked ? 'text-emerald-600' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            `;
            verifiedSection.appendChild(div);
          });
        }

        // Last updated date
        const lastUpdatedEl = document.querySelector('.last-updated-text');
        if (lastUpdatedEl && u.createdAt) {
          const date = new Date(u.createdAt);
          lastUpdatedEl.textContent = `Last updated: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  },

  async loadExperiences(targetUserId = null) {
    try {
      const endpoint = targetUserId ? `/experiences?userId=${targetUserId}` : "/experiences";
      const res = await API.get(endpoint);
      if (res.success) {
        this.experiences = res.experiences;
        this.renderExperiencesList(targetUserId);
      }
    } catch (err) {
      console.error("Error loading experiences:", err);
    }
  },

  renderExperiencesList(targetUserId = null) {
    const container = document.getElementById("experiences-list-container");
    if (!container) return;

    const currentUserId = Auth.getUser()?.id;
    const isViewingOther = targetUserId && parseInt(targetUserId, 10) !== currentUserId;

    if (this.experiences.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <p class="text-sm">No work experiences found.</p>
          ${!isViewingOther ? `
            <button onclick="Seeker.openAddExperienceModal()" class="mt-3 btn-emerald text-xs">
              + Add First Experience
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = this.experiences.map((exp) => {
      let badgeHtml = "";
      if (exp.status === "verified") {
        badgeHtml = `
          <span class="badge-verified">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            Verified
          </span>
        `;
      } else if (exp.status === "pending") {
        badgeHtml = `
          <span class="badge-pending">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Pending
          </span>
        `;
      } else {
        badgeHtml = `
          <span class="badge-rejected">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            Rejected
          </span>
        `;
      }

      const iconBg = exp.company.includes("Block") ? "bg-emerald-700" : (exp.company.includes("DeFi") ? "bg-indigo-700" : "bg-blue-600");
      const iconInitial = exp.company.substring(0, 2).toUpperCase();

      return `
        <div class="p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-full ${iconBg} text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              ${iconInitial}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-semibold text-slate-800 text-sm">${exp.title}</h4>
              </div>
              <div class="text-xs text-emerald-600 font-medium">${exp.company}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">
                ${this.formatDate(exp.startDate)} – ${exp.isCurrent ? 'Present' : (this.formatDate(exp.endDate) || 'N/A')}
              </div>
              <p class="text-xs text-slate-600 mt-1 max-w-xl line-clamp-2">
                ${exp.description || 'No description provided.'}
              </p>
              ${exp.txHash ? `
                <div class="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  <a href="https://sepolia.etherscan.io/tx/${exp.txHash}" target="_blank" class="hover:underline">
                    Verified on Etherscan (${exp.txHash.substring(0, 8)}...)
                  </a>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-center">
            ${badgeHtml}
            ${!isViewingOther && (exp.status === 'pending' || exp.status === 'rejected') ? `
              <button onclick="Seeker.openRequestVerificationModal(${exp.id})" class="btn-outline-emerald text-xs py-1 px-2.5">
                Verify
              </button>
            ` : ''}
            ${!isViewingOther ? `
              <button onclick="Seeker.deleteExperience(${exp.id})" class="text-slate-400 hover:text-red-500 p-1 rounded transition-colors" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  async loadRecentApplications() {
    const container = document.getElementById("recent-applications-container");
    if (!container) return;

    try {
      const res = await API.get("/jobs/applications/seeker");
      if (res.success && res.applications.length > 0) {
        container.innerHTML = res.applications.slice(0, 5).map(app => {
          return `
            <div class="p-3 border-b border-slate-100 last:border-b-0 flex items-center justify-between text-xs">
              <div>
                <div class="font-semibold text-slate-800">${app.jobTitle}</div>
                <div class="text-slate-400">${app.company} • ${new Date(app.appliedAt).toLocaleDateString()}</div>
              </div>
              <span class="badge-${app.status.toLowerCase()}">${app.status}</span>
            </div>
          `;
        }).join('');
      } else {
        container.innerHTML = `<p class="p-4 text-center text-xs text-slate-400">No applications submitted yet.</p>`;
      }
    } catch (err) {
      console.error(err);
    }
  },

  // Modal helpers
  formatDate(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${monthNames[mIdx] || parts[1]} ${parts[0]}`;
    }
    return dateStr;
  },

  toggleCurrentJob(isCurrent) {
    const endDateInput = document.getElementById("exp-end-date");
    if (!endDateInput) return;
    if (isCurrent) {
      endDateInput.value = "";
      endDateInput.disabled = true;
      endDateInput.classList.add("bg-slate-100", "text-slate-400", "cursor-not-allowed");
      endDateInput.classList.remove("bg-white", "text-slate-700");
    } else {
      endDateInput.disabled = false;
      endDateInput.classList.remove("bg-slate-100", "text-slate-400", "cursor-not-allowed");
      endDateInput.classList.add("bg-white", "text-slate-700");
    }
  },

  openAddExperienceModal() {
    const modal = document.getElementById("add-experience-modal");
    if (modal) modal.classList.remove("hidden");

    // Reset date fields & current checkbox
    const currentCheck = document.getElementById("exp-is-current");
    if (currentCheck) currentCheck.checked = false;
    this.toggleCurrentJob(false);

    // Populate company dropdown with registered recruiters
    const select = document.getElementById("exp-company");
    if (select) {
      select.innerHTML = '<option value="" disabled selected>Loading registered employers...</option>';
      try {
        API.get("/experiences/recruiters").then(res => {
          if (res.success && res.recruiters.length > 0) {
            select.innerHTML = '<option value="" disabled selected>-- Select Company / Employer --</option>';
            res.recruiters.forEach(rec => {
              const opt = document.createElement("option");
              opt.value = rec.company;
              opt.textContent = `${rec.company}  —  ${rec.email}`;
              select.appendChild(opt);
            });
          } else {
            select.innerHTML = '<option value="" disabled selected>No registered employers found</option>';
          }
        }).catch(err => {
          console.error("Error loading recruiters:", err);
          select.innerHTML = '<option value="" disabled selected>Error loading employers</option>';
        });
      } catch (err) {
        console.error("Error loading recruiters:", err);
      }
    }
  },

  closeAddExperienceModal() {
    const modal = document.getElementById("add-experience-modal");
    if (modal) modal.classList.add("hidden");
  },

  async submitAddExperience(e) {
    if (e) e.preventDefault();
    const company = document.getElementById("exp-company").value;
    const title = document.getElementById("exp-title").value.trim();
    const startDate = document.getElementById("exp-start-date").value;
    const endDate = document.getElementById("exp-end-date").value;
    const isCurrent = document.getElementById("exp-is-current").checked;
    const description = document.getElementById("exp-description").value.trim();

    if (!startDate) {
      showToast("Please pick a Start Date", "error");
      document.getElementById("exp-start-date").focus();
      return;
    }

    if (!isCurrent && endDate && endDate < startDate) {
      showToast("End Date cannot be earlier than Start Date", "error");
      document.getElementById("exp-end-date").focus();
      return;
    }

    try {
      const res = await API.post("/experiences", {
        company,
        title,
        startDate,
        endDate,
        isCurrent,
        description,
      });

      if (res.success) {
        showToast("Work experience added successfully!", "success");
        this.closeAddExperienceModal();
        await this.loadExperiences();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  openRequestVerificationModal(experienceId) {
    const modal = document.getElementById("request-verification-modal");
    const expIdInput = document.getElementById("req-exp-id");
    if (expIdInput) expIdInput.value = experienceId;
    if (modal) modal.classList.remove("hidden");
  },

  closeRequestVerificationModal() {
    const modal = document.getElementById("request-verification-modal");
    if (modal) modal.classList.add("hidden");
  },

  async submitVerificationRequest(e) {
    if (e) e.preventDefault();
    const experienceId = document.getElementById("req-exp-id").value;
    const recruiterEmail = document.getElementById("req-recruiter-email").value;

    try {
      const res = await API.post("/verifications/request", {
        experienceId,
        recruiterEmail,
      });

      if (res.success) {
        showToast("Verification request sent to employer/recruiter!", "success");
        this.closeRequestVerificationModal();
        await this.loadExperiences();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  async deleteExperience(id) {
    if (!confirm("Are you sure you want to remove this experience?")) return;
    try {
      const res = await API.del(`/experiences/${id}`);
      if (res.success) {
        showToast("Experience deleted", "info");
        await this.loadExperiences();
        await this.loadStats();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  async saveProfile(e) {
    if (e) e.preventDefault();
    const fullName = document.getElementById("field-fullname").value.trim();
    const phone = document.getElementById("field-phone").value;
    const location = document.getElementById("field-location").value;
    const headline = document.getElementById("field-headline").value;
    const bio = document.getElementById("field-bio").value;

    if (fullName && !/^[A-Za-z\s]+$/.test(fullName)) {
      showToast("Full Name must contain only alphabetic characters and spaces", "error");
      const nameField = document.getElementById("field-fullname");
      if (nameField) nameField.focus();
      return;
    }

    try {
      const res = await API.put("/auth/profile", {
        fullName,
        phone,
        location,
        headline,
        bio,
      });

      if (res.success) {
        Auth.updateUser(res.user);
        showToast("Profile details updated successfully!", "success");
        await this.loadProfileData();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  },

  safeSetValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
};

window.Seeker = Seeker;
