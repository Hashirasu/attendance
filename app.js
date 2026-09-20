import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ==============================
// CONFIG SUPABASE
// ==============================
const SUPABASE_URL = "https://njdrnrnnlsrxdyugmsww.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHJucm5ubHNyeGR5dWdtc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExNDEsImV4cCI6MjEwNTQ3NzE0MX0.F65pU2A3XjyEaisye2GfzLPF9DCaQF1fklMxgSTRhs8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Secret Key Kios (Harus sama dengan di kiosk.js)
const KIOSK_SECRET = "MUDIVIVAVVBN";

// ==============================
// ELEMENT HTML
// ==============================
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nameGroup = document.getElementById("name-group");
const registerNameInput = document.getElementById("register-name");

const authMainButton = document.getElementById("auth-main-button");
const authButtonText = document.getElementById("auth-button-text");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleAuthText = document.getElementById("toggle-auth-text");

const formEyebrow = document.getElementById("form-eyebrow");
const formTitle = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const message = document.getElementById("message");

const logoutButton = document.getElementById("logout-button");
const adminLogoutBtn = document.getElementById("admin-logout-button");

const checkInButton = document.getElementById("check-in-button");
const attendanceMessage = document.getElementById("attendance-message");

const userNameDisplay = document.getElementById("user-name-display");
const attendanceHistory = document.getElementById("attendance-history");
const todayStatus = document.getElementById("today-status");

const loginSection = document.getElementById("login-section");
const userSection = document.getElementById("user-section");
const adminSection = document.getElementById("admin-section");

const userName = document.getElementById("user-name");
const userCode = document.getElementById("user-code");
const userRole = document.getElementById("user-role");

// Admin Elements
const adminAttendanceList = document.getElementById("admin-attendance-list");
const adminFilterDate = document.getElementById("admin-filter-date");
const adminFilterStatus = document.getElementById("admin-filter-status");
const statTotal = document.getElementById("stat-total");
const statPresent = document.getElementById("stat-present");

const switchToUserBtn = document.getElementById("switch-to-user");
const switchToAdminBtn = document.getElementById("switch-to-admin");

const tabRekapBtn = document.getElementById("tab-rekap-btn");
const tabKaryawanBtn = document.getElementById("tab-karyawan-btn");
const adminViewRekap = document.getElementById("admin-view-rekap");
const adminViewKaryawan = document.getElementById("admin-view-karyawan");
const adminEmployeeList = document.getElementById("admin-employee-list");
const exportCsvBtn = document.getElementById("export-csv-btn");

// Modal Edit Member
const editEmpModal = document.getElementById("edit-emp-modal");
const editEmpId = document.getElementById("edit-emp-id");
const editEmpName = document.getElementById("edit-emp-name");
const editEmpCode = document.getElementById("edit-emp-code");
const editEmpRole = document.getElementById("edit-emp-role");
const editEmpActive = document.getElementById("edit-emp-active");
const cancelEditEmp = document.getElementById("cancel-edit-emp");
const saveEditEmp = document.getElementById("save-edit-emp");
const editModalMsg = document.getElementById("edit-modal-msg");

// Modal Scanner QR
const openScannerBtn = document.getElementById("open-scanner-btn");
const closeScannerBtn = document.getElementById("close-scanner-btn");
const scannerModal = document.getElementById("scanner-modal");
let html5QrcodeScanner = null;

let isRegisterMode = false;

// ==============================
// AUTO CHECK SESSION ON REFRESH
// ==============================
window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await loadUserProfile();
  } else {
    if (loginSection) loginSection.style.display = "block";
    if (userSection) userSection.style.display = "none";
    if (adminSection) adminSection.style.display = "none";
  }
});

