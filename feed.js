import { supabase } from "./app.js";

let quill = null;
let currentUserId = null;
let currentUserName = "Member";
let currentUserRole = "user";
let editingPostId = null;

// INIT QUILL EDITOR
function initQuillEditor() {
  const editorEl = document.getElementById("quill-editor");
  if (!editorEl) return;

  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Tulis isi pengumuman... Kamu bisa memasukkan foto via ikon gambar di toolbar.',
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

// INSIALISASI SISTEM FORUM FEED & REALTIME SUBSCRIPTION
async function initFeedSystem() {
  initQuillEditor();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  currentUserId = session.user.id;

  const { data: empData } = await supabase
    .from("employees")
    .select("name, role")
    .eq("id", currentUserId)
    .single();

  if (empData) {
    currentUserName = empData.name;
    currentUserRole = empData.role;

    // UPLOAD POSTINGAN: BISA UNTUK Pengurus, Admin, DAN Adm1n
    const canUploadPost = (currentUserRole === "pengurus" || currentUserRole === "admin" || currentUserRole === "adm1n");
    const postEditorContainer = document.getElementById("post-editor-container");

    if (postEditorContainer && canUploadPost) {
      postEditorContainer.style.display = "block";
    }

    // EDIT PERENUNGAN HARI INI: HANYA UNTUK Admin DAN Adm1n
    const canEditQuote = (currentUserRole === "admin" || currentUserRole === "adm1n");
    const editQuoteBtn = document.getElementById("btn-edit-quote-trigger");

    if (editQuoteBtn && canEditQuote) {
      editQuoteBtn.style.display = "inline-block";
    }
  }

  await loadDailyQuote();
  await loadFeedPosts();

  // REALTIME SUBSCRIPTIONS
  supabase
    .channel('public:posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      loadFeedPosts();
    })
    .subscribe();

  supabase
    .channel('public:comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
      if (payload.new && payload.new.post_id) {
        loadCommentsForPost(payload.new.post_id);
      } else {
        loadFeedPosts();
      }
    })
    .subscribe();

  supabase
    .channel('public:daily_quotes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_quotes' }, () => {
      loadDailyQuote();
    })
    .subscribe();
}

// MEMUAT & SINKRONISASI PERENUNGAN HARI INI
async function loadDailyQuote() {
  const quoteTextEl = document.getElementById("display-quote-text");
  const quoteSourceEl = document.getElementById("display-quote-source");
  if (!quoteTextEl || !quoteSourceEl) return;

  const { data } = await supabase
    .from("daily_quotes")
    .select("quote_text, quote_source")
    .eq("id", 1)
    .maybeSingle();

  if (data) {
    quoteTextEl.textContent = `"${data.quote_text}"`;
    quoteSourceEl.textContent = `— ${data.quote_source}`;
  }
}

// FUNGSI RENDER POSTINGAN UNTUK HOME (RECENT) & FULL POSTS TAB
async function loadFeedPosts() {
  const recentContainer = document.getElementById("recent-feed-container");
  const fullContainer = document.getElementById("full-feed-container");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !posts || posts.length === 0) {
    const emptyHtml = "<p style='color: var(--text-sub); text-align: center; padding: 20px; background: var(--card-bg); border-radius: 16px;'>Belum ada postingan.</p>";
    if (recentContainer) recentContainer.innerHTML = emptyHtml;
    if (fullContainer) fullContainer.innerHTML = emptyHtml;
    return;
  }

  if (recentContainer) {
    recentContainer.innerHTML = "";
    const recentPosts = posts.slice(0, 3); // Hanya 3 postingan terbaru untuk Home
    recentPosts.forEach(post => {
      recentContainer.appendChild(createPostCardElement(post));
    });
  }

  if (fullContainer) {
    fullContainer.innerHTML = "";
    posts.forEach(post => {
      fullContainer.appendChild(createPostCardElement(post));
    });
  }
}

