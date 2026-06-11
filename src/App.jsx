import { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, doc, updateDoc } from "firebase/firestore";

const STAFF = ["김영업","이물류","박정산","최영업"];
const AV_COLORS = ["#E6F1FB","#E1F5EE","#FAECE7","#EEEDFE"];
const AV_TEXT = ["#185FA5","#0F6E56","#993C1D","#534AB7"];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [channel, setChannel] = useState("전체공지");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({type:"sales",client:"",content:"",amount:"",date:"",status:"진행"});

  useEffect(() => { onAuthStateChanged(auth, setUser); }, []);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db,"projects"), snap => setProjects(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const unsub2 = onSnapshot(collection(db,"deliveries"), snap => setDeliveries(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    const q = query(collection(db,"messages",channel,"chats"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return unsub;
  }, [channel]);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await addDoc(collection(db,"messages",channel,"chats"), { text:input, name:user.displayName, createdAt:serverTimestamp() });
    setInput("");
  };

  const addItem = async () => {
    if (!form.client) return;
    if (form.type === "sales") await addDoc(collection(db,"projects"), {...form, progress:0, createdAt:serverTimestamp()});
    else await addDoc(collection(db,"deliveries"), {...form, createdAt:serverTimestamp()});
    setShowForm(false);
    setForm({type:"sales",client:"",content:"",amount:"",date:"",status:"진행"});
  };

  const statusBadge = (s) => {
    const map = {"진행":"#E6F1FB|#185FA5","완료":"#EAF3DE|#3B6D11","대기":"#F1EFE8|#5F5E5A","지연":"#FCEBEB|#A32D2D","운송중":"#E6F1FB|#185FA5","출고대기":"#FAEEDA|#854F0B","납품완료":"#EAF3DE|#3B6D11"};
    const [bg,color] = (map[s]||"#F1EFE8|#5F5E5A").split("|");
    return <span style={{background:bg,color,fontSize:11,padding:"2px 8px",borderRadius:8}}>{s}</span>;
  };

  if (!user) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:16}}>
      <h1 style={{fontSize:24,fontWeight:500}}>에코테크 업무 시스템</h1>
      <p style={{color:"#888"}}>Google 계정으로 로그인하세요</p>
      <button onClick={login} style={{padding:"10px 24px",fontSize:15,cursor:"pointer",borderRadius:8,border:"1px solid #ddd",background:"#fff"}}>Google로 로그인</button>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"sans-serif",fontSize:14}}>
      <div style={{width:190,background:"#f7f7f7",borderRight:"1px solid #e8e8e8",display:"flex",flexDirection:"column",padding:"12px 0"}}>
        <div style={{padding:"0 14px 12px",fontWeight:500,fontSize:15}}>에코테크</div>
        {[["dashboard","전체현황"],["sales","영업·거래처"],["delivery","납품·물류"],["staff","직원업무"]].map(([t,label])=>(
          <div key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",cursor:"pointer",background:tab===t?"#ebebeb":"transparent",borderRadius:6,margin:"0 6px"}}>{label}</div>
        ))}
        <div style={{padding:"10px 14px 4px",fontSize:11,color:"#aaa",marginTop:6}}>메신저</div>
        {["전체공지","영업팀","물류팀"].map(ch=>(
          <div key={ch} onClick={()=>{setTab("chat");setChannel(ch);}} style={{padding:"7px 14px",cursor:"pointer",background:tab==="chat"&&channel===ch?"#ebebeb":"transparent",borderRadius:6,margin:"0 6px"}}># {ch}</div>
        ))}
        <div style={{marginTop:"auto",padding:"12px 14px",fontSize:12,color:"#666"}}>
          <div style={{fontWeight:500}}>{user.displayName}</div>
          <div onClick={logout} style={{cursor:"pointer",color:"#999",marginTop:3}}>로그아웃</div>
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 20px",borderBottom:"1px solid #e8e8e8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:500,fontSize:15}}>
            {tab==="dashboard"?"전체현황":tab==="sales"?"영업·거래처":tab==="delivery"?"납품·물류":tab==="staff"?"직원업무":"# "+channel}
          </span>
          {(tab==="sales"||tab==="delivery")&&<button onClick={()=>setShowForm(true)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #ddd",background:"#fff",cursor:"pointer"}}>+ 추가</button>}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:20}}>
          {tab==="dashboard"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20}}>
                {[["진행 프로젝트",projects.filter(p=>p.status==="진행").length+"건"],["납품 대기",deliveries.filter(d=>d.status!=="납품완료").length+"건"],["완료",projects.filter(p=>p.status==="완료").length+"건"],["전체",projects.length+"건"]].map(([l,v])=>(
                  <div key={l} style={{background:"#f5f5f5",borderRadius:8,padding:14}}>
                    <div style={{fontSize:11,color:"#888",marginBottom:4}}>{l}</div>
                    <div style={{fontSize:22,fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{fontWeight:500,marginBottom:10}}>최근 프로젝트</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
                {projects.slice(0,4).map(p=>(
                  <div key={p.id} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:10,padding:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:500}}>{p.client}</span>{statusBadge(p.status)}</div>
                    <div style={{color:"#888",fontSize:12}}>{p.content}</div>
                    <div style={{color:"#888",fontSize:12}}>{p.amount} · {p.date}</div>
                    <div style={{marginTop:8,height:3,background:"#eee",borderRadius:2}}><div style={{height:"100%",width:(p.progress||0)+"%",background:"#378ADD",borderRadius:2}}/></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="sales"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
              {projects.map(p=>(
                <div key={p.id} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:10,padding:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:500}}>{p.client}</span>{statusBadge(p.status)}</div>
                  <div style={{color:"#666",fontSize:12,marginBottom:4}}>{p.content}</div>
                  <div style={{color:"#888",fontSize:12}}>{p.amount} · {p.date}</div>
                  <div style={{marginTop:8,height:3,background:"#eee",borderRadius:2}}><div style={{height:"100%",width:(p.progress||0)+"%",background:"#378ADD",borderRadius:2}}/></div>
                </div>
              ))}
              {projects.length===0&&<div style={{color:"#aaa"}}>+ 추가 버튼으로 프로젝트를 등록하세요</div>}
            </div>
          )}

          {tab==="delivery"&&(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr>{["거래처","품목","수량","납기일","상태"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",borderBottom:"1px solid #e8e8e8",color:"#888",fontWeight:400}}>{h}</th>)}</tr></thead>
              <tbody>{deliveries.map(d=>(
                <tr key={d.id}>{[d.client,d.content,d.amount,d.date].map((v,i)=><td key={i} style={{padding:"10px 10px",borderBottom:"1px solid #f0f0f0"}}>{v}</td>)}<td style={{padding:"10px 10px",borderBottom:"1px solid #f0f0f0"}}>{statusBadge(d.status)}</td></tr>
              ))}</tbody>
            </table>
          )}

          {tab==="staff"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
              {STAFF.map((name,i)=>(
                <div key={name} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:10,padding:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:AV_COLORS[i],color:AV_TEXT[i],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>{name[0]}</div>
                    <div style={{fontWeight:500}}>{name}</div>
                  </div>
                  <div style={{color:"#888",fontSize:12}}>담당 프로젝트: {projects.filter(p=>p.assignee===name).length}건</div>
                </div>
              ))}
            </div>
          )}

          {tab==="chat"&&(
            <div style