// ==============================
// 1. TOGGLE UI (LOGIN / REGISTER)
// ==============================
if (toggleAuthBtn) {
  toggleAuthBtn.addEventListener("click", (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;

    if (isRegisterMode) {
      if (nameGroup) nameGroup.style.display = "block";
      if (formEyebrow) formEyebrow.textContent = "JOIN US";
      if (formTitle) formTitle.textContent = "Buat Akun Baru";
      if (formSubtitle) formSubtitle.textContent = "Daftar sekali untuk melakukan absensi harian.";
      if (authButtonText) authButtonText.textContent = "DAFTAR SEKARANG";
      if (toggleAuthText) toggleAuthText.textContent = "Sudah punya akun?";
      if (toggleAuthBtn) toggleAuthBtn.textContent = "Login di sini";
    } else {
      if (nameGroup) nameGroup.style.display = "none";
      if (formEyebrow) formEyebrow.textContent = "WELCOME BACK";
      if (formTitle) formTitle.textContent = "Stay present.";
      if (formSubtitle) formSubtitle.textContent = "Log in to continue your attendance journey.";
      if (authButtonText) authButtonText.textContent = "LOGIN";
      if (toggleAuthText) toggleAuthText.textContent = "Belum punya akun?";
      if (toggleAuthBtn) toggleAuthBtn.textContent = "Daftar di sini";
    }

    if (message) message.textContent = "";
  });
}

// ==============================
// 2. SUBMIT AUTH (LOGIN & REGISTER)
// ==============================
if (authMainButton) {
  authMainButton.addEventListener("click", async () => {
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
      if (message) message.textContent = "Mohon isi email dan password.";
      return;
    }

    if (isRegisterMode) {
      const fullName = registerNameInput ? registerNameInput.value.trim() : "";
      if (!fullName) {
        if (message) message.textContent = "Mohon isi nama lengkap kamu.";
        return;
      }

      if (message) message.textContent = "Mendaftarkan akun...";

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { name: fullName } }
      });

      if (signUpError) {
        if (message) message.textContent = "Gagal mendaftar: " + signUpError.message;
        return;
      }

      if (signUpData.session) {
        if (message) message.textContent = "Pendaftaran berhasil! Memuat profil...";
        await loadUserProfile();
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
          if (message) message.textContent = "Akun terbuat, silakan coba login manual.";
        } else {
          if (message) message.textContent = "Pendaftaran berhasil!";
          await loadUserProfile();
        }
      }

    } else {
      if (message) message.textContent = "Logging in...";

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (message) message.textContent = "Login gagal: " + error.message;
        return;
      }

      if (message) message.textContent = "Login berhasil!";
      await loadUserProfile();
    }
  });
}

// ==============================
// LOAD MEMBER PROFILE
// ==============================
async function checkUrlAutoAttendance() {
  const urlParams = new URLSearchParams(window.location.search);
  const secret = urlParams.get("secret");
  const block = urlParams.get("block");

  if (secret && block) {
    const currentUnix = Math.floor(Date.now() / 1000);
    const currentBlock = Math.floor(currentUnix / 15);

    // Cek secret & toleransi waktu 15 detik
    if (secret === "VIHARA_ZEN_SECRET_2026" && Math.abs(currentBlock - parseInt(block)) <= 1) {
      const { data, error } = await supabase.rpc("check_in");
      if (!error && data.success) {
        alert("✓ Absensi Berhasil via Scan Kamera!");
      } else if (data) {
        alert(data.message);
      }
    } else {
      alert("QR Code sudah kedaluwarsa, silakan scan ulang di layar Kios.");
    }

    // Bersihkan URL parameter agar tidak re-trigger saat di-refresh
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}


async function loadUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, employee_code, role, is_active")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      if (message) message.textContent = "Data profil member belum ditemukan.";
      return;
    }

    if (data.is_active === false) {
      if (message) message.textContent = "Akun kamu sedang dinonaktifkan. Hubungi Admin.";
      await supabase.auth.signOut();
      return;
    }

    if (userName) userName.textContent = data.name;
    if (userCode) userCode.textContent = data.employee_code;
    if (userRole) userRole.textContent = data.role;
    if (userNameDisplay) userNameDisplay.textContent = data.name;

    if (loginSection) loginSection.style.display = "none";

    if (data.role === "admin") {
      if (switchToAdminBtn) switchToAdminBtn.style.display = "inline-block";
      if (userSection) userSection.style.display = "none";
      if (adminSection) adminSection.style.display = "block";

      if (adminFilterDate) {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
        adminFilterDate.value = today;
      }

      await loadAdminDashboard();
    } else {
      if (switchToAdminBtn) switchToAdminBtn.style.display = "none";
      if (adminSection) adminSection.style.display = "none";
      if (userSection) userSection.style.display = "block";

      await loadAttendanceHistory();
      await loadTodayStatus();
    }
  } catch (err) {
    console.error("Crash di loadUserProfile:", err);
  }
}