// MEMBUAT ELEMEN KARTU POSTINGAN
function createPostCardElement(post) {
  const postCard = document.createElement("div");
  postCard.className = "post-card";

  const dateFormatted = new Date(post.created_at).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const isManagement = (currentUserRole === "pengurus" || currentUserRole === "admin" || currentUserRole === "adm1n");
  const isAuthorOrAdmin = (currentUserId === post.author_id || isManagement);

  // LOGIKA HUMAS MUDIVIVA:
  // Pengurus/Admin/Adm1n melihat nama asli pembuat post.
  // Anggota biasa (user) hanya melihat "Humas Mudiviva".
  const displayAuthorName = isManagement ? post.author_name : "Humas Mudiviva";

  postCard.innerHTML = `
    <div class="post-header">
      <div class="post-author-box">
        <div class="post-avatar">${displayAuthorName.charAt(0).toUpperCase()}</div>
        <div>
          <div class="post-author-name">${displayAuthorName}</div>
          <div class="post-date">${dateFormatted} WIB</div>
        </div>
      </div>
      ${isAuthorOrAdmin ? `
        <div class="flex-gap-8">
          <button class="btn-edit-post secondary-button" style="padding: 2px 8px; font-size: 11px; color: #60a5fa;" data-id="${post.id}">Edit</button>
          <button class="btn-delete-post secondary-button" style="padding: 2px 8px; font-size: 11px; color: #f87171;" data-id="${post.id}">Hapus</button>
        </div>
      ` : ''}
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

  // EVENT EDIT POST
  const editBtn = postCard.querySelector(".btn-edit-post");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      editingPostId = post.id;
      document.getElementById("edit-post-id-val").value = post.id;
      document.getElementById("post-title-input").value = post.title;
      quill.root.innerHTML = post.content;

      document.getElementById("form-post-heading").textContent = "✏ Edit Postingan Pengumuman";
      document.getElementById("btn-submit-post").textContent = "💾 Simpan Perubahan";
      document.getElementById("btn-cancel-edit-post").style.display = "inline-block";

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // EVENT HAPUS POST
  const deleteBtn = postCard.querySelector(".btn-delete-post");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Yakin ingin menghapus postingan ini?")) {
        await supabase.from("posts").delete().eq("id", post.id);
        await loadFeedPosts();
      }
    });
  }

  // EVENT KIRIM KOMENTAR
  const sendCommentBtn = postCard.querySelector(`.btn-send-comment`);
  if (sendCommentBtn) {
    sendCommentBtn.addEventListener("click", async () => {
      const input = postCard.querySelector(`#comment-input-${post.id}`);
      const commentText = input.value.trim();
      if (!commentText) return;

      await supabase.from("comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        user_name: currentUserName,
        comment_text: commentText
      });

      input.value = "";
      await loadCommentsForPost(post.id, post.author_id);
    });
  }

  loadCommentsForPost(post.id, post.author_id);
  return postCard;
}

