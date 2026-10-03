import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://njdrnrnnlsrxdyugmsww.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHJucm5ubHNyeGR5dWdtc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExNDEsImV4cCI6MjEwNTQ3NzE0MX0.F65pU2A3XjyEaisye2GfzLPF9DCaQF1fklMxgSTRhs8";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIOSK_SECRET = "VIHARA_ZEN_SECRET_2026";

const loginSection = document.getElementById("login-section");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nameGroup = document.getElementById("name-group");
const registerNameInput = document.getElementById("register-name");
const registerBirthPlace = document.getElementById("register-birth-place");
const registerBirthDate = document.getElementById("register-birth-date");
const registerPhoneInput = document.getElementById("register-phone");

const authMainButton = document.getElementById("auth-main-button");
const authButtonText = document.getElementById("auth-button-text");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleAuthText = document.getElementById("toggle-auth-text");
const messageEl = document.getElementById("message");
const unverifiedSection = document.getElementById("unverified-section");

const userNameDisplay = document.getElementById("user-name-display");
const userCodeEl = document.getElementById("user-code");
const todayStatusEl = document.getElementById("today-status");
const attendanceHistory = document.getElementById("attendance-history");

const logoutBtn = document.getElementById("logout-button");

let isRegisterMode = false;
let currentUserRole = "user";
let currentUserId = null;
let currentEmployeeData = null;
let activeChatFriendId = null;

// ==============================
// 1. AUTO CHECK-IN & QR SCANNER
// ==============================
async function checkUrlAutoAttendance() {
  const urlParams = new URLSearchParams(window.location.search);
  const secret = urlParams.get("secret");
  const block = urlParams.get("block");

  if (secret && block) {
    sessionStorage.setItem("pending_secret", secret);
    sessionStorage.setItem("pending_block", block);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const savedSecret = sessionStorage.getItem("pending_secret");
  const savedBlock = sessionStorage.getItem("pending_block");

  if (savedSecret && savedBlock) {
    const currentUnix = Math.floor(Date.now() / 1000);
    const currentBlock = Math.floor(currentUnix / 15);

    if (savedSecret === KIOSK_SECRET && Math.abs(currentBlock - parseInt(savedBlock)) <= 4) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (!isRegisterMode && toggleAuthBtn) toggleAuthBtn.click();
        if (messageEl) messageEl.textContent = "Silakan buat akun untuk menyelesaikan presensi.";
        return; 
      }

      const { data, error } = await supabase.rpc("check_in");
      
      if (!error && data && data.success) {
        alert("Absensi Berhasil via Scan QR!");
        await loadUserProfile();
      } else {
        const errorMsg = error ? error.message : (data ? data.message : "Terjadi kesalahan.");
        alert("Gagal Absen: " + errorMsg);
      }
      
      sessionStorage.removeItem("pending_secret");
      sessionStorage.removeItem("pending_block");
    } else {
      alert("QR Code kedaluwarsa. Silakan scan ulang.");
      sessionStorage.removeItem("pending_secret");
      sessionStorage.removeItem("pending_block");
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await loadUserProfile();
    await checkUrlAutoAttendance();
  } else {
    showLoginSection();
    await checkUrlAutoAttendance(); 
  }
});

if (toggleAuthBtn) {
  toggleAuthBtn.addEventListener("click", () => {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      if (nameGroup) nameGroup.style.display = "block";
      if (authButtonText) authButtonText.textContent = "Daftar";
      if (toggleAuthText) toggleAuthText.textContent = "Sudah punya akun?";
      toggleAuthBtn.textContent = "Login di sini";
    } else {
      if (nameGroup) nameGroup.style.display = "none";
      if (authButtonText) authButtonText.textContent = "Masuk";
      if (toggleAuthText) toggleAuthText.textContent = "Belum punya akun?";
      toggleAuthBtn.textContent = "Daftar di sini";
    }
    if (messageEl) messageEl.textContent = "";
  });
}