// ==============================
// LOAD TODAY STATUS
// ==============================
async function loadTodayStatus() {
  if (!todayStatus) return;
  todayStatus.innerHTML = "<p>Memuat status...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  const today = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const { data, error } = await supabase
    .from("attendance")
    .select("attendance_date, check_in, status")
    .eq("employee_id", user.id)
    .eq("attendance_date", today)
    .maybeSingle();

  if (error) {
    todayStatus.innerHTML = "<p>Gagal memuat status hari ini.</p>";
    return;
  }

  if (!data) {
    todayStatus.innerHTML = "<p>Belum melakukan absensi hari ini.</p>";
    if (checkInButton) {
      checkInButton.textContent = "ABSEN MANUAL";
      checkInButton.disabled = false;
    }
    return;
  }

  const time = new Date(data.check_in).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta"
  });

  const statusText = data.status === "late" ? "Late" : "Present";

  todayStatus.innerHTML = `
    <p>✓ Sudah absen</p>
    <p>Waktu: ${time} WIB</p>
    <p>Status: ${statusText}</p>
  `;

  if (checkInButton) {
    checkInButton.textContent = "SUDAH ABSEN HARI INI";
    checkInButton.disabled = true;
  }
}

// ==============================
// LOAD ATTENDANCE HISTORY
// ==============================
async function loadAttendanceHistory() {
  if (!attendanceHistory) return;
  attendanceHistory.innerHTML = "<p>Memuat riwayat...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("attendance")
    .select("attendance_date, check_in, status")
    .eq("employee_id", user.id)
    .order("attendance_date", { ascending: false });

  if (error || !data || data.length === 0) {
    attendanceHistory.innerHTML = "<p>Belum ada riwayat absensi.</p>";
    return;
  }

  attendanceHistory.innerHTML = "";

  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta"
    });

    const time = new Date(row.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta"
    });

    const status = row.status === "late" ? "Late" : "Present";
    const item = document.createElement("p");
    item.textContent = `${date} | ${time} WIB | ${status}`;

    attendanceHistory.appendChild(item);
  });
}

// ==============================
// LOGIKA SCANNER KAMERA & FETCHING ABSENSI
// ==============================
if (openScannerBtn) {
  openScannerBtn.addEventListener("click", () => {
    if (scannerModal) scannerModal.style.display = "flex";
    
    html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      onScanSuccess,
      onScanFailure
    );
  });
}

if (closeScannerBtn) {
  closeScannerBtn.addEventListener("click", () => {
    stopScanner();
  });
}

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      html5QrcodeScanner.clear();
      if (scannerModal) scannerModal.style.display = "none";
    }).catch(() => {
      if (scannerModal) scannerModal.style.display = "none";
    });
  } else {
    if (scannerModal) scannerModal.style.display = "none";
  }
}

async function onScanSuccess(decodedText) {
  stopScanner();
  
  try {
    const data = JSON.parse(decodedText);
    const currentUnix = Math.floor(Date.now() / 1000);
    const currentBlock = Math.floor(currentUnix / 15);

    // Verifikasi Token QR Kios & Toleransi Waktu (1 block / 15 detik)
    if (data.secret === KIOSK_SECRET && Math.abs(currentBlock - data.block) <= 1) {
      if (attendanceMessage) attendanceMessage.textContent = "Verifikasi QR Berhasil! Memproses absensi...";
      
      // FETCHING LANGSUNG KE SUPABASE RPC
      const { data: rpcData, error } = await supabase.rpc("check_in");

      if (error) {
        alert("Absensi gagal: " + error.message);
        return;
      }

      if (!rpcData.success) {
        alert(rpcData.message);
        return;
      }

      alert("Absensi Berhasil!");
      await loadTodayStatus();
      await loadAttendanceHistory();

    } else {
      alert("QR Code tidak valid atau sudah kedaluwarsa! Silakan scan ulang di layar lokasi.");
    }
  } catch (err) {
    alert("Format QR Code tidak dikenali!");
  }
}

function onScanFailure(error) {
  // Biarkan kosong untuk pencarian frame konstan
}

