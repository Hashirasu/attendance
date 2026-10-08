import { supabase, getFirstName } from "./app.js";

const DEFAULT_AVATAR = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
let currentUserId = null;
let currentUserRole = "user";
let quillEditor = null;

export async function initFeedSystem() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    currentUserId = null;
    currentUserRole = "user";
    return;
  }
  currentUserId = user.id;

  // 1. Ambil Role Pengguna Langsung
  const { data: emp } = await supabase
    .from("employees")
    .select("role")
    .eq("id", currentUserId)
    .maybeSingle();

  if (emp) currentUserRole = emp.role;

  // 2. Tampilkan/Sembunyikan Form Upload
  const editorContainer = document.getElementById("post-editor-container");
  const isManagement = (currentUserRole === "admin" || currentUserRole === "adm1n" || currentUserRole === "pengurus");

  if (editorContainer) {
    if (isManagement) {
      editorContainer.style.display = "block";
      setTimeout(() => initQuillEditor(), 100);
    } else {
      editorContainer.style.display = "none";
    }
  }

  // 3. Muat Postingan Langsung Tanpa Perlu Refresh
  await loadRecentFeed();
  await loadFullFeed();
  setupFeedRealtime();
}

function initQuillEditor() {
  const container = document.getElementById("quill-editor");
  if (!container) return;

  // Bersihkan editor lama jika sudah diinisialisasi
  const parent = container.parentElement;
  if (parent) {
    const existingToolbar = parent.querySelector('.ql-toolbar');
    if (existingToolbar) existingToolbar.remove();
  }

  if (!quillEditor) {
    quillEditor = new Quill("#quill-editor", {
      theme: "snow",
      placeholder: "Tulis isi pengumuman atau postingan...",
      modules: {
        toolbar: [
          [{ 'header': [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          ['image', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['clean']
        ]
      }
    });
  }
}

async function loadRecentFeed() {
  const container = document.getElementById("recent-feed-container");
  if (!container) return;

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, employees(name, avatar_url, role)")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !posts || posts.length === 0) {
    container.innerHTML = `<p style="color: var(--text-sub); text-align: center; padding: 20px;">Belum ada postingan terbaru.</p>`;
    return;
  }

  container.innerHTML = "";
  for (const p of posts) {
    const card = await renderPostCard(p, false);
    container.appendChild(card);
  }
}

async function loadFullFeed() {
  const container = document.getElementById("full-feed-container");
  if (!container) return;

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, employees(name, avatar_url, role)")
    .order("created_at", { ascending: false });

  if (error || !posts || posts.length === 0) {
    container.innerHTML = `<p style="color: var(--text-sub); text-align: center; padding: 20px;">Belum ada postingan di forum.</p>`;
    return;
  }

  container.innerHTML = "";
  for (const p of posts) {
    const card = await renderPostCard(p, true);
    container.appendChild(card);
  }
}

async function renderPostCard(post, withComments = true) {
  const emp = post.employees || {};
  const authorRole = emp.role || "user";

  // Penentuan Nama Penulis: Jika bukan admin/adm1n/pengurus, maka tampilkan "Humas Mudiviva"
  let authorDisplayName = "Humas Mudiviva";
  if (authorRole === "admin" || authorRole === "adm1n" || authorRole === "pengurus") {
    authorDisplayName = getFirstName(emp.name);
  }

  const avatar = (emp.avatar_url && emp.avatar_url.trim() !== "") ? emp.avatar_url : DEFAULT_AVATAR;
  const postDate = new Date(post.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const isAuthor = post.author_id === currentUserId;
  const isAdmin = (currentUserRole === "admin" || currentUserRole === "adm1n" || currentUserRole === "pengurus");

  const card = document.createElement("div");
  card.className = "post-card";
  card.setAttribute("data-post-id", post.id);

  // Tombol Edit & Hapus dengan styling modern dan rapi
  let actionsHTML = "";
  if (isAuthor || isAdmin) {
    actionsHTML = `
      <div class="post-action-buttons" style="display: flex; gap: 8px; align-items: center;">
        <button class="btn-edit-post" data-id="${post.id}" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.05); color: #e2e8f0; cursor: pointer; transition: all 0.2s ease;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Edit
        </button>
        <button class="btn-delete-post" data-id="${post.id}" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.12); color: #f87171; cursor: pointer; transition: all 0.2s ease;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Hapus
        </button>
      </div>
    `;
  }

  let commentsContainerHTML = "";
  if (withComments) {
    commentsContainerHTML = `
      <div class="comments-wrapper">
        <h5 style="font-size: 12px; font-weight: 700; color: var(--text-sub); margin-bottom: 8px;">Komentar</h5>
        <div class="comments-list-box" id="comments-box-${post.id}">
          <p style="font-size: 11px; color: var(--text-sub);">Memuat komentar...</p>
        </div>
        <div class="comment-input-box">
          <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Tulis komentar...">
          <button class="btn-send-comment" data-post-id="${post.id}">Kirim</button>
        </div>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="post-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div class="post-author-box" style="display: flex; align-items: center; gap: 10px;">
        <img src="${avatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" alt="Avatar" onerror="this.src='${DEFAULT_AVATAR}'">
        <div>
          <div class="post-author-name" style="font-weight: 700; font-size: 14px;">${authorDisplayName}</div>
          <div class="post-date" style="font-size: 11px; color: var(--text-sub);">${postDate} WIB</div>
        </div>
      </div>
      ${actionsHTML}
    </div>
    <h3 class="post-title">${post.title}</h3>
    <div class="post-body-content">${post.content}</div>
    ${commentsContainerHTML}
  `;

  if (withComments) {
    loadPostComments(post.id, card.querySelector(`#comments-box-${post.id}`));
  }

  return card;
}

async function loadPostComments(postId, boxElement) {
  if (!boxElement) return;

  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("*, employees(name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error || !comments || comments.length === 0) {
    boxElement.innerHTML = `<p style="font-size: 11px; color: var(--text-sub);">Belum ada komentar.</p>`;
    return;
  }

  boxElement.innerHTML = "";
  comments.forEach(c => {
    const cEmp = c.employees || {};
    const cFirstName = getFirstName(cEmp.name);
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <div class="comment-author">${cFirstName}</div>
      <div class="comment-text">${c.comment_text}</div>
    `;
    boxElement.appendChild(item);
  });
}

// SUBMIT POSTINGAN
const btnSubmitPost = document.getElementById("btn-submit-post");
const btnCancelEditPost = document.getElementById("btn-cancel-edit-post");
const postTitleInput = document.getElementById("post-title-input");
const editPostIdVal = document.getElementById("edit-post-id-val");

if (btnSubmitPost) {
  btnSubmitPost.addEventListener("click", async () => {
    const title = postTitleInput.value.trim();
    const content = quillEditor ? quillEditor.root.innerHTML.trim() : "";
    const postId = editPostIdVal.value;

    if (!title || !content || content === "<p><br></p>") {
      alert("Judul dan isi postingan wajib diisi!");
      return;
    }

    btnSubmitPost.disabled = true;
    btnSubmitPost.textContent = "Mengunggah...";

    try {
      if (postId) {
        const { error } = await supabase.from("posts").update({ title, content }).eq("id", postId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert({
          author_id: currentUserId,
          title,
          content
        });
        if (error) throw error;
      }

      postTitleInput.value = "";
      if (quillEditor) quillEditor.setContents([]);
      editPostIdVal.value = "";
      if (btnCancelEditPost) btnCancelEditPost.style.display = "none";

      await loadRecentFeed();
      await loadFullFeed();
    } catch (err) {
      alert("Gagal posting: " + err.message);
    } finally {
      btnSubmitPost.textContent = "🚀 Unggah Postingan";
      btnSubmitPost.disabled = false;
    }
  });
}

if (btnCancelEditPost) {
  btnCancelEditPost.addEventListener("click", () => {
    postTitleInput.value = "";
    if (quillEditor) quillEditor.setContents([]);
    editPostIdVal.value = "";
    btnCancelEditPost.style.display = "none";
    if (btnSubmitPost) btnSubmitPost.textContent = "🚀 Unggah Postingan";
  });
}

document.addEventListener("click", async (e) => {
  const targetEdit = e.target.closest(".btn-edit-post");
  const targetDelete = e.target.closest(".btn-delete-post");
  const targetComment = e.target.closest(".btn-send-comment");

  if (targetComment) {
    const postId = targetComment.getAttribute("data-post-id");
    const inputEl = document.getElementById(`comment-input-${postId}`);
    const text = inputEl ? inputEl.value.trim() : "";

    if (!text) return;

    inputEl.value = "";
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: currentUserId,
      comment_text: text
    });

    if (!error) {
      const box = document.getElementById(`comments-box-${postId}`);
      if (box) await loadPostComments(postId, box);
    }
  }

  if (targetDelete) {
    const postId = targetDelete.getAttribute("data-id");
    if (confirm("Yakin hapus postingan ini?")) {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (!error) {
        await loadRecentFeed();
        await loadFullFeed();
      }
    }
  }

  if (targetEdit) {
    const postId = targetEdit.getAttribute("data-id");
    const { data: p } = await supabase.from("posts").select("*").eq("id", postId).single();
    if (p) {
      editPostIdVal.value = p.id;
      postTitleInput.value = p.title;
      if (quillEditor) quillEditor.root.innerHTML = p.content;
      if (btnCancelEditPost) btnCancelEditPost.style.display = "inline-block";
      if (btnSubmitPost) btnSubmitPost.textContent = "💾 Simpan Perubahan";
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
});

const btnRefreshFeed = document.getElementById("btn-refresh-feed");
if (btnRefreshFeed) {
  btnRefreshFeed.addEventListener("click", async () => {
    await loadRecentFeed();
    await loadFullFeed();
  });
}

function setupFeedRealtime() {
  supabase
    .channel("feed-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, async () => {
      await loadRecentFeed();
      await loadFullFeed();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, async (payload) => {
      const postId = payload.new ? payload.new.post_id : payload.old ? payload.old.post_id : null;
      if (postId) {
        const box = document.getElementById(`comments-box-${postId}`);
        if (box) await loadPostComments(postId, box);
      }
    })
    .subscribe();
}

window.initFeedSystem = initFeedSystem;