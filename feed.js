import { supabase } from "./app.js";

let quill = null;
let currentUserId = null;
let currentUserName = "Member";
let currentUserRole = "user";

// INISIALISASI QUILL RICH TEXT EDITOR
function initQuillEditor() {
  const editorEl = document.getElementById("quill-editor");
  if (!editorEl) return;

  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Tulis isi pengumuman... Kamu bisa memasukkan gambar via ikon gambar di toolbar.',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ]
    }
  });
}

// LOAD DATA USER & FEED Halaman Home
async function initFeedSystem() {
  initQuillEditor();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  currentUserId = session.user.id;

  // Cek Role User
  const { data: empData } = await supabase
    .from("employees")
    .select("name, role")
    .eq("id", currentUserId)
    .single();

  if (empData) {
    currentUserName = empData.name;
    currentUserRole = empData.role;

    // Tampilkan Form Post HANYA jika Admin / Adm1n
    const adminPostBox = document.getElementById("admin-post-box");
    if (adminPostBox && (currentUserRole === "admin" || currentUserRole === "adm1n")) {
      adminPostBox.style.display = "block";
    }
  }

  await loadFeedPosts();
}

// FUNGSI MEMUAT DAFTAR POSTINGAN FORUM
async function loadFeedPosts() {
  const container = document.getElementById("forum-feed-container");
  if (!container) return;

  container.innerHTML = "<p style='color: var(--text-sub); text-align: center; padding: 15px;'>Memuat postingan...</p>";

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !posts || posts.length === 0) {
    container.innerHTML = "<p style='color: var(--text-sub); text-align: center; padding: 20px; background: var(--card-bg); border-radius: 16px;'>Belum ada pengumuman / postingan.</p>";
    return;
  }

  container.innerHTML = "";

  for (const post of posts) {
    const postCard = document.createElement("div");
    postCard.className = "post-card";

    const dateFormatted = new Date(post.created_at).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    const isAuthorOrAdmin = (currentUserId === post.author_id || currentUserRole === "admin" || currentUserRole === "adm1n");

    postCard.innerHTML = `
      <div class="post-header">
        <div class="post-author-box">
          <div class="post-avatar">${post.author_name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="post-author-name">${post.author_name}</div>
            <div class="post-date">${dateFormatted} WIB</div>
          </div>
        </div>
        ${isAuthorOrAdmin ? `<button class="btn-delete-post secondary-button" style="padding: 2px 8px; font-size: 11px; color: #f87171;" data-id="${post.id}">Hapus</button>` : ''}
      </div>

      <div class="post-title">${post.title}</div>
      <div class="post-body-content">${post.content}</div>

      <!-- SECTION KOMENTAR -->
      <div class="comments-wrapper">
        <div id="comments-list-${post.id}" class="comments-list">
          <p style="font-size: 11px; color: var(--text-sub);">Memuat komentar...</p>
        </div>

        <div class="comment-input-box">
          <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="Tulis komentar...">
          <button class="btn-send-comment" data-postid="${post.id}">Kirim</button>
        </div>
      </div>
    `;

    container.appendChild(postCard);

    // Event Hapus Post
    const deleteBtn = postCard.querySelector(".btn-delete-post");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Yakin ingin menghapus postingan ini?")) {
          await supabase.from("posts").delete().eq("id", post.id);
          await loadFeedPosts();
        }
      });
    }

    // Event Kirim Komentar
    const sendCommentBtn = postCard.querySelector(`.btn-send-comment`);
    if (sendCommentBtn) {
      sendCommentBtn.addEventListener("click", async () => {
        const input = document.getElementById(`comment-input-${post.id}`);
        const commentText = input.value.trim();
        if (!commentText) return;

        await supabase.from("comments").insert({
          post_id: post.id,
          user_id: currentUserId,
          user_name: currentUserName,
          comment_text: commentText
        });

        input.value = "";
        await loadCommentsForPost(post.id);
      });
    }

    // Load Komentar Post Ini
    loadCommentsForPost(post.id);
  }
}

// MEMUAT KOMENTAR PER POSTINGAN
async function loadCommentsForPost(postId) {
  const commentListEl = document.getElementById(`comments-list-${postId}`);
  if (!commentListEl) return;

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) {
    commentListEl.innerHTML = "<p style='font-size: 11px; color: var(--text-sub); margin-bottom: 8px;'>Belum ada komentar.</p>";
    return;
  }

  commentListEl.innerHTML = "";
  comments.forEach(c => {
    const cItem = document.createElement("div");
    cItem.className = "comment-item";
    cItem.innerHTML = `
      <div class="comment-author">${c.user_name}</div>
      <div class="comment-text">${c.comment_text}</div>
    `;
    commentListEl.appendChild(cItem);
  });
}

// EVENT UNGGAH POSTINGAN BARU (KHUSUS ADMIN)
const btnSubmitPost = document.getElementById("btn-submit-post");
if (btnSubmitPost) {
  btnSubmitPost.addEventListener("click", async () => {
    const titleInput = document.getElementById("post-title-input");
    const title = titleInput.value.trim();
    const htmlContent = quill.root.innerHTML;

    if (!title || quill.getText().trim().length === 0) {
      alert("Judul dan isi pengumuman tidak boleh kosong!");
      return;
    }

    btnSubmitPost.textContent = "Mengunggah...";
    btnSubmitPost.disabled = true;

    const { error } = await supabase.from("posts").insert({
      author_id: currentUserId,
      author_name: currentUserName,
      title: title,
      content: htmlContent
    });

    if (error) {
      alert("Gagal mengunggah: " + error.message);
    } else {
      titleInput.value = "";
      quill.setContents([]);
      await loadFeedPosts();
    }

    btnSubmitPost.textContent = "🚀 Unggah Postingan";
    btnSubmitPost.disabled = false;
  });
}

const btnRefreshFeed = document.getElementById("btn-refresh-feed");
if (btnRefreshFeed) {
  btnRefreshFeed.addEventListener("click", loadFeedPosts);
}

// Jalankan Inisialisasi Feed saat DOM Siap
window.addEventListener("DOMContentLoaded", initFeedSystem);