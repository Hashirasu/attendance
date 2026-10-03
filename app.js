import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { 
  ALL_SHOP_POKEMON, ALL_SHOP_SCENERY, ensureFreeStarterPokemon,
  publishRealItem, redeemRealItem, renderRealItems,
  renderPokemonShop, buyPokemon, renderSceneryShop, buyScenery, loadItemRedemptions, deleteRealItem
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

  // Pastikan starter pokemon gratis
  await ensureFreeStarterPokemon(currentUserId);

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
    const profileBanner = document.getElementById("my-profile-banner");

    const avatarUrl = empData.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${empData.name}`;

    if (profilePageAvatar) profilePageAvatar.src = avatarUrl;
    if (profilePageName) profilePageName.textContent = empData.name;
    if (profilePageCode) profilePageCode.textContent = `Kode Anggota: ${empData.employee_code}`;
    if (profilePagePoints) profilePagePoints.textContent = empData.points || 0;
    if (profilePageBio) profilePageBio.textContent = `"${empData.bio || 'Halo, salam kenal ya!'}"`;
    if (profileBanner && empData.active_scenery_url) {
      profileBanner.style.backgroundImage = `url('${empData.active_scenery_url}')`;
    }

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

  await renderMyPokemonShowcase(currentUserId);

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

// RENDER PAJANGAN 3 POKEMON PROFIL SAYA
async function renderMyPokemonShowcase(userId) {
  const container = document.getElementById("my-pokemon-showcase");
  if (!container) return;

  const { data: showcase } = await supabase.from("user_pokemon_showcase").select("pokemon_id, slot_index").eq("user_id", userId);
  
  container.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const slot = (showcase || []).find(s => s.slot_index === i);
    const pokeObj = slot ? ALL_SHOP_POKEMON.find(p => p.id === slot.pokemon_id) : null;

    const div = document.createElement("div");
    if (pokeObj) {
      div.className = "pokemon-slot filled";
      div.innerHTML = `
        <img src="${pokeObj.img}" alt="${pokeObj.name}">
        <span>${pokeObj.name}</span>
      `;
    } else {
      div.className = "pokemon-slot empty";
      div.innerHTML = `<span>+ Kosong (Slot ${i+1})</span>`;
    }
    container.appendChild(div);
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
// 5. FRIENDS SYSTEM & PUBLIC PROFILE
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

  const banner = document.getElementById("public-profile-banner");
  if (banner && u.active_scenery_url) {
    banner.style.backgroundImage = `url('${u.active_scenery_url}')`;
  }

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

  // RENDER POKEMON PUBLIC
  const pokeContainer = document.getElementById("public-pokemon-showcase");
  if (pokeContainer) {
    const { data: showcase } = await supabase.from("user_pokemon_showcase").select("pokemon_id, slot_index").eq("user_id", targetUserId);
    pokeContainer.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const slot = (showcase || []).find(s => s.slot_index === i);
      const pokeObj = slot ? ALL_SHOP_POKEMON.find(p => p.id === slot.pokemon_id) : null;

      const div = document.createElement("div");
      if (pokeObj) {
        div.className = "pokemon-slot filled";
        div.innerHTML = `<img src="${pokeObj.img}" alt="${pokeObj.name}"><span>${pokeObj.name}</span>`;
      } else {
        div.className = "pokemon-slot empty";
        div.innerHTML = `<span>+ Kosong</span>`;
      }
      pokeContainer.appendChild(div);
    }
  }

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

// HANDLER CLICK EVENT PERTEMANAN
document.addEventListener("click", async (e) => {
  const userInfoBox = e.target.closest(".friend-user-info");
  if (userInfoBox) {
    const uId = userInfoBox.getAttribute("data-user-id");
    if (uId) {
      switchTab("friends", false);
      await openPublicProfile(uId);
    }
  }

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
  }

  if (e.target.classList.contains("btn-friend-accept")) {
    const relId = e.target.getAttribute("data-id");
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", relId);
    await Promise.all([loadFriendsSystem(), loadMyFriendsList()]);
  }

  if (e.target.classList.contains("btn-friend-reject")) {
    const relId = e.target.getAttribute("data-id");
    await supabase.from("friendships").delete().eq("id", relId);
    await loadFriendsSystem();
  }

  if (e.target.classList.contains("btn-friend-unfollow")) {
    const relId = e.target.getAttribute("data-rel-id");
    const name = e.target.getAttribute("data-name");
    const targetId = e.target.getAttribute("data-target-id");

    if (confirm(`Unfollow ${name}?`)) {
      await supabase.from("friendships").delete().or(`id.eq.${relId},and(user_id.eq.${currentUserId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${currentUserId})`);
      await Promise.all([loadFriendsSystem(), loadMyFriendsList()]);
    }
  }

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

  const { data: msgs } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeChatFriendId}),and(sender_id.eq.${activeChatFriendId},receiver_id.eq.${currentUserId})`)
    .order("created_at", { ascending: true });

  if (!msgs || msgs.length === 0) {
    body.innerHTML = `<p style="font-size: 11px; color: var(--text-sub); text-align: center; margin: auto;">Belum ada pesan.</p>`;
    return;
  }

  body.innerHTML = "";
  msgs.forEach(m => {
    const isMine = m.sender_id === currentUserId;
    const timeStr = new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'other'}`;
    bubble.innerHTML = `<span>${m.message}</span><div class="chat-meta"><span>${timeStr}</span></div>`;
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
  await supabase.from("direct_messages").insert({ sender_id: currentUserId, receiver_id: activeChatFriendId, message: text });
  await loadChatMessages();
}

if (btnSendChat) btnSendChat.addEventListener("click", handleSendMessage);

// ==============================
// 7. PROFILE EDITING & STATUS
// ==============================
const uploadAvatarFileInput = document.getElementById("upload-avatar-file");

if (uploadAvatarFileInput) {
  uploadAvatarFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUserId) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUserId}/avatar_${Date.now()}.${fileExt}`;

    try {
      await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('employees').update({ avatar_url: publicUrl }).eq('id', currentUserId);

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

if (btnOpenEditBioModal) {
  btnOpenEditBioModal.addEventListener("click", () => {
    if (currentEmployeeData) editBioInputText.value = currentEmployeeData.bio || "";
    if (editBioModal) editBioModal.style.display = "flex";
  });
}

if (cancelEditBioBtn) cancelEditBioBtn.addEventListener("click", () => editBioModal.style.display = "none");

if (saveEditBioBtn) {
  saveEditBioBtn.addEventListener("click", async () => {
    const bioText = editBioInputText.value.trim();
    await supabase.from("employees").update({ bio: bioText }).eq("id", currentUserId);
    if (editBioModal) editBioModal.style.display = "none";
    await loadUserProfile();
  });
}

async function loadTodayStatus() {
  if (!todayStatusEl) return;
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
    const badge = row.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Tepat Waktu</span>`;

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
// 8. POKEDEX & SHOWCASE PAJANGAN
// ==============================
const btnOpenPokedexModal = document.getElementById("btn-open-pokedex-modal");
const pokedexModal = document.getElementById("pokedex-modal");
const closePokedexModal = document.getElementById("close-pokedex-modal");

if (btnOpenPokedexModal) {
  btnOpenPokedexModal.addEventListener("click", async () => {
    if (pokedexModal) pokedexModal.style.display = "flex";
    await renderPokedexModal();
  });
}

if (closePokedexModal) {
  closePokedexModal.addEventListener("click", () => {
    if (pokedexModal) pokedexModal.style.display = "none";
  });
}

async function renderPokedexModal() {
  const container = document.getElementById("pokedex-container");
  if (!container || !currentUserId) return;

  container.innerHTML = "<p style='font-size:12px; color:var(--text-sub); text-align:center;'>Memuat Pokedex...</p>";

  const { data: userInventory } = await supabase.from("user_pokemon_inventory").select("pokemon_id").eq("user_id", currentUserId);
  const ownedIds = (userInventory || []).map(i => i.pokemon_id);

  const { data: showcase } = await supabase.from("user_pokemon_showcase").select("pokemon_id").eq("user_id", currentUserId);
  const showcaseIds = (showcase || []).map(s => s.pokemon_id);

  container.innerHTML = "";
  ALL_SHOP_POKEMON.forEach(poke => {
    const isOwned = ownedIds.includes(poke.id);
    const isDisplayed = showcaseIds.includes(poke.id);

    const card = document.createElement("div");
    card.className = `shop-item-card ${isOwned ? 'owned' : 'locked'}`;
    card.style.opacity = isOwned ? "1" : "0.5";
    card.style.filter = isOwned ? "none" : "grayscale(0.9)";

    card.innerHTML = `
      <img src="${poke.img}" style="width:60px; height:60px; object-fit:contain; margin-bottom:4px;" alt="${poke.name}">
      <h4 style="font-size:12px; font-weight:700; color:var(--text-main);">${poke.name}</h4>
      <span style="font-size:10px; color:var(--text-sub);">Gen ${poke.gen}</span>

      ${isOwned ? `
        <button class="btn-toggle-showcase secondary-button-sm" data-id="${poke.id}" style="width:100\%; margin-top:6px; font-size:10px; ${isDisplayed ? 'background:#10b981; color:white;' : ''}">
          ${isDisplayed ? '✨ Dipajang' : '📌 Pajang'}
        </button>
      ` : `
        <span style="font-size:10px; color:var(--text-sub); margin-top:6px; display:block;">🔒 Belum Dimiliki</span>
      `}
    `;
    container.appendChild(card);
  });
}

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-toggle-showcase")) {
    const pokeId = e.target.getAttribute("data-id");
    const { data: showcase } = await supabase.from("user_pokemon_showcase").select("*").eq("user_id", currentUserId);

    const existingIndex = (showcase || []).findIndex(s => s.pokemon_id === pokeId);

    if (existingIndex !== -1) {
      await supabase.from("user_pokemon_showcase").delete().eq("user_id", currentUserId).eq("pokemon_id", pokeId);
    } else {
      if ((showcase || []).length >= 3) {
        alert("Kamu hanya bisa memajang maksimal 3 Pokémon! Lepas salah satu terlebih dahulu.");
        return;
      }

      const availableSlots = [0, 1, 2].filter(slot => !(showcase || []).some(s => s.slot_index === slot));
      const targetSlot = availableSlots[0];

      await supabase.from("user_pokemon_showcase").insert({
        user_id: currentUserId,
        pokemon_id: pokeId,
        slot_index: targetSlot
      });
    }

    await renderPokedexModal();
    await renderMyPokemonShowcase(currentUserId);
  }
});

// ==============================
// 9. TOKO VIHARA (3 TAB SYSTEM)
// ==============================
const btnOpenShopModal = document.getElementById("btn-open-shop-modal");
const shopModal = document.getElementById("shop-modal");
const closeShopModal = document.getElementById("close-shop-modal");

if (btnOpenShopModal) {
  btnOpenShopModal.addEventListener("click", async () => {
    if (shopModal) shopModal.style.display = "flex";
    const pts = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;
    await renderRealItems(currentUserRole);
    await renderPokemonShop(currentUserId, pts);
    await renderSceneryShop(currentUserId, pts, currentEmployeeData ? currentEmployeeData.active_scenery_url : null);
  });
}

if (closeShopModal) {
  closeShopModal.addEventListener("click", () => {
    if (shopModal) shopModal.style.display = "none";
  });
}

// TAB NAVIGATION DI TOKO
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("shop-tab-btn")) {
    const targetTab = e.target.getAttribute("data-shop-tab");

    document.querySelectorAll(".shop-tab-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");

    document.querySelectorAll(".shop-tab-view").forEach(v => v.style.display = "none");
    const targetView = document.getElementById(`shop-tab-${targetTab}`);
    if (targetView) targetView.style.display = "block";
  }
});

// HANDLER AKSI TOKO (QTY +/-, REDEEM, ADOPSI, SCENERY)
document.addEventListener("click", async (e) => {
  // 1. Plus Qty
  if (e.target.classList.contains("btn-qty-plus")) {
    const id = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const stock = parseInt(e.target.getAttribute("data-stock"));
    const qtyEl = document.getElementById(`qty-count-${id}`);
    const totalEl = document.getElementById(`total-price-${id}`);

    let currentQty = parseInt(qtyEl.textContent);
    if (currentQty < stock) {
      currentQty++;
      qtyEl.textContent = currentQty;
      totalEl.textContent = currentQty * price;
    }
  }

  // 2. Minus Qty
  if (e.target.classList.contains("btn-qty-minus")) {
    const id = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const qtyEl = document.getElementById(`qty-count-${id}`);
    const totalEl = document.getElementById(`total-price-${id}`);

    let currentQty = parseInt(qtyEl.textContent);
    if (currentQty > 1) {
      currentQty--;
      qtyEl.textContent = currentQty;
      totalEl.textContent = currentQty * price;
    }
  }

  // 3. Redeem Barang Fisik
  if (e.target.classList.contains("btn-redeem-real")) {
    const id = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const qty = parseInt(document.getElementById(`qty-count-${id}`).textContent);
    const totalPoints = price * qty;
    const currentPoints = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;

    if (confirm(`Tukarkan ${totalPoints} Poin untuk ${qty}x barang ini?`)) {
      const ok = await redeemRealItem(currentUserId, id, qty, totalPoints, currentPoints);
      if (ok) {
        await loadUserProfile();
        await renderRealItems(currentUserRole);
      }
    }
  }

  // 4. Adopsi Pokemon
  if (e.target.classList.contains("btn-buy-pokemon")) {
    const pokeId = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const name = e.target.getAttribute("data-name");
    const currentPoints = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;

    if (confirm(`Adopsi ${name} seharga ${price} Poin?`)) {
      const ok = await buyPokemon(currentUserId, pokeId, price, name, currentPoints);
      if (ok) {
        await loadUserProfile();
        await renderPokemonShop(currentUserId, currentEmployeeData.points);
      }
    }
  }

  // 5. Beli & Pasang Scenery
  if (e.target.classList.contains("btn-buy-scenery")) {
    const scId = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const url = e.target.getAttribute("data-url");
    const title = e.target.getAttribute("data-title");
    const currentPoints = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;

    if (confirm(`Beli Background ${title} seharga ${price} Poin?`)) {
      const ok = await buyScenery(currentUserId, scId, price, url, title, currentPoints);
      if (ok) {
        await loadUserProfile();
        await renderSceneryShop(currentUserId, currentEmployeeData.points, url);
      }
    }
  }

  if (e.target.classList.contains("btn-equip-scenery")) {
    const url = e.target.getAttribute("data-url");
    await supabase.from("employees").update({ active_scenery_url: url }).eq("id", currentUserId);
    await loadUserProfile();
    await renderSceneryShop(currentUserId, currentEmployeeData.points, url);
  }

  // Admin Actions Toko
  if (e.target.classList.contains("btn-edit-item")) {
    const id = e.target.getAttribute("data-id");
    document.getElementById("publish-title").value = e.target.getAttribute("data-title");
    document.getElementById("publish-desc").value = e.target.getAttribute("data-desc");
    document.getElementById("publish-points").value = e.target.getAttribute("data-price");
    document.getElementById("publish-stock").value = e.target.getAttribute("data-stock");
    window.editingShopItemId = id;
    document.getElementById("publish-shop-modal").style.display = "flex";
  }

  if (e.target.classList.contains("btn-delete-item")) {
    const id = e.target.getAttribute("data-id");
    if (confirm("Yakin hapus barang ini?")) {
      const ok = await deleteRealItem(id);
      if (ok) await renderRealItems(currentUserRole);
    }
  }

  if (e.target.classList.contains("btn-check-redemptions")) {
    const id = e.target.getAttribute("data-id");
    const modal = document.getElementById("redemption-list-modal");
    const container = document.getElementById("redemption-history-container");
    if (modal && container) {
      modal.style.display = "flex";
      container.innerHTML = "<p style='font-size:12px; color:var(--text-sub); text-align:center;'>Memuat data...</p>";
      const logs = await loadItemRedemptions(id);
      if (logs.length === 0) {
        container.innerHTML = "<p style='font-size:12px; color:var(--text-sub); text-align:center;'>Belum ada yang menukarkan barang ini.</p>";
      } else {
        container.innerHTML = "";
        logs.forEach(l => {
          const emp = l.employees || {};
          const time = new Date(l.created_at).toLocaleString("id-ID");
          container.innerHTML += `
            <div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.1); font-size:12px;">
              <strong>${emp.name || 'Member'}</strong> (${emp.employee_code || '-'})<br>
              <span style="color:var(--text-sub);">Menukar: ${l.quantity}x (${l.total_points} Poin)</span><br>
              <span style="font-size:10px; color:var(--text-sub);">${time}</span>
            </div>
          `;
        });
      }
    }
  }
});

const closeRedemptionModal = document.getElementById("close-redemption-list-modal");
if (closeRedemptionModal) {
  closeRedemptionModal.addEventListener("click", () => {
    document.getElementById("redemption-list-modal").style.display = "none";
  });
}

// PUBLISH BARANG ADMIN
const btnAdminPublishShop = document.getElementById("btn-admin-publish-shop");
const publishShopModal = document.getElementById("publish-shop-modal");
const closePublishShopModal = document.getElementById("close-publish-shop-modal");
const btnSubmitPublishShop = document.getElementById("btn-submit-publish-shop");

if (btnAdminPublishShop) {
  btnAdminPublishShop.addEventListener("click", () => {
    window.editingShopItemId = null;
    document.getElementById("publish-title").value = "";
    document.getElementById("publish-desc").value = "";
    document.getElementById("publish-points").value = "";
    document.getElementById("publish-stock").value = "";
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

    const editId = window.editingShopItemId;
    const success = await publishRealItem(currentUserId, title, desc, points, stock, file, editId);
    if (success) {
      alert("✅ Barang berhasil dipublish/diupdate!");
      if (publishShopModal) publishShopModal.style.display = "none";
      await renderRealItems(currentUserRole);
    }

    btnSubmitPublishShop.textContent = "Publish Barang";
    btnSubmitPublishShop.disabled = false;
  });
}

// ==============================
// 10. QR SCANNER KAMERA & ADMIN KIOSK
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
    } catch (e) {}
  }
  if (scannerModal) scannerModal.style.display = "none";
}

if (openScannerBtnUser) openScannerBtnUser.addEventListener("click", startQrScanner);
if (closeScannerBtn) closeScannerBtn.addEventListener("click", stopQrScanner);

// ADMIN PANELS
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
    text: "INIT", width: 220, height: 220,
    colorDark: "#000000", colorLight: "#ffffff",
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
    if (fillBar) fillBar.style.width = `${(secondsRemaining / 15) * 100}%`;
  }

  updateKioskFrame();
  kioskTimerInterval = setInterval(updateKioskFrame, 1000);
}

// LIGHT & DARK MODE
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
      if (themeIcon) themeIcon.textContent = isLight ? "☀️" : "🌙";
      localStorage.setItem("app_theme", isLight ? "light" : "dark");
    });
  }
}

// NAVIGATION
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

  Object.keys(views).forEach(key => { if (views[key]) views[key].style.display = "none"; });
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  if (views[tabName]) views[tabName].style.display = "block";
  document.querySelectorAll(`.nav-btn[data-tab="${tabName}"]`).forEach(btn => btn.classList.add("active"));

  if (pushToHistory) history.pushState({ tab: tabName }, "", `#${tabName}`);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (btn) {
    const targetTab = btn.getAttribute("data-tab");
    if (targetTab) switchTab(targetTab, true);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  function updateClock() {
    const clockEl = document.getElementById("live-time");
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  const initialTab = window.location.hash ? window.location.hash.replace("#", "") : "home";
  history.replaceState({ tab: initialTab }, "", `#${initialTab}`);
});

initThemeToggle();