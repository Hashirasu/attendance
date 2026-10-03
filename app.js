import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { 
  publishRealItem, redeemRealItem, renderRealItems,
  currentAvatarConfig, loadUserAvatarConfig, renderAvatarDisplay, saveUserAvatarConfig, addNewCatalogItem 
} from "./shop.js";

const SUPABASE_URL = "https://njdrnrnnlsrxdyugmsww.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHJucm5ubHNyeGR5dWdtc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExNDEsImV4cCI6MjEwNTQ3NzE0MX0.F65pU2A3XjyEaisye2GfzLPF9DCaQF1fklMxgSTRhs8";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIOSK_SECRET = "VIHARA_ZEN_SECRET_2026";

const loginSection = document.getElementById("login-section");
const userSection = document.getElementById("user-section");
const adminSection = document.getElementById("admin-section");

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

const switchToAdminBtn = document.getElementById("switch-to-admin");
const switchToUserBtn = document.getElementById("switch-to-user");
const logoutBtn = document.getElementById("logout-button");
const adminLogoutBtn = document.getElementById("admin-logout-button");

const tabRekapBtn = document.getElementById("tab-rekap-btn");
const tabKaryawanBtn = document.getElementById("tab-karyawan-btn");
const tabKioskBtn = document.getElementById("tab-kiosk-btn");

const adminViewRekap = document.getElementById("admin-view-rekap");
const adminViewKaryawan = document.getElementById("admin-view-karyawan");
const adminViewKiosk = document.getElementById("admin-view-kiosk");

const adminFilterDate = document.getElementById("admin-filter-date");
const adminFilterStatus = document.getElementById("admin-filter-status");
const exportCsvBtn = document.getElementById("export-csv-btn");
const adminAttendanceList = document.getElementById("admin-attendance-list");
const adminEmployeeList = document.getElementById("admin-employee-list");

const adminChartFilter = document.getElementById("admin-chart-filter");
const adminChartContainer = document.getElementById("admin-chart-container");

const editEmpModal = document.getElementById("edit-emp-modal");
const editEmpId = document.getElementById("edit-emp-id");
const editEmpName = document.getElementById("edit-emp-name");
const editEmpPhone = document.getElementById("edit-emp-phone");
const editEmpCode = document.getElementById("edit-emp-code");
const editEmpRole = document.getElementById("edit-emp-role");
const editEmpActive = document.getElementById("edit-emp-active");
const editModalMsg = document.getElementById("edit-modal-msg");
const cancelEditEmp = document.getElementById("cancel-edit-emp");
const saveEditEmp = document.getElementById("save-edit-emp");

let isRegisterMode = false;
let currentUserRole = "user";
let currentUserId = null;
let currentEmployeeData = null;
let kioskTimerInterval = null;
let kioskQrObject = null;
let activeChatFriendId = null;

// ==============================
// 1. AUTO CHECK-IN & PRESENSI UTAMA
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
        await Promise.all([
          loadUserProfile(),
          loadTodayStatus(),
          loadAttendanceHistory(),
          loadMonthlyStatistics(),
          loadUserAchievements()
        ]);
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

    const emailRegex = /^[a-zA-Z0-9.]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      if (messageEl) messageEl.textContent = "Format email harus menggunakan @gmail.com dan bagian depan hanya huruf, angka, serta titik (.) saja.";
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

      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(name)) {
        if (messageEl) messageEl.textContent = "Nama hanya boleh berisi huruf dan spasi.";
        return;
      }

      const { data: nameExists, error: rpcError } = await supabase.rpc("check_name_exists", { p_name: name });
      if (rpcError) {
        if (messageEl) messageEl.textContent = "Gagal memvalidasi nama: " + rpcError.message;
        return;
      }

      if (nameExists) {
        if (messageEl) messageEl.textContent = "Nama lengkap ini sudah terdaftar!";
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, birth_place: birthPlace, birth_date: birthDate, phone: phone } }
      });

      if (signUpError) {
        if (messageEl) messageEl.textContent = "Gagal mendaftar: " + signUpError.message;
        return;
      }

      if (messageEl) messageEl.textContent = "Pendaftaran berhasil, masuk ke akun...";

      const { error: autoLoginError } = await supabase.auth.signInWithPassword({ email, password });

      if (autoLoginError) {
        if (messageEl) messageEl.textContent = "Pendaftaran berhasil! Silakan masuk manual.";
        toggleAuthBtn.click();
        return;
      }

      if (messageEl) messageEl.textContent = "";
      await loadUserProfile();
      await checkUrlAutoAttendance();

    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (messageEl) messageEl.textContent = "Login Gagal: " + error.message;
        return;
      }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        if (emailInput) emailInput.style.display = "none";
        if (passwordInput) passwordInput.style.display = "none";
        if (authMainButton) authMainButton.style.display = "none";
        const authToggleBox = document.querySelector(".auth-toggle-box");
        if (authToggleBox) authToggleBox.style.display = "none";
        if (unverifiedSection) unverifiedSection.style.display = "block";
        window.pendingVerificationEmail = email;
        if (messageEl) messageEl.textContent = "";
        return;
      }

      if (messageEl) messageEl.textContent = "";
      await loadUserProfile();
      await checkUrlAutoAttendance();
    }
  });
}

async function handleLogout() {
  if (kioskTimerInterval) clearInterval(kioskTimerInterval);
  await supabase.auth.signOut();
  showLoginSection();
}

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", handleLogout);

function showLoginSection() {
  const authContainer = document.getElementById("auth-container");
  const dashboardWorkspace = document.getElementById("dashboard-workspace");

  if (authContainer) authContainer.style.display = "flex";
  if (dashboardWorkspace) dashboardWorkspace.style.display = "none";

  if (loginSection) loginSection.style.display = "block";
  if (userSection) userSection.style.display = "none";
  if (adminSection) adminSection.style.display = "none";
  if (unverifiedSection) unverifiedSection.style.display = "none";
  if (emailInput) emailInput.style.display = "block";
  if (passwordInput) passwordInput.style.display = "block";
  if (authMainButton) authMainButton.style.display = "block";
  const authToggleBox = document.querySelector(".auth-toggle-box");
  if (authToggleBox) authToggleBox.style.display = "block";
  if (messageEl) messageEl.textContent = "";
}

