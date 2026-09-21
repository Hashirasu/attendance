import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// CONFIG SUPABASE (Ganti dengan URL & Anon Key asli proyek Supabase kamu)
const SUPABASE_URL = "https://your-supabase-url.supabase.co"; 
const SUPABASE_ANON_KEY = "your-anon-key";                   

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIOSK_SECRET = "VIHARA_ZEN_SECRET_2026";

// ELEMEN DOM
const loginSection = document.getElementById("login-section");
const userSection = document.getElementById("user-section");
const adminSection = document.getElementById("admin-section");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nameGroup = document.getElementById("name-group");
const registerNameInput = document.getElementById("register-name");
const authMainButton = document.getElementById("auth-main-button");
const authButtonText = document.getElementById("auth-button-text");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleAuthText = document.getElementById("toggle-auth-text");
const messageEl = document.getElementById("message");

const userNameDisplay = document.getElementById("user-name-display");
const userCodeEl = document.getElementById("user-code");
const todayStatusEl = document.getElementById("today-status");
const checkInButton = document.getElementById("check-in-button");
const attendanceMessage = document.getElementById("attendance-message");
const attendanceHistory = document.getElementById("attendance-history");

const switchToAdminBtn = document.getElementById("switch-to-admin");
const switchToUserBtn = document.getElementById("switch-to-user");
const logoutBtn = document.getElementById("logout-button");
const adminLogoutBtn = document.getElementById("admin-logout-button");

const tabRekapBtn = document.getElementById("tab-rekap-btn");
const tabKaryawanBtn = document.getElementById("tab-karyawan-btn");
const adminViewRekap = document.getElementById("admin-view-rekap");
const adminViewKaryawan = document.getElementById("admin-view-karyawan");

const adminFilterDate = document.getElementById("admin-filter-date");
const adminFilterStatus = document.getElementById("admin-filter-status");
const exportCsvBtn = document.getElementById("export-csv-btn");
const adminAttendanceList = document.getElementById("admin-attendance-list");
const adminEmployeeList = document.getElementById("admin-employee-list");

const editEmpModal = document.getElementById("edit-emp-modal");
const editEmpId = document.getElementById("edit-emp-id");
const editEmpName = document.getElementById("edit-emp-name");
const editEmpCode = document.getElementById("edit-emp-code");
const editEmpRole = document.getElementById("edit-emp-role");
const editEmpActive = document.getElementById("edit-emp-active");
const editModalMsg = document.getElementById("edit-modal-msg");
const cancelEditEmp = document.getElementById("cancel-edit-emp");
const saveEditEmp = document.getElementById("save-edit-emp");

let isRegisterMode = false;
let currentUserRole = "user";

// ==============================
// 1. AUTO CHECK-IN DARI URL QR
// ==============================
async function checkUrlAutoAttendance() {
  const urlParams = new URLSearchParams(window.location.search);
  const secret = urlParams.get("secret");
  const block = urlParams.get("block");

  if (secret && block) {
    const currentUnix = Math.floor(Date.now() / 1000);
    const currentBlock = Math.floor(currentUnix / 15);

    if (secret === KIOSK_SECRET && Math.abs(currentBlock - parseInt(block)) <= 1) {
      const { data, error } = await supabase.rpc("check_in");
      if (!error && data && data.success) {
        alert("✓ Absensi Berhasil via Scan Kamera!");
      } else if (data && data.message) {
        alert(data.message);
      }
    } else {
      alert("QR Code sudah kedaluwarsa, silakan scan ulang di layar Kios.");
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ==============================
// 2. AUTHENTICATION & SESSION
// ==============================
window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await loadUserProfile();
    await checkUrlAutoAttendance();
  } else {
    showLoginSection();
  }
});

toggleAuthBtn.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    nameGroup.style.display = "block";
    authButtonText.textContent = "DAFTAR";
    toggleAuthText.textContent = "Sudah punya akun?";
    toggleAuthBtn.textContent = "Login di sini";
  } else {
    nameGroup.style.display = "none";
    authButtonText.textContent = "LOGIN";
    toggleAuthText.textContent = "Belum punya akun?";
    toggleAuthBtn.textContent = "Daftar di sini";
  }
  messageEl.textContent = "";
});

authMainButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    messageEl.textContent = "Email dan password wajib diisi!";
    return;
  }

  messageEl.textContent = "Memproses...";

  if (isRegisterMode) {
    const name = registerNameInput.value.trim();
    if (!name) {
      messageEl.textContent = "Nama lengkap wajib diisi!";
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });

    if (error) {
      messageEl.textContent = "Gagal mendaftar: " + error.message;
    } else {
      messageEl.textContent = "Pendaftaran berhasil! Silakan login.";
      toggleAuthBtn.click();
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      messageEl.textContent = "Login gagal: " + error.message;
    } else {
      messageEl.textContent = "";
      await loadUserProfile();
      await checkUrlAutoAttendance();
    }
  }
});

async function handleLogout() {
  await supabase.auth.signOut();
  showLoginSection();
}

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", handleLogout);

function showLoginSection() {
  loginSection.style.display = "block";
  userSection.style.display = "none";
  adminSection.style.display = "none";
}

// ==============================
// 3. PROFILE & DASHBOARD USER
// ==============================
async function loadUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: empData, error } = await supabase
    .from("employees")
    .select("name, employee_code, role")
    .eq("id", user.id)
    .single();

  if (!error && empData) {
    userNameDisplay.textContent = empData.name;
    userCodeEl.textContent = `Kode: ${empData.employee_code}`;
    currentUserRole = empData.role;

    // CEK AKSES ADMIN UNTUK 'admin' DAN 'adm1n'
    if (currentUserRole === "admin" || currentUserRole === "adm1n") {
      switchToAdminBtn.style.display = "inline-block";
    } else {
      switchToAdminBtn.style.display = "none";
    }
  }

  loginSection.style.display = "none";
  userSection.style.display = "block";
  adminSection.style.display = "none";

  await loadTodayStatus();
  await loadAttendanceHistory();
}

async function loadTodayStatus() {
  if (!todayStatusEl) return;
  todayStatusEl.innerHTML = "<p style='color: var(--text-sub);'>Memuat status hari ini...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  const todayStr = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("attendance")
    .select("check_in, status")
    .eq("employee_id", user.id)
    .eq("attendance_date", todayStr)
    .maybeSingle();

  if (error) {
    todayStatusEl.innerHTML = "<p style='color: #a82e2e;'>Gagal memuat status.</p>";
    return;
  }

  if (data) {
    const time = new Date(data.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
    });
    const badge = data.status === "late" 
      ? `<span class="badge-late">Terlambat</span>` 
      : `<span class="badge-present">Tepat Waktu</span>`;

    todayStatusEl.innerHTML = `
      <div style="font-size: 16px; font-weight: 800; color: var(--primary-dark); margin-bottom: 4px;">Sudah Absen</div>
      <div style="font-size: 13px; color: var(--text-sub); margin-bottom: 8px;">Pukul ${time} WIB</div>
      <div>${badge}</div>
    `;
    checkInButton.disabled = true;
    checkInButton.textContent = "SUDAH ABSEN HARI INI";
  } else {
    todayStatusEl.innerHTML = `
      <div style="font-size: 16px; font-weight: 800; color: #a82e2e; margin-bottom: 4px;">Belum Absen</div>
      <div style="font-size: 13px; color: var(--text-sub);">Silakan tekan tombol untuk presensi.</div>
    `;
    checkInButton.disabled = false;
    checkInButton.textContent = "ABSEN SEKARANG";
  }
}

if (checkInButton) {
  checkInButton.addEventListener("click", async () => {
    checkInButton.disabled = true;
    attendanceMessage.textContent = "Memproses absensi...";

    const { data, error } = await supabase.rpc("check_in");

    if (error) {
      attendanceMessage.textContent = "Gagal absen: " + error.message;
      checkInButton.disabled = false;
    } else if (data) {
      attendanceMessage.textContent = data.message;
      await loadTodayStatus();
      await loadAttendanceHistory();
    }
  });
}