// ==============================
// CHECK IN MANUAL (BACKUP)
// ==============================
if (checkInButton) {
  checkInButton.addEventListener("click", async () => {
    checkInButton.disabled = true;
    if (attendanceMessage) attendanceMessage.textContent = "Memproses absensi...";

    const { data, error } = await supabase.rpc("check_in");

    if (error || !data.success) {
      if (attendanceMessage) attendanceMessage.textContent = data ? data.message : error.message;
      checkInButton.disabled = false;
      return;
    }

    const time = new Date(data.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta"
    });

    if (attendanceMessage) attendanceMessage.textContent = "Absensi berhasil! Waktu: " + time;

    await loadTodayStatus();
    await loadAttendanceHistory();
  });
}

// ==============================
// TAB SWITCHER ADMIN
// ==============================
if (tabRekapBtn && tabKaryawanBtn) {
  tabRekapBtn.addEventListener("click", (e) => {
    e.preventDefault();
    adminViewRekap.style.display = "block";
    adminViewKaryawan.style.display = "none";
    tabRekapBtn.classList.add("active");
    tabKaryawanBtn.classList.remove("active");
  });

  tabKaryawanBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    adminViewRekap.style.display = "none";
    adminViewKaryawan.style.display = "block";
    tabKaryawanBtn.classList.add("active");
    tabRekapBtn.classList.remove("active");
    await loadEmployeeManagement();
  });
}

