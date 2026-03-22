import { useState, useEffect, useCallback, useRef } from "react";

const MEMBERS = [
  { id: "m1", name: "田中", color: "#1D9E75", initials: "田" },
  { id: "m2", name: "佐藤", color: "#378ADD", initials: "佐" },
  { id: "m3", name: "鈴木", color: "#D85A30", initials: "鈴" },
  { id: "m4", name: "山田", color: "#D4537E", initials: "山" },
  { id: "m5", name: "高橋", color: "#7F77DD", initials: "高" },
];

const PRIORITY = {
  high: { label: "高", bg: "#FCEBEB", color: "#A32D2D", border: "#F09595" },
  medium: { label: "中", bg: "#FAEEDA", color: "#854F0B", border: "#FAC775" },
  low: { label: "低", bg: "#E1F5EE", color: "#0F6E56", border: "#9FE1CB" },
};

const COLUMNS = [
  { id: "todo", label: "未着手", icon: "○", accent: "#B4B2A9" },
  { id: "in_progress", label: "進行中", icon: "◐", accent: "#378ADD" },
  { id: "review", label: "レビュー", icon: "◉", accent: "#BA7517" },
  { id: "done", label: "完了", icon: "●", accent: "#1D9E75" },
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDate = (d) => { if (!d) return ""; const dt = new Date(d); return `${dt.getMonth() + 1}/${dt.getDate()}`; };
const isOverdue = (d) => d ? new Date(d) < new Date(new Date().toDateString()) : false;

const STORAGE_KEY = "team-tasks-v2";
const SAMPLE_TASKS = [
  { id: uid(), title: "Q2レポート作成", desc: "四半期レポートのドラフトを作成する", status: "todo", priority: "high", assignee: "m1", deadline: "2026-03-28", created: Date.now() },
  { id: uid(), title: "デザインレビュー", desc: "新UIのモックアップを確認", status: "in_progress", priority: "medium", assignee: "m2", deadline: "2026-03-25", created: Date.now() },
  { id: uid(), title: "API仕様書更新", desc: "v2エンドポイントの仕様を追記", status: "review", priority: "medium", assignee: "m3", deadline: "2026-03-24", created: Date.now() },
  { id: uid(), title: "テスト環境構築", desc: "CI/CDパイプラインの設定", status: "done", priority: "low", assignee: "m4", deadline: "2026-03-20", created: Date.now() },
  { id: uid(), title: "クライアント打ち合わせ準備", desc: "提案資料とアジェンダの作成", status: "todo", priority: "high", assignee: "m5", deadline: "2026-03-26", created: Date.now() },
];

async function loadShared() {
  try { const r = await window.storage.get(STORAGE_KEY, true); if (r && r.value) return JSON.parse(r.value); } catch {} return null;
}
async function saveShared(tasks) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(tasks), true); } catch (e) { console.error("Save error:", e); }
}

function Avatar({ member, size = 28 }) {
  if (!member) return <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--color-background-tertiary)", border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, color: "var(--color-text-tertiary)", flexShrink: 0 }}>?</div>;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, color: "#fff", fontWeight: 500, flexShrink: 0, letterSpacing: -1 }}>{member.initials}</div>;
}

function PriorityBadge({ priority }) {
  const p = PRIORITY[priority]; if (!p) return null;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: p.bg, color: p.color, border: `1px solid ${p.border}`, fontWeight: 500, whiteSpace: "nowrap" }}>{p.label}</span>;
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", padding: "1.5rem" }}>{children}</div>
    </div>
  );
}

function TaskForm({ task, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(task || { title: "", desc: "", status: "todo", priority: "medium", assignee: "", deadline: "" });
  const isEdit = !!task?.id;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 1.25rem", color: "var(--color-text-primary)" }}>{isEdit ? "タスク編集" : "新規タスク"}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>タイトル</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="タスク名を入力..." style={{ width: "100%", boxSizing: "border-box" }} autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>説明</label>
          <textarea value={form.desc} onChange={e => set("desc", e.target.value)} placeholder="詳細を入力..." rows={3} style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>ステータス</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>{COLUMNS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>優先度</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>担当者</label>
            <select value={form.assignee} onChange={e => set("assignee", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}><option value="">未割り当て</option>{MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>期限</label>
            <input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 8 }}>
        <div>{isEdit && onDelete && <button onClick={() => onDelete(task.id)} style={{ color: "#A32D2D", borderColor: "#F09595" }}>削除</button>}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel}>キャンセル</button>
          <button onClick={() => { if (form.title.trim()) onSave(form); }} style={{ background: "var(--color-text-primary)", color: "var(--color-background-primary)", borderColor: "var(--color-text-primary)" }}>保存</button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }) {
  const member = MEMBERS.find(m => m.id === task.assignee);
  const overdue = isOverdue(task.deadline) && task.status !== "done";
  return (
    <div draggable onDragStart={e => e.dataTransfer.setData("text/plain", task.id)} onClick={() => onClick(task)}
      style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-secondary)"} onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.4, flex: 1 }}>{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.desc && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.desc}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Avatar member={member} size={24} />
        {task.deadline && <span style={{ fontSize: 11, color: overdue ? "#A32D2D" : "var(--color-text-tertiary)", fontWeight: overdue ? 500 : 400, display: "flex", alignItems: "center", gap: 3 }}>
          {overdue && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#E24B4A" }} />}{formatDate(task.deadline)}
        </span>}
      </div>
    </div>
  );
}