async function loadAttendanceHistory() {
  if (!attendanceHistory) return;
  attendanceHistory.innerHTML = "<p style='color: var(--text-sub);'>Memuat riwayat...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("attendance")
    .select("attendance_date, check_in, status")
    .eq("employee_id", user.id)
    .order("attendance_date", { ascending: false });

  if (error || !data || data.length === 0) {
    attendanceHistory.innerHTML = `
      <div style="text-align: center; padding: 24px 10px; background: rgba(255,255,255,0.6); border-radius: 12px;">
        <span style="font-size: 28px; display: block; margin-bottom: 6px;">🌱</span>
        <p style="font-size: 13px; color: var(--text-sub); margin: 0; font-weight: 600;">Belum ada riwayat absensi. Mulai catat presensimu!</p>
      </div>
    `;
    return;
  }

  attendanceHistory.innerHTML = "";

  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
    });

    const time = new Date(row.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
    });

    const isLate = row.status === "late";
    const statusBadge = isLate 
      ? `<span class="badge-late">Terlambat</span>` 
      : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="color: var(--gold); font-size: 16px;">☸</span>
        <div>
          <strong style="font-size: 14px; color: var(--text-main);">${date}</strong>
          <div style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">Pukul ${time} WIB</div>
        </div>
      </div>
      <div>${statusBadge}</div>
    `;

    attendanceHistory.appendChild(item);
  });
}

// ==============================
// 4. ADMIN PANEL & MANAGEMENT
// ==============================
if (switchToAdminBtn) {
  switchToAdminBtn.addEventListener("click", async () => {
    userSection.style.display = "none";
    adminSection.style.display = "block";
    await loadAdminAttendance();
  });
}

if (switchToUserBtn) {
  switchToUserBtn.addEventListener("click", () => {
    adminSection.style.display = "none";
    userSection.style.display = "block";
  });
}

if (tabRekapBtn && tabKaryawanBtn) {
  tabRekapBtn.addEventListener("click", () => {
    adminViewRekap.style.display = "block";
    adminViewKaryawan.style.display = "none";
    tabRekapBtn.classList.add("active");
    tabKaryawanBtn.classList.remove("active");
  });

  tabKaryawanBtn.addEventListener("click", async () => {
    adminViewRekap.style.display = "none";
    adminViewKaryawan.style.display = "block";
    tabKaryawanBtn.classList.add("active");
    tabRekapBtn.classList.remove("active");
    await loadEmployeeManagement();
  });
}

if (adminFilterDate) adminFilterDate.addEventListener("change", loadAdminAttendance);
if (adminFilterStatus) adminFilterStatus.addEventListener("change", loadAdminAttendance);

async function loadAdminAttendance() {
  if (!adminAttendanceList) return;
  adminAttendanceList.innerHTML = "<p style='color: var(--text-sub);'>Memuat rekap absensi...</p>";

  const selectedDate = adminFilterDate.value;
  const selectedStatus = adminFilterStatus.value;

  let query = supabase
    .from("attendance")
    .select("id, attendance_date, check_in, status, employees(name, employee_code)")
    .order("check_in", { ascending: false });

  if (selectedDate) {
    query = query.eq("attendance_date", selectedDate);
  }

  if (selectedStatus !== "ALL") {
    query = query.eq("status", selectedStatus);
  }

  const { data, error } = await query;

  if (error || !data) {
    adminAttendanceList.innerHTML = "<p style='color: #a82e2e;'>Gagal memuat data rekap absensi.</p>";
    return;
  }

  if (data.length === 0) {
    adminAttendanceList.innerHTML = "<p style='color: var(--text-sub); text-align: center; padding: 20px;'>Tidak ada data absensi untuk filter ini.</p>";
    return;
  }

  adminAttendanceList.innerHTML = "";

  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
    });

    const time = new Date(row.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
    });

    const empName = row.employees ? row.employees.name : "Member (Dihapus)";
    const empCode = row.employees ? row.employees.employee_code : "-";

    const isLate = row.status === "late";
    const statusBadge = isLate 
      ? `<span class="badge-late">Terlambat</span>` 
      : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong style="font-size: 14px; color: var(--text-main);">${empName}</strong> 
        <span style="font-size: 11px; color: var(--text-sub);">(${empCode})</span>
        <div style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">${date} &bull; Pukul ${time} WIB</div>
      </div>
      <div>${statusBadge}</div>
    `;

    adminAttendanceList.appendChild(item);
  });
}

