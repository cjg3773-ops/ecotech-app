import { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "firebase/firestore";

const STAFF = ["김영업","이물류","박정산","최영업"];
const AV_BG = ["#E6F1FB","#E1F5EE","#FAECE7","#EEEDFE"];
const AV_FG = ["#185FA5","#0F6E56","#993C1D","#534AB7"];

function Badge({ s }) {
  const map = {
    "진행": ["#E6F1FB","#185FA5"],
    "완료": ["#EAF3DE","#3B6D11"],
    "대기": ["#F1EFE8","#5F5E5A"],
    "지연": ["#FCEBEB","#A32D2D"],
    "운송중": ["#E6F1FB","#185FA5"],
    "출고대기": ["#FAEEDA","#854F0B"],
    "납품완료": ["#EAF3DE","#3B6D11"],
  };
  const [bg, color] = map[s] || ["#F1EFE8","#5F5E5A"];
  return (
    <span style={{
      background: bg, color,
      fontSize: 11, padding: "2px 8px", borderRadius: 8
    }}>{s}</span>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [channel, setChannel] = useState("전체공지");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("sales");
  const [form, setForm] = useState({
    client: "", content: "", amount: "", date: "", status: "진행"
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "projects"), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u2 = onSnapshot(collection(db, "deliveries"), snap => {
      setDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "messages", channel, "chats"),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [channel]);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db, "messages", channel, "chats"), {
      text: input,
      name: user.displayName,
      createdAt: serverTimestamp(),
    });
    setInput("");
  };

  const addItem = async () => {
    if (!form.client) return;
    const col = formType === "sales" ? "projects" : "deliveries";
    await addDoc(collection(db, col), {
      ...form,
      progress: 0,
      createdAt: serverTimestamp(),
    });
    setShowForm(false);
    setForm({ client: "", content: "", amount: "", date: "", status: "진행" });
  };

  if (!user) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100vh", gap: 16
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 500 }}>에코테크 업무 시스템</h1>
        <p style={{ color: "#888" }}>Google 계정으로 로그인하세요</p>
        <button onClick={login} style={{
          padding: "10px 24px", fontSize: 15, cursor: "pointer",
          borderRadius: 8, border: "1px solid #ddd", background: "#fff"
        }}>
          Google로 로그인
        </button>
      </div>
    );
  }

  const navItems = [
    ["dashboard", "전체현황"],
    ["sales", "영업·거래처"],
    ["delivery", "납품·물류"],
    ["staff", "직원업무"],
  ];

  const channels = ["전체공지", "영업팀", "물류팀"];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", fontSize: 14 }}>
      <div style={{
        width: 190, background: "#f7f7f7",
        borderRight: "1px solid #e8e8e8",
        display: "flex", flexDirection: "column", padding: "12px 0"
      }}>
        <div style={{ padding: "0 14px 12px", fontWeight: 500, fontSize: 15 }}>에코테크</div>

        {navItems.map(([t, label]) => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", cursor: "pointer",
            background: tab === t ? "#ebebeb" : "transparent",
            borderRadius: 6, margin: "0 6px"
          }}>{label}</div>
        ))}

        <div style={{ padding: "10px 14px 4px", fontSize: 11, color: "#aaa", marginTop: 6 }}>메신저</div>

        {channels.map(ch => (
          <div key={ch} onClick={() => { setTab("chat"); setChannel(ch); }} style={{
            padding: "7px 14px", cursor: "pointer",
            background: tab === "chat" && channel === ch ? "#ebebeb" : "transparent",
            borderRadius: 6, margin: "0 6px"
          }}># {ch}</div>
        ))}

        <div style={{ marginTop: "auto", padding: "12px 14px", fontSize: 12, color: "#666" }}>
          <div style={{ fontWeight: 500 }}>{user.displayName}</div>
          <div onClick={logout} style={{ cursor: "pointer", color: "#999", marginTop: 3 }}>로그아웃</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          padding: "12px 20px", borderBottom: "1px solid #e8e8e8",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>
            {tab === "dashboard" ? "전체현황"
              : tab === "sales" ? "영업·거래처"
              : tab === "delivery" ? "납품·물류"
              : tab === "staff" ? "직원업무"
              : "# " + channel}
          </span>
          {(tab === "sales" || tab === "delivery") && (
            <button onClick={() => { setFormType(tab); setShowForm(true); }} style={{
              padding: "6px 14px", borderRadius: 6,
              border: "1px solid #ddd", background: "#fff", cursor: "pointer"
            }}>+ 추가</button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

          {tab === "dashboard" && (
            <div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10, marginBottom: 20
              }}>
                {[
                  ["진행 프로젝트", projects.filter(p => p.status === "진행").length + "건"],
                  ["납품 대기", deliveries.filter(d => d.status !== "납품완료").length + "건"],
                  ["완료", projects.filter(p => p.status === "완료").length + "건"],
                  ["전체", projects.length + "건"],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "#f5f5f5", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 22, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight: 500, marginBottom: 10 }}>최근 프로젝트</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10
              }}>
                {projects.slice(0, 4).map(p => (
                  <div key={p.id} style={{
                    background: "#fff", border: "1px solid #e8e8e8",
                    borderRadius: 10, padding: 14
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{p.client}</span>
                      <Badge s={p.status} />
                    </div>
                    <div style={{ color: "#888", fontSize: 12 }}>{p.content}</div>
                    <div style={{ color: "#888", fontSize: 12 }}>{p.amount} · {p.date}</div>
                    <div style={{ marginTop: 8, height: 3, background: "#eee", borderRadius: 2 }}>
                      <div style={{
                        height: "100%", width: (p.progress || 0) + "%",
                        background: "#378ADD", borderRadius: 2
                      }} />
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div style={{ color: "#aaa" }}>영업·거래처에서 프로젝트를 추가하세요</div>
                )}
              </div>
            </div>
          )}

          {tab === "sales" && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10
            }}>
              {projects.map(p => (
                <div key={p.id} style={{
                  background: "#fff", border: "1px solid #e8e8e8",
                  borderRadius: 10, padding: 14
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>{p.client}</span>
                    <Badge s={p.status} />
                  </div>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>{p.content}</div>
                  <div style={{ color: "#888", fontSize: 12 }}>{p.amount} · {p.date}</div>
                  <div style={{ marginTop: 8, height: 3, background: "#eee", borderRadius: 2 }}>
                    <div style={{
                      height: "100%", width: (p.progress || 0) + "%",
                      background: "#378ADD", borderRadius: 2
                    }} />
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div style={{ color: "#aaa" }}>+ 추가 버튼으로 프로젝트를 등록하세요</div>
              )}
            </div>
          )}

          {tab === "delivery" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["거래처", "품목", "수량", "납기일", "상태"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "8px 10px",
                      borderBottom: "1px solid #e8e8e8",
                      color: "#888", fontWeight: 400
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{d.client}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{d.content}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{d.amount}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>{d.date}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}><Badge s={d.status} /></td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 20, color: "#aaa" }}>+ 추가 버튼으로 납품을 등록하세요</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "staff" && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 10
            }}>
              {STAFF.map((name, i) => (
                <div key={name} style={{
                  background: "#fff", border: "1px solid #e8e8e8",
                  borderRadius: 10, padding: 14
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: AV_BG[i], color: AV_FG[i],
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 500
                    }}>{name[0]}</div>
                    <div style={{ fontWeight: 500 }}>{name}</div>
                  </div>
                  <div style={{ color: "#888", fontSize: 12 }}>
                    담당 프로젝트: {projects.filter(p => p.assignee === name).length}건
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
              <div style={{
                flex: 1, overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10
              }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    display: "flex", gap: 8,
                    flexDirection: m.name === user.displayName ? "row-reverse" : "row"
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "#E6F1FB", color: "#185FA5",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 11,
                      fontWeight: 500, flexShrink: 0
                    }}>{m.name?.[0]}</div>
                    <div>
                      {m.name !== user.displayName && (
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{m.name}</div>
                      )}
                      <div style={{
                        background: m.name === user.displayName ? "#E6F1FB" : "#f5f5f5",
                        padding: "8px 12px", borderRadius: 10, fontSize: 13,
                        maxWidth: 280,
                        color: m.name === user.displayName ? "#0C447C" : "#333"
                      }}>{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                display: "flex", gap: 8,
                paddingTop: 10, borderTop: "1px solid #e8e8e8"
              }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="메시지 입력..."
                  style={{
                    flex: 1, padding: "8px 12px",
                    borderRadius: 8, border: "1px solid #ddd", fontSize: 13
                  }}
                />
                <button onClick={sendMessage} style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "none", background: "#185FA5",
                  color: "#fff", cursor: "pointer"
                }}>전송</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 320 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 500 }}>
              {formType === "sales" ? "프로젝트 추가" : "납품 추가"}
            </h3>
            {[
              ["client", "거래처"],
              ["content", "내용"],
              ["amount", "금액/수량"],
              ["date", "날짜"],
            ].map(([k, label]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>{label}</div>
                <input
                  value={form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })}
                  style={{
                    width: "100%", padding: "7px 10px",
                    borderRadius: 6, border: "1px solid #ddd", fontSize: 13
                  }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 3 }}>상태</div>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={{
                  width: "100%", padding: "7px 10px",
                  borderRadius: 6, border: "1px solid #ddd", fontSize: 13
                }}
              >
                {["진행","완료","대기","지연","출고대기","운송중","납품완료"].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{
                padding: "7px 16px", borderRadius: 6,
                border: "1px solid #ddd", background: "#fff", cursor: "pointer"
              }}>취소</button>
              <button onClick={addItem} style={{
                padding: "7px 16px", borderRadius: 6,
                border: "none", background: "#185FA5",
                color: "#fff", cursor: "pointer"
              }}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}