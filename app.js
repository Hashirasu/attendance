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
// 1. AUTO CHECK-IN & PRESENSI
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

// RENDER KANDANG & HABITAT ANIMASI 3 POKEMON PROFIL SAYA
async function renderMyPokemonShowcase(userId) {
  const stage = document.getElementById("pokemon-habitat-stage");
  const container = document.getElementById("habitat-pokemon-container");
  if (!container || !stage) return;

  // Set latar Kandang sesuai active_scenery_url
  if (currentEmployeeData && currentEmployeeData.active_scenery_url) {
    stage.style.backgroundImage = `url('${currentEmployeeData.active_scenery_url}')`;
  }

  const { data: showcase } = await supabase
    .from("user_pokemon_showcase")
    .select("pokemon_id, slot_index")
    .eq("user_id", userId);
  
  container.innerHTML = "";

  if (!showcase || showcase.length === 0) {
    container.innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:white; text-shadow:0 2px 4px rgba(0,0,0,0.8); font-size:12px; font-weight:700;">🐾 Kandang masih kosong. Buka Pokédex untuk melepas Pokémon di sini!</div>`;
    return;
  }

  showcase.forEach((slot) => {
    const pokeObj = ALL_SHOP_POKEMON.find(p => p.id === slot.pokemon_id);
    if (pokeObj) {
      const img = document.createElement("img");
      // Menggunakan sprite piksel bergerak
      img.src = pokeObj.sprite;
      img.className = "animated-habitat-poke";
      img.title = `Pokémon #${pokeObj.pokedexNum}`;
      container.appendChild(img);
    }
  });
}

// ==============================
// 8. POKEDEX MODAL (FULL 721 POKEMON)
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

// RENDER POKEDEX SAYA (721 POKEMON)
async function renderPokedexModal() {
  const container = document.getElementById("pokedex-container");
  if (!container || !currentUserId) return;

  container.innerHTML = "<p style='font-size:12px; color:var(--text-sub); text-align:center; grid-column:1/-1;'>Memuat Pokédex (721 Pokémon)...</p>";

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
    card.style.opacity = isOwned ? "1" : "0.35";
    card.style.filter = isOwned ? "none" : "grayscale(1)";

    card.innerHTML = `
      <img src="${poke.img}" style="width:55px; height:55px; object-fit:contain; margin-bottom:4px;" alt="#${poke.pokedexNum}">
      <h4 style="font-size:11px; font-weight:700; color:var(--text-main);">#${poke.pokedexNum}</h4>
      <span style="font-size:9px; color:var(--text-sub);">Gen ${poke.gen}</span>

      ${isOwned ? `
        <button class="btn-toggle-showcase secondary-button-sm" data-id="${poke.id}" style="width:100\%; margin-top:6px; font-size:10px; ${isDisplayed ? 'background:#10b981; color:white;' : ''}">
          ${isDisplayed ? '✨ Di Kandang' : '📌 Lepas ke Kandang'}
        </button>
      ` : `
        <span style="font-size:9px; color:var(--text-sub); margin-top:6px; display:block;">🔒 Belum Dimiliki</span>
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
        alert("Kamu hanya bisa melepas maksimal 3 Pokémon di dalam Kandang! Masukkan salah satu kembali terlebih dahulu.");
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

// SEARCH POKEMON IN SHOP
const searchPokeInput = document.getElementById("search-pokedex-input");
if (searchPokeInput) {
  searchPokeInput.addEventListener("input", (e) => {
    const pts = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;
    renderPokemonShop(currentUserId, pts, e.target.value.trim());
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

// HANDLER AKSI TOKO
document.addEventListener("click", async (e) => {
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

  if (e.target.classList.contains("btn-buy-scenery")) {
    const scId = e.target.getAttribute("data-id");
    const price = parseInt(e.target.getAttribute("data-price"));
    const url = e.target.getAttribute("data-url");
    const title = e.target.getAttribute("data-title");
    const currentPoints = currentEmployeeData ? (currentEmployeeData.points || 0) : 0;

    if (confirm(`Beli Kandang/Habitat ${title} seharga ${price} Poin?`)) {
      const ok = await buyScenery(currentUserId, scId, price, url, title, currentPoints);
      if (ok) {
        await loadUserProfile();
        await renderSceneryShop(currentUserId, currentEmployeeData.points, url);
        await renderMyPokemonShowcase(currentUserId);
      }
    }
  }

  if (e.target.classList.contains("btn-equip-scenery")) {
    const url = e.target.getAttribute("data-url");
    await supabase.from("employees").update({ active_scenery_url: url }).eq("id", currentUserId);
    currentEmployeeData.active_scenery_url = url;
    await loadUserProfile();
    await renderSceneryShop(currentUserId, currentEmployeeData.points, url);
    await renderMyPokemonShowcase(currentUserId);
  }

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
// 10. LIGHT & DARK MODE & DRAWER & LAINNYA
// ==============================
async function loadUserAchievements() {
  if (!currentUserId) return;
  const { count } = await supabase.from("attendance").select("id", { count: "exact", head: true }).eq("employee_id", currentUserId);
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
  if (badgeCountText) badgeCountText.textContent = `${unlockedCount} / 3 Unlocked`;
}

function setupRealtimeListeners() {
  if (!currentUserId) return;
  supabase.channel("global-app-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, async () => {
      await Promise.all([loadFriendsSystem(), loadMyFriendsList()]);
    }).subscribe();
}

async function loadFriendsSystem() {
  const container = document.getElementById("search-friends-results");
  if (!container || !currentUserId) return;
  const { data: allUsers } = await supabase.from("employees").select("id, name, employee_code, avatar_url, bio").neq("id", currentUserId).order("name");
  container.innerHTML = "";
  (allUsers || []).forEach(u => {
    const avatar = u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`;
    container.innerHTML += `<div class="friend-item-card"><div class="friend-user-info" data-user-id="${u.id}"><img src="${avatar}" class="friend-avatar-mini"><div><div class="friend-name">${u.name}</div></div></div></div>`;
  });
}

async function loadMyFriendsList() {}
async function loadTodayStatus() {}
async function loadAttendanceHistory() {}
async function loadMonthlyStatistics() {}

function initThemeToggle() {
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");
  const savedTheme = localStorage.getItem("app_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (themeIcon) themeIcon.textContent = "☀️";
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light-mode");
      const isLight = document.body.classList.contains("light-mode");
      localStorage.setItem("app_theme", isLight ? "light" : "dark");
      if (themeIcon) themeIcon.textContent = isLight ? "☀️" : "🌙";
    });
  }
}

initThemeToggle();