// ==============================
// 2. AUTHENTICATION
// ==============================
if (authMainButton) {
  authMainButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      if (messageEl) messageEl.textContent = "Email dan password wajib diisi!";
      return;
    }

    if (messageEl) messageEl.textContent = "Memproses...";

    if (isRegisterMode) {
      const name = registerNameInput.value.trim();
      const birthPlace = registerBirthPlace.value.trim();
      const birthDate = registerBirthDate.value;
      const phone = registerPhoneInput ? registerPhoneInput.value.trim() : "";

      if (!name || !birthPlace || !birthDate || !phone) {
        if (messageEl) messageEl.textContent = "Nama, tempat/tgl lahir, dan No WhatsApp wajib diisi!";
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, 
        password, 
        options: { 
          data: { full_name: name, birth_place: birthPlace, birth_date: birthDate, phone: phone } 
        }
      });

      if (signUpError) {
        if (messageEl) messageEl.textContent = "Gagal mendaftar: " + signUpError.message;
        return;
      }

      const { error: autoLoginError } = await supabase.auth.signInWithPassword({ email, password });
      if (autoLoginError) {
        toggleAuthBtn.click();
        return;
      }

      await loadUserProfile();
      await checkUrlAutoAttendance();

    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (messageEl) messageEl.textContent = "Login Gagal: " + error.message;
        return;
      }

      await loadUserProfile();
      await checkUrlAutoAttendance();
    }
  });
}

async function handleLogout() {
  await supabase.auth.signOut();
  showLoginSection();
}

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

function showLoginSection() {
  const authContainer = document.getElementById("auth-container");
  const dashboardWorkspace = document.getElementById("dashboard-workspace");

  if (authContainer) authContainer.style.display = "flex";
  if (dashboardWorkspace) dashboardWorkspace.style.display = "none";
}