function KanbanView({ tasks, onTaskClick, onDrop }) {
  const [dragOver, setDragOver] = useState(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))`, gap: 12, minHeight: 400, overflowX: "auto" }}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id).sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.priority] - ({ high: 0, medium: 1, low: 2 })[b.priority]);
        return (
          <div key={col.id} onDragOver={e => { e.preventDefault(); setDragOver(col.id); }} onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); setDragOver(null); onDrop(e.dataTransfer.getData("text/plain"), col.id); }}
            style={{ background: dragOver === col.id ? "var(--color-background-info)" : "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: 10, minWidth: 180, transition: "background 0.2s", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px 10px", borderBottom: `2px solid ${col.accent}`, marginBottom: 10 }}>
              <span style={{ fontSize: 14, opacity: 0.7 }}>{col.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{col.label}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto", background: "var(--color-background-primary)", borderRadius: 99, padding: "1px 8px" }}>{colTasks.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {colTasks.map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onTaskClick }) {
  const [sortBy, setSortBy] = useState("status");
  const sorted = [...tasks].sort((a, b) => {
    if (sortBy === "priority") return ({ high: 0, medium: 1, low: 2 })[a.priority] - ({ high: 0, medium: 1, low: 2 })[b.priority];
    if (sortBy === "deadline") { if (!a.deadline) return 1; if (!b.deadline) return -1; return new Date(a.deadline) - new Date(b.deadline); }
    if (sortBy === "assignee") return (MEMBERS.find(m => m.id === a.assignee)?.name || "ん").localeCompare(MEMBERS.find(m => m.id === b.assignee)?.name || "ん", "ja");
    return ({ todo: 0, in_progress: 1, review: 2, done: 3 })[a.status] - ({ todo: 0, in_progress: 1, review: 2, done: 3 })[b.status];
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[["status", "ステータス順"], ["priority", "優先度順"], ["deadline", "期限順"], ["assignee", "担当者順"]].map(([k, l]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{ fontSize: 12, padding: "4px 12px", background: sortBy === k ? "var(--color-text-primary)" : "transparent", color: sortBy === k ? "var(--color-background-primary)" : "var(--color-text-secondary)", borderColor: sortBy === k ? "var(--color-text-primary)" : undefined }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sorted.map(task => {
          const member = MEMBERS.find(m => m.id === task.assignee);
          const col = COLUMNS.find(c => c.id === task.status);
          const overdue = isOverdue(task.deadline) && task.status !== "done";
          return (
            <div key={task.id} onClick={() => onTaskClick(task)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-secondary)"} onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
              <span style={{ fontSize: 13, opacity: 0.6, width: 18, textAlign: "center", flexShrink: 0 }}>{col?.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
              <PriorityBadge priority={task.priority} />
              {task.deadline && <span style={{ fontSize: 12, color: overdue ? "#A32D2D" : "var(--color-text-tertiary)", fontWeight: overdue ? 500 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(task.deadline)}</span>}
              <Avatar member={member} size={24} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [view, setView] = useState("kanban");
  const [modal, setModal] = useState(null);
  const [filterMember, setFilterMember] = useState("");
  const [search, setSearch] = useState("");

  const fetchTasks = useCallback(async (showSync = false) => {
    if (showSync) setSyncing(true);
    try {
      const data = await loadShared();
      if (data) { setTasks(data); } else { await saveShared(SAMPLE_TASKS); setTasks(SAMPLE_TASKS); }
      setLastSync(Date.now());
    } catch {} finally { setLoading(false); if (showSync) setSyncing(false); }
  }, []);

  useEffect(() => {
    fetchTasks(false);
    const id = setInterval(() => fetchTasks(true), 15000);
    return () => clearInterval(id);
  }, [fetchTasks]);

  const persist = useCallback(async (newTasks) => {
    setTasks(newTasks); setSyncing(true);
    await saveShared(newTasks);
    setLastSync(Date.now()); setSyncing(false);
  }, []);

  const filtered = tasks.filter(t => {
    if (filterMember && t.assignee !== filterMember) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.desc || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (form) => {
    const newTasks = form.id ? tasks.map(t => t.id === form.id ? { ...t, ...form } : t) : [...tasks, { ...form, id: uid(), created: Date.now() }];
    await persist(newTasks); setModal(null);
  };
  const handleDelete = async (id) => { await persist(tasks.filter(t => t.id !== id)); setModal(null); };
  const handleDrop = async (taskId, newStatus) => { await persist(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); };

  const stats = { total: tasks.length, done: tasks.filter(t => t.status === "done").length, overdue: tasks.filter(t => isOverdue(t.deadline) && t.status !== "done").length, inProgress: tasks.filter(t => t.status === "in_progress").length };

  if (loading) return (
    <div style={{ padding: "4rem 1rem", textAlign: "center", fontFamily: "var(--font-sans)" }}>
      <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>共有データを読み込み中...</div>
      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>チームのタスクを取得しています</div>
    </div>
  );

  return (
    <div style={{ padding: "0.5rem 0", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)", letterSpacing: -0.5 }}>タスクボード</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>チーム共有タスク管理</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-tertiary)" }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: syncing ? "#BA7517" : "#1D9E75", transition: "background 0.3s" }} />
              {syncing ? "同期中..." : lastSync ? `同期済 ${new Date(lastSync).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}` : "接続中"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => fetchTasks(true)} style={{ fontSize: 12, padding: "6px 12px", color: "var(--color-text-secondary)" }}>↻ 同期</button>
          <button onClick={() => setModal({ mode: "new" })} style={{ background: "var(--color-text-primary)", color: "var(--color-background-primary)", borderColor: "var(--color-text-primary)", padding: "8px 18px", fontWeight: 500, fontSize: 13 }}>+ 新規タスク</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 20 }}>
        {[{ label: "合計", value: stats.total, bg: "var(--color-background-secondary)" }, { label: "進行中", value: stats.inProgress, bg: "#E6F1FB" }, { label: "完了", value: stats.done, bg: "#E1F5EE" }, { label: "期限超過", value: stats.overdue, bg: stats.overdue > 0 ? "#FCEBEB" : "var(--color-background-secondary)" }].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="検索..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180, fontSize: 13 }} />
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)} style={{ fontSize: 13, minWidth: 120 }}>
          <option value="">全メンバー</option>
          {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["kanban", "ボード"], ["list", "リスト"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ fontSize: 12, padding: "5px 14px", background: view === k ? "var(--color-text-primary)" : "transparent", color: view === k ? "var(--color-background-primary)" : "var(--color-text-secondary)", borderColor: view === k ? "var(--color-text-primary)" : undefined }}>{l}</button>
          ))}
        </div>
      </div>

      {view === "kanban" ? <KanbanView tasks={filtered} onTaskClick={t => setModal({ mode: "edit", task: t })} onDrop={handleDrop} /> : <ListView tasks={filtered} onTaskClick={t => setModal({ mode: "edit", task: t })} />}
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-tertiary)" }}><p style={{ fontSize: 14, margin: 0 }}>タスクが見つかりません</p></div>}

      <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>メンバー</div>
          <button onClick={() => persist(SAMPLE_TASKS)} style={{ fontSize: 11, padding: "3px 10px", color: "var(--color-text-tertiary)", borderColor: "var(--color-border-tertiary)" }}>リセット</button>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {MEMBERS.map(m => {
            const count = tasks.filter(t => t.assignee === m.id && t.status !== "done").length;
            return (
              <div key={m.id} onClick={() => setFilterMember(filterMember === m.id ? "" : m.id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: filterMember && filterMember !== m.id ? 0.4 : 1, transition: "opacity 0.15s" }}>
                <Avatar member={m} size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{count}件 進行中</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
        共有モード: このアプリのURLをチームメンバーに共有してください。全員が同じタスクデータを閲覧・編集できます。15秒ごとに自動同期されます。
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal && <TaskForm task={modal.mode === "edit" ? modal.task : null} onSave={handleSave} onCancel={() => setModal(null)} onDelete={handleDelete} />}
      </Modal>
    </div>
  );
}
