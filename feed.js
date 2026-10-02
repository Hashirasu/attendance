import { supabase } from "./app.js";

let quill = null;
let currentUserId = null;
let currentUserName = "Member";
let currentUserRole = "user";
let currentUserAvatar = "";
let editingPostId = null;

let postsChannel = null;
let commentsChannel = null;
let quotesChannel = null;

function initQuillEditor() {
  const editorEl = document.getElementById("quill-editor");
  if (!editorEl || document.querySelector('.ql-toolbar')) return;

  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Tulis isi pengumuman...',
    modules: { toolbar: [['bold', 'italic', 'underline'], ['link', 'image'], ['clean']] }
  });
}

export async function initFeedSystem() {
  initQuillEditor();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  currentUserId = session.user.id;

  const { data: empData } = await supabase.from("employees").select("name, role, avatar_url").eq("id", currentUserId).single();
  if (empData) {
    currentUserName = empData.name;
    currentUserRole = empData.role;
    currentUserAvatar = empData.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${empData.name}`;

    const canUpload = (currentUserRole === "pengurus" || currentUserRole === "admin" || currentUserRole === "adm1n");
    const postEditor = document.getElementById("post-editor-container");
    if (postEditor) postEditor.style.display = canUpload ? "block" : "none";
  }

  await loadDailyQuote();
  await loadFeedPosts();
  setupRealtimeSubscriptions();
}

function setupRealtimeSubscriptions() {
  if (postsChannel) supabase.removeChannel(postsChannel);
  if (commentsChannel) supabase.removeChannel(commentsChannel);
  if (quotesChannel) supabase.removeChannel(quotesChannel);

  postsChannel = supabase.channel('public:posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadFeedPosts).subscribe();
  commentsChannel = supabase.channel('public:comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (p) => loadCommentsForPost(p.new?.post_id)).subscribe();
  quotesChannel = supabase.channel('public:quotes').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_quotes' }, loadDailyQuote).subscribe();
}

window.initFeedSystem = initFeedSystem;

async function loadDailyQuote() {
  const { data } = await supabase.from("daily_quotes").select("quote_text, quote_source").eq("id", 1).maybeSingle();
  if (data) {
    document.getElementById("display-quote-text").textContent = `"${data.quote_text}"`;
    document.getElementById("display-quote-source").textContent = `— ${data.quote_source}`;
  }
}

async function loadFeedPosts() {
  const recentContainer = document.getElementById("recent-feed-container");
  const fullContainer = document.getElementById("full-feed-container");

  // Ambil postingan sekaligus join ke tabel employees untuk mendapatkan foto profil terbaru penulis
  const { data: posts } = await supabase
    .from("posts")
    .select("*, employees(avatar_url)")
    .order("created_at", { ascending: false });

  if (!posts || posts.length === 0) {
    const empty = "<p style='color: var(--text-sub); text-align: center; padding: 20px;'>Belum ada postingan.</p>";
    if (recentContainer) recentContainer.innerHTML = empty;
    if (fullContainer) fullContainer.innerHTML = empty;
    return;
  }

  if (recentContainer) {
    recentContainer.innerHTML = "";
    posts.slice(0, 3).forEach(p => recentContainer.appendChild(createPostCardElement(p)));
  }
  if (fullContainer) {
    fullContainer.innerHTML = "";
    posts.forEach(p => fullContainer.appendChild(createPostCardElement(p)));
  }
}

function createPostCardElement(post) {
  const postCard = document.createElement("div");
  postCard.className = "post-card";
  const dateFormatted = new Date(post.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const isManagement = (currentUserRole === "pengurus" || currentUserRole === "admin" || currentUserRole === "adm1n");
  const displayAuthorName = isManagement ? post.author_name : "Humas Mudiviva";
  
  // AMBIL FOTO PROFIL ASLI DARI TABEL EMPLOYEES
  const authorAvatarUrl = (post.employees && post.employees.avatar_url) ? post.employees.avatar_url : `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author_name}`;

  postCard.innerHTML = `
    <div class="post-header">
      <div class="post-author-box">
        <img src="${authorAvatarUrl}" alt="Avatar" class="post-avatar-img" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
        <div>
          <div class="post-author-name">${displayAuthorName}</div>
          <div class="post-date">${dateFormatted} WIB</div>
        </div>
      </div>
    </div>
    <div class="post-title">${post.title}</div>
    <div class="post-body-content">${post.content}</div>

    <div class="comments-wrapper">
      <div id="comments-list-${post.id}" class="comments-list"></div>
      <div class="comment-input-box">
        <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="Tulis komentar...">
        <button class="btn-send-comment" data-postid="${post.id}">Kirim</button>
      </div>
    </div>
  `;

  postCard.querySelector(".btn-send-comment").addEventListener("click", async () => {
    const input = postCard.querySelector(`#comment-input-${post.id}`);
    const text = input.value.trim();
    if (!text) return;
    await supabase.from("comments").insert({ post_id: post.id, user_id: currentUserId, user_name: currentUserName, comment_text: text });
    input.value = "";
    loadCommentsForPost(post.id);
  });

  loadCommentsForPost(post.id);
  return postCard;
}

async function loadCommentsForPost(postId) {
  const commentListEls = document.querySelectorAll(`#comments-list-${postId}`);
  if (!commentListEls.length) return;

  const { data: comments } = await supabase.from("comments").select("*, employees(avatar_url)").eq("post_id", postId).order("created_at", { ascending: true });

  commentListEls.forEach(el => {
    if (!comments || comments.length === 0) { el.innerHTML = ""; return; }
    el.innerHTML = "";
    comments.forEach(c => {
      const cAvatar = (c.employees && c.employees.avatar_url) ? c.employees.avatar_url : `https://api.dicebear.com/7.x/bottts/svg?seed=${c.user_name}`;
      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <img src="${cAvatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
          <span class="comment-author">${c.user_name}</span>
        </div>
        <div class="comment-text" style="padding-left: 32px;">${c.comment_text}</div>
      `;
      el.appendChild(item);
    });
  });
}

const btnSubmitPost = document.getElementById("btn-submit-post");
if (btnSubmitPost) {
  btnSubmitPost.addEventListener("click", async () => {
    const title = document.getElementById("post-title-input").value.trim();
    const content = quill.root.innerHTML;
    if (!title) return;
    await supabase.from("posts").insert({ author_id: currentUserId, author_name: currentUserName, title, content });
    document.getElementById("post-title-input").value = "";
    quill.setContents([]);
    loadFeedPosts();
  });
}

window.addEventListener("DOMContentLoaded", initFeedSystem);