// ==============================
// 3. LOAD USER PROFILE & INITIALIZE
// ==============================
async function loadUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  currentUserId = user.id;

  document.getElementById("auth-container").style.display = "none";
  document.getElementById("dashboard-workspace").style.display = "flex";

  const { data: empData } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .single();

  if (empData) {
    currentEmployeeData = empData;
    currentUserRole = empData.role;

    // AMBIL HANYA NAMA DEPAN UNTUK HEADER
    const firstName = empData.name.split(" ")[0];
    if (userNameDisplay) userNameDisplay.textContent = firstName;
    if (userCodeEl) userCodeEl.textContent = `Kode: ${empData.employee_code}`;

    document.getElementById("profile-page-name").textContent = empData.name;
    document.getElementById("profile-page-code").textContent = `Kode Anggota: ${empData.employee_code}`;
    document.getElementById("profile-page-points").textContent = empData.points || 0;
    document.getElementById("profile-page-bio").textContent = `"${empData.bio || 'Halo, salam kenal ya!'}"`;

    const avatarUrl = empData.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${empData.name}`;
    document.getElementById("profile-page-avatar").src = avatarUrl;

    const navAdminBtns = document.querySelectorAll(".nav-admin-btn");
    navAdminBtns.forEach(btn => btn.style.display = (currentUserRole === "admin" || currentUserRole === "adm1n" || currentUserRole === "pengurus") ? "flex" : "none");
  }

  await Promise.all([
    loadTodayStatus(),
    loadAttendanceHistory(),
    loadMonthlyStatistics(),
    loadUserAchievements(),
    loadNotifications(),
    loadFriendsList()
  ]);

  if (window.initFeedSystem) await window.initFeedSystem();
}

// ==============================
// 4. REALTIME SEARCH & AUTOCOMPLETE FRIENDS
// ==============================
const searchInput = document.getElementById("friend-search-input");
const autocompleteDropdown = document.getElementById("search-autocomplete-dropdown");
const friendsListContainer = document.getElementById("friends-list-container");

if (searchInput) {
  searchInput.addEventListener("input", async (e) => {
    const keyword = e.target.value.trim();
    if (!keyword) {
      autocompleteDropdown.style.display = "none";
      await loadFriendsList();
      return;
    }

    const { data: users } = await supabase
      .from("employees")
      .select("id, name, employee_code, avatar_url")
      .ilike("name", `%${keyword}%`)
      .neq("id", currentUserId)
      .limit(5);

    if (users && users.length > 0) {
      autocompleteDropdown.innerHTML = "";
      users.forEach(u => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`;
        item.innerHTML = `
          <img src="${avatar}" class="autocomplete-avatar">
          <div class="autocomplete-info">
            <h5>${u.name}</h5>
            <span>Kode: ${u.employee_code}</span>
          </div>
        `;
        item.addEventListener("click", () => {
          searchInput.value = u.name;
          autocompleteDropdown.style.display = "none";
          openPublicProfile(u.id);
        });
        autocompleteDropdown.appendChild(item);
      });
      autocompleteDropdown.style.display = "block";
    } else {
      autocompleteDropdown.style.display = "none";
    }
  });

  searchInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const keyword = searchInput.value.trim();
      autocompleteDropdown.style.display = "none";
      if (!keyword) return;

      document.getElementById("friends-section-title").textContent = `Hasil Pencarian: "${keyword}"`;
      friendsListContainer.innerHTML = "<p style='color: var(--text-sub); text-align: center;'>Mencari...</p>";

      const { data: users } = await supabase
        .from("employees")
        .select("id, name, employee_code, avatar_url")
        .ilike("name", `%${keyword}%`)
        .neq("id", currentUserId);

      if (!users || users.length === 0) {
        friendsListContainer.innerHTML = "<p style='color: var(--text-sub); text-align: center;'>Pengguna tidak ditemukan.</p>";
        return;
      }

      friendsListContainer.innerHTML = "";
      users.forEach(u => {
        const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`;
        const card = document.createElement("div");
        card.className = "user-card-item";
        card.innerHTML = `
          <div class="user-card-left" onclick="openPublicProfile('${u.id}')">
            <img src="${avatar}" class="user-card-avatar">
            <div>
              <div class="user-card-name">${u.name}</div>
              <div class="user-card-sub">Kode: ${u.employee_code}</div>
            </div>
          </div>
          <button class="secondary-button" onclick="openPublicProfile('${u.id}')">Lihat Profil</button>
        `;
        friendsListContainer.appendChild(card);
      });
    }
  });
}

// ==============================
// 5. SYSTEM FRIENDS & PUBLIC PROFILE (INSTAGRAM STYLE)
// ==============================
window.openPublicProfile = async function(targetUserId) {
  switchTab("public-profile", true);
  const container = document.getElementById("public-profile-container");
  container.innerHTML = "<p style='color: var(--text-sub); text-align: center;'>Memuat profil...</p>";

  const { data: targetUser } = await supabase.from("employees").select("*").eq("id", targetUserId).single();
  if (!targetUser) return;

  const { data: friendRelation } = await supabase
    .from("friendships")
    .select("*")
    .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
    .maybeSingle();

  let actionButtonHtml = "";
  if (!friendRelation) {
    actionButtonHtml = `<button class="btn-ig-action btn-ig-primary" onclick="sendFriendRequest('${targetUserId}')">Follow / Add Friend</button>`;
  } else if (friendRelation.status === "pending") {
    if (friendRelation.user_id === currentUserId) {
      actionButtonHtml = `<button class="btn-ig-action btn-ig-secondary" disabled>Request Sent</button>`;
    } else {
      actionButtonHtml = `<button class="btn-ig-action btn-ig-primary" onclick="acceptFriendRequest('${friendRelation.id}')">Add Back</button>`;
    }
  } else if (friendRelation.status === "accepted") {
    actionButtonHtml = `
      <button class="btn-ig-action btn-ig-secondary" disabled>Friends ✓</button>
      <button class="btn-ig-action btn-ig-primary" onclick="openChatRoom('${targetUserId}')">Message</button>
    `;
  }

  const { count: friendsCount } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`)
    .eq("status", "accepted");

  const avatar = targetUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.name}`;

  container.innerHTML = `
    <div class="ig-profile-header">
      <img src="${avatar}" class="ig-avatar-large">
      <h2 class="ig-username">${targetUser.name}</h2>
      <p class="ig-subtext">Kode: ${targetUser.employee_code} &bull; Mudiviverse Member</p>
      
      <div class="ig-stats-row">
        <div class="ig-stat-box"><div class="ig-stat-num">${friendsCount || 0}</div><div class="ig-stat-lbl">Friends</div></div>
        <div class="ig-stat-box"><div class="ig-stat-num">${targetUser.points || 0}</div><div class="ig-stat-lbl">Points</div></div>
      </div>

      <div class="ig-actions-row">${actionButtonHtml}</div>
    </div>

    <div class="card-box" style="margin-bottom: 16px;">
      <h3 class="section-heading" style="margin-bottom: 8px;">Bio</h3>
      <p style="font-size: 13px; font-style: italic; color: var(--text-main);">"${targetUser.bio || 'Belum ada bio.'}"</p>
    </div>
  `;
};

document.getElementById("btn-back-from-public-profile").addEventListener("click", () => switchTab("friends", false));

window.sendFriendRequest = async function(friendId) {
  await supabase.from("friendships").insert({ user_id: currentUserId, friend_id: friendId, status: "pending" });
  await supabase.from("notifications").insert({
    user_id: friendId,
    sender_id: currentUserId,
    type: "friend_request",
    message: `${currentEmployeeData.name} mengirimkan permintaan pertemanan.`
  });
  alert("Permintaan pertemanan terkirim!");
  openPublicProfile(friendId);
};

window.acceptFriendRequest = async function(friendshipId) {
  await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  alert("Sekarang kalian berteman!");
  await loadFriendsList();
  switchTab("friends", false);
};

async function loadFriendsList() {
  document.getElementById("friends-section-title").textContent = "👥 Teman Saya";
  const { data: friends } = await supabase
    .from("friendships")
    .select("*, user:user_id(*), friend:friend_id(*)")
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
    .eq("status", "accepted");

  if (!friends || friends.length === 0) {
    friendsListContainer.innerHTML = "<p style='color: var(--text-sub); text-align: center;'>Belum ada teman. Cari dan tambahkan teman baru!</p>";
    document.getElementById("friends-count-badge").textContent = "0 Teman";
    document.getElementById("my-friends-count-stat").textContent = "0";
    return;
  }

  document.getElementById("friends-count-badge").textContent = `${friends.length} Teman`;
  document.getElementById("my-friends-count-stat").textContent = friends.length;
  friendsListContainer.innerHTML = "";

  friends.forEach(f => {
    const friendObj = f.user_id === currentUserId ? f.friend : f.user;
    const avatar = friendObj.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${friendObj.name}`;
    const card = document.createElement("div");
    card.className = "user-card-item";
    card.innerHTML = `
      <div class="user-card-left" onclick="openPublicProfile('${friendObj.id}')">
        <img src="${avatar}" class="user-card-avatar">
        <div>
          <div class="user-card-name">${friendObj.name}</div>
          <div class="user-card-sub">Kode: ${friendObj.employee_code}</div>
        </div>
      </div>
      <button class="main-button" style="padding: 6px 14px; font-size: 12px; margin: 0; background: var(--ios-blue); color: white;" onclick="openChatRoom('${friendObj.id}')">Message</button>
    `;
    friendsListContainer.appendChild(card);
  });
}