// ==============================
// 3. LOAD USER PROFILE
// ==============================
async function loadUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  currentUserId = user.id;

  const authContainer = document.getElementById("auth-container");
  const dashboardWorkspace = document.getElementById("dashboard-workspace");

  if (authContainer) authContainer.style.display = "none";
  if (dashboardWorkspace) dashboardWorkspace.style.display = "flex";

  if (loginSection) loginSection.style.display = "none";
  if (userSection) userSection.style.display = "block";
  if (adminSection) adminSection.style.display = "none";

  const { data: empData, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!error && empData) {
    currentEmployeeData = empData;
    currentUserRole = empData.role;

    if (userNameDisplay) userNameDisplay.textContent = empData.name;
    if (userCodeEl) userCodeEl.textContent = `Kode: ${empData.employee_code}`;

    const profilePageAvatar = document.getElementById("profile-page-avatar");
    const profilePageName = document.getElementById("profile-page-name");
    const profilePageCode = document.getElementById("profile-page-code");
    const profilePagePoints = document.getElementById("profile-page-points");
    const profilePageBio = document.getElementById("profile-page-bio");

    const avatarUrl = empData.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${empData.name}`;

    if (profilePageAvatar) profilePageAvatar.src = avatarUrl;
    if (profilePageName) profilePageName.textContent = empData.name;
    if (profilePageCode) profilePageCode.textContent = `Kode Anggota: ${empData.employee_code}`;
    if (profilePagePoints) profilePagePoints.textContent = empData.points || 0;
    if (profilePageBio) profilePageBio.textContent = `"${empData.bio || 'Halo, salam kenal ya!'}"`;

    const navAdminBtns = document.querySelectorAll(".nav-admin-btn");
    const btnAdminPublishShop = document.getElementById("btn-admin-publish-shop");

    if (currentUserRole === "admin" || currentUserRole === "adm1n" || currentUserRole === "pengurus") {
      if (switchToAdminBtn) switchToAdminBtn.style.display = "inline-block";
      navAdminBtns.forEach(btn => btn.style.display = "flex");
      if (tabKioskBtn) tabKioskBtn.style.display = "inline-block";
      if (btnAdminPublishShop) btnAdminPublishShop.style.display = "inline-block";
    } else {
      if (switchToAdminBtn) switchToAdminBtn.style.display = "none";
      navAdminBtns.forEach(btn => btn.style.display = "none");
      if (tabKioskBtn) tabKioskBtn.style.display = "none";
      if (btnAdminPublishShop) btnAdminPublishShop.style.display = "none";
    }
  }

  await loadUserAvatarConfig(currentUserId);

  await Promise.all([
    loadTodayStatus(),
    loadAttendanceHistory(),
    loadMonthlyStatistics(),
    loadUserAchievements(),
    loadFriendsSystem(),
    loadMyFriendsList()
  ]);

  setupRealtimeListeners();

  if (window.initFeedSystem) {
    await window.initFeedSystem();
  }
}

async function loadUserAchievements() {
  if (!currentUserId) return;

  const { count } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", currentUserId);

  const totalAbsen = count || 0;
  let unlockedCount = 0;

  const item10 = document.getElementById("badge-item-10");
  const bar10 = document.getElementById("badge-bar-10");
  const status10 = document.getElementById("badge-status-10");
  if (item10 && bar10 && status10) {
    const pct10 = Math.min(100, Math.round((totalAbsen / 10) * 100));
    bar10.style.width = `${pct10}%`;
    if (totalAbsen >= 10) {
      item10.classList.remove("locked");
      item10.classList.add("unlocked");
      status10.textContent = "✅ Terbuka (10 / 10 Absen)";
      status10.style.color = "#10b981";
      unlockedCount++;
    } else {
      status10.textContent = `${totalAbsen} / 10 Absen`;
    }
  }

  const badgeCountText = document.getElementById("badge-count-text");
  if (badgeCountText) {
    badgeCountText.textContent = `${unlockedCount} / 3 Unlocked`;
  }
}

// ==========================================================
// 4. REALTIME PERTEMANAN & CHAT
// ==========================================================
function setupRealtimeListeners() {
  if (!currentUserId) return;

  supabase
    .channel("global-app-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, async () => {
      await Promise.all([loadFriendsSystem(), loadMyFriendsList()]);
      const publicCard = document.getElementById("public-profile-card");
      if (publicCard && publicCard.style.display !== "none") {
        const activeProfileId = window.location.hash.replace("#profile-", "");
        if (activeProfileId) await openPublicProfile(activeProfileId);
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, async (payload) => {
      const newMsg = payload.new;
      if (activeChatFriendId && (newMsg.sender_id === activeChatFriendId || newMsg.receiver_id === activeChatFriendId)) {
        await loadChatMessages();
      }
    })
    .subscribe();
}

// =========================================
// 5. FRIENDS SYSTEM (ADD, ACCEPT, REJECT, UNFOLLOW)
// =========================================
async function loadFriendsSystem() {
  const container = document.getElementById("search-friends-results");
  const searchInput = document.getElementById("search-friend-input");
  if (!container || !currentUserId) return;

  const { data: allUsers } = await supabase
    .from("employees")
    .select("id, name, employee_code, avatar_url, bio")
    .neq("id", currentUserId)
    .order("name");

  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

  function renderSearchList(query = "") {
    container.innerHTML = "";
    const filtered = (allUsers || []).filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.employee_code.toLowerCase().includes(query.toLowerCase()));

    if (filtered.length === 0) {
      container.innerHTML = `<p style="color:var(--text-sub); font-size:12px; text-align:center; padding:10px;">Anggota tidak ditemukan.</p>`;
      return;
    }

    filtered.forEach(u => {
      const rel = (friendships || []).find(f => 
        (f.user_id === currentUserId && f.friend_id === u.id) || 
        (f.friend_id === currentUserId && f.user_id === u.id)
      );

      let btnHTML = "";
      if (!rel) {
        btnHTML = `<button class="btn-friend-action btn-friend-add" data-id="${u.id}">+ Add</button>`;
      } else if (rel.status === "pending") {
        if (rel.user_id === currentUserId) {
          btnHTML = `<button class="btn-friend-action btn-friend-pending" disabled>Pending</button>`;
        } else {
          btnHTML = `
            <button class="btn-friend-action btn-friend-accept" data-id="${rel.id}" data-sender="${rel.user_id}">Accept</button>
            <button class="btn-friend-action btn-friend-reject" data-id="${rel.id}" data-sender="${rel.user_id}">Reject</button>
          `;
        }
      } else if (rel.status === "accepted") {
        btnHTML = `
          <div style="display: flex; gap: 6px;">
            <button class="btn-friend-action btn-friend-msg" data-id="${u.id}" data-name="${u.name}" data-avatar="${u.avatar_url || ''}">Message</button>
            <button class="btn-friend-unfollow" data-rel-id="${rel.id}" data-name="${u.name}" data-target-id="${u.id}">Unfollow</button>
          </div>
        `;
      }

      const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`;
      const item = document.createElement("div");
      item.className = "friend-item-card";
      item.innerHTML = `
        <div class="friend-user-info" data-user-id="${u.id}">
          <img src="${avatar}" class="friend-avatar-mini" alt="Avatar">
          <div>
            <div class="friend-name">${u.name}</div>
            <div class="friend-code">Kode: ${u.employee_code}</div>
          </div>
        </div>
        <div>${btnHTML}</div>
      `;
      container.appendChild(item);
    });
  }

  renderSearchList();

  if (searchInput) {
    searchInput.oninput = (e) => renderSearchList(e.target.value.trim());
  }
}