// RENDER KELOLA MEMBER
async function loadEmployeeManagement() {
  if (!adminEmployeeList) return;
  adminEmployeeList.innerHTML = "<p style='color: var(--text-sub);'>Memuat daftar member...</p>";

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, employee_code, role, is_active")
    .order("name", { ascending: true });

  if (error) {
    adminEmployeeList.innerHTML = "<p style='color: #a82e2e;'>Gagal memuat data member.</p>";
    return;
  }

  adminEmployeeList.innerHTML = "";

  data.forEach((emp) => {
    const isActive = emp.is_active !== false;
    const statusBadge = isActive 
      ? `<span class="badge-active">Aktif</span>` 
      : `<span class="badge-inactive">Nonaktif</span>`;

    const roleBadge = (emp.role === "admin" || emp.role === "adm1n")
      ? `<span class="role-badge role-admin">${emp.role.toUpperCase()}</span>`
      : `<span class="role-badge role-user">MEMBER</span>`;

    const card = document.createElement("div");
    card.className = "emp-card-item";
    
    card.innerHTML = `
      <div>
        <div class="emp-name-title">
          ${emp.name}
          ${roleBadge}
          ${statusBadge}
        </div>
        <div class="emp-code-sub">Kode Member: <strong>${emp.employee_code}</strong></div>
      </div>
      <button class="secondary-button edit-btn-style" type="button" style="padding: 6px 16px; font-size: 12px;">Edit</button>
    `;

    const editBtn = card.querySelector(".edit-btn-style");
    editBtn.addEventListener("click", () => {
      editEmpId.value = emp.id;
      editEmpName.value = emp.name;
      editEmpCode.value = emp.employee_code;
      editEmpRole.value = emp.role;
      editEmpActive.value = isActive ? "true" : "false";
      if (editModalMsg) editModalMsg.textContent = "";
      editEmpModal.style.display = "flex";
    });

    adminEmployeeList.appendChild(card);
  });
}

if (cancelEditEmp) {
  cancelEditEmp.addEventListener("click", () => {
    editEmpModal.style.display = "none";
  });
}

if (saveEditEmp) {
  saveEditEmp.addEventListener("click", async () => {
    const id = editEmpId.value;
    const name = editEmpName.value.trim();
    const code = editEmpCode.value.trim();
    const role = editEmpRole.value;
    const isActive = editEmpActive.value === "true";

    if (!name || !code) {
      editModalMsg.textContent = "Nama dan Kode tidak boleh kosong!";
      return;
    }

    // PROTEKSI: Cek apakah user yang login adalah 'adm1n'
    const { data: { user } } = await supabase.auth.getUser();
    const { data: currentUserData } = await supabase
      .from("employees")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUserData.role !== "adm1n") {
      const { data: targetUserData } = await supabase
        .from("employees")
        .select("role")
        .eq("id", id)
        .single();

      if (targetUserData.role !== role) {
        editModalMsg.textContent = "⛔ Hanya Adm1n yang bisa mengubah Role / Pangkat!";
        return;
      }
    }

    editModalMsg.textContent = "Menyimpan...";

    const { error } = await supabase
      .from("employees")
      .update({ name, employee_code: code, role, is_active: isActive })
      .eq("id", id);

    if (error) {
      editModalMsg.textContent = "Gagal menyimpan: " + error.message;
    } else {
      editModalMsg.textContent = "Berhasil diperbarui!";
      setTimeout(() => {
        editEmpModal.style.display = "none";
        loadEmployeeManagement();
      }, 800);
    }
  });
}

// EXPORT EXCEL
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("attendance_date, check_in, status, employees(name, employee_code)")
      .order("attendance_date", { ascending: false });

    if (error || !data) {
      alert("Gagal mengambil data untuk ekspor.");
      return;
    }

    const excelData = data.map((row) => ({
      Tanggal: row.attendance_date,
      "Nama Member": row.employees ? row.employees.name : "N/A",
      "Kode Member": row.employees ? row.employees.employee_code : "N/A",
      "Jam Absen": new Date(row.check_in).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }),
      Status: row.status === "late" ? "Terlambat" : "Tepat Waktu",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");
    XLSX.writeFile(workbook, `Rekap_Presensi_Mudiviverse_${new Date().toISOString().split("T")[0]}.xlsx`);
  });
}