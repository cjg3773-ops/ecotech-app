import { useState, useEffect, useRef } from "react";
import { auth, provider, db, storage } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ADMIN_EMAIL = "cjg3773@gmail.com";
const AV_BG = ["#E6F1FB","#E1F5EE","#FAECE7","#EEEDFE","#FBEAF0","#FAEEDA","#EAF3DE","#F1EFE8"];
const AV_FG = ["#185FA5","#0F6E56","#993C1D","#534AB7","#993556","#854F0B","#3B6D11","#5F5E5A"];
const STATUS_LIST = ["진행","완료","대기","지연"];
const STATUS_COLOR = {
  "진행":["#E6F1FB","#185FA5"], "완료":["#EAF3DE","#3B6D11"],
  "대기":["#F1EFE8","#5F5E5A"], "지연":["#FCEBEB","#A32D2D"],
  "운송중":["#E6F1FB","#185FA5"], "출고대기":["#FAEEDA","#854F0B"],
  "납품완료":["#EAF3DE","#3B6D11"],
};

function Badge({ s }) {
  const [bg, color] = STATUS_COLOR[s] || ["#F1EFE8","#5F5E5A"];
  return <span style={{ background:bg, color, fontSize:11, padding:"2px 8px", borderRadius:8 }}>{s}</span>;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit" });
}
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"short" });
}
function isSameDay(ts1, ts2) {
  if (!ts1 || !ts2) return false;
  const d1 = ts1.toDate ? ts1.toDate() : new Date(ts1);
  const d2 = ts2.toDate ? ts2.toDate() : new Date(ts2);
  return d1.toDateString() === d2.toDateString();
}