// MEMUAT KOMENTAR PER POST DENGAN HAK AKSES HAPUS KOMENTAR
async function loadCommentsForPost(postId, postAuthorId = null) {
  const commentListEls = document.querySelectorAll(`#comments-list-${postId}`);
  if (!commentListEls || commentListEls.length === 0) return;

  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  commentListEls.forEach(commentListEl => {
    if (!comments || comments.length === 0) {
      commentListEl.innerHTML = "<p style='font-size: 11px; color: var(--text-sub); margin-bottom: 8px;'>Belum ada komentar.</p>";
      return;
    }

    commentListEl.innerHTML = "";
    comments.forEach(c => {
      // HAK HAPUS KOMENTAR:
      // Penulis Komentar BISA Hapus, Pembuat Post BISA Hapus, Pengurus/Admin BISA Hapus
      const canDeleteComment = (
        currentUserId === c.user_id || 
        currentUserId === postAuthorId || 
        currentUserRole === "pengurus" || 
        currentUserRole === "admin" || 
        currentUserRole === "adm1n"
      );

      const cItem = document.createElement("div");
      cItem.className = "comment-item";
      cItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="comment-author">${c.user_name}</div>
          ${canDeleteComment ? `<button class="btn-delete-comment" data-cid="${c.id}">Hapus</button>` : ''}
        </div>
        <div class="comment-text">${c.comment_text}</div>
      `;

      const delBtn = cItem.querySelector(".btn-delete-comment");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (confirm("Hapus komentar ini?")) {
            await supabase.from("comments").delete().eq("id", c.id);
            await loadCommentsForPost(postId, postAuthorId);
          }
        });
      }

      commentListEl.appendChild(cItem);
    });
  });
}

// EVENT UNGGAH / EDIT POSTINGAN
const btnSubmitPost = document.getElementById("btn-submit-post");
const btnCancelEditPost = document.getElementById("btn-cancel-edit-post");

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

    if (editingPostId) {
      const { error } = await supabase.from("posts").update({
        title: title,
        content: htmlContent
      }).eq("id", editingPostId);

      if (error) alert("Gagal update: " + error.message);
      else resetPostForm();
    } else {
      const { error } = await supabase.from("posts").insert({
        author_id: currentUserId,
        author_name: currentUserName,
        title: title,
        content: htmlContent
      });

      if (error) alert("Gagal mengunggah: " + error.message);
      else resetPostForm();
    }

    btnSubmitPost.disabled = false;
    await loadFeedPosts();
  });
}

function resetPostForm() {
  editingPostId = null;
  document.getElementById("edit-post-id-val").value = "";
  document.getElementById("post-title-input").value = "";
  quill.setContents([]);
  document.getElementById("form-post-heading").textContent = "📢 Buat Pengumuman / Postingan Baru";
  document.getElementById("btn-submit-post").textContent = "🚀 Unggah Postingan";
  if (btnCancelEditPost) btnCancelEditPost.style.display = "none";
}

if (btnCancelEditPost) {
  btnCancelEditPost.addEventListener("click", resetPostForm);
}

const btnRefreshFeed = document.getElementById("btn-refresh-feed");
if (btnRefreshFeed) {
  btnRefreshFeed.addEventListener("click", loadFeedPosts);
}

// LOGIKA MODAL EDIT PERENUNGAN HARI INI
const btnEditQuoteTrigger = document.getElementById("btn-edit-quote-trigger");
const editQuoteModal = document.getElementById("edit-quote-modal");
const editQuoteTextInput = document.getElementById("edit-quote-text-input");
const editQuoteSourceInput = document.getElementById("edit-quote-source-input");
const cancelEditQuote = document.getElementById("cancel-edit-quote");
const saveEditQuote = document.getElementById("save-edit-quote");
const editQuoteModalMsg = document.getElementById("edit-quote-modal-msg");

if (btnEditQuoteTrigger) {
  btnEditQuoteTrigger.addEventListener("click", async () => {
    const { data } = await supabase.from("daily_quotes").select("*").eq("id", 1).maybeSingle();
    if (data) {
      editQuoteTextInput.value = data.quote_text;
      editQuoteSourceInput.value = data.quote_source;
    }
    editQuoteModalMsg.textContent = "";
    editQuoteModal.style.display = "flex";
  });
}

if (cancelEditQuote) {
  cancelEditQuote.addEventListener("click", () => editQuoteModal.style.display = "none");
}

if (saveEditQuote) {
  saveEditQuote.addEventListener("click", async () => {
    const text = editQuoteTextInput.value.trim();
    const source = editQuoteSourceInput.value.trim();

    if (!text || !source) {
      editQuoteModalMsg.textContent = "Kutipan dan sumber tidak boleh kosong!";
      return;
    }

    saveEditQuote.textContent = "Menyimpan...";
    const { error } = await supabase.from("daily_quotes").upsert({
      id: 1,
      quote_text: text,
      quote_source: source,
      updated_at: new Date().toISOString()
    });

    if (error) {
      editQuoteModalMsg.textContent = "Gagal menyimpan: " + error.message;
    } else {
      editQuoteModal.style.display = "none";
      await loadDailyQuote();
    }
    saveEditQuote.textContent = "Simpan";
  });
}

// JALANKAN SAAT DOM SIAP
window.addEventListener("DOMContentLoaded", initFeedSystem);