async function getUserSocialStats(targetUserId) {
  const { data: acceptedRel } = await supabase
    .from("friendships")
    .select("id")
    .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`)
    .eq("status", "accepted");

  const { data: followingRel } = await supabase
    .from("friendships")
    .select("id")
    .or(`and(user_id.eq.${targetUserId},status.eq.pending),and(user_id.eq.${targetUserId},status.eq.accepted),and(friend_id.eq.${targetUserId},status.eq.accepted)`);

  return {
    friendsCount: acceptedRel ? acceptedRel.length : 0,
    followingCount: followingRel ? followingRel.length : 0
  };
}

async function openPublicProfile(targetUserId) {
  const publicCard = document.getElementById("public-profile-card");
  const searchContainer = document.getElementById("friends-search-container");
  const actionBtnBox = document.getElementById("public-action-btn-box");

  if (!publicCard) return;

  const { data: u } = await supabase.from("employees").select("*").eq("id", targetUserId).single();
  if (!u) return;

  const { data: rel } = await supabase
    .from("friendships")
    .select("*")
    .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
    .maybeSingle();

  const stats = await getUserSocialStats(targetUserId);

  document.getElementById("public-avatar-img").src = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`;
  document.getElementById("public-name-text").textContent = u.name;
  document.getElementById("public-code-text").textContent = `Kode: ${u.employee_code}`;
  document.getElementById("public-bio-text").textContent = `"${u.bio || 'Halo, salam kenal!'}"`;
  document.getElementById("public-friends-count").textContent = stats.friendsCount;
  document.getElementById("public-following-count").textContent = stats.followingCount;

  if (actionBtnBox) {
    actionBtnBox.innerHTML = "";
    let btnHTML = "";

    if (!rel) {
      btnHTML = `<button class="btn-friend-action btn-friend-add" style="padding: 10px 24px; font-size: 13px;" data-id="${u.id}">+ Add</button>`;
    } else if (rel.status === "pending") {
      if (rel.user_id === currentUserId) {
        btnHTML = `<button class="btn-friend-action btn-friend-pending" style="padding: 10px 24px; font-size: 13px;" disabled>Pending</button>`;
      } else {
        btnHTML = `
          <button class="btn-friend-action btn-friend-accept" style="padding: 10px 20px; font-size: 13px;" data-id="${rel.id}" data-sender="${rel.user_id}">Accept</button>
          <button class="btn-friend-action btn-friend-reject" style="padding: 10px 20px; font-size: 13px;" data-id="${rel.id}" data-sender="${rel.user_id}">Reject</button>
        `;
      }
    } else if (rel.status === "accepted") {
      btnHTML = `
        <div style="display: flex; gap: 8px;">
          <button class="btn-friend-action btn-friend-msg" style="padding: 10px 20px; font-size: 13px;" data-id="${u.id}" data-name="${u.name}" data-avatar="${u.avatar_url || ''}">Message</button>
          <button class="btn-friend-unfollow" style="padding: 10px 20px; font-size: 13px;" data-rel-id="${rel.id}" data-name="${u.name}" data-target-id="${u.id}">Unfollow</button>
        </div>
      `;
    }
    actionBtnBox.innerHTML = btnHTML;
  }

  const achievementsBox = document.getElementById("public-achievements-container");
  const { count: attCount } = await supabase.from("attendance").select("id", { count: "exact", head: true }).eq("employee_id", targetUserId);
  const totalAbsen = attCount || 0;

  achievementsBox.innerHTML = `
    <div class="badge-card ${totalAbsen >= 10 ? 'unlocked' : 'locked'}">
      <div class="badge-icon">🌱</div>
      <div class="badge-info">
        <h4>Keep it up!</h4>
        <p>${totalAbsen >= 10 ? '✅ Unlocked' : `${totalAbsen} / 10 Absen`}</p>
      </div>
    </div>
    <div class="badge-card ${totalAbsen >= 30 ? 'unlocked' : 'locked'}">
      <div class="badge-icon">⭐</div>
      <div class="badge-info">
        <h4>Well Done!</h4>
        <p>${totalAbsen >= 30 ? '✅ Unlocked' : `${totalAbsen} / 30 Absen`}</p>
      </div>
    </div>
  `;

  if (searchContainer) searchContainer.style.display = "none";
  publicCard.style.display = "block";

  history.pushState({ view: "public_profile", targetUserId }, "", `#profile-${targetUserId}`);
}

function closePublicProfile() {
  const publicCard = document.getElementById("public-profile-card");
  const searchContainer = document.getElementById("friends-search-container");
  if (publicCard) publicCard.style.display = "none";
  if (searchContainer) searchContainer.style.display = "block";
}

const btnBackFriends = document.getElementById("btn-back-friends-list");
if (btnBackFriends) {
  btnBackFriends.addEventListener("click", () => {
    history.back();
  });
}

async function loadMyFriendsList() {
  const container = document.getElementById("my-friends-container");
  if (!container || !currentUserId) return;

  const { data: friendships } = await supabase
    .from("friendships")
    .select("*, user_emp:employees!friendships_user_id_fkey(id, name, employee_code, avatar_url), friend_emp:employees!friendships_friend_id_fkey(id, name, employee_code, avatar_url)")
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
    .eq("status", "accepted");

  if (!friendships || friendships.length === 0) {
    container.innerHTML = `<p style="color:var(--text-sub); font-size:12px; text-align:center; padding:10px;">Belum ada teman.</p>`;
    return;
  }

  container.innerHTML = "";
  friendships.forEach(f => {
    const u = (f.user_id === currentUserId) ? f.friend_emp : f.user_emp;
    if (!u) return;

    const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`;
    const card = document.createElement("div");
    card.className = "friend-item-card";
    card.innerHTML = `
      <div class="friend-user-info" data-user-id="${u.id}">
        <img src="${avatar}" class="friend-avatar-mini" alt="Avatar">
        <div>
          <div class="friend-name">${u.name}</div>
          <div class="friend-code">Kode: ${u.employee_code}</div>
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn-friend-action btn-friend-msg" data-id="${u.id}" data-name="${u.name}" data-avatar="${avatar}">Message</button>
        <button class="btn-friend-unfollow" data-rel-id="${f.id}" data-name="${u.name}" data-target-id="${u.id}">Unfollow</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// HANDLER CLICK EVENT UNTUK AKSI PERTEMANAN
document.addEventListener("click", async (e) => {
  const userInfoBox = e.target.closest(".friend-user-info");
  if (userInfoBox) {
    const uId = userInfoBox.getAttribute("data-user-id");
    if (uId) {
      switchTab("friends", false);
      await openPublicProfile(uId);
    }
  }

  // 1. ADD FRIEND
  if (e.target.classList.contains("btn-friend-add")) {
    const btn = e.target;
    const friendId = btn.getAttribute("data-id");

    btn.disabled = true;
    btn.className = "btn-friend-action btn-friend-pending";
    btn.textContent = "Pending";

    const { error: friendErr } = await supabase.from("friendships").insert({
      user_id: currentUserId,
      friend_id: friendId,
      status: "pending"
    });

    if (friendErr) {
      alert("Gagal menambahkan teman: " + friendErr.message);
      btn.disabled = false;
      btn.className = "btn-friend-action btn-friend-add";
      btn.textContent = "+ Add";
      return;
    }

    await loadFriendsSystem();

    const publicCard = document.getElementById("public-profile-card");
    if (publicCard && publicCard.style.display !== "none") {
      await openPublicProfile(friendId);
    }
  }

  // 2. ACCEPT FRIEND
  if (e.target.classList.contains("btn-friend-accept")) {
    const relId = e.target.getAttribute("data-id");
    const senderId = e.target.getAttribute("data-sender");

    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", relId);

    if (!error) {
      await Promise.all([loadFriendsSystem(), loadMyFriendsList()]);

      const publicCard = document.getElementById("public-profile-card");
      if (publicCard && publicCard.style.display !== "none") {
        if (senderId) await openPublicProfile(senderId);
      }
    } else {
      alert("Gagal menerima pertemanan: " + error.message);
    }
  }

  // 3. REJECT FRIEND
  if (e.target.classList.contains("btn-friend-reject")) {
    const relId = e.target.getAttribute("data-id");
    const senderId = e.target.getAttribute("data-sender");

    const { error } = await supabase.from("friendships").delete().eq("id", relId);

    if (!error) {
      await loadFriendsSystem();

      const publicCard = document.getElementById("public-profile-card");
      if (publicCard && publicCard.style.display !== "none") {
        if (senderId) await openPublicProfile(senderId);
      }
    } else {
      alert("Gagal menolak pertemanan: " + error.message);
    }
  }

  // 4. UNFOLLOW / UNFRIEND
  if (e.target.classList.contains("btn-friend-unfollow")) {
    const relId = e.target.getAttribute("data-rel-id");
    const name = e.target.getAttribute("data-name");
    const targetId = e.target.getAttribute("data-target-id");

    const confirmUnfriend = confirm(`Apakah kamu yakin ingin berhenti berteman (Unfollow) dengan ${name}?`);
    if (!confirmUnfriend) return;

    const { error } = await supabase.from("friendships").delete().or(`id.eq.${relId},and(user_id.eq.${currentUserId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${currentUserId})`);

    if (!error) {
      await Promise.all([loadFriendsSystem(), loadMyFriendsList()]);

      const publicCard = document.getElementById("public-profile-card");
      if (publicCard && publicCard.style.display !== "none" && targetId) {
        await openPublicProfile(targetId);
      }
    } else {
      alert("Gagal unfollow: " + error.message);
    }
  }

  // 5. MESSAGE
  if (e.target.classList.contains("btn-friend-msg")) {
    const fId = e.target.getAttribute("data-id");
    const fName = e.target.getAttribute("data-name");
    const fAvatar = e.target.getAttribute("data-avatar");
    openChatWindow(fId, fName, fAvatar);
  }
});

// =========================================
// 6. CHAT WINDOW & MESSAGES
// =========================================
async function openChatWindow(friendId, friendName, friendAvatar) {
  activeChatFriendId = friendId;
  const chatWin = document.getElementById("floating-chat-window");
  document.getElementById("chat-target-name").textContent = friendName;
  document.getElementById("chat-target-avatar").src = friendAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friendName}`;
  chatWin.style.display = "flex";

  await supabase.from("direct_messages").update({ is_read: true }).eq("sender_id", friendId).eq("receiver_id", currentUserId).eq("is_read", false);
  await loadChatMessages();
}

const closeChatBtn = document.getElementById("close-chat-btn");
if (closeChatBtn) closeChatBtn.addEventListener("click", () => {
  document.getElementById("floating-chat-window").style.display = "none";
  activeChatFriendId = null;
});

async function loadChatMessages() {
  const body = document.getElementById("chat-messages-body");
  if (!body || !activeChatFriendId || !currentUserId) return;

  await supabase.from("direct_messages").update({ is_read: true }).eq("sender_id", activeChatFriendId).eq("receiver_id", currentUserId).eq("is_read", false);

  const { data: msgs, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChatFriendId}),and(sender_id.eq.${activeChatFriendId},receiver_id.eq.${currentUserId})`)
    .order("created_at", { ascending: true });

  if (error) {
    body.innerHTML = `<p style="font-size: 11px; color: #ef4444; text-align: center; margin: auto;">Gagal memuat pesan: ${error.message}</p>`;
    return;
  }

  if (!msgs || msgs.length === 0) {
    body.innerHTML = `<p style="font-size: 11px; color: var(--text-sub); text-align: center; margin: auto;">Belum ada pesan.</p>`;
    return;
  }

  body.innerHTML = "";
  msgs.forEach(m => {
    const isMine = m.sender_id === currentUserId;
    const timeStr = new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    
    const statusTick = m.is_read 
      ? `<span class="chat-status-tick read" title="Dibaca">✓✓</span>` 
      : `<span class="chat-status-tick" title="Terkirim">✓</span>`;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'other'}`;
    bubble.innerHTML = `
      <span>${m.message}</span>
      <div class="chat-meta">
        <span>${timeStr}</span>
        ${isMine ? statusTick : ''}
      </div>
    `;
    body.appendChild(bubble);
  });
  body.scrollTop = body.scrollHeight;
}

const btnSendChat = document.getElementById("btn-send-chat");
const chatTextInput = document.getElementById("chat-text-input");

async function handleSendMessage() {
  const text = chatTextInput.value.trim();
  if (!text || !activeChatFriendId) return;

  chatTextInput.value = "";
  
  const { error } = await supabase.from("direct_messages").insert({
    sender_id: currentUserId,
    receiver_id: activeChatFriendId,
    message: text,
    is_read: false
  });

  if (error) {
    alert("Gagal mengirim pesan: " + error.message);
  } else {
    await loadChatMessages();
  }
}

if (btnSendChat) btnSendChat.addEventListener("click", handleSendMessage);

if (chatTextInput) {
  chatTextInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  });

  chatTextInput.addEventListener("focus", () => {
    setTimeout(() => {
      const body = document.getElementById("chat-messages-body");
      if (body) body.scrollTop = body.scrollHeight;
    }, 300);
  });
}

// ==============================
// 7. PROFILE EDITING & STATUS
// ==============================
const uploadAvatarFileInput = document.getElementById("upload-avatar-file");

if (uploadAvatarFileInput) {
  uploadAvatarFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUserId) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar (JPG, PNG, WebP)!");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { 
      alert("Ukuran file gambar maksimal 10MB!");
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUserId}/avatar_${Date.now()}.${fileExt}`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateErr } = await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUserId);

      if (updateErr) throw updateErr;

      const profilePageAvatar = document.getElementById("profile-page-avatar");
      if (profilePageAvatar) profilePageAvatar.src = publicUrl;

      alert("✅ Foto profil berhasil diperbarui!");

    } catch (err) {
      alert("Gagal mengunggah foto profil: " + err.message);
    }
  });
}

