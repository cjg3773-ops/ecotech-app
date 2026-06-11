import { useState, useEffect, useRef } from "react";
import { auth, provider, db, storage } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const STAFF = ["김영업","이물류","박정산","최영업"];
const AV_BG = ["#E6F1FB","#E1F5EE","#FAECE7","#EEEDFE"];
const AV_FG = ["#185FA5","#0F6E56","#993C1D","#534AB7"];
const STATUS_LIST = ["진행","완료","대기","지연"];

function Badge({ s }) {
  const map = {
    "진행":["#E6F1FB","#185FA5"],
    "완료":["#EAF3DE","#3B6D11"],
    "대기":["#F1EFE8","#5F5E5A"],
    "지연":["#FCEBEB","#A32D2D"],
    "운송중":["#E6F1FB","#185FA5"],
    "출고대기":["#FAEEDA","#854F0B"],
    "납품완료":["#EAF3DE","#3B6D11"],
  };
  const [bg, color] = map[s] || ["#F1EFE8","#5F5E5A"];
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

function SalesTab({ projects }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ client:"", title:"", assignee:"", status:"진행", progress:0, note:"" });
  const [filter, setFilter] = useState("전체");

  const openAdd = () => {
    setEditItem(null);
    setForm({ client:"", title:"", assignee:"", status:"진행", progress:0, note:"" });
    setShowForm(true);
  };
  const openEdit = (p) => {
    setEditItem(p);
    setForm({ client:p.client||"", title:p.title||"", assignee:p.assignee||"", status:p.status||"진행", progress:p.progress||0, note:p.note||"" });
    setShowForm(true);
  };
  const save = async () => {
    if (!form.client) return;
    if (editItem) {
      await updateDoc(doc(db,"projects",editItem.id), { ...form, progress:Number(form.progress) });
    } else {
      await addDoc(collection(db,"projects"), { ...form, progress:Number(form.progress), createdAt:serverTimestamp() });
    }
    setShowForm(false);
  };
  const remove = async (id) => {
    if (window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db,"projects",id));
  };

  const counts = STATUS_LIST.reduce((acc,s) => ({ ...acc, [s]: projects.filter(p=>p.status===s).length }), {});
  const filtered = filter === "전체" ? projects : projects.filter(p => p.status === filter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["전체",...STATUS_LIST].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:"4px 14px", borderRadius:20, border:"1px solid #ddd",
              cursor:"pointer", fontSize:12,
              background: filter===s ? "#185FA5" : "#fff",
              color: filter===s ? "#fff" : "#555"
            }}>
              {s} {s==="전체" ? projects.length : (counts[s]||0)}
            </button>
          ))}
        </div>
        <button onClick={openAdd} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer", fontSize:13 }}>
          + 프로젝트 추가
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
        {filtered.map(p => {
          const barColor = p.status==="완료"?"#1D9E75":p.status==="지연"?"#E24B4A":"#378ADD";
          return (
            <div key={p.id} style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:12, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:15 }}>{p.client}</div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{p.title}</div>
                </div>
                <Badge s={p.status} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                <div style={{ background:"#f8f8f8", borderRadius:6, padding:"6px 10px" }}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>담당자</div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.assignee||"-"}</div>
                </div>
                <div style={{ background:"#f8f8f8", borderRadius:6, padding:"6px 10px" }}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>진행률</div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.progress||0}%</div>
                </div>
              </div>
              {p.note && (
                <div style={{ fontSize:12, color:"#854F0B", background:"#FFFBE6", borderRadius:6, padding:"6px 10px", marginBottom:10 }}>
                  📝 {p.note}
                </div>
              )}
              <div style={{ marginBottom:12 }}>
                <div style={{ height:5, background:"#eee", borderRadius:3 }}>
                  <div style={{ height:"100%", width:(p.progress||0)+"%", background:barColor, borderRadius:3, transition:"width 0.3s" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                <button onClick={() => openEdit(p)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:12 }}>수정</button>
                <button onClick={() => remove(p.id)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #fcc", background:"#fff", color:"#E24B4A", cursor:"pointer", fontSize:12 }}>삭제</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color:"#aaa", padding:20 }}>해당 상태의 프로젝트가 없어요</div>}
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, width:360, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ marginBottom:16, fontWeight:500 }}>{editItem ? "프로젝트 수정" : "프로젝트 추가"}</h3>
            {[["client","거래처"],["title","프로젝트 제목"],["note","메모 (선택)"]].map(([k,label]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>{label}</div>
                <input value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }} />
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>담당자</div>
              <select value={form.assignee} onChange={e => setForm({...form,assignee:e.target.value})}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
                <option value="">선택</option>
                {STAFF.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>상태</div>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
                {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:3 }}>진행률 {form.progress}%</div>
              <input type="range" min="0" max="100" step="5" value={form.progress}
                onChange={e => setForm({...form,progress:e.target.value})} style={{ width:"100%" }} />
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"8px 16px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>취소</button>
              <button onClick={save} style={{ padding:"8px 16px", borderRadius:6, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>저장</button>
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
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    });
    return unsub;
  }, [channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db,"messages",channel,"chats"), {
      text: input, name: user.displayName,
      uid: user.uid, type:"text", createdAt: serverTimestamp()
    });
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
      await addDoc(collection(db,"messages",channel,"chats"), {
        text: file.name, url, name: user.displayName,
        uid: user.uid, type: isImage ? "image" : "file",
        createdAt: serverTimestamp()
      });
    } catch(err) {
      alert("업로드 실패: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  };

  const deleteMsg = async (msg) => {
    if (msg.uid !== user.uid) return alert("본인 메시지만 삭제할 수 있어요");
    if (window.confirm("메시지를 삭제하시겠습니까?")) {
      await deleteDoc(doc(db,"messages",channel,"chats",msg.id));
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 112px)" }}>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:2, padding:"0 0 10px" }}>
        {messages.map((m, i) => {
          const isMe = m.name === user.displayName;
          const showDate = i === 0 || !isSameDay(messages[i-1].createdAt, m.createdAt);
          return (
            <div key={m.id}>
              {showDate && (
                <div style={{ textAlign:"center", margin:"12px 0 8px" }}>
                  <span style={{ fontSize:11, color:"#aaa", background:"#f5f5f5", padding:"3px 12px", borderRadius:20 }}>
                    {formatDate(m.createdAt)}
                  </span>
                </div>
              )}
              <div style={{ display:"flex", gap:8, flexDirection:isMe?"row-reverse":"row", alignItems:"flex-end", padding:"2px 0" }}
                onMouseEnter={e => e.currentTarget.querySelector('.del-btn')?.style && (e.currentTarget.querySelector('.del-btn').style.opacity="1")}
                onMouseLeave={e => e.currentTarget.querySelector('.del-btn')?.style && (e.currentTarget.querySelector('.del-btn').style.opacity="0")}
              >
                {!isMe && (
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#E6F1FB", color:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:500, flexShrink:0 }}>
                    {m.name?.[0]}
                  </div>
                )}
                <div style={{ maxWidth:"65%" }}>
                  {!isMe && <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>{m.name}</div>}
                  <div style={{ display:"flex", alignItems:"flex-end", gap:4, flexDirection:isMe?"row-reverse":"row" }}>
                    <div>
                      {m.type === "image" ? (
                        <a href={m.url} target="_blank" rel="noreferrer">
                          <img src={m.url} alt={m.text} style={{ maxWidth:180, borderRadius:8, display:"block" }} />
                        </a>
                      ) : m.type === "file" ? (
                        <a href={m.url} target="_blank" rel="noreferrer" style={{
                          display:"flex", alignItems:"center", gap:6,
                          background: isMe?"#E6F1FB":"#f5f5f5",
                          padding:"8px 12px", borderRadius:10, fontSize:13,
                          color: isMe?"#0C447C":"#333", textDecoration:"none"
                        }}>
                          📎 {m.text}
                        </a>
                      ) : (
                        <div style={{
                          background: isMe?"#E6F1FB":"#f5f5f5",
                          padding:"8px 12px", borderRadius:10, fontSize:13,
                          color: isMe?"#0C447C":"#333"
                        }}>{m.text}</div>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap", marginBottom:2 }}>
                      {formatTime(m.createdAt)}
                    </div>
                    {isMe && (
                      <button className="del-btn" onClick={() => deleteMsg(m)} style={{
                        opacity:0, transition:"opacity 0.15s",
                        background:"none", border:"none", cursor:"pointer",
                        fontSize:11, color:"#E24B4A", padding:"2px 4px", marginBottom:2
                      }}>삭제</button>
                    )}
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
          <button onClick={() => fileRef.current.click()} style={{
            padding:"8px 10px", borderRadius:6, border:"1px solid #ddd",
            background:"#fff", cursor:"pointer", fontSize:14, color:"#888"
          }} title="파일 첨부">📎</button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && send()}
            placeholder={uploading ? "업로드 중..." : "메시지 입력..."}
            disabled={uploading}
            style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1px solid #ddd", fontSize:13 }} />
          <button onClick={send} style={{
            padding:"8px 16px", borderRadius:8, border:"none",
            background:"#185FA5", color:"#fff", cursor:"pointer"
          }}>전송</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [channel, setChannel] = useState("전체공지");
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => { const u = onAuthStateChanged(auth, setUser); return u; }, []);

  useEffect(() => {
    const u1 = onSnapshot(collection(db,"projects"), snap => setProjects(snap.docs.map(d => ({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db,"deliveries"), snap => setDeliveries(snap.docs.map(d => ({id:d.id,...d.data()}))));
    return () => { u1(); u2(); };
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  if (!user) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16 }}>
      <h1 style={{ fontSize:24, fontWeight:500 }}>에코테크 업무 시스템</h1>
      <p style={{ color:"#888" }}>Google 계정으로 로그인하세요</p>
      <button onClick={login} style={{ padding:"10px 24px", fontSize:15, cursor:"pointer", borderRadius:8, border:"1px solid #ddd", background:"#fff" }}>Google로 로그인</button>
    </div>
  );

  const navItems = [["dashboard","전체현황"],["sales","영업 프로젝트"],["delivery","납품·물류"],["staff","직원업무"]];
  const channels = ["전체공지","영업팀","물류팀"];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"sans-serif", fontSize:14 }}>
      <div style={{ width:190, background:"#f7f7f7", borderRight:"1px solid #e8e8e8", display:"flex", flexDirection:"column", padding:"12px 0" }}>
        <div style={{ padding:"0 14px 12px", fontWeight:500, fontSize:15 }}>에코테크</div>
        {navItems.map(([t,label]) => (
          <div key={t} onClick={() => setTab(t)} style={{ padding:"7px 14px", cursor:"pointer", background:tab===t?"#ebebeb":"transparent", borderRadius:6, margin:"0 6px" }}>{label}</div>
        ))}
        <div style={{ padding:"10px 14px 4px", fontSize:11, color:"#aaa", marginTop:6 }}>메신저</div>
        {channels.map(ch => (
          <div key={ch} onClick={() => { setTab("chat"); setChannel(ch); }} style={{ padding:"7px 14px", cursor:"pointer", background:tab==="chat"&&channel===ch?"#ebebeb":"transparent", borderRadius:6, margin:"0 6px" }}># {ch}</div>
        ))}
        <div style={{ marginTop:"auto", padding:"12px 14px", fontSize:12, color:"#666" }}>
          <div style={{ fontWeight:500 }}>{user.displayName}</div>
          <div onClick={logout} style={{ cursor:"pointer", color:"#999", marginTop:3 }}>로그아웃</div>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"12px 20px", borderBottom:"1px solid #e8e8e8", fontWeight:500, fontSize:15 }}>
          {tab==="dashboard"?"전체현황":tab==="sales"?"영업 프로젝트":tab==="delivery"?"납품·물류":tab==="staff"?"직원업무":"# "+channel}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>

          {tab==="dashboard" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
                {[
                  ["진행 프로젝트", projects.filter(p=>p.status==="진행").length+"건"],
                  ["납품 대기", deliveries.filter(d=>d.status!=="납품완료").length+"건"],
                  ["완료", projects.filter(p=>p.status==="완료").length+"건"],
                  ["전체", projects.length+"건"],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:"#f5f5f5", borderRadius:8, padding:14 }}>
                    <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:22, fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight:500, marginBottom:10 }}>최근 프로젝트</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
                {projects.slice(0,4).map(p => (
                  <div key={p.id} style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:10, padding:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontWeight:500 }}>{p.client}</span><Badge s={p.status} />
                    </div>
                    <div style={{ color:"#888", fontSize:12 }}>{p.title}</div>
                    <div style={{ marginTop:8, height:4, background:"#eee", borderRadius:2 }}>
                      <div style={{ height:"100%", width:(p.progress||0)+"%", background:"#378ADD", borderRadius:2 }} />
                    </div>
                  </div>
                ))}
                {projects.length===0 && <div style={{ color:"#aaa" }}>영업 프로젝트에서 추가하세요</div>}
              </div>
            </div>
          )}

          {tab==="sales" && <SalesTab projects={projects} />}

          {tab==="delivery" && (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
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
          )}

          {tab==="staff" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10 }}>
              {STAFF.map((name,i) => (
                <div key={name} style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:10, padding:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:AV_BG[i], color:AV_FG[i], display:"flex", alignItems:"center", justifyContent:"center", fontWeight:500 }}>{name[0]}</div>
                    <div style={{ fontWeight:500 }}>{name}</div>
                  </div>
                  <div style={{ color:"#888", fontSize:12 }}>담당 프로젝트: {projects.filter(p=>p.assignee===name).length}건</div>
                </div>
              ))}
            </div>
          )}

          {tab==="chat" && <ChatTab user={user} channel={channel} />}
        </div>
      </div>
    </div>
  );
}