// ==============================
// 6. SYSTEM CHAT ROOM (REFERENSI GAMBAR 2)
// ==============================
const chatModal = document.getElementById("chat-room-modal");
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatInput = document.getElementById("chat-message-input");

window.openChatRoom = async function(friendId) {
  activeChatFriendId = friendId;
  const { data: friend } = await supabase.from("employees").select("*").eq("id", friendId).single();
  if (!friend) return;

  const avatar = friend.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.name}`;
  document.getElementById("chat-header-avatar").src = avatar;
  document.getElementById("chat-header-name").textContent = friend.name;
  document.getElementById("chat-header-username").textContent = `Kode: ${friend.employee_code}`;

  document.getElementById("chat-banner-avatar").src = avatar;
  document.getElementById("chat-banner-name").textContent = friend.name;
  document.getElementById("btn-view-profile-from-chat").onclick = () => {
    chatModal.style.display = "none";
    openPublicProfile(friendId);
  };

  chatModal.style.display = "flex";
  await loadMessages();

  // REALTIME SUBSCRIPTION FOR CHAT
  supabase.channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      if (payload.new.sender_id === activeChatFriendId || payload.new.sender_id === currentUserId) {
        appendMessageBubble(payload.new);
      }
    })
    .subscribe();
};

document.getElementById("btn-close-chat").addEventListener("click", () => {
  chatModal.style.display = "none";
  activeChatFriendId = null;
});

async function loadMessages() {
  chatMessagesContainer.innerHTML = "";
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChatFriendId}),and(sender_id.eq.${activeChatFriendId},receiver_id.eq.${currentUserId})`)
    .order("created_at", { ascending: true });

  if (msgs) {
    msgs.forEach(m => appendMessageBubble(m));
  }
}