const btnOpenEditBioModal = document.getElementById("btn-open-edit-bio-modal");
const editBioModal = document.getElementById("edit-bio-modal");
const editBioInputText = document.getElementById("edit-bio-input-text");
const cancelEditBioBtn = document.getElementById("cancel-edit-bio");
const saveEditBioBtn = document.getElementById("save-edit-bio");
const editBioMsg = document.getElementById("edit-bio-modal-msg");

if (btnOpenEditBioModal) {
  btnOpenEditBioModal.addEventListener("click", () => {
    if (currentEmployeeData) {
      editBioInputText.value = currentEmployeeData.bio || "";
    }
    if (editBioMsg) editBioMsg.textContent = "";
    if (editBioModal) editBioModal.style.display = "flex";
  });
}

if (cancelEditBioBtn) {
  cancelEditBioBtn.addEventListener("click", () => {
    if (editBioModal) editBioModal.style.display = "none";
  });
}

if (saveEditBioBtn) {
  saveEditBioBtn.addEventListener("click", async () => {
    const bioText = editBioInputText.value.trim();

    saveEditBioBtn.textContent = "Menyimpan...";
    const { error } = await supabase.from("employees").update({
      bio: bioText
    }).eq("id", currentUserId);

    if (error) {
      if (editBioMsg) editBioMsg.textContent = "Gagal menyimpan: " + error.message;
    } else {
      if (editBioModal) editBioModal.style.display = "none";
      await loadUserProfile();
    }
    saveEditBioBtn.textContent = "Simpan";
  });
}

async function loadTodayStatus() {
  if (!todayStatusEl) return;
  todayStatusEl.innerHTML = "<p style='color: var(--text-sub);'>Memuat status...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const { data } = await supabase
    .from("attendance")
    .select("check_in, status")
    .eq("employee_id", user.id)
    .eq("attendance_date", todayStr)
    .maybeSingle();

  if (data) {
    const time = new Date(data.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const badge = data.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Tepat Waktu</span>`;
    todayStatusEl.innerHTML = `<div style="font-size: 15px; font-weight: 700; color: var(--text-main);">Sudah Absen (${time} WIB)</div><div style="margin-top:8px;">${badge}</div>`;
  } else {
    todayStatusEl.innerHTML = `<div style="font-size: 15px; font-weight: 700; color: var(--ios-red);">Belum Absen</div>`;
  }
}

async function loadAttendanceHistory() {
  if (!attendanceHistory) return;
  attendanceHistory.innerHTML = "<p style='color: var(--text-sub);'>Memuat riwayat...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("attendance")
    .select("attendance_date, check_in, status")
    .eq("employee_id", user.id)
    .order("attendance_date", { ascending: false });

  if (!data || data.length === 0) {
    attendanceHistory.innerHTML = "<p style='font-size: 13px; color: var(--text-sub);'>Belum ada riwayat presensi.</p>";
    return;
  }

  attendanceHistory.innerHTML = "";
  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
    const time = new Date(row.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const isLate = row.status === "late";
    const badge = isLate ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Tepat Waktu</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<div><strong style="color: var(--text-main);">${date}</strong><div style="font-size: 11px; color: var(--text-sub);">${time} WIB</div></div><div>${badge}</div>`;
    attendanceHistory.appendChild(item);
  });
}

