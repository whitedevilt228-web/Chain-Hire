// Real-time Chat and Messaging Logic
const Chat = {
  activeContactId: null,
  contacts: [],
  pollTimer: null,

  async init() {
    Auth.requireAuth();
    Auth.renderNavigation("messages");
    await this.loadConversations();
    this.startPolling();
  },

  async loadConversations() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlContactId = urlParams.get("contactId") || urlParams.get("userId");

      const res = await API.get("/chat/conversations");
      if (res.success) {
        this.contacts = res.contacts || [];

        // If a contact ID was provided via URL parameter (e.g., from Profile or Admin), ensure it's selected
        if (urlContactId) {
          const parsedId = parseInt(urlContactId, 10);
          const exists = this.contacts.find(c => c.id === parsedId);
          if (!exists) {
            try {
              const userRes = await API.get(`/auth/user/${parsedId}`);
              if (userRes.success && userRes.user) {
                const u = userRes.user;
                this.contacts.unshift({
                  id: u.id,
                  fullName: u.fullName,
                  email: u.email,
                  role: u.role,
                  avatar: u.avatar,
                  headline: u.headline || "",
                  lastMessage: "Start a conversation...",
                  lastMessageTime: new Date().toISOString(),
                  unreadCount: 0,
                });
              }
            } catch (uErr) {
              console.error("Could not fetch target user:", uErr);
            }
          }
          this.activeContactId = parsedId;
        }

        this.renderContacts();

        // Select active contact or first available contact
        if (this.activeContactId) {
          this.selectContact(this.activeContactId);
        } else if (this.contacts.length > 0) {
          this.selectContact(this.contacts[0].id);
        } else {
          // Empty state when no chats exist
          const streamEl = document.getElementById("chat-messages-stream");
          const headerEl = document.getElementById("chat-active-header");
          if (streamEl) {
            streamEl.innerHTML = `
              <div class="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                </div>
                <h4 class="font-bold text-slate-700 text-sm">No Active Conversations</h4>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">Only accounts you have exchanged messages with will appear here. You can start a chat from user profiles, candidate lists, or job applications.</p>
              </div>
            `;
          }
          if (headerEl) {
            headerEl.innerHTML = `<div class="text-xs text-slate-400 font-medium">Select or start a conversation to view messages.</div>`;
          }
        }
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  },

  renderContacts(customList = null) {
    const container = document.getElementById("chat-contacts-list");
    if (!container) return;

    const list = customList !== null ? customList : this.contacts;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-400">
          <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
          <div class="font-medium text-slate-600">No Conversations</div>
          <p class="text-[11px] text-slate-400 mt-1">Only users you have active chats with are displayed.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(c => {
      const isActive = c.id === this.activeContactId;
      return `
        <div onclick="Chat.selectContact(${c.id})" 
          class="p-3 border-b border-slate-100 cursor-pointer transition-colors flex items-center gap-3 ${isActive ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}">
          <div onclick="event.stopPropagation(); Chat.openUserProfileModal(${c.id})" title="Click to view profile" class="relative w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-emerald-500 transition-all">
            ${c.avatar ? `<img src="${c.avatar}" class="w-full h-full object-cover"/>` : c.fullName.charAt(0)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-xs text-slate-800 truncate hover:text-emerald-600 transition-colors">${c.fullName}</span>
              ${c.unreadCount > 0 ? `
                <span class="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">${c.unreadCount}</span>
              ` : ''}
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5">
              ${c.lastMessage || c.headline || 'Say hello...'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterContacts(term) {
    const query = (term || "").toLowerCase().trim();
    if (!query) {
      this.renderContacts();
      return;
    }
    const filtered = this.contacts.filter(c => 
      (c.fullName && c.fullName.toLowerCase().includes(query)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(query)) ||
      (c.headline && c.headline.toLowerCase().includes(query))
    );
    this.renderContacts(filtered);
  },

  async selectContact(contactId) {
    this.activeContactId = contactId;
    this.renderContacts();
    await this.loadMessages();
  },

  async loadMessages() {
    if (!this.activeContactId) return;
    const headerEl = document.getElementById("chat-active-header");
    const streamEl = document.getElementById("chat-messages-stream");

    try {
      const res = await API.get(`/chat/messages/${this.activeContactId}`);
      if (res.success) {
        if (headerEl && res.contact) {
          headerEl.innerHTML = `
            <div class="flex items-center justify-between">
              <div onclick="Chat.openUserProfileModal(${res.contact.id})" title="Click to view profile" class="flex items-center gap-3 group cursor-pointer">
                <div class="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden group-hover:ring-2 group-hover:ring-emerald-500 transition-all">
                  ${res.contact.avatar ? `<img src="${res.contact.avatar}" class="w-full h-full object-cover"/>` : res.contact.fullName.charAt(0)}
                </div>
                <div>
                  <h4 class="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                    <span>${res.contact.fullName}</span>
                    <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </h4>
                  <div class="text-[11px] text-emerald-600 font-medium capitalize flex items-center gap-1">
                    <span>${res.contact.role === 'jobSeeker' ? 'Job Seeker' : (res.contact.role === 'recruiter' ? 'Recruiter / Employer' : res.contact.role)}</span>
                    <span class="text-slate-300">•</span>
                    <span class="text-slate-500 group-hover:underline">View Profile</span>
                  </div>
                </div>
              </div>
              <button onclick="Chat.openUserProfileModal(${res.contact.id})" class="btn-outline-emerald text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <span>View Profile</span>
              </button>
            </div>
          `;
        }

        if (streamEl) {
          const currentUserId = Auth.getUser()?.id;
          if (res.messages.length === 0) {
            streamEl.innerHTML = `
              <div class="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                <div>
                  <svg class="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  <span>Start the conversation. Send a message below.</span>
                </div>
              </div>
            `;
          } else {
            streamEl.innerHTML = res.messages.map(m => {
              const isMine = m.senderId === currentUserId;
              return `
                <div class="flex ${isMine ? 'justify-end' : 'justify-start items-start gap-2.5'} mb-3">
                  ${!isMine ? `
                    <div onclick="Chat.openUserProfileModal(${res.contact.id})" title="View ${res.contact.fullName}'s profile" class="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden flex-shrink-0 mt-0.5 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer">
                      ${res.contact.avatar ? `<img src="${res.contact.avatar}" class="w-full h-full object-cover"/>` : res.contact.fullName.charAt(0)}
                    </div>
                  ` : ''}
                  <div class="max-w-md px-4 py-2.5 rounded-2xl text-xs ${isMine ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}">
                    ${!isMine ? `
                      <span onclick="Chat.openUserProfileModal(${res.contact.id})" class="block font-bold text-[11px] text-emerald-700 hover:underline cursor-pointer mb-1">
                        ${res.contact.fullName}
                      </span>
                    ` : ''}
                    <p class="leading-relaxed">${m.message}</p>
                    <span class="block text-[10px] mt-1 text-right ${isMine ? 'text-emerald-100' : 'text-slate-400'}">
                      ${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              `;
            }).join('');
            streamEl.scrollTop = streamEl.scrollHeight;
          }
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  },

  async openUserProfileModal(userId) {
    const modal = document.getElementById("user-profile-modal");
    const body = document.getElementById("user-profile-modal-body");
    const titleEl = document.getElementById("modal-user-title");

    if (!modal || !body) return;

    modal.classList.remove("hidden");
    body.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-xs">
        <svg class="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        Loading profile details...
      </div>
    `;

    try {
      const [userRes, expRes] = await Promise.all([
        API.get(`/auth/user/${userId}`),
        API.get(`/experiences?userId=${userId}`)
      ]);

      if (!userRes.success || !userRes.user) {
        body.innerHTML = `<div class="p-6 text-center text-red-500 text-xs">Failed to load user profile.</div>`;
        return;
      }

      const u = userRes.user;
      const exps = expRes.experiences || [];
      const verifiedCount = exps.filter(e => e.status === 'verified').length;
      const roleName = u.role === 'jobSeeker' ? 'Job Seeker' : (u.role === 'recruiter' ? 'Recruiter / Employer' : 'Admin');

      if (titleEl) {
        titleEl.innerText = `${u.fullName}'s Profile`;
      }

      body.innerHTML = `
        <div class="space-y-5">
          <!-- Profile Card Top Header -->
          <div class="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div class="w-16 h-16 rounded-full bg-slate-200 border-2 border-emerald-500 flex items-center justify-center font-bold text-xl text-slate-700 overflow-hidden flex-shrink-0 shadow-sm">
              ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover"/>` : u.fullName.charAt(0)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-slate-900 text-base leading-tight">${u.fullName}</h3>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ${roleName}
                </span>
              </div>
              <p class="text-xs text-slate-600 font-medium mt-1">${u.headline || 'Web3 Professional'}</p>
              <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                <span>📍 ${u.location || 'Remote / Worldwide'}</span>
                <span>✉️ ${u.email}</span>
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
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
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
                <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                On-Chain Verification Status
              </span>
              <span class="font-black text-emerald-700">${verifiedCount} Verified Credential${verifiedCount === 1 ? '' : 's'}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-emerald-100/80 text-[11px] font-semibold text-slate-700">
              <div class="flex items-center gap-1 text-emerald-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span>Identity ✓</span>
              </div>
              <div class="flex items-center gap-1 text-emerald-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span>Work Exp ✓</span>
              </div>
              <div class="flex items-center gap-1 text-emerald-700">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span>On-Chain ✓</span>
              </div>
            </div>
          </div>

          <!-- Work Experience List -->
          <div>
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Employment History</h4>
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
                      <div class="text-[10px] text-slate-400 mt-0.5">${exp.startDate} – ${exp.isCurrent ? 'Present' : (exp.endDate || 'N/A')}</div>
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
                      Tx: <span class="text-slate-500">${exp.txHash.substring(0, 16)}...</span>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Close Button -->
          <div class="pt-3 border-t border-slate-100 flex justify-end">
            <button onclick="Chat.closeUserProfileModal()" class="btn-emerald text-xs py-2 px-5">
              Close Profile
            </button>
          </div>
        </div>
      `;
    } catch (err) {
      console.error("Profile load error:", err);
      body.innerHTML = `<div class="p-6 text-center text-red-500 text-xs">${err.message || 'Error loading profile'}</div>`;
    }
  },

  closeUserProfileModal() {
    const modal = document.getElementById("user-profile-modal");
    if (modal) modal.classList.add("hidden");
  },

  async sendMessage(e) {
    if (e) e.preventDefault();
    if (!this.activeContactId) return;

    const input = document.getElementById("chat-input-field");
    const message = input?.value?.trim();
    if (!message) return;

    try {
      const res = await API.post("/chat/send", {
        receiverId: this.activeContactId,
        message,
      });

      if (res.success) {
        if (input) input.value = "";
        await this.loadMessages();
        await this.loadConversations();
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  startPolling() {
    this.pollTimer = setInterval(() => {
      if (this.activeContactId) {
        this.loadMessages();
      }
    }, 4000);
  },

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
};

window.Chat = Chat;
