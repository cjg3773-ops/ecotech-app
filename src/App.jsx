import { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("전체공지");

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
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

  if (!user) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16 }}>
      <h1 style={{ fontSize:24, fontWeight:500 }}>에코테크 업무 시스템</h1>
      <p style={{ color:"#888" }}>Google 계정으로 로그인하세요</p>
      <button onClick={login} style={{ padding:"10px 24px", fontSize:15, cursor:"pointer", borderRadius:8, border:"1px solid #ddd", background:"#fff" }}>
        Google로 로그인
      </button>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"sans-serif" }}>
      <div style={{ width:200, background:"#f5f5f5", borderRight:"1px solid #e0e0e0", display:"flex", flexDirection:"column", padding:"16px 0" }}>
        <div style={{ padding:"0 16px 16px", fontWeight:500 }}>에코테크</div>
        {["dashboard","sales","delivery","staff"].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ padding:"8px 16px", cursor:"pointer", background: tab===t ? "#e8e8e8":"transparent", fontSize:14 }}>
            {t==="dashboard"?"전체현황":t==="sales"?"영업·거래처":t==="delivery"?"납품·물류":"직원업무"}
          </div>
        ))}
        <div style={{ padding:"8px 16px 4px", fontSize:11, color:"#aaa", marginTop:8 }}>메신저</div>
        {["전체공지","영업팀","물류팀"].map(ch => (
          <div key={ch} onClick={() => { setTab("chat"); setChannel(ch); }} style={{ padding:"8px 16px", cursor:"pointer", background: tab==="chat" && channel===ch ? "#e8e8e8":"transparent", fontSize:14 }}>
            # {ch}
          </div>
        ))}
        <div style={{ marginTop:"auto", padding:"16px", fontSize:13, color:"#666" }}>
          <div>{user.displayName}</div>
          <div onClick={logout} style={{ cursor:"pointer", color:"#999", fontSize:12, marginTop:4 }}>로그아웃</div>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        {tab !== "chat" ? (
          <div style={{ padding:24 }}>
            <h2 style={{ fontSize:18, fontWeight:500, marginBottom:16 }}>
              {tab==="dashboard"?"전체 현황":tab==="sales"?"영업·거래처":tab==="delivery"?"납품·물류":"직원 업무"}
            </h2>
            <p style={{ color:"#888" }}>데이터를 여기에 추가해 나갈 예정입니다.</p>
          </div>
        ) : (
          <>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #e0e0e0", fontWeight:500 }}># {channel}</div>
            <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:8 }}>
              {messages.map(m => (
                <div key={m.id}>
                  <span style={{ fontWeight:500, fontSize:13 }}>{m.name} </span>
                  <span style={{ fontSize:13 }}>{m.text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:12, borderTop:"1px solid #e0e0e0", display:"flex", gap:8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMessage()} placeholder="메시지 입력..." style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1px solid #ddd", fontSize:14 }} />
              <button onClick={sendMessage} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#185FA5", color:"#fff", cursor:"pointer" }}>전송</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}