async function loadMonthlyStatistics() {
  const statHadirEl = document.getElementById("stat-total-hadir");
  const statTerlambatEl = document.getElementById("stat-total-terlambat");
  const statRateEl = document.getElementById("stat-attendance-rate");
  const barPresent = document.getElementById("progress-bar-present");
  const barLate = document.getElementById("progress-bar-late");

  if (!statHadirEl) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data } = await supabase
    .from("attendance")
    .select("status")
    .eq("employee_id", user.id)
    .gte("attendance_date", startOfMonth);

  if (!data) return;

  let hadir = 0, terlambat = 0;
  data.forEach(r => r.status === "late" ? terlambat++ : hadir++);
  const total = hadir + terlambat;
  const percent = total > 0 ? Math.round((hadir / total) * 100) : 0;

  statHadirEl.textContent = hadir;
  if (statTerlambatEl) statTerlambatEl.textContent = terlambat;
  if (statRateEl) statRateEl.textContent = percent + "%";
  if (barPresent && barLate) {
    barPresent.style.width = percent + "%";
    barLate.style.width = (total > 0 ? (terlambat / total) * 100 : 0) + "%";
  }
}

// ==============================
// 8. QR SCANNER KAMERA
// ==============================
const openScannerBtnUser = document.getElementById("open-scanner-btn-user");
const scannerModal = document.getElementById("scanner-modal");
const closeScannerBtn = document.getElementById("close-scanner-btn");
let html5QrCode = null;

async function startQrScanner() {
  if (!scannerModal) return;
  scannerModal.style.display = "flex";
  
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader");
  }

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (text) => {
        await stopQrScanner();
        try {
          const url = new URL(text);
          const secret = url.searchParams.get("secret");
          const block = url.searchParams.get("block");
          if (secret && block) {
            sessionStorage.setItem("pending_secret", secret);
            sessionStorage.setItem("pending_block", block);
            await checkUrlAutoAttendance();
          } else {
            alert("QR Code tidak valid.");
          }
        } catch {
          alert("Format QR tidak dikenali.");
        }
      },
      () => {}
    );
  } catch (err) {
    alert("Gagal membuka kamera: " + (err.message || err));
    scannerModal.style.display = "none";
  }
}

async function stopQrScanner() {
  if (html5QrCode) {
    try {
      if (html5QrCode.isScanning) {
        await html5QrCode.stop();
      }
      html5QrCode.clear();
    } catch (e) {
      console.log("Scanner cleanup:", e);
    }
  }
  if (scannerModal) scannerModal.style.display = "none";
}

if (openScannerBtnUser) openScannerBtnUser.addEventListener("click", startQrScanner);
if (closeScannerBtn) closeScannerBtn.addEventListener("click", stopQrScanner);

// ==============================
// 9. MANAJEMEN POIN MEMBER
// ==============================
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-add-points")) {
    const empId = e.target.getAttribute("data-id");
    const empName = e.target.getAttribute("data-name");

    const targetIdEl = document.getElementById("target-member-id");
    const targetNameEl = document.getElementById("target-member-name");
    const amountEl = document.getElementById("input-points-amount");
    const reasonEl = document.getElementById("input-points-reason");
    const msgEl = document.getElementById("manage-points-modal-msg");
    const pointsModal = document.getElementById("manage-points-modal");

    if (targetIdEl) targetIdEl.value = empId;
    if (targetNameEl) targetNameEl.textContent = `Anggota: ${empName}`;
    if (amountEl) amountEl.value = "";
    if (reasonEl) reasonEl.value = "";
    if (msgEl) msgEl.textContent = "";

    if (pointsModal) pointsModal.style.display = "flex";
  }
});

const btnCancelPoints = document.getElementById("cancel-manage-points");
if (btnCancelPoints) {
  btnCancelPoints.addEventListener("click", () => {
    const pointsModal = document.getElementById("manage-points-modal");
    if (pointsModal) pointsModal.style.display = "none";
  });
}

const btnSavePoints = document.getElementById("save-manage-points");
if (btnSavePoints) {
  btnSavePoints.addEventListener("click", async () => {
    const empId = document.getElementById("target-member-id").value;
    const amount = parseInt(document.getElementById("input-points-amount").value);
    const reason = document.getElementById("input-points-reason").value.trim();
    const msgEl = document.getElementById("manage-points-modal-msg");

    if (isNaN(amount) || amount === 0 || !reason) {
      if (msgEl) msgEl.textContent = "Masukkan jumlah poin valid dan alasannya!";
      return;
    }

    btnSavePoints.textContent = "Memproses...";

    const { data: emp } = await supabase.from("employees").select("points").eq("id", empId).single();
    const currentPoints = emp ? (emp.points || 0) : 0;
    const newTotal = currentPoints + amount;

    const { error: updateErr } = await supabase.from("employees").update({ points: newTotal }).eq("id", empId);

    if (updateErr) {
      if (msgEl) msgEl.textContent = "Gagal mengupdate poin: " + updateErr.message;
    } else {
      await supabase.from("point_logs").insert({
        employee_id: empId,
        points_added: amount,
        reason: reason
      });

      const pointsModal = document.getElementById("manage-points-modal");
      if (pointsModal) pointsModal.style.display = "none";
      alert(`Berhasil memperbarui poin! Total poin baru: ${newTotal}`);
      await loadEmployeeManagement();
      if (empId === currentUserId) await loadUserProfile();
    }

    btnSavePoints.textContent = "Proses Poin";
  });
}

// ==============================
// 10. ADMIN PANEL & KIOSK
// ==============================
if (switchToAdminBtn) {
  switchToAdminBtn.addEventListener("click", async () => {
    if (userSection) userSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";
    if (adminFilterDate) adminFilterDate.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    await loadAdminAttendance();
    await loadAdminChart();
  });
}

if (switchToUserBtn) {
  switchToUserBtn.addEventListener("click", () => {
    if (adminSection) adminSection.style.display = "none";
    if (userSection) userSection.style.display = "block";
    if (kioskTimerInterval) clearInterval(kioskTimerInterval);
  });
}

if (tabRekapBtn && tabKaryawanBtn && tabKioskBtn) {
  tabRekapBtn.addEventListener("click", () => {
    if (adminViewRekap) adminViewRekap.style.display = "block";
    if (adminViewKaryawan) adminViewKaryawan.style.display = "none";
    if (adminViewKiosk) adminViewKiosk.style.display = "none";
    tabRekapBtn.classList.add("active");
    tabKaryawanBtn.classList.remove("active");
    tabKioskBtn.classList.remove("active");
    if (kioskTimerInterval) clearInterval(kioskTimerInterval);
  });

  tabKaryawanBtn.addEventListener("click", async () => {
    if (adminViewRekap) adminViewRekap.style.display = "none";
    if (adminViewKaryawan) adminViewKaryawan.style.display = "block";
    if (adminViewKiosk) adminViewKiosk.style.display = "none";
    tabKaryawanBtn.classList.add("active");
    tabRekapBtn.classList.remove("active");
    tabKioskBtn.classList.remove("active");
    if (kioskTimerInterval) clearInterval(kioskTimerInterval);
    await loadEmployeeManagement();
  });

  tabKioskBtn.addEventListener("click", () => {
    if (currentUserRole !== "admin" && currentUserRole !== "adm1n") {
      alert("Akses Ditolak: Hanya Admin yang dapat memunculkan Kios QR.");
      return;
    }
    if (adminViewRekap) adminViewRekap.style.display = "none";
    if (adminViewKaryawan) adminViewKaryawan.style.display = "none";
    if (adminViewKiosk) adminViewKiosk.style.display = "block";
    tabKioskBtn.classList.add("active");
    tabRekapBtn.classList.remove("active");
    tabKaryawanBtn.classList.remove("active");
    
    startAdminKioskQr();
  });
}