function appendMessageBubble(m) {
  const isMe = m.sender_id === currentUserId;
  const bubble = document.createElement("div");
  bubble.className = `msg-bubble ${isMe ? 'msg-me' : 'msg-them'}`;
  bubble.textContent = m.message;
  chatMessagesContainer.appendChild(bubble);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

document.getElementById("btn-send-message").addEventListener("click", async () => {
  const text = chatInput.value.trim();
  if (!text || !activeChatFriendId) return;

  chatInput.value = "";
  await supabase.from("messages").insert({
    sender_id: currentUserId,
    receiver_id: activeChatFriendId,
    message: text
  });
});

document.getElementById("btn-chat-options").addEventListener("click", async () => {
  if (confirm("Hapus seluruh obrolan dengan user ini secara lokal?")) {
    await supabase.from("messages").delete().or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChatFriendId}),and(sender_id.eq.${activeChatFriendId},receiver_id.eq.${currentUserId})`);
    chatMessagesContainer.innerHTML = "";
  }
});

// ==============================
// 7. NOTIFICATIONS SYSTEM
// ==============================
async function loadNotifications() {
  const container = document.getElementById("notifications-list-container");
  const { data: notifs } = await supabase
    .from("notifications")
    .select("*, sender:sender_id(*)")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (!notifs || notifs.length === 0) {
    container.innerHTML = "<p style='color: var(--text-sub); text-align: center;'>Tidak ada notifikasi baru.</p>";
    return;
  }

  container.innerHTML = "";
  notifs.forEach(n => {
    const time = new Date(n.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement("div");
    item.className = "notif-item";

    let actionBtnHtml = "";
    if (n.type === "friend_request") {
      actionBtnHtml = `<button class="main-button" style="padding: 6px 12px; font-size: 11px; margin: 0; background: var(--ios-green); color: white;" onclick="acceptFriendRequestFromNotif('${n.sender_id}')">Add Back</button>`;
    }

    item.innerHTML = `
      <div class="notif-left">
        <div>
          <div class="notif-text">${n.message}</div>
          <span class="notif-time">${time} WIB</span>
        </div>
      </div>
      <div>${actionBtnHtml}</div>
    `;
    container.appendChild(item);
  });
}

window.acceptFriendRequestFromNotif = async function(senderId) {
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_id", senderId)
    .eq("friend_id", currentUserId)
    .single();

  if (friendship) {
    await acceptFriendRequest(friendship.id);
    await loadNotifications();
  }
};

// ==============================
// HELPER FUNCTIONS & LISTENERS
// ==============================
async function loadTodayStatus() {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const { data } = await supabase.from("attendance").select("check_in, status").eq("employee_id", currentUserId).eq("attendance_date", todayStr).maybeSingle();
  if (data) {
    const time = new Date(data.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    todayStatusEl.innerHTML = `<div style="font-size: 15px; font-weight: 700;">Sudah Absen (${time} WIB)</div>`;
  } else {
    todayStatusEl.innerHTML = `<div style="font-size: 15px; font-weight: 700; color: var(--ios-red);">Belum Absen</div>`;
  }
}

async function loadAttendanceHistory() {
  const { data } = await supabase.from("attendance").select("*").eq("employee_id", currentUserId).order("attendance_date", { ascending: false });
  if (!data) return;
  attendanceHistory.innerHTML = "";
  data.forEach(row => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<div><strong>${row.attendance_date}</strong></div><div>${row.status}</div>`;
    attendanceHistory.appendChild(item);
  });
}

async function loadMonthlyStatistics() {}
async function loadUserAchievements() {}

// DRAWER NAVIGATION
const mobileHamburgerBtn = document.getElementById("mobile-hamburger-btn");
const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
const closeMobileNavBtn = document.getElementById("close-mobile-nav");

if (mobileHamburgerBtn) mobileHamburgerBtn.addEventListener("click", () => mobileNavOverlay.classList.add("open"));
if (closeMobileNavBtn) closeMobileNavBtn.addEventListener("click", () => mobileNavOverlay.classList.remove("open"));

function switchTab(tabName, pushToHistory = true) {
  const views = {
    home: document.getElementById("tab-home-view"),
    posts: document.getElementById("tab-posts-view"),
    friends: document.getElementById("tab-friends-view"),
    notifications: document.getElementById("tab-notifications-view"),
    presensi: document.getElementById("tab-presensi-view"),
    profile: document.getElementById("tab-profile-view"),
    "public-profile": document.getElementById("tab-public-profile-view"),
    admin: document.getElementById("tab-admin-view")
  };

  Object.keys(views).forEach(key => { if (views[key]) views[key].style.display = "none"; });
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  if (views[tabName]) views[tabName].style.display = "block";
  document.querySelectorAll(`.nav-btn[data-tab="${tabName}"]`).forEach(btn => btn.classList.add("active"));

  mobileNavOverlay.classList.remove("open");
  if (pushToHistory) history.pushState({ tab: tabName }, "", `#${tabName}`);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (btn) switchTab(btn.getAttribute("data-tab"), true);
});

window.addEventListener("popstate", (event) => {
  if (event.state && event.state.tab) switchTab(event.state.tab, false);
});

// CLOCK INITIALIZER
setInterval(() => {
  const clockEl = document.getElementById("live-time");
  if (clockEl) clockEl.textContent = new Date().toLocaleTimeString("id-ID", { timeZone: 'Asia/Jakarta' });
}, 1000);