function StaffManager({ staffList, onClose }) {
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const add = async () => {
    if (!newName.trim()) return;
    await addDoc(collection(db, "staff"), { name: newName.trim(), email: newEmail.trim().toLowerCase(), createdAt: serverTimestamp() });
    setNewName(""); setNewEmail("");
  };
  const remove = async (id, name) => {
    if (window.confirm(`"${name}" 직원을 삭제하시겠습니까?`)) await deleteDoc(doc(db, "staff", id));
  };
  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, "staff", id), { name: editName.trim(), email: editEmail.trim().toLowerCase() });
    setEditId(null);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:"#fff", borderRadius:14, padding:24, width:380, maxHeight:"85vh", overflowY:"auto" }}>
        <h3 style={{ fontWeight:500, marginBottom:6 }}>직원 관리</h3>
        <div style={{ fontSize:12, color:"#999", marginBottom:16, lineHeight:1.6 }}>구글 로그인 이메일을 등록하면, 로그인 계정 이름이 달라도 접속 현황에 직원관리 이름으로 표시돼요.</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
          {staffList.map((s, i) => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#f8f8f8", borderRadius:8 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:AV_BG[i%AV_BG.length], color:AV_FG[i%AV_FG.length], display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500, flexShrink:0 }}>{s.name[0]}</div>
              {editId === s.id ? (
                <>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} placeholder="이름" autoFocus />
                    <input value={editEmail} onChange={e => setEditEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit(s.id)} style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #ddd", fontSize:12 }} placeholder="구글 로그인 이메일 (선택)" />
                  </div>
                  <button onClick={() => saveEdit(s.id)} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", fontSize:12, cursor:"pointer" }}>저장</button>
                  <button onClick={() => setEditId(null)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", fontSize:12, cursor:"pointer" }}>취소</button>
                </>
              ) : (
                <>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{s.name}</div>
                    <div style={{ fontSize:11, color: s.email ? "#999" : "#ccc" }}>{s.email || "연동된 이메일 없음"}</div>
                  </div>
                  <button onClick={() => { setEditId(s.id); setEditName(s.name); setEditEmail(s.email||""); }} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", fontSize:12, cursor:"pointer" }}>수정</button>
                  <button onClick={() => remove(s.id, s.name)} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #fcc", background:"#fff", color:"#E24B4A", fontSize:12, cursor:"pointer" }}>삭제</button>
                </>
              )}
            </div>
          ))}
          {staffList.length === 0 && <div style={{ color:"#aaa", fontSize:13 }}>등록된 직원이 없어요</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="새 직원 이름 입력" style={{ padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
          <div style={{ display:"flex", gap:8 }}>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="구글 로그인 이메일 (선택)" style={{ flex:1, padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
            <button onClick={add} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer", fontSize:13 }}>추가</button>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 20px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>완료</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab({ staffList, user }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [curDate, setCurDate] = useState(new Date());
  const [form, setForm] = useState({ date:"", staffs:[], title:"", note:"" });

  useEffect(() => {
    const unsub = onSnapshot(collection(db,"events"), snap => setEvents(snap.docs.map(d => ({id:d.id,...d.data()}))));
    return unsub;
  }, []);

  const year = curDate.getFullYear();
  const month = curDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);

  const changeMonth = (d) => setCurDate(new Date(year, month+d, 1));

  const getStaffs = (ev) => ev.staffs && ev.staffs.length ? ev.staffs : (ev.staff ? [ev.staff] : []);

  const openAddNew = (day) => {
    setEditItem(null);
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setForm({ date:dateStr, staffs:staffList[0]?[staffList[0].name]:[], title:"", note:"" });
    setShowForm(true);
  };

  const openView = (ev) => setViewItem(ev);

  const openEditFromView = () => {
    setEditItem(viewItem);
    setForm({ date:viewItem.date, staffs:getStaffs(viewItem), title:viewItem.title, note:viewItem.note||"" });
    setViewItem(null);
    setShowForm(true);
  };

  const toggleStaff = (name) => {
    setForm(f => {
      const has = f.staffs.includes(name);
      return { ...f, staffs: has ? f.staffs.filter(s => s !== name) : [...f.staffs, name] };
    });
  };

  const save = async () => {
    if (!form.title || form.staffs.length === 0) return;
    const data = { date:form.date, staffs:form.staffs, title:form.title, note:form.note };
    if (editItem) await updateDoc(doc(db,"events",editItem.id), data);
    else await addDoc(collection(db,"events"), { ...data, createdAt:serverTimestamp() });
    setShowForm(false);
  };
  const remove = async (id) => {
    if (window.confirm("일정을 삭제하시겠습니까?")) { await deleteDoc(doc(db,"events",id)); setViewItem(null); }
  };

  const staffColor = (name) => {
    const idx = staffList.findIndex(s => s.name === name);
    return idx >= 0 ? [AV_BG[idx%AV_BG.length], AV_FG[idx%AV_FG.length]] : ["#F1EFE8","#5F5E5A"];
  };

  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => changeMonth(-1)} style={{ width:28, height:28, borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>‹</button>
          <span style={{ fontWeight:500, fontSize:15, minWidth:90, textAlign:"center" }}>{year}년 {month+1}월</span>
          <button onClick={() => changeMonth(1)} style={{ width:28, height:28, borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>›</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        {staffList.map((s,i) => (
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#888" }}>
            <span style={{ width:9, height:9, borderRadius:"50%", background:AV_FG[i%AV_FG.length], display:"inline-block" }} />
            {s.name}
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:"#e8e8e8", borderRadius:8, overflow:"hidden", border:"1px solid #e8e8e8" }}>
        {["일","월","화","수","목","금","토"].map(d => (
          <div key={d} style={{ background:"#f7f7f7", textAlign:"center", fontSize:11, color:"#888", padding:"6px 0" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ background:"#fff", minHeight:80 }} />;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dayEvents = events.filter(e => e.date === dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div key={i} style={{ background:"#fff", minHeight:80, padding:4, minWidth:0, overflow:"hidden" }}>
              <div onClick={() => openAddNew(day)} style={{ fontSize:11, color:"#888", marginBottom:3, cursor:"pointer" }}>
                {isToday ? <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:"#185FA5", color:"#fff" }}>{day}</span> : day}
              </div>
              {dayEvents.map(ev => {
                const evStaffs = getStaffs(ev);
                const [bg,fg] = staffColor(evStaffs[0]);
                return (
                  <div key={ev.id} onClick={() => openView(ev)} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, padding:"1px 5px", borderRadius:4, marginBottom:2, background:bg, color:fg, cursor:"pointer", width:"100%", minWidth:0, overflow:"hidden", boxSizing:"border-box" }}>
                    <span style={{ display:"flex", flexShrink:0 }}>
                      {evStaffs.slice(0,3).map((sn,idx) => {
                        const [,sfg] = staffColor(sn);
                        return <span key={idx} style={{ width:13, height:13, borderRadius:"50%", background:sfg, color:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:500, marginLeft: idx>0?-4:0, border:"1px solid #fff", flexShrink:0 }}>{sn[0]}</span>;
                      })}
                    </span>
                    <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minWidth:0, flex:1 }}>{ev.title}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {viewItem && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:340 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {getStaffs(viewItem).map((sn,idx) => {
                const [bg,fg] = staffColor(sn);
                return (
                  <span key={idx} style={{ display:"flex", alignItems:"center", gap:4, background:bg, color:fg, padding:"3px 10px", borderRadius:14, fontSize:12, fontWeight:500 }}>
                    <span style={{ width:16, height:16, borderRadius:"50%", background:fg, color:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9 }}>{sn[0]}</span>
                    {sn}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize:13, color:"#888", marginBottom:6 }}>{viewItem.date}</div>
            <h3 style={{ marginBottom:14, fontWeight:500, fontSize:17 }}>{viewItem.title}</h3>
            {viewItem.note ? (
              <div style={{ fontSize:13, color:"#555", lineHeight:1.7, background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:16, whiteSpace:"pre-wrap" }}>{viewItem.note}</div>
            ) : (
              <div style={{ fontSize:13, color:"#bbb", marginBottom:16 }}>메모 없음</div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button onClick={() => remove(viewItem.id)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #fcc", background:"#fff", color:"#E24B4A", cursor:"pointer" }}>삭제</button>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setViewItem(null)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>닫기</button>
                <button onClick={openEditFromView} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>수정</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:340 }}>
            <h3 style={{ marginBottom:16, fontWeight:500 }}>{editItem ? "일정 수정" : "일정 추가"} · {form.date}</h3>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>참여 직원 (여러 명 선택 가능)</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {staffList.map((s,i) => {
                  const active = form.staffs.includes(s.name);
                  return (
                    <button key={s.id} onClick={() => toggleStaff(s.name)} style={{
                      display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:16, fontSize:12, cursor:"pointer",
                      border: active ? `1px solid ${AV_FG[i%AV_FG.length]}` : "1px solid #ddd",
                      background: active ? AV_BG[i%AV_BG.length] : "#fff",
                      color: active ? AV_FG[i%AV_FG.length] : "#888"
                    }}>
                      <span style={{ width:14, height:14, borderRadius:"50%", background:AV_FG[i%AV_FG.length], color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8 }}>{s.name[0]}</span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
              {form.staffs.length === 0 && <div style={{ fontSize:11, color:"#E24B4A", marginTop:6 }}>최소 1명 선택해 주세요</div>}
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>일정 제목</div>
              <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="예: 한화케미칼 미팅" style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>메모 (선택)</div>
              <textarea value={form.note} onChange={e => setForm({...form,note:e.target.value})} style={{ width:"100%", height:60, padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13, resize:"vertical" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>취소</button>
              <button onClick={save} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesTab({ projects, staffList, user }) {
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ client:"", title:"", assignee:"", status:"진행", start:"", end:"", progress:0, note:"", files:[] });
  const [filter, setFilter] = useState("전체");
  const [staffFilter, setStaffFilter] = useState("전체");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const openAdd = () => { setEditItem(null); setForm({ client:"", title:"", assignee:staffList[0]?.name||"", status:"진행", start:"", end:"", progress:0, note:"", files:[] }); setShowForm(true); };
  const openEditFromView = () => { setEditItem(viewItem); setForm({ client:viewItem.client||"", title:viewItem.title||"", assignee:viewItem.assignee||"", status:viewItem.status||"진행", start:viewItem.start||"", end:viewItem.end||"", progress:viewItem.progress||0, note:viewItem.note||"", files:viewItem.files||[] }); setViewItem(null); setShowForm(true); };
  const save = async () => {
    if (!form.client) return;
    if (editItem) await updateDoc(doc(db,"projects",editItem.id), { ...form, progress:Number(form.progress) });
    else await addDoc(collection(db,"projects"), { ...form, progress:Number(form.progress), createdAt:serverTimestamp() });
    setShowForm(false);
  };
  const remove = async (id) => { if (window.confirm("삭제하시겠습니까?")) { await deleteDoc(doc(db,"projects",id)); setViewItem(null); } };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `project-files/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(f => ({ ...f, files: [...(f.files||[]), { name:file.name, url }] }));
    } catch(err) { alert("업로드 실패: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };
  const removeFile = (idx) => setForm(f => ({ ...f, files: f.files.filter((_,i) => i!==idx) }));

  const filtered = filter === "전체" ? projects : projects.filter(p => p.status === filter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["전체",...STATUS_LIST].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding:"4px 14px", borderRadius:20, border:"1px solid #ddd", cursor:"pointer", fontSize:12, background: filter===s ? "#185FA5" : "#fff", color: filter===s ? "#fff" : "#555" }}>
              {s} {s==="전체" ? projects.length : projects.filter(p=>p.status===s).length}
            </button>
          ))}
        </div>
        <button onClick={openAdd} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer", fontSize:13 }}>+ 프로젝트 추가</button>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
        <button onClick={() => setStaffFilter("전체")} style={{ padding:"4px 12px", borderRadius:20, border:"1px solid #ddd", cursor:"pointer", fontSize:12, background: staffFilter==="전체" ? "#333" : "#fff", color: staffFilter==="전체" ? "#fff" : "#555" }}>전체 직원</button>
        {staffList.map((s,i) => (
          <button key={s.id} onClick={() => setStaffFilter(s.name)} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:20, cursor:"pointer", fontSize:12, border: staffFilter===s.name ? `1px solid ${AV_FG[i%AV_FG.length]}` : "1px solid #ddd", background: staffFilter===s.name ? AV_BG[i%AV_BG.length] : "#fff", color: staffFilter===s.name ? AV_FG[i%AV_FG.length] : "#888" }}>
            <span style={{ width:14, height:14, borderRadius:"50%", background:AV_FG[i%AV_FG.length], color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8 }}>{s.name[0]}</span>
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
        {filtered.filter(p => staffFilter==="전체" || p.assignee===staffFilter).map(p => {
          const barColor = p.status==="완료"?"#1D9E75":p.status==="지연"?"#E24B4A":"#378ADD";
          return (
            <div key={p.id} onClick={() => setViewItem(p)} style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:12, padding:16, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div><div style={{ fontWeight:500, fontSize:15 }}>{p.client}</div><div style={{ fontSize:12, color:"#888", marginTop:2 }}>{p.title}</div></div>
                <Badge s={p.status} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                {[["담당자",p.assignee||"-"],["진행률",(p.progress||0)+"%"],["시작일",p.start||"-"],["완료예정",p.end||"-"]].map(([l,v]) => (
                  <div key={l} style={{ background:"#f8f8f8", borderRadius:6, padding:"6px 10px" }}>
                    <div style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.note && <div style={{ fontSize:12, color:"#854F0B", background:"#FFFBE6", borderRadius:6, padding:"6px 10px", marginBottom:10, whiteSpace:"pre-wrap", overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>📝 {p.note}</div>}
              {p.files && p.files.length > 0 && <div style={{ fontSize:11, color:"#185FA5", marginBottom:10 }}>📎 첨부파일 {p.files.length}개</div>}
              <div style={{ height:5, background:"#eee", borderRadius:3 }}>
                <div style={{ height:"100%", width:(p.progress||0)+"%", background:barColor, borderRadius:3, transition:"width 0.3s" }} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color:"#aaa", padding:20 }}>해당 상태의 프로젝트가 없어요</div>}
      </div>

      {viewItem && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:380, maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div><div style={{ fontWeight:500, fontSize:17 }}>{viewItem.client}</div><div style={{ fontSize:13, color:"#888", marginTop:3 }}>{viewItem.title}</div></div>
              <Badge s={viewItem.status} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {[["담당자",viewItem.assignee||"-"],["진행률",(viewItem.progress||0)+"%"],["시작일",viewItem.start||"-"],["완료예정",viewItem.end||"-"]].map(([l,v]) => (
                <div key={l} style={{ background:"#f8f8f8", borderRadius:6, padding:"8px 10px" }}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ height:6, background:"#eee", borderRadius:3, marginBottom:16 }}>
              <div style={{ height:"100%", width:(viewItem.progress||0)+"%", background:"#378ADD", borderRadius:3 }} />
            </div>
            <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>메모</div>
            <div style={{ fontSize:13, color:"#555", lineHeight:1.7, background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:16, whiteSpace:"pre-wrap", minHeight:40 }}>
              {viewItem.note || <span style={{ color:"#bbb" }}>메모 없음</span>}
            </div>
            {viewItem.files && viewItem.files.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>첨부파일</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {viewItem.files.map((f,idx) => (
                    <a key={idx} href={f.url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:6, background:"#f5f5f5", padding:"8px 12px", borderRadius:8, fontSize:13, color:"#185FA5", textDecoration:"none" }}>📎 {f.name}</a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button onClick={() => remove(viewItem.id)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #fcc", background:"#fff", color:"#E24B4A", cursor:"pointer" }}>삭제</button>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setViewItem(null)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>닫기</button>
                <button onClick={openEditFromView} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>수정</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:380, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ marginBottom:16, fontWeight:500 }}>{editItem ? "프로젝트 수정" : "프로젝트 추가"}</h3>
            {[["client","거래처"],["title","프로젝트 제목"]].map(([k,label]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>{label}</div>
                <input value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>담당자</div>
              <select value={form.assignee} onChange={e => setForm({...form,assignee:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
                <option value="">선택</option>
                {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>상태</div>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
                {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              {[["start","시작일"],["end","완료 예정일"]].map(([k,label]) => (
                <div key={k}>
                  <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>📅 {label}</div>
                  <input type="date" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>진행률 {form.progress}%</div>
              <input type="range" min="0" max="100" step="5" value={form.progress} onChange={e => setForm({...form,progress:e.target.value})} style={{ width:"100%" }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>메모</div>
              <textarea value={form.note} onChange={e => setForm({...form,note:e.target.value})} placeholder="상세 내용을 자유롭게 입력하세요" style={{ width:"100%", height:140, padding:"10px", borderRadius:6, border:"1px solid #ddd", fontSize:13, resize:"vertical", lineHeight:1.6 }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>첨부파일</div>
              <input ref={fileRef} type="file" style={{ display:"none" }} onChange={uploadFile} />
              <button onClick={() => fileRef.current.click()} disabled={uploading} style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:12, marginBottom:8 }}>
                📎 {uploading ? "업로드 중..." : "파일 선택"}
              </button>
              {form.files && form.files.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {form.files.map((f,idx) => (
                    <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f5f5f5", padding:"6px 10px", borderRadius:6, fontSize:12 }}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📎 {f.name}</span>
                      <button onClick={() => removeFile(idx)} style={{ background:"none", border:"none", color:"#E24B4A", cursor:"pointer", fontSize:12, flexShrink:0, marginLeft:6 }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>취소</button>
              <button onClick={save} disabled={uploading} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffTab({ staffList, tasks }) {
  const [showForm, setShowForm] = useState(false);
  const [showMgr, setShowMgr] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ assignee:"", title:"", desc:"", start:"", end:"", status:"진행", files:[] });
  const [uploading, setUploading] = useState(false);
  const [staffFilter, setStaffFilter] = useState("전체");
  const fileRef = useRef();

  const openAdd = () => { setEditItem(null); setForm({ assignee:staffList[0]?.name||"", title:"", desc:"", start:"", end:"", status:"진행", files:[] }); setShowForm(true); };
  const openEditFromView = () => { setEditItem(viewItem); setForm({ assignee:viewItem.assignee||"", title:viewItem.title||"", desc:viewItem.desc||"", start:viewItem.start||"", end:viewItem.end||"", status:viewItem.status||"진행", files:viewItem.files||[] }); setViewItem(null); setShowForm(true); };
  const save = async () => {
    if (!form.title) return;
    if (editItem) await updateDoc(doc(db,"tasks",editItem.id), form);
    else await addDoc(collection(db,"tasks"), { ...form, createdAt:serverTimestamp() });
    setShowForm(false);
  };
  const remove = async (id) => { if (window.confirm("삭제하시겠습니까?")) { await deleteDoc(doc(db,"tasks",id)); setViewItem(null); } };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `task-files/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(f => ({ ...f, files: [...(f.files||[]), { name:file.name, url }] }));
    } catch(err) { alert("업로드 실패: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };
  const removeFile = (idx) => setForm(f => ({ ...f, files: f.files.filter((_,i) => i!==idx) }));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <button onClick={() => setShowMgr(true)} style={{ padding:"7px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:13 }}>👥 직원 추가·수정·삭제</button>
        <button onClick={openAdd} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer", fontSize:13 }}>+ 업무 추가</button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <button onClick={() => setStaffFilter("전체")} style={{ padding:"5px 14px", borderRadius:20, border:"1px solid #ddd", cursor:"pointer", background: staffFilter==="전체" ? "#333" : "#fff", color: staffFilter==="전체" ? "#fff" : "#555", fontSize:12, fontWeight:500 }}>
          전체 ({tasks.length}건)
        </button>
        {staffList.map((s,i) => (
          <button key={s.id} onClick={() => setStaffFilter(s.name)} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 14px", borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:500, border: staffFilter===s.name ? `2px solid ${AV_FG[i%AV_FG.length]}` : "1px solid transparent", background:AV_BG[i%AV_BG.length], color:AV_FG[i%AV_FG.length] }}>
            <span>{s.name}</span><span style={{ fontSize:11, opacity:0.8 }}>({tasks.filter(t=>t.assignee===s.name).length}건)</span>
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {tasks.filter(t => staffFilter==="전체" || t.assignee===staffFilter).map(t => (
          <div key={t.id} onClick={() => setViewItem(t)} style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:10, padding:14, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div><div style={{ fontWeight:500, fontSize:14 }}>{t.title}</div><div style={{ fontSize:12, color:"#888", marginTop:2 }}>담당: {t.assignee}</div></div>
              <Badge s={t.status} />
            </div>
            {(t.start || t.end) && <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>📅 {t.start||"-"} → {t.end||"-"}</div>}
            {t.desc && <div style={{ fontSize:12, color:"#666", marginBottom:6, lineHeight:1.6, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{t.desc}</div>}
            {t.files && t.files.length > 0 && <div style={{ fontSize:11, color:"#185FA5" }}>📎 첨부파일 {t.files.length}개</div>}
          </div>
        ))}
        {tasks.length === 0 && <div style={{ color:"#aaa" }}>+ 업무 추가 버튼으로 업무를 등록하세요</div>}
      </div>

      {showMgr && <StaffManager staffList={staffList} onClose={() => setShowMgr(false)} />}

      {viewItem && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:380, maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div><div style={{ fontWeight:500, fontSize:17 }}>{viewItem.title}</div><div style={{ fontSize:13, color:"#888", marginTop:3 }}>담당: {viewItem.assignee}</div></div>
              <Badge s={viewItem.status} />
            </div>
            {(viewItem.start || viewItem.end) && (
              <div style={{ background:"#f8f8f8", borderRadius:6, padding:"8px 10px", marginBottom:14, fontSize:13 }}>📅 {viewItem.start||"-"} → {viewItem.end||"-"}</div>
            )}
            <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>업무 내용</div>
            <div style={{ fontSize:13, color:"#555", lineHeight:1.7, background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:16, whiteSpace:"pre-wrap", minHeight:40 }}>
              {viewItem.desc || <span style={{ color:"#bbb" }}>내용 없음</span>}
            </div>
            {viewItem.files && viewItem.files.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>첨부파일</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {viewItem.files.map((f,idx) => (
                    <a key={idx} href={f.url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:6, background:"#f5f5f5", padding:"8px 12px", borderRadius:8, fontSize:13, color:"#185FA5", textDecoration:"none" }}>📎 {f.name}</a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <button onClick={() => remove(viewItem.id)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #fcc", background:"#fff", color:"#E24B4A", cursor:"pointer" }}>삭제</button>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setViewItem(null)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>닫기</button>
                <button onClick={openEditFromView} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>수정</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:380, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ marginBottom:16, fontWeight:500 }}>{editItem ? "업무 수정" : "업무 추가"}</h3>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>담당자</div>
              <select value={form.assignee} onChange={e => setForm({...form,assignee:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
                <option value="">선택</option>
                {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>업무 제목</div>
              <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              {[["start","시작일"],["end","마감일"]].map(([k,label]) => (
                <div key={k}>
                  <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>📅 {label}</div>
                  <input type="date" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>상태</div>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
                {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>업무 내용</div>
              <textarea value={form.desc} onChange={e => setForm({...form,desc:e.target.value})} placeholder="상세 내용을 자유롭게 입력하세요" style={{ width:"100%", height:140, padding:"10px", borderRadius:6, border:"1px solid #ddd", fontSize:13, resize:"vertical", lineHeight:1.6 }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>첨부파일</div>
              <input ref={fileRef} type="file" style={{ display:"none" }} onChange={uploadFile} />
              <button onClick={() => fileRef.current.click()} disabled={uploading} style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:12, marginBottom:8 }}>
                📎 {uploading ? "업로드 중..." : "파일 선택"}
              </button>
              {form.files && form.files.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {form.files.map((f,idx) => (
                    <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f5f5f5", padding:"6px 10px", borderRadius:6, fontSize:12 }}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📎 {f.name}</span>
                      <button onClick={() => removeFile(idx)} style={{ background:"none", border:"none", color:"#E24B4A", cursor:"pointer", fontSize:12, flexShrink:0, marginLeft:6 }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>취소</button>
              <button onClick={save} disabled={uploading} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatTab({ user, channel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(() => {
    const q = query(collection(db,"messages",channel,"chats"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, [channel]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db,"messages",channel,"chats"), { text:input, name:user.displayName, uid:user.uid, type:"text", createdAt:serverTimestamp() });
    setInput("");
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `files/${channel}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const isImage = file.type.startsWith("image/");
      await addDoc(collection(db,"messages",channel,"chats"), { text:file.name, url, name:user.displayName, uid:user.uid, type: isImage ? "image" : "file", createdAt:serverTimestamp() });
    } catch(err) { alert("업로드 실패: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };

  const deleteMsg = async (msg) => {
    if (msg.name !== user.displayName) return alert("본인 메시지만 삭제할 수 있어요");
    if (window.confirm("메시지를 삭제하시겠습니까?")) await deleteDoc(doc(db,"messages",channel,"chats",msg.id));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 112px)" }}>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:2, padding:"0 0 10px" }}>
        {messages.map((m, i) => {
          const isMe = m.name === user.displayName;
          const showDate = i === 0 || !isSameDay(messages[i-1].createdAt, m.createdAt);
          return (
            <div key={m.id}>
              {showDate && <div style={{ textAlign:"center", margin:"12px 0 8px" }}><span style={{ fontSize:11, color:"#aaa", background:"#f5f5f5", padding:"3px 12px", borderRadius:20 }}>{formatDate(m.createdAt)}</span></div>}
              <div style={{ display:"flex", gap:8, flexDirection:isMe?"row-reverse":"row", alignItems:"flex-end", padding:"2px 0" }}>
                {!isMe && <div style={{ width:28, height:28, borderRadius:"50%", background:"#E6F1FB", color:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:500, flexShrink:0 }}>{m.name?.[0]}</div>}
                <div style={{ maxWidth:"65%" }}>
                  {!isMe && <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>{m.name}</div>}
                  <div style={{ display:"flex", alignItems:"flex-end", gap:4, flexDirection:isMe?"row-reverse":"row" }}>
                    <div>
                      {m.type === "image" ? (
                        <a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt={m.text} style={{ maxWidth:180, borderRadius:8, display:"block" }} /></a>
                      ) : m.type === "file" ? (
                        <a href={m.url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:6, background:isMe?"#E6F1FB":"#f5f5f5", padding:"8px 12px", borderRadius:10, fontSize:13, color:isMe?"#0C447C":"#333", textDecoration:"none" }}>📎 {m.text}</a>
                      ) : (
                        <div style={{ background:isMe?"#E6F1FB":"#f5f5f5", padding:"8px 12px", borderRadius:10, fontSize:13, color:isMe?"#0C447C":"#333" }}>{m.text}</div>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap", marginBottom:2 }}>{formatTime(m.createdAt)}</div>
                    {isMe && <button onClick={() => deleteMsg(m)} style={{ opacity:0.4, background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#E24B4A", padding:"2px 4px", marginBottom:2 }} onMouseEnter={e => e.target.style.opacity="1"} onMouseLeave={e => e.target.style.opacity="0.4"}>삭제</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ borderTop:"1px solid #e8e8e8", paddingTop:10 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input ref={fileRef} type="file" style={{ display:"none" }} onChange={uploadFile} />
          <button onClick={() => fileRef.current.click()} style={{ padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:16 }} title="파일 첨부">📎</button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} placeholder={uploading ? "업로드 중..." : "메시지 입력..."} disabled={uploading} style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1px solid #ddd", fontSize:13 }} />
          <button onClick={send} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>전송</button>
        </div>
      </div>
    </div>
  );
}

function StaffDetailModal({ name, projects, tasks, events, onClose }) {
  const [detailItem, setDetailItem] = useState(null); // { type:'project'|'task'|'event', data }
  const myProjects = projects.filter(p => p.assignee === name);
  const myTasks = tasks.filter(t => t.assignee === name);
  const myEvents = events
    .filter(e => (e.staffs && e.staffs.includes(name)) || e.staff === name)
    .sort((a,b) => (a.date||"").localeCompare(b.date||""));
  const todayStr = new Date().toISOString().slice(0,10);

  const Section = ({ title, count, children }) => (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:13, fontWeight:500, color:"#333", marginBottom:8 }}>{title} <span style={{ color:"#aaa", fontWeight:400 }}>({count})</span></div>
      {count === 0 ? (
        <div style={{ fontSize:12, color:"#bbb", padding:"8px 0" }}>등록된 내용이 없어요</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>{children}</div>
      )}
    </div>
  );

  const Field = ({ label, value }) => (
    <div style={{ background:"#f8f8f8", borderRadius:6, padding:"8px 10px" }}>
      <div style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:500 }}>{value}</div>
    </div>
  );

  const renderDetail = () => {
    const { type, data } = detailItem;
    if (type === "project") return (
      <>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div><div style={{ fontWeight:500, fontSize:17 }}>{data.client}</div><div style={{ fontSize:13, color:"#888", marginTop:3 }}>{data.title}</div></div>
          <Badge s={data.status} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          <Field label="담당자" value={data.assignee||"-"} />
          <Field label="진행률" value={(data.progress||0)+"%"} />
          <Field label="시작일" value={data.start||"-"} />
          <Field label="완료예정" value={data.end||"-"} />
        </div>
        <div style={{ height:6, background:"#eee", borderRadius:3, marginBottom:16 }}>
          <div style={{ height:"100%", width:(data.progress||0)+"%", background:"#378ADD", borderRadius:3 }} />
        </div>
        <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>메모</div>
        <div style={{ fontSize:13, color:"#555", lineHeight:1.7, background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:16, whiteSpace:"pre-wrap", minHeight:40 }}>
          {data.note || <span style={{ color:"#bbb" }}>메모 없음</span>}
        </div>
        {data.files && data.files.length > 0 && (
          <div style={{ marginBottom:6 }}>
            <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>첨부파일</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.files.map((f,idx) => (
                <a key={idx} href={f.url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:6, background:"#f5f5f5", padding:"8px 12px", borderRadius:8, fontSize:13, color:"#185FA5", textDecoration:"none" }}>📎 {f.name}</a>
              ))}
            </div>
          </div>
        )}
      </>
    );
    if (type === "task") return (
      <>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div><div style={{ fontWeight:500, fontSize:17 }}>{data.title}</div><div style={{ fontSize:13, color:"#888", marginTop:3 }}>담당: {data.assignee}</div></div>
          <Badge s={data.status} />
        </div>
        {(data.start || data.end) && (
          <div style={{ background:"#f8f8f8", borderRadius:6, padding:"8px 10px", marginBottom:14, fontSize:13 }}>📅 {data.start||"-"} → {data.end||"-"}</div>
        )}
        <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>업무 내용</div>
        <div style={{ fontSize:13, color:"#555", lineHeight:1.7, background:"#f8f8f8", borderRadius:8, padding:"10px 12px", marginBottom:16, whiteSpace:"pre-wrap", minHeight:40 }}>
          {data.desc || <span style={{ color:"#bbb" }}>내용 없음</span>}
        </div>
        {data.files && data.files.length > 0 && (
          <div style={{ marginBottom:6 }}>
            <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>첨부파일</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.files.map((f,idx) => (
                <a key={idx} href={f.url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:6, background:"#f5f5f5", padding:"8px 12px", borderRadius:8, fontSize:13, color:"#185FA5", textDecoration:"none" }}>📎 {f.name}</a>
              ))}
            </div>
          </div>
        )}
      </>
    );
    // event
    const staffs = data.staffs && data.staffs.length ? data.staffs : (data.staff ? [data.staff] : []);
    return (
      <>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14, flexWrap:"wrap" }}>
          {staffs.map((sn,idx) => (
            <span key={idx} style={{ background:"#E6F1FB", color:"#185FA5", padding:"3px 10px", borderRadius:14, fontSize:12, fontWeight:500 }}>{sn}</span>
          ))}
        </div>
        <div style={{ fontSize:13, color:"#888", marginBottom:6 }}>{data.date}</div>
        <h3 style={{ marginBottom:14, fontWeight:500, fontSize:17 }}>{data.title}</h3>
        {data.note ? (
          <div style={{ fontSize:13, color:"#555", lineHeight:1.7, background:"#f8f8f8", borderRadius:8, padding:"10px 12px", whiteSpace:"pre-wrap" }}>{data.note}</div>
        ) : (
          <div style={{ fontSize:13, color:"#bbb" }}>메모 없음</div>
        )}
      </>
    );
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:440, maxHeight:"82vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 18px", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          {detailItem ? (
            <div onClick={() => setDetailItem(null)} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", color:"#185FA5", fontSize:14, fontWeight:500 }}>← {name}님의 현황</div>
          ) : (
            <div style={{ fontSize:16, fontWeight:600 }}>{name}님의 현황</div>
          )}
          <span onClick={onClose} style={{ cursor:"pointer", color:"#999", fontSize:20, lineHeight:1 }}>×</span>
        </div>
        <div style={{ padding:18, overflowY:"auto" }}>
          {detailItem ? renderDetail() : (
            <>
              <Section title="영업 프로젝트" count={myProjects.length}>
                {myProjects.map(p => (
                  <div key={p.id} onClick={() => setDetailItem({type:"project", data:p})} style={{ background:"#fafafa", border:"1px solid #eee", borderRadius:8, padding:"8px 10px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{p.client}</span>
                      <Badge s={p.status} />
                    </div>
                    <div style={{ fontSize:12, color:"#888" }}>{p.title}</div>
                    <div style={{ marginTop:6, height:4, background:"#eee", borderRadius:2 }}><div style={{ height:"100%", width:(p.progress||0)+"%", background:"#378ADD", borderRadius:2 }} /></div>
                  </div>
                ))}
              </Section>

              <Section title="직원업무" count={myTasks.length}>
                {myTasks.map(t => (
                  <div key={t.id} onClick={() => setDetailItem({type:"task", data:t})} style={{ background:"#fafafa", border:"1px solid #eee", borderRadius:8, padding:"8px 10px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{t.title}</span>
                      <Badge s={t.status} />
                    </div>
                    {(t.start || t.end) && <div style={{ fontSize:11, color:"#999", marginTop:3 }}>📅 {t.start||"-"} → {t.end||"-"}</div>}
                  </div>
                ))}
              </Section>

              <Section title="일정관리" count={myEvents.length}>
                {myEvents.map(e => (
                  <div key={e.id} onClick={() => setDetailItem({type:"event", data:e})} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background: e.date===todayStr ? "#E6F1FB" : "#fafafa", border:"1px solid #eee", borderRadius:8, cursor:"pointer" }}>
                    <span style={{ fontSize:11, color: e.date===todayStr ? "#185FA5" : "#999", fontWeight:500, flexShrink:0 }}>{e.date}{e.date===todayStr?" · 오늘":""}</span>
                    <span style={{ fontSize:13 }}>{e.title}</span>
                  </div>
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [channel, setChannel] = useState("전체공지");
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const u = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthChecked(true);
      if (u) {
        const isAdmin = u.email === ADMIN_EMAIL;
        const userRef = doc(db, "approvedUsers", u.uid);
        if (isAdmin) {
          await setDoc(userRef, { email:u.email, name:u.displayName, approvedAt:serverTimestamp() }, { merge:true });
          setApprovalStatus("approved");
        } else {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setApprovalStatus("approved");
          } else {
            await setDoc(doc(db, "pendingUsers", u.uid), { email:u.email, name:u.displayName, requestedAt:serverTimestamp() }, { merge:true });
            setApprovalStatus("pending");
          }
        }
      }
    });
    return u;
  }, []);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    const unsub = onSnapshot(collection(db,"pendingUsers"), snap => setPendingUsers(snap.docs.map(d => ({id:d.id,...d.data()}))));
    return unsub;
  }, [user]);

  const approveUser = async (pu) => {
    await setDoc(doc(db,"approvedUsers",pu.id), { email:pu.email, name:pu.name, approvedAt:serverTimestamp() });
    await deleteDoc(doc(db,"pendingUsers",pu.id));
  };
  const rejectUser = async (pu) => {
    if (window.confirm(`${pu.name}님의 요청을 거부하시겠습니까?`)) await deleteDoc(doc(db,"pendingUsers",pu.id));
  };

  useEffect(() => {
    if (!user || approvalStatus !== "approved") return;
    const presenceRef = doc(db, "presence", user.uid);
    const setOnline = () => setDoc(presenceRef, { name:user.displayName, email:(user.email||"").toLowerCase(), lastActive:serverTimestamp() });
    setOnline();
    const interval = setInterval(setOnline, 30000);
    const handleBeforeUnload = () => { deleteDoc(presenceRef); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      deleteDoc(presenceRef);
    };
  }, [user, approvalStatus]);

  useEffect(() => {
    if (!user || approvalStatus !== "approved") return;
    const unsub = onSnapshot(collection(db,"presence"), snap => {
      const now = Date.now();
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(p => {
        const t = p.lastActive?.toMillis ? p.lastActive.toMillis() : 0;
        return now - t < 90000;
      });
      setOnlineUsers(list);
    });
    return unsub;
  }, [user, approvalStatus]);

  useEffect(() => {
    if (!user || approvalStatus !== "approved") return;
    const todayStr = new Date().toISOString().slice(0,10);
    const unsub = onSnapshot(collection(db,"events"), snap => {
      const evs = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(e => e.date === todayStr);
      setTodayEvents(evs);
    });
    return unsub;
  }, [user, approvalStatus]);

  const getEventsForName = (name) => todayEvents.filter(e => (e.staffs && e.staffs.includes(name)) || e.staff === name);

  const resolveStaffName = (ou) => {
    const matched = staffList.find(s => s.email && ou.email && s.email.toLowerCase() === ou.email.toLowerCase());
    return matched ? matched.name : ou.name;
  };

  useEffect(() => {
    const u1 = onSnapshot(collection(db,"projects"), snap => setProjects(snap.docs.map(d => ({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db,"deliveries"), snap => setDeliveries(snap.docs.map(d => ({id:d.id,...d.data()}))));
    const u3 = onSnapshot(collection(db,"staff"), snap => setStaffList(snap.docs.map(d => ({id:d.id,...d.data()}))));
    const u4 = onSnapshot(collection(db,"tasks"), snap => setTasks(snap.docs.map(d => ({id:d.id,...d.data()}))));
    const u5 = onSnapshot(collection(db,"events"), snap => setAllEvents(snap.docs.map(d => ({id:d.id,...d.data()}))));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => { setApprovalStatus(null); signOut(auth); };

  if (!authChecked) return null;

  if (!user) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16, padding:20, textAlign:"center" }}>
      <h1 style={{ fontSize:24, fontWeight:500 }}>에코테크 업무 시스템</h1>
      <p style={{ color:"#888" }}>Google 계정으로 로그인하세요</p>
      <button onClick={login} style={{ padding:"10px 24px", fontSize:15, cursor:"pointer", borderRadius:8, border:"1px solid #ddd", background:"#fff" }}>Google로 로그인</button>
    </div>
  );

  if (approvalStatus === "pending") return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16, padding:20, textAlign:"center" }}>
      <h1 style={{ fontSize:22, fontWeight:500 }}>승인 대기 중입니다</h1>
      <p style={{ color:"#888", maxWidth:320, lineHeight:1.6 }}>관리자(대표)의 승인이 필요해요. 승인되면 자동으로 접속할 수 있습니다.</p>
      <div onClick={logout} style={{ cursor:"pointer", color:"#999", fontSize:13, marginTop:6 }}>로그아웃</div>
    </div>
  );

  if (approvalStatus !== "approved") return null;

  const navItems = [
    ["dashboard","전체현황"],
    ["sales","영업 프로젝트"],
    ["staff","직원업무"],
    ["schedule","일정관리"],
    ["delivery","납품·물류"],
  ];
  const channels = ["전체공지","영업팀","물류팀"];

  const goTab = (t) => { setTab(t); setDrawerOpen(false); };
  const goChat = (ch) => { setTab("chat"); setChannel(ch); setDrawerOpen(false); };

  const tabLabel = tab==="dashboard"?"전체현황":tab==="sales"?"영업 프로젝트":tab==="staff"?"직원업무":tab==="schedule"?"일정관리":tab==="delivery"?"납품·물류":"# "+channel;

  const PendingList = () => (
    user.email === ADMIN_EMAIL && pendingUsers.length > 0 && (
      <div style={{ marginTop:10 }}>
        <div style={{ padding:"0 14px 4px", fontSize:11, color:"#E24B4A", fontWeight:500 }}>승인 대기 ({pendingUsers.length})</div>
        {pendingUsers.map(pu => (
          <div key={pu.id} style={{ margin:"0 6px 6px", padding:"6px 8px", background:"#fff", borderRadius:6, border:"1px solid #fcc" }}>
            <div style={{ fontSize:12, fontWeight:500, marginBottom:4 }}>{pu.name}</div>
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={() => approveUser(pu)} style={{ flex:1, padding:"3px 0", borderRadius:4, border:"none", background:"#185FA5", color:"#fff", fontSize:11, cursor:"pointer" }}>승인</button>
              <button onClick={() => rejectUser(pu)} style={{ flex:1, padding:"3px 0", borderRadius:4, border:"1px solid #ddd", background:"#fff", color:"#888", fontSize:11, cursor:"pointer" }}>거부</button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const OnlineList = () => (
    <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #e8e8e8" }}>
      <div style={{ padding:"0 14px 6px", fontSize:11, color:"#aaa" }}>접속 중 ({onlineUsers.length})</div>
      <div style={{ maxHeight:160, overflowY:"auto" }}>
        {onlineUsers.map(ou => {
          const resolvedName = resolveStaffName(ou);
          const evs = getEventsForName(resolvedName);
          return (
            <div key={ou.id} onClick={() => { setSelectedStaff(resolvedName); setDrawerOpen(false); }} style={{ margin:"0 6px 6px", padding:"6px 8px", background:"#fff", borderRadius:6, cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom: evs.length?4:0 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#3B6D11", display:"inline-block" }} />
                <span style={{ fontSize:12, fontWeight:500 }}>{resolvedName}</span>
              </div>
              {evs.map(e => (
                <div key={e.id} style={{ fontSize:11, color:"#888", paddingLeft:12 }}>· {e.title}</div>
              ))}
            </div>
          );
        })}
        {onlineUsers.length === 0 && <div style={{ padding:"0 14px", fontSize:11, color:"#bbb" }}>접속자 없음</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"sans-serif", fontSize:14, overflow:"hidden", position:"relative" }}>

      {isMobile ? (
        <>
          <div style={{ width:54, background:"#f7f7f7", borderRight:"1px solid #e8e8e8", display:"flex", flexDirection:"column", alignItems:"center", padding:"14px 0", gap:14, flexShrink:0 }}>
            <button onClick={() => setDrawerOpen(true)} style={{ width:36, height:36, borderRadius:8, border:"none", background: drawerOpen ? "#185FA5" : "transparent", color: drawerOpen ? "#fff" : "#555", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:20 }}>☰</button>
            {navItems.map(([t,label]) => (
              <button key={t} onClick={() => goTab(t)} title={label} style={{ width:36, height:36, borderRadius:8, border:"none", background: tab===t ? "#E6F1FB" : "transparent", color: tab===t ? "#185FA5" : "#888", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:11, fontWeight:500 }}>
                {label[0]}
              </button>
            ))}
            <button onClick={() => goChat("전체공지")} title="메신저" style={{ width:36, height:36, borderRadius:8, border:"none", background: tab==="chat" ? "#E6F1FB" : "transparent", color: tab==="chat" ? "#185FA5" : "#888", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }}>💬</button>
          </div>

          {drawerOpen && (
            <div onClick={() => setDrawerOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:300 }} />
          )}
          <div style={{
            position:"fixed", top:0, left:0, bottom:0, width:200, background:"#f7f7f7", zIndex:301,
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)", transition:"transform 0.25s ease",
            display:"flex", flexDirection:"column", padding:"12px 0", boxShadow:"2px 0 10px rgba(0,0,0,0.15)", overflowY:"auto"
          }}>
            <div style={{ padding:"0 14px 12px", fontWeight:500, fontSize:15, borderBottom:"1px solid #e8e8e8", marginBottom:8 }}>에코테크</div>
            {navItems.map(([t,label]) => (
              <div key={t} onClick={() => goTab(t)} style={{ padding:"9px 14px", cursor:"pointer", background:tab===t?"#ebebeb":"transparent", borderRadius:6, margin:"0 6px", fontWeight: tab===t?500:400 }}>{label}</div>
            ))}
            <div style={{ padding:"10px 14px 4px", fontSize:11, color:"#aaa", marginTop:6 }}>메신저</div>
            {channels.map(ch => (
              <div key={ch} onClick={() => goChat(ch)} style={{ padding:"9px 14px", cursor:"pointer", background:tab==="chat"&&channel===ch?"#ebebeb":"transparent", borderRadius:6, margin:"0 6px" }}># {ch}</div>
            ))}
            <PendingList />
            <OnlineList />
            <div style={{ marginTop:"auto", padding:"12px 14px", fontSize:12, color:"#666" }}>
              <div style={{ fontWeight:500 }}>{user.displayName}</div>
              <div onClick={logout} style={{ cursor:"pointer", color:"#999", marginTop:3 }}>로그아웃</div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ width:190, background:"#f7f7f7", borderRight:"1px solid #e8e8e8", display:"flex", flexDirection:"column", padding:"12px 0", flexShrink:0, overflowY:"auto" }}>
          <div style={{ padding:"0 14px 12px", fontWeight:500, fontSize:15 }}>에코테크</div>
          {navItems.map(([t,label]) => (
            <div key={t} onClick={() => goTab(t)} style={{ padding:"7px 14px", cursor:"pointer", background:tab===t?"#ebebeb":"transparent", borderRadius:6, margin:"0 6px" }}>{label}</div>
          ))}
          <div style={{ padding:"10px 14px 4px", fontSize:11, color:"#aaa", marginTop:6 }}>메신저</div>
          {channels.map(ch => (
            <div key={ch} onClick={() => goChat(ch)} style={{ padding:"7px 14px", cursor:"pointer", background:tab==="chat"&&channel===ch?"#ebebeb":"transparent", borderRadius:6, margin:"0 6px" }}># {ch}</div>
          ))}
          <PendingList />
          <OnlineList />
          <div style={{ marginTop:"auto", padding:"12px 14px", fontSize:12, color:"#666" }}>
            <div style={{ fontWeight:500 }}>{user.displayName}</div>
            <div onClick={logout} style={{ cursor:"pointer", color:"#999", marginTop:3 }}>로그아웃</div>
          </div>
        </div>
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #e8e8e8", fontWeight:500, fontSize:15, flexShrink:0 }}>
          {tabLabel}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding: isMobile ? 14 : 20, minWidth:0 }}>

          {tab==="dashboard" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
                <div onClick={() => goTab("sales")} style={{ background:"#f5f5f5", borderRadius:8, padding:14, cursor:"pointer" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>영업 프로젝트</div>
                  <div style={{ fontSize:22, fontWeight:500 }}>{projects.filter(p=>p.status==="진행").length}건 진행</div>
                </div>
                <div onClick={() => goTab("staff")} style={{ background:"#f5f5f5", borderRadius:8, padding:14, cursor:"pointer" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>직원업무</div>
                  <div style={{ fontSize:22, fontWeight:500 }}>바로가기</div>
                </div>
                <div onClick={() => goTab("schedule")} style={{ background:"#f5f5f5", borderRadius:8, padding:14, cursor:"pointer" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>일정관리</div>
                  <div style={{ fontSize:22, fontWeight:500 }}>바로가기</div>
                </div>
                <div onClick={() => goTab("staff")} style={{ background:"#f5f5f5", borderRadius:8, padding:14, cursor:"pointer" }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>직원</div>
                  <div style={{ fontSize:22, fontWeight:500 }}>{staffList.length}명</div>
                </div>
              </div>
              <div style={{ fontWeight:500, marginBottom:10 }}>최근 프로젝트</div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
                {projects.slice(0,4).map(p => (
                  <div key={p.id} onClick={() => goTab("sales")} style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:10, padding:14, cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontWeight:500 }}>{p.client}</span><Badge s={p.status} /></div>
                    <div style={{ color:"#888", fontSize:12 }}>{p.title}</div>
                    <div style={{ marginTop:8, height:4, background:"#eee", borderRadius:2 }}><div style={{ height:"100%", width:(p.progress||0)+"%", background:"#378ADD", borderRadius:2 }} /></div>
                  </div>
                ))}
                {projects.length===0 && <div style={{ color:"#aaa" }}>영업 프로젝트에서 추가하세요</div>}
              </div>
            </div>
          )}

          {tab==="sales" && <SalesTab projects={projects} staffList={staffList} user={user} />}
          {tab==="staff" && <StaffTab staffList={staffList} tasks={tasks} />}
          {tab==="schedule" && <ScheduleTab staffList={staffList} user={user} />}

          {tab==="delivery" && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:480 }}>
                <thead><tr>{["거래처","품목","수량","납기일","상태"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"8px 10px", borderBottom:"1px solid #e8e8e8", color:"#888", fontWeight:400 }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {deliveries.map(d => (
                    <tr key={d.id}>
                      {[d.client,d.content,d.amount,d.date].map((v,i) => <td key={i} style={{ padding:"10px", borderBottom:"1px solid #f0f0f0" }}>{v}</td>)}
                      <td style={{ padding:"10px", borderBottom:"1px solid #f0f0f0" }}><Badge s={d.status} /></td>
                    </tr>
                  ))}
                  {deliveries.length===0 && <tr><td colSpan={5} style={{ padding:20, color:"#aaa" }}>납품 데이터가 없어요</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab==="chat" && <ChatTab user={user} channel={channel} />}
        </div>
      </div>

      {selectedStaff && (
        <StaffDetailModal
          name={selectedStaff}
          projects={projects}
          tasks={tasks}
          events={allEvents}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
  );
}