function startAdminKioskQr() {
  const qrBox = document.getElementById("admin-kiosk-qrcode");
  const fillBar = document.getElementById("kiosk-progress-fill");
  const timerText = document.getElementById("kiosk-timer-text");

  if (!qrBox) return;
  qrBox.innerHTML = "";

  if (kioskTimerInterval) clearInterval(kioskTimerInterval);

  kioskQrObject = new QRCode(qrBox, {
    text: "INIT",
    width: 220,
    height: 220,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  function updateKioskFrame() {
    const nowUnix = Math.floor(Date.now() / 1000);
    const block = Math.floor(nowUnix / 15);
    const secondsRemaining = 15 - (nowUnix % 15);

    const baseUrl = window.location.origin + window.location.pathname;
    const kioskUrl = `${baseUrl}?secret=${KIOSK_SECRET}&block=${block}`;

    kioskQrObject.clear();
    kioskQrObject.makeCode(kioskUrl);

    if (timerText) timerText.textContent = `Memperbarui dalam ${secondsRemaining}s`;
    if (fillBar) {
      const percentage = (secondsRemaining / 15) * 100;
      fillBar.style.width = `${percentage}%`;
    }
  }

  updateKioskFrame();
  kioskTimerInterval = setInterval(updateKioskFrame, 1000);
}

if (adminFilterDate) adminFilterDate.addEventListener("change", loadAdminAttendance);
if (adminFilterStatus) adminFilterStatus.addEventListener("change", loadAdminAttendance);
if (adminChartFilter) adminChartFilter.addEventListener("change", loadAdminChart);

async function loadAdminAttendance() {
  if (!adminAttendanceList) return;
  adminAttendanceList.innerHTML = "<p style='color: var(--text-sub);'>Memuat rekap...</p>";

  let query = supabase.from("attendance").select("attendance_date, check_in, status, employees(name, employee_code)").order("check_in", { ascending: false });
  if (adminFilterDate && adminFilterDate.value) query = query.eq("attendance_date", adminFilterDate.value);
  if (adminFilterStatus && adminFilterStatus.value !== "ALL") query = query.eq("status", adminFilterStatus.value);

  const { data } = await query;
  if (!data || data.length === 0) {
    adminAttendanceList.innerHTML = "<p style='font-size: 13px; color: var(--text-sub);'>Tidak ada data.</p>";
    return;
  }

  adminAttendanceList.innerHTML = "";
  data.forEach(row => {
    const time = new Date(row.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const name = row.employees ? row.employees.name : "Dihapus";
    const badge = row.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<div><strong style="color: var(--text-main);">${name}</strong><div style="font-size: 11px; color: var(--text-sub);">${row.attendance_date} &bull; ${time} WIB</div></div><div>${badge}</div>`;
    adminAttendanceList.appendChild(item);
  });
}

async function loadAdminChart() {
  if (!adminChartContainer) return;
  adminChartContainer.innerHTML = "<p style='font-size: 12px; color: var(--text-sub); margin: auto;'>Memuat grafik...</p>";

  const filterType = adminChartFilter ? adminChartFilter.value : "month";
  const { data } = await supabase.from("attendance").select("attendance_date, status");
  if (!data) return;

  const grouped = {};
  data.forEach(row => {
    let key = row.attendance_date;
    if (filterType === "month") key = row.attendance_date.substring(0, 7);
    else if (filterType === "year") key = row.attendance_date.substring(0, 4);

    if (!grouped[key]) grouped[key] = { total: 0 };
    grouped[key].total++;
  });

  const keys = Object.keys(grouped).sort().slice(-7);
  if (keys.length === 0) {
    adminChartContainer.innerHTML = "<p style='font-size: 12px; color: var(--text-sub); margin: auto;'>Belum ada data.</p>";
    return;
  }

  const max = Math.max(...keys.map(k => grouped[k].total), 5);
  adminChartContainer.innerHTML = "";

  keys.forEach(k => {
    const total = grouped[k].total;
    const heightPercentage = Math.round((total / max) * 100);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; min-width: 32px;";
    wrapper.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; color: #60a5fa; margin-bottom: 4px;">${total}</div>
      <div style="width: 100%; max-width: 24px; height: ${Math.max(heightPercentage, 12)}%; background: linear-gradient(180deg, #3b82f6, #1d4ed8); border-radius: 6px 6px 0 0;"></div>
      <div style="font-size: 10px; color: var(--text-sub); margin-top: 6px; white-space: nowrap; font-weight: 600;">${k}</div>
    `;
    adminChartContainer.appendChild(wrapper);
  });
}

async function loadEmployeeManagement() {
  if (!adminEmployeeList) return;
  adminEmployeeList.innerHTML = "<p style='color: var(--text-sub);'>Memuat anggota...</p>";

  const { data } = await supabase.from("employees").select("id, name, employee_code, role, is_active, phone, points").order("name");
  if (!data) return;

  adminEmployeeList.innerHTML = "";
  data.forEach(emp => {
    let roleBadgeBg = "rgba(0, 92, 191, 0.2)";
    let roleBadgeColor = "#60a5fa";
    let roleText = "MEMBER";

    if (emp.role === "adm1n") {
      roleBadgeBg = "rgba(255, 59, 48, 0.25)";
      roleBadgeColor = "#f87171";
      roleText = "ADM1N";
    } else if (emp.role === "admin") {
      roleBadgeBg = "rgba(245, 158, 11, 0.25)";
      roleBadgeColor = "#fbbf24";
      roleText = "ADMIN";
    } else if (emp.role === "pengurus") {
      roleBadgeBg = "rgba(16, 185, 129, 0.25)";
      roleBadgeColor = "#34d399";
      roleText = "PENGURUS";
    }

    const card = document.createElement("div");
    card.className = "emp-card-item";
    card.style.marginBottom = "10px";
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
            <strong style="font-size: 14px; color: var(--text-main);">${emp.name}</strong>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: ${roleBadgeBg}; color: ${roleBadgeColor};">${roleText}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-sub);">Kode: ${emp.employee_code} | WA: ${emp.phone || '-'}</div>
          <div style="margin-top: 4px;">
            <span style="font-size: 11px; font-weight: 800; color: #f59e0b; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 8px;">
              🪙 ${emp.points || 0} Poin
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-add-points" data-id="${emp.id}" data-name="${emp.name}" style="padding: 4px 10px; font-size: 11px; border-radius: 8px; font-weight: 700; background: #f59e0b; color: white; border: none; cursor: pointer;">🪙 Poin</button>
          <button class="btn-edit-member secondary-button" style="padding: 4px 10px; font-size: 11px;">Edit</button>
        </div>
      </div>
    `;
    
    card.querySelector(".btn-edit-member").addEventListener("click", () => {
      editEmpId.value = emp.id;
      editEmpName.value = emp.name;
      editEmpPhone.value = emp.phone || "";
      editEmpCode.value = emp.employee_code;
      editEmpRole.value = emp.role;
      editEmpActive.value = String(emp.is_active);
      editModalMsg.textContent = "";
      editEmpModal.style.display = "flex";
    });
    adminEmployeeList.appendChild(card);
  });
}

if (cancelEditEmp) cancelEditEmp.addEventListener("click", () => editEmpModal.style.display = "none");

if (saveEditEmp) {
  saveEditEmp.addEventListener("click", async () => {
    const id = editEmpId.value;
    const name = editEmpName.value.trim();
    const phone = editEmpPhone.value.trim();
    const code = editEmpCode.value.trim();
    const role = editEmpRole.value;
    const isActive = editEmpActive.value === "true";

    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("employees").select("role").eq("id", user.id).single();

    if (me.role !== "adm1n") {
      const { data: target } = await supabase.from("employees").select("role").eq("id", id).single();
      if (target.role !== role) {
        editModalMsg.textContent = "Akses ditolak: Hanya Super Admin (adm1n) yang dapat mengubah role!";
        return;
      }
    }

    editModalMsg.textContent = "Menyimpan...";
    const { error } = await supabase.from("employees").update({ name, phone, employee_code: code, role, is_active: isActive }).eq("id", id);
    
    if (error) {
      editModalMsg.textContent = "Gagal: " + error.message;
    } else {
      editModalMsg.textContent = "Berhasil!";
      setTimeout(() => {
        editEmpModal.style.display = "none";
        loadEmployeeManagement();
      }, 700);
    }
  });
}

// ==============================
// 11. ADVANCED EXCEL EXPORT
// ==============================
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", async () => {
    const { data: attData, error } = await supabase
      .from("attendance")
      .select(`
        attendance_date, check_in, status, employee_id, 
        employees (name, phone, employee_code, role, birth_place, birth_date)
      `)
      .order("attendance_date", { ascending: false });

    if (error || !attData) {
      alert("Gagal mengambil data ekspor.");
      return;
    }

    const pengurusRows = [];
    const memberRows = [];

    attData.forEach(row => {
      const emp = row.employees || {};
      const name = emp.name || "N/A";
      const phone = emp.phone || "-";
      const code = emp.employee_code || "N/A";
      const role = (emp.role || "user").toLowerCase().trim();
      const birthPlace = emp.birth_place || "-";
      const birthDate = emp.birth_date ? new Date(emp.birth_date).toLocaleDateString("id-ID") : "-";
      const date = row.attendance_date;
      const time = new Date(row.check_in).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });
      const statusText = row.status === "late" ? "Terlambat" : "Tepat Waktu";

      const isPengurus = (role === "pengurus" || role === "admin" || role === "adm1n");

      const itemExcel = {
        "Tanggal": date, "Kode Anggota": code, "Nama Lengkap": name, "No WhatsApp": phone,
        "Tempat Lahir": birthPlace, "Tanggal Lahir": birthDate, "Jam Absen": time, "Status": statusText
      };

      if (isPengurus) pengurusRows.push(itemExcel);
      else memberRows.push(itemExcel);
    });

    const workbook = XLSX.utils.book_new();
    const wsPengurus = XLSX.utils.json_to_sheet(pengurusRows);
    const wsMember = XLSX.utils.json_to_sheet(memberRows);

    XLSX.utils.book_append_sheet(workbook, wsPengurus, "Data Pengurus");
    XLSX.utils.book_append_sheet(workbook, wsMember, "Data Anggota");

    XLSX.writeFile(workbook, `Rekap_Absensi_Mudiviverse_${new Date().toISOString().split("T")[0]}.xlsx`);
  });
}

// ==============================
// 12. SINKRONISASI GOOGLE SHEETS
// ==============================
const syncSheetsBtn = document.getElementById("sync-sheets-btn");

if (syncSheetsBtn) {
  syncSheetsBtn.addEventListener("click", async () => {
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxssFU-ZNmAL8rJ5iQqLhgxLqi_tCntFvVzJq8StAIKOGlIXJFXsGXFHJHHQU5sUl0rug/exec";

    if (!WEB_APP_URL || WEB_APP_URL.includes("MASUKKAN_URL")) {
      alert("URL Web App Google Sheets belum diatur!");
      return;
    }

    syncSheetsBtn.textContent = "Menyinkronkan...";
    syncSheetsBtn.disabled = true;

    try {
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, name, phone, employee_code, role, birth_place, birth_date")
        .order("name");

      if (empError || !empData) throw new Error("Gagal mengambil data anggota: " + (empError ? empError.message : "Data kosong"));

      const { data: attData, error: attError } = await supabase
        .from("attendance")
        .select("attendance_date, check_in, status, employee_id")
        .order("attendance_date", { ascending: false });

      if (attError || !attData) throw new Error("Gagal mengambil data riwayat absensi.");

      const attMap = {};
      (attData || []).forEach(att => {
        if (!attMap[att.employee_id]) attMap[att.employee_id] = [];
        attMap[att.employee_id].push(att);
      });

      const pengurusRows = [];
      const memberRows = [];

      empData.forEach(emp => {
        const name = emp.name || "N/A";
        const phone = emp.phone || "-";
        const code = emp.employee_code || "N/A";
        const roleStr = String(emp.role || "user").toLowerCase().trim();
        const birthPlace = emp.birth_place || "-";
        
        let birthDate = "-";
        if (emp.birth_date) {
          try {
            const bd = new Date(emp.birth_date);
            if (!isNaN(bd.getTime())) birthDate = bd.toLocaleDateString("id-ID");
          } catch (e) { birthDate = "-"; }
        }

        const isPengurus = (roleStr === "pengurus" || roleStr === "admin" || roleStr === "adm1n");
        const userAttList = attMap[emp.id] || [];

        if (userAttList.length > 0) {
          userAttList.forEach(att => {
            let time = "-";
            if (att.check_in) {
              try { time = new Date(att.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }); } catch (e) { time = "-"; }
            }
            const statusText = att.status === "late" ? "Terlambat" : "Tepat Waktu";
            const itemData = { "Kode Anggota": code, "Nama Lengkap": name, "No WhatsApp": phone, "Tempat Lahir": birthPlace, "Tanggal Lahir": birthDate, "Tanggal": att.attendance_date || "", "Jam Absen": time, "Status": statusText };
            if (isPengurus) pengurusRows.push(itemData);
            else memberRows.push(itemData);
          });
        } else {
          const itemData = { "Kode Anggota": code, "Nama Lengkap": name, "No WhatsApp": phone, "Tempat Lahir": birthPlace, "Tanggal Lahir": birthDate, "Tanggal": "", "Jam Absen": "", "Status": "" };
          if (isPengurus) pengurusRows.push(itemData);
          else memberRows.push(itemData);
        }
      });

      const payload = { pengurus: pengurusRows, anggota: memberRows };

      await fetch(WEB_APP_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      alert("Berhasil! Seluruh data Pengurus dan Anggota telah disinkronkan.");
    } catch (err) {
      alert("Gagal sinkronisasi: " + err.message);
    } finally {
      syncSheetsBtn.textContent = "🔄 Sinkron";
      syncSheetsBtn.disabled = false;
    }
  });
}

// ==============================
// 13. LIGHT & DARK MODE LOGIC
// ==============================
function initThemeToggle() {
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");

  const savedTheme = localStorage.getItem("app_theme") || "dark";
  
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (themeIcon) themeIcon.textContent = "☀️";
  } else {
    document.body.classList.remove("light-mode");
    if (themeIcon) themeIcon.textContent = "🌙";
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light-mode");
      const isLight = document.body.classList.contains("light-mode");

      if (isLight) {
        if (themeIcon) themeIcon.textContent = "☀️️";
        localStorage.setItem("app_theme", "light");
      } else {
        if (themeIcon) themeIcon.textContent = "🌙";
        localStorage.setItem("app_theme", "dark");
      }
    });
  }
}

// =========================================
// 14. DRAWER NAVIGATION & HISTORY API
// =========================================
const mobileHamburgerBtn = document.getElementById("mobile-hamburger-btn");
const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
const closeMobileNavBtn = document.getElementById("close-mobile-nav");

function openDrawer() { if (mobileNavOverlay) mobileNavOverlay.classList.add("open"); }
function closeDrawer() { if (mobileNavOverlay) mobileNavOverlay.classList.remove("open"); }

if (mobileHamburgerBtn) mobileHamburgerBtn.addEventListener("click", openDrawer);
if (closeMobileNavBtn) closeMobileNavBtn.addEventListener("click", closeDrawer);

if (mobileNavOverlay) {
  mobileNavOverlay.addEventListener("click", (e) => {
    if (e.target === mobileNavOverlay) closeDrawer();
  });
}

function switchTab(tabName, pushToHistory = true) {
  closePublicProfile();

  const views = {
    home: document.getElementById("tab-home-view"),
    posts: document.getElementById("tab-posts-view"),
    presensi: document.getElementById("tab-presensi-view"),
    friends: document.getElementById("tab-friends-view"),
    profile: document.getElementById("tab-profile-view"),
    admin: document.getElementById("tab-admin-view")
  };

  Object.keys(views).forEach(key => {
    if (views[key]) views[key].style.display = "none";
  });

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  if (views[tabName]) views[tabName].style.display = "block";

  document.querySelectorAll(`.nav-btn[data-tab="${tabName}"]`).forEach(btn => {
    btn.classList.add("active");
  });

  closeDrawer();

  if (pushToHistory) history.pushState({ tab: tabName }, "", `#${tabName}`);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (btn) {
    const targetTab = btn.getAttribute("data-tab");
    if (targetTab) switchTab(targetTab, true);
  }
});

const btnSeeMore = document.getElementById("btn-see-more-posts");
if (btnSeeMore) btnSeeMore.addEventListener("click", () => switchTab("posts", true));

window.addEventListener("popstate", (event) => {
  if (mobileNavOverlay && mobileNavOverlay.classList.contains("open")) {
    closeDrawer();
    return;
  }

  const publicCard = document.getElementById("public-profile-card");
  if (publicCard && publicCard.style.display !== "none") {
    closePublicProfile();
    return;
  }

  if (event.state && event.state.tab) switchTab(event.state.tab, false);
  else if (window.location.hash) switchTab(window.location.hash.replace("#", ""), false);
  else switchTab("home", false);
});

document.addEventListener("DOMContentLoaded", () => {
  function updateClock() {
    const clockEl = document.getElementById("live-time");
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  const initialTab = window.location.hash ? window.location.hash.replace("#", "") : "home";
  history.replaceState({ tab: initialTab }, "", `#${initialTab}`);
});

initThemeToggle();

// =========================================
// 15. INTEGRASI FITUR TOKO FISIK & KUSTOMISASI AVATAR (TAMBAHAN UTUH)
// =========================================
const btnCustomAvatar = document.getElementById("btn-custom-avatar");
const avatarCustomModal = document.getElementById("avatar-custom-modal");
const closeAvatarCustomModal = document.getElementById("close-avatar-custom-modal");
const btnSaveAvatarConfig = document.getElementById("btn-save-avatar-config");

if (btnCustomAvatar) {
  btnCustomAvatar.removeAttribute("disabled");
  btnCustomAvatar.style.opacity = "1";
  btnCustomAvatar.addEventListener("click", async () => {
    if (avatarCustomModal) avatarCustomModal.style.display = "flex";
    if (currentUserId) await loadUserAvatarConfig(currentUserId);

    const adminAddBox = document.getElementById("admin-add-accessory-box");
    if (adminAddBox) {
      if (currentUserRole === "admin" || currentUserRole === "adm1n") {
        adminAddBox.style.display = "block";
      } else {
        adminAddBox.style.display = "none";
      }
    }
  });
}

if (closeAvatarCustomModal) {
  closeAvatarCustomModal.addEventListener("click", () => {
    if (avatarCustomModal) avatarCustomModal.style.display = "none";
  });
}

if (btnSaveAvatarConfig) {
  btnSaveAvatarConfig.addEventListener("click", async () => {
    if (currentUserId) await saveUserAvatarConfig(currentUserId);
  });
}

document.addEventListener("click", (e) => {
  const opt = e.target.closest(".avatar-option-btn");
  if (opt) {
    const type = opt.getAttribute("data-type");
    const val = opt.getAttribute("data-val");

    if (type && val !== null) {
      currentAvatarConfig[type] = val;
      renderAvatarDisplay();
    }
  }
});

const btnSubmitNewAccessory = document.getElementById("btn-submit-new-accessory");
if (btnSubmitNewAccessory) {
  btnSubmitNewAccessory.addEventListener("click", async () => {
    const name = document.getElementById("acc-name").value.trim();
    const cat = document.getElementById("acc-category").value;
    const price = parseInt(document.getElementById("acc-price").value) || 0;
    const asset = document.getElementById("acc-asset").value.trim();

    if (!name || !asset) {
      alert("Lengkapi nama dan ikon/asset item!");
      return;
    }

    const ok = await addNewCatalogItem(name, cat, price, asset);
    if (ok) {
      document.getElementById("acc-name").value = "";
      document.getElementById("acc-asset").value = "";
    }
  });
}

const btnOpenShopModal = document.getElementById("btn-open-shop-modal");
const shopModal = document.getElementById("shop-modal");
const closeShopModal = document.getElementById("close-shop-modal");

if (btnOpenShopModal) {
  btnOpenShopModal.addEventListener("click", async () => {
    if (shopModal) shopModal.style.display = "flex";
    await renderRealItems();
  });
}

if (closeShopModal) {
  closeShopModal.addEventListener("click", () => {
    if (shopModal) shopModal.style.display = "none";
  });
}

const btnAdminPublishShop = document.getElementById("btn-admin-publish-shop");
const publishShopModal = document.getElementById("publish-shop-modal");
const closePublishShopModal = document.getElementById("close-publish-shop-modal");
const btnSubmitPublishShop = document.getElementById("btn-submit-publish-shop");

if (btnAdminPublishShop) {
  btnAdminPublishShop.addEventListener("click", () => {
    if (publishShopModal) publishShopModal.style.display = "flex";
  });
}

if (closePublishShopModal) {
  closePublishShopModal.addEventListener("click", () => {
    if (publishShopModal) publishShopModal.style.display = "none";
  });
}

if (btnSubmitPublishShop) {
  btnSubmitPublishShop.addEventListener("click", async () => {
    const title = document.getElementById("publish-title").value.trim();
    const desc = document.getElementById("publish-desc").value.trim();
    const points = parseInt(document.getElementById("publish-points").value);
    const stock = parseInt(document.getElementById("publish-stock").value);
    const fileInput = document.getElementById("publish-img-file");
    const file = fileInput ? fileInput.files[0] : null;

    if (!title || isNaN(points) || isNaN(stock)) {
      alert("Harap lengkapi judul, poin, dan stok!");
      return;
    }

    btnSubmitPublishShop.textContent = "Menerbitkan...";
    btnSubmitPublishShop.disabled = true;

    const success = await publishRealItem(currentUserId, title, desc, points, stock, file);
    if (success) {
      alert("✅ Barang berhasil dipublish ke toko!");
      document.getElementById("publish-title").value = "";
      document.getElementById("publish-desc").value = "";
      document.getElementById("publish-points").value = "";
      document.getElementById("publish-stock").value = "";
      if (fileInput) fileInput.value = "";
      if (publishShopModal) publishShopModal.style.display = "none";
      await renderRealItems();
    }

    btnSubmitPublishShop.textContent = "Publish Barang";
    btnSubmitPublishShop.disabled = false;
  });
}

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-redeem-real")) {
    const itemId = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const stock = parseInt(e.target.getAttribute("data-stock"));
    const currentPoints = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;

    if (stock <= 0) {
      alert("Maaf, stok barang ini sudah habis!");
      return;
    }

    const confirmRedeem = confirm(`Tukarkan ${price} Poin Vihara untuk barang ini?`);
    if (!confirmRedeem) return;

    const success = await redeemRealItem(currentUserId, itemId, price, currentPoints);
    if (success) {
      await loadUserProfile();
      await renderRealItems();
    }
  }
});