// ==============================
// RENDER KELOLA MEMBER
// ==============================
async function loadEmployeeManagement() {
  if (!adminEmployeeList) return;
  adminEmployeeList.innerHTML = "<p>Memuat daftar member...</p>";

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, employee_code, role, is_active")
    .order("name", { ascending: true });

  if (error) {
    adminEmployeeList.innerHTML = "<p>Gagal memuat data member.</p>";
    return;
  }

  adminEmployeeList.innerHTML = "";

  data.forEach((emp) => {
    const isActive = emp.is_active !== false;
    const statusBadge = isActive 
      ? `<span class="badge-active">Aktif</span>` 
      : `<span class="badge-inactive">Nonaktif</span>`;

    const roleBadge = emp.role === "admin"
      ? `<span class="role-badge role-admin">ADMIN</span>`
      : `<span class="role-badge role-user">MEMBER</span>`;

    const initial = emp.name ? emp.name.charAt(0).toUpperCase() : "M";

    const card = document.createElement("div");
    card.className = "emp-card-item";
    
    card.innerHTML = `
      <div class="emp-info-wrapper">
        <div class="emp-avatar">${initial}</div>
        <div class="emp-details">
          <div class="emp-name-row">
            <span class="emp-name-text">${emp.name}</span>
            ${roleBadge}
            ${statusBadge}
          </div>
          <div class="emp-code-sub">Kode Member: <strong>${emp.employee_code}</strong></div>
        </div>
      </div>
      <button class="edit-btn-style" type="button">Edit</button>
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

// ==============================
// MODAL ACTIONS (EDIT MEMBER)
// ==============================
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
    const active = editEmpActive.value === "true";

    if (!name || !code) {
      editModalMsg.textContent = "Nama dan Kode Member wajib diisi.";
      return;
    }

    editModalMsg.textContent = "Menyimpan...";

    const { data, error } = await supabase.rpc("admin_update_employee", {
      target_id: id,
      new_name: name,
      new_code: code,
      new_role: role,
      new_active: active
    });

    if (error || (data && !data.success)) {
      editModalMsg.textContent = "Gagal update: " + (error ? error.message : data.message);
      return;
    }

    editEmpModal.style.display = "none";
    await loadEmployeeManagement();
    await loadAdminDashboard();
  });
}

// ==============================
// FITUR EXPORT REKAP TO .XLSX
// ==============================
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", async () => {
    const selectedDate = adminFilterDate && adminFilterDate.value 
      ? adminFilterDate.value 
      : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    
    const { data: attData, error: attErr } = await supabase
      .from("attendance")
      .select("employee_id, attendance_date, check_in, status")
      .eq("attendance_date", selectedDate);

    if (attErr || !attData || attData.length === 0) {
      alert("Tidak ada data absensi untuk diexport pada tanggal ini.");
      return;
    }

    const { data: empData } = await supabase.from("employees").select("id, name, employee_code");
    const empMap = {};
    if (empData) empData.forEach(e => empMap[e.id] = e);

    const excelRows = attData.map((row, index) => {
      const emp = empMap[row.employee_id] || { name: "Unknown", employee_code: "-" };
      const time = new Date(row.check_in).toLocaleTimeString("id-ID", { 
        hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" 
      });

      return {
        "No": index + 1,
        "Tanggal": row.attendance_date,
        "Kode Member": emp.employee_code,
        "Nama Member": emp.name,
        "Waktu Absen (WIB)": time,
        "Status": row.status === "late" ? "Late" : "Present"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absensi");
    worksheet["!cols"] = [{ wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 25 }, { wch: 20 }, { wch: 12 }];

    XLSX.writeFile(workbook, `Rekap_Absensi_Vihara_${selectedDate}.xlsx`);
  });
}

// ==============================
// LOAD ADMIN DASHBOARD
// ==============================
async function loadAdminDashboard() {
  if (!adminAttendanceList) return;
  adminAttendanceList.innerHTML = "<p>Memuat rekap absensi...</p>";

  const selectedDate = adminFilterDate && adminFilterDate.value 
    ? adminFilterDate.value 
    : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  const selectedStatus = adminFilterStatus ? adminFilterStatus.value : "ALL";

  const { count: totalEmpCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true });

  if (statTotal) statTotal.textContent = totalEmpCount || 0;

  let query = supabase
    .from("attendance")
    .select("employee_id, attendance_date, check_in, status")
    .eq("attendance_date", selectedDate)
    .order("check_in", { ascending: true });

  if (selectedStatus !== "ALL") query = query.eq("status", selectedStatus);

  const { data: attendanceData, error: attError } = await query;

  if (attError) {
    adminAttendanceList.innerHTML = "<p>Gagal memuat rekap absensi.</p>";
    return;
  }

  if (statPresent) statPresent.textContent = attendanceData ? attendanceData.length : 0;

  if (!attendanceData || attendanceData.length === 0) {
    adminAttendanceList.innerHTML = `<p>Belum ada data absensi untuk tanggal <strong>${selectedDate}</strong>.</p>`;
    return;
  }

  const { data: employeesData } = await supabase.from("employees").select("id, name, employee_code");
  const empMap = {};
  if (employeesData) employeesData.forEach((emp) => empMap[emp.id] = emp);

  adminAttendanceList.innerHTML = "";

  attendanceData.forEach((row) => {
    const time = new Date(row.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta"
    });

    const isLate = row.status === "late";
    const statusBadge = isLate 
      ? `<span class="badge-late">Late</span>` 
      : `<span class="badge-present">Present</span>`;

    const empInfo = empMap[row.employee_id];
    const empName = empInfo ? empInfo.name : "Member";
    const empCode = empInfo ? empInfo.employee_code : "-";

    const card = document.createElement("div");
    card.className = "attendance-card-item";
    card.innerHTML = `
      <div>
        <span class="emp-name">${empName}</span>
        <span class="emp-code">(${empCode})</span>
        <div class="time-info">⏰ Waktu: <strong>${time} WIB</strong></div>
      </div>
      <div>${statusBadge}</div>
    `;

    adminAttendanceList.appendChild(card);
  });
}

// ==============================
// SWITCHER & LOGOUT LISTENERS
// ==============================
if (switchToUserBtn) {
  switchToUserBtn.addEventListener("click", async () => {
    if (adminSection) adminSection.style.display = "none";
    if (userSection) userSection.style.display = "block";
    await loadAttendanceHistory();
    await loadTodayStatus();
  });
}

if (switchToAdminBtn) {
  switchToAdminBtn.addEventListener("click", async () => {
    if (userSection) userSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";
    await loadAdminDashboard();
  });
}

const handleLogout = async () => {
  await supabase.auth.signOut();
  if (loginSection) loginSection.style.display = "block";
  if (userSection) userSection.style.display = "none";
  if (adminSection) adminSection.style.display = "none";
  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (message) message.textContent = "";
};

if (logoutButton) logoutButton.addEventListener("click", handleLogout);
if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", handleLogout);

if (adminFilterDate) adminFilterDate.addEventListener("change", async () => await loadAdminDashboard());
if (adminFilterStatus) adminFilterStatus.addEventListener("change", async () => await loadAdminDashboard());

setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && userSection && userSection.style.display !== "none") {
    await loadTodayStatus();
  }
}, 60000);