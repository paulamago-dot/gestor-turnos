import { useState, useEffect, useMemo } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SI = {
  M: { l: "Mañana",  h: "07:30–14:30", c: "#d97706", bg: "#fef9ee", sbg: "#fde68a", t: "#78350f" },
  T: { l: "Tarde",   h: "14:30–21:30", c: "#0284c7", bg: "#f0f9ff", sbg: "#bae6fd", t: "#0c4a6e" },
  N: { l: "Noche",   h: "21:30–07:30", c: "#6d28d9", bg: "#f5f3ff", sbg: "#ddd6fe", t: "#2e1065" },
};
const GC  = ["#e11d48","#0284c7","#059669","#7c3aed","#d97706"];
const GCL = ["#fff1f2","#f0f9ff","#ecfdf5","#f5f3ff","#fffbeb"];
const GCS = ["#fda4af","#7dd3fc","#6ee7b7","#c4b5fd","#fcd34d"];

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WDAYS  = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

// Guard 1 starts April 7 2026; each subsequent guard is +1 day
const GSD = [0,1,2,3,4].map(i => new Date(2026, 3, 7 + i));

const AT = [
  { id: "vacaciones",      l: "Vacaciones",           c: "#16a34a", r: true  },
  { id: "asuntos_propios", l: "Asuntos Propios",       c: "#ca8a04", r: true  },
  { id: "comp_festivos",   l: "Comp. Festivos",        c: "#ea580c", r: true  },
  { id: "merced",          l: "Merced",                c: "#9333ea", r: true  },
  { id: "art48",           l: "Art. 48 TREBEP",        c: "#dc2626", r: false },
  { id: "baja",            l: "Baja",                  c: "#7f1d1d", r: false },
  { id: "otros",           l: "Otros",                 c: "#6b7280", r: false },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getShifts(gIdx, date) {
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s0 = new Date(GSD[gIdx]);
  const diff = Math.round((d0 - s0) / 86400000);
  const p = ((diff % 5) + 5) % 5;
  return p === 0 ? ["M","T"] : p === 1 ? ["N"] : [];
}
function ds(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function pd(str) { const [y,m,d] = str.split("-").map(Number); return new Date(y,m-1,d); }
function dim(y,m) { return new Date(y,m+1,0).getDate(); }
function fdow(y,m) { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; }
function yos(sd) { return Math.floor((Date.now()-new Date(sd))/(365.25*86400000)); }
function vacDays(y) { return y>=30?26:y>=25?25:y>=20?24:y>=15?23:22; }
function initials(name) { return name.split(" ").slice(0,2).map(w=>w[0]).join(""); }
const TODAY = ds(new Date());

// Returns true if the shift has already started (can't swap anymore)
const SHIFT_START = { M: [7,30], T: [14,30], N: [21,30] };
function isPastShift(dateStr, shift) {
  const now   = new Date();
  const today = ds(now);
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  // Same day — check if shift start time has passed
  const [h, m] = SHIFT_START[shift] || [0,0];
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INIT_USERS = [
  {id:0,name:"Administrador",email:"admin",pwd:"admin",role:"admin",gId:null,cardNum:"ADM-000",sd:"2000-01-01",bal:{}},
  {id:1,name:"Ana García",email:"ana",pwd:"1234",role:"user",gId:0,cardNum:"G1-001",sd:"2015-03-15",bal:{vacaciones:24,asuntos_propios:6,comp_festivos:4,merced:2}},
  {id:2,name:"Carlos López",email:"carlos",pwd:"1234",role:"user",gId:0,cardNum:"G1-002",sd:"2008-06-01",bal:{vacaciones:25,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:3,name:"María Sánchez",email:"maria",pwd:"1234",role:"user",gId:0,cardNum:"G1-003",sd:"2020-09-01",bal:{vacaciones:22,asuntos_propios:5,comp_festivos:5,merced:2}},
  {id:4,name:"Pedro Martín",email:"pedro",pwd:"1234",role:"user",gId:0,cardNum:"G1-004",sd:"2012-11-20",bal:{vacaciones:23,asuntos_propios:4,comp_festivos:2,merced:1}},
  {id:5,name:"Laura Torres",email:"laura",pwd:"1234",role:"user",gId:0,cardNum:"G1-005",sd:"2018-04-10",bal:{vacaciones:22,asuntos_propios:6,comp_festivos:4,merced:2}},
  {id:6,name:"Javier Ruiz",email:"javier",pwd:"1234",role:"user",gId:1,cardNum:"G2-001",sd:"2011-07-15",bal:{vacaciones:25,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:7,name:"Elena Díaz",email:"elena",pwd:"1234",role:"user",gId:1,cardNum:"G2-002",sd:"2019-02-01",bal:{vacaciones:22,asuntos_propios:6,comp_festivos:4,merced:2}},
  {id:8,name:"Miguel Fernández",email:"miguel",pwd:"1234",role:"user",gId:1,cardNum:"G2-003",sd:"2007-08-20",bal:{vacaciones:26,asuntos_propios:6,comp_festivos:2,merced:1}},
  {id:9,name:"Sara Jiménez",email:"sara",pwd:"1234",role:"user",gId:1,cardNum:"G2-004",sd:"2016-05-12",bal:{vacaciones:23,asuntos_propios:5,comp_festivos:5,merced:2}},
  {id:10,name:"Roberto Moreno",email:"roberto",pwd:"1234",role:"user",gId:1,cardNum:"G2-005",sd:"2022-01-10",bal:{vacaciones:22,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:11,name:"Cristina Álvarez",email:"cristina",pwd:"1234",role:"user",gId:2,cardNum:"G3-001",sd:"2014-10-05",bal:{vacaciones:23,asuntos_propios:6,comp_festivos:4,merced:2}},
  {id:12,name:"David Romero",email:"david",pwd:"1234",role:"user",gId:2,cardNum:"G3-002",sd:"2009-03-22",bal:{vacaciones:25,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:13,name:"Isabel Navarro",email:"isabel",pwd:"1234",role:"user",gId:2,cardNum:"G3-003",sd:"2021-06-15",bal:{vacaciones:22,asuntos_propios:5,comp_festivos:5,merced:2}},
  {id:14,name:"Francisco Gil",email:"fran",pwd:"1234",role:"user",gId:2,cardNum:"G3-004",sd:"2013-08-30",bal:{vacaciones:23,asuntos_propios:6,comp_festivos:2,merced:1}},
  {id:15,name:"Teresa Vargas",email:"teresa",pwd:"1234",role:"user",gId:2,cardNum:"G3-005",sd:"2017-12-01",bal:{vacaciones:22,asuntos_propios:4,comp_festivos:4,merced:2}},
  {id:16,name:"Antonio Serrano",email:"antonio",pwd:"1234",role:"user",gId:3,cardNum:"G4-001",sd:"2010-05-18",bal:{vacaciones:25,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:17,name:"Pilar Molina",email:"pilar",pwd:"1234",role:"user",gId:3,cardNum:"G4-002",sd:"2023-03-01",bal:{vacaciones:22,asuntos_propios:6,comp_festivos:5,merced:2}},
  {id:18,name:"Sergio Herrera",email:"sergio",pwd:"1234",role:"user",gId:3,cardNum:"G4-003",sd:"2006-11-25",bal:{vacaciones:26,asuntos_propios:6,comp_festivos:2,merced:1}},
  {id:19,name:"Natalia Castro",email:"natalia",pwd:"1234",role:"user",gId:3,cardNum:"G4-004",sd:"2018-07-14",bal:{vacaciones:22,asuntos_propios:5,comp_festivos:4,merced:2}},
  {id:20,name:"Manuel Ortega",email:"manuel",pwd:"1234",role:"user",gId:3,cardNum:"G4-005",sd:"2015-09-08",bal:{vacaciones:24,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:21,name:"Lucía Guerrero",email:"lucia",pwd:"1234",role:"user",gId:4,cardNum:"G5-001",sd:"2016-01-20",bal:{vacaciones:23,asuntos_propios:6,comp_festivos:4,merced:2}},
  {id:22,name:"Víctor Delgado",email:"victor",pwd:"1234",role:"user",gId:4,cardNum:"G5-002",sd:"2011-04-05",bal:{vacaciones:25,asuntos_propios:6,comp_festivos:3,merced:1}},
  {id:23,name:"Carmen Rubio",email:"carmen",pwd:"1234",role:"user",gId:4,cardNum:"G5-003",sd:"2020-11-15",bal:{vacaciones:22,asuntos_propios:5,comp_festivos:5,merced:2}},
  {id:24,name:"Raúl Medina",email:"raul",pwd:"1234",role:"user",gId:4,cardNum:"G5-004",sd:"2009-06-30",bal:{vacaciones:25,asuntos_propios:6,comp_festivos:2,merced:1}},
  {id:25,name:"Patricia Suárez",email:"patricia",pwd:"1234",role:"user",gId:4,cardNum:"G5-005",sd:"2014-02-28",bal:{vacaciones:23,asuntos_propios:6,comp_festivos:4,merced:2}},
];

const INIT_PENDING = [
  {id:100,name:"Fernando Costa",email:"fernando@gov.es",phone:"677888999",cardNum:"G3-006",gId:2,sd:"2024-01-15",role:"user",pwd:"1234",bal:{}}
];

// ─── REUSABLE SMALL COMPONENTS ────────────────────────────────────────────────
function Avatar({ name, size=32, color="#e11d48" }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",backgroundColor:color+"25",
      color,fontWeight:700,fontSize:size*0.35,display:"flex",alignItems:"center",
      justifyContent:"center",flexShrink:0}}>
      {initials(name)}
    </div>
  );
}

function ShiftChip({ shift, small }) {
  const s = SI[shift]; if(!s) return null;
  return (
    <span style={{backgroundColor:s.c,color:"white",fontWeight:700,
      fontSize:small?10:11,padding:small?"1px 5px":"2px 7px",borderRadius:4,display:"inline-block"}}>
      {shift}
    </span>
  );
}

function GuardChip({ gIdx }) {
  return (
    <span style={{backgroundColor:GC[gIdx]+"20",color:GC[gIdx],fontWeight:700,
      fontSize:10,padding:"2px 7px",borderRadius:4,display:"inline-block",
      border:`1px solid ${GC[gIdx]}40`}}>
      G{gIdx+1}
    </span>
  );
}

function StatusDot({ color }) {
  return <span style={{width:8,height:8,borderRadius:"50%",backgroundColor:color,display:"inline-block",flexShrink:0}}/>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd]     = useState("");
  const [err, setErr]     = useState("");
  const [mob, setMob]     = useState(window.innerWidth < 600);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const handle = () => {
    const u = INIT_USERS.find(u => u.email === email && u.pwd === pwd);
    if (u) onLogin(u); else setErr("Usuario o contraseña incorrectos");
  };

  // Mobile: full-screen form flush to edges, no card border
  // Desktop: centered floating card
  const inputStyle = {
    background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)",
    color:"white", width:"100%", borderRadius:12, padding:"13px 14px",
    fontSize:16, outline:"none", boxSizing:"border-box",
  };

  if (mob) {
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f172a 0%,#1e3558 60%,#0f172a 100%)",
        display:"flex",flexDirection:"column",boxSizing:"border-box",
        padding:"0 0 env(safe-area-inset-bottom,0px)"}}>

        {/* Hero header */}
        <div style={{padding:"48px 24px 32px",textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#f59e0b,#ef4444)",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:28}}>🛡️</div>
          <h1 style={{color:"white",fontSize:28,fontWeight:900,margin:0,letterSpacing:-0.5}}>GestorTurnos</h1>
          <p style={{color:"#64748b",fontSize:14,margin:"6px 0 0"}}>Sistema de Gestión de Guardias</p>
        </div>

        {/* Form fills rest of screen */}
        <div style={{flex:1,background:"rgba(255,255,255,0.03)",borderTop:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"24px 24px 0 0",padding:"28px 24px 24px",display:"flex",flexDirection:"column",gap:0}}>

          <div style={{marginBottom:18}}>
            <label style={{color:"#94a3b8",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8}}>
              Usuario
            </label>
            <input style={inputStyle} value={email}
              onChange={e=>{setEmail(e.target.value);setErr("");}}
              placeholder="Tu usuario de acceso" autoCapitalize="none" autoCorrect="off"/>
          </div>

          <div style={{marginBottom:18}}>
            <label style={{color:"#94a3b8",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8}}>
              Contraseña
            </label>
            <input type="password" style={inputStyle} value={pwd}
              onChange={e=>{setPwd(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handle()}
              placeholder="••••••••"/>
          </div>

          {err && <p style={{color:"#f87171",fontSize:14,textAlign:"center",margin:"0 0 10px",fontWeight:600}}>{err}</p>}

          <button style={{background:"linear-gradient(135deg,#f59e0b,#ef4444)",width:"100%",border:"none",
            borderRadius:14,padding:"16px 0",color:"white",fontWeight:700,fontSize:17,cursor:"pointer",marginBottom:24}}
            onClick={handle}>
            Acceder al sistema
          </button>

          <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:20}}>
            <p style={{color:"#475569",fontSize:12,textAlign:"center",marginBottom:12}}>Cuentas de demostración</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{l:"Admin",e:"admin",p:"admin"},{l:"Ana – G1",e:"ana",p:"1234"},
                {l:"David – G3",e:"david",p:"1234"},{l:"Raúl – G5",e:"raul",p:"1234"}].map(a=>(
                <button key={a.e}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:12,padding:"12px 10px",color:"#94a3b8",fontSize:14,cursor:"pointer",textAlign:"center",width:"100%"}}
                  onClick={()=>{setEmail(a.e);setPwd(a.p);}}>
                  {a.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop layout ──
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f172a 0%,#1e3558 60%,#0f172a 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#f59e0b,#ef4444)",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:24}}>🛡️</div>
          <h1 style={{color:"white",fontSize:26,fontWeight:900,margin:0,letterSpacing:-0.5}}>GestorTurnos</h1>
          <p style={{color:"#64748b",fontSize:13,margin:"4px 0 0"}}>Sistema de Gestión de Guardias</p>
        </div>
        <div style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",
          border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"28px 28px 32px"}}>
          <div style={{marginBottom:16}}>
            <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Usuario</label>
            <input style={inputStyle} value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}
              placeholder="Tu usuario de acceso"/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Contraseña</label>
            <input type="password" style={inputStyle} value={pwd}
              onChange={e=>{setPwd(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handle()}
              placeholder="••••••••"/>
          </div>
          {err && <p style={{color:"#f87171",fontSize:13,textAlign:"center",margin:"0 0 8px"}}>{err}</p>}
          <button style={{background:"linear-gradient(135deg,#f59e0b,#ef4444)",width:"100%",border:"none",borderRadius:12,
            padding:"14px 0",color:"white",fontWeight:700,fontSize:16,cursor:"pointer",marginTop:8}}
            onClick={handle}>Acceder al sistema</button>
          <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:20,paddingTop:16}}>
            <p style={{color:"#475569",fontSize:11,textAlign:"center",marginBottom:10}}>Cuentas de demostración</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[{l:"Admin",e:"admin",p:"admin"},{l:"Ana – G1",e:"ana",p:"1234"},
                {l:"David – G3",e:"david",p:"1234"},{l:"Raúl – G5",e:"raul",p:"1234"}].map(a=>(
                <button key={a.e}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:10,padding:"8px 10px",color:"#64748b",fontSize:12,cursor:"pointer",textAlign:"left",width:"100%"}}
                  onClick={()=>{setEmail(a.e);setPwd(a.p);}}>
                  {a.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ABSENCE MODAL ────────────────────────────────────────────────────────────
function AbsenceModal({ date, shift, gIdx, workingCount, onConfirm, onClose }) {
  const [reason, setReason] = useState("vacaciones");
  const sel = AT.find(a => a.id === reason);
  const blocked = sel?.r && workingCount <= 3;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:100,padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:20,
        padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#111"}}>Solicitar día libre</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#9ca3af",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"8px 12px",background:"#f8fafc",borderRadius:10,marginBottom:16,fontSize:13,color:"#64748b"}}>
          <b style={{color:"#1e293b"}}>{date.getDate()} de {MONTHS[date.getMonth()]}</b>
          &nbsp;· Turno <ShiftChip shift={shift} small/>
          &nbsp;· <b style={{color: workingCount<3?"#dc2626":"#16a34a"}}>{workingCount} trabajando</b>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {AT.map(a => {
            const isBlocked = a.r && workingCount <= 3;
            return (
              <button key={a.id} onClick={()=>!isBlocked&&setReason(a.id)}
                style={{padding:"10px 12px",borderRadius:10,textAlign:"left",cursor:isBlocked?"not-allowed":"pointer",
                  border:`2px solid ${reason===a.id?a.c:"#e5e7eb"}`,
                  background:reason===a.id?a.c+"15":isBlocked?"#fafafa":"white",
                  opacity:isBlocked?0.5:1,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:600,color:isBlocked?"#9ca3af":reason===a.id?a.c:"#374151"}}>{a.l}</span>
                {isBlocked&&<span style={{fontSize:10,color:"#ef4444"}}>min. no cubierto</span>}
                {!a.r&&<span style={{fontSize:10,color:"#16a34a"}}>siempre permitido</span>}
              </button>
            );
          })}
        </div>
        <button onClick={()=>!blocked&&onConfirm(reason)}
          style={{width:"100%",padding:"11px 0",borderRadius:12,border:"none",fontWeight:700,fontSize:14,
            cursor:blocked?"not-allowed":"pointer",
            background:blocked?"#e5e7eb":GC[gIdx],color:blocked?"#9ca3af":"white"}}>
          {blocked?"Mínimo no cubierto para este motivo":"Confirmar solicitud"}
        </button>
      </div>
    </div>
  );
}

// ─── GENERAL CALENDAR MODAL ───────────────────────────────────────────────────
function GeneralModal({ date, shift, users, absences, swaps, onClose }) {
  const dateStr = ds(date);

  // Build the definitive list of rows to display
  const rows = []; // {type:"working"|"absent", worker, originalUser, g, atype, isSubstitute}

  for (let g = 0; g < 5; g++) {
    if (!getShifts(g, date).includes(shift)) continue;
    const gUsers = users.filter(u => u.gId === g && u.id !== 0);

    gUsers.forEach(u => {
      const abs    = absences.find(a => a.userId===u.id && a.date===dateStr && a.shift===shift);
      const swAway = swaps.find(s => s.status==="approved" && s.fromId===u.id && s.fromDate===dateStr && s.fromShift===shift);

      if (abs) {
        // Absent — show regardless of swap (force-majeure overrides)
        rows.push({ type:"absent", worker:u, originalUser:null, g, atype: AT.find(a=>a.id===abs.reason), isSubstitute:false });
      } else if (swAway) {
        // Gave away shift — find substitute and show them as working
        const sub = users.find(x => x.id === swAway.toId);
        if (sub) {
          rows.push({ type:"working", worker:sub, originalUser:u, g, atype:null, isSubstitute:true, subG: sub.gId });
        }
        // Original person NOT added (they gave their shift away)
      } else {
        // Working normally
        rows.push({ type:"working", worker:u, originalUser:null, g, atype:null, isSubstitute:false });
      }
    });
  }

  const working = rows.filter(r => r.type==="working");
  const absent  = rows.filter(r => r.type==="absent");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:100,padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:20,
        padding:24,width:"100%",maxWidth:460,maxHeight:"85vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <h3 style={{margin:0,fontSize:17,fontWeight:800,color:"#111"}}>
              {date.getDate()} de {MONTHS[date.getMonth()]} {date.getFullYear()}
            </h3>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
              <ShiftChip shift={shift}/>
              <span style={{fontSize:13,color:SI[shift].t}}>{SI[shift].l} · {SI[shift].h}</span>
              <span style={{fontSize:12,fontWeight:700,
                color:working.length>=3?"#16a34a":"#dc2626"}}>
                {working.length} trabajando
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#9ca3af",lineHeight:1}}>×</button>
        </div>

        {working.length > 0 && (
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:700,color:"#94a3b8",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:0.5}}>
              Trabajando ({working.length})
            </p>
            {working.map((row, i) => {
              const displayG = row.isSubstitute ? (row.subG ?? row.g) : row.g;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                  borderRadius:10,marginBottom:4,
                  background: row.isSubstitute ? "#f0fdf4" : "#f8fafc",
                  border: row.isSubstitute ? "1px solid #bbf7d0" : "1px solid #f1f5f9"}}>
                  <Avatar name={row.worker.name} size={30} color={GC[displayG]}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {row.worker.name}
                      </p>
                      <GuardChip gIdx={displayG}/>
                    </div>
                    {row.isSubstitute && row.originalUser && (
                      <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                        <span style={{fontSize:10,color:"#16a34a",fontWeight:600}}>↔ cambio con</span>
                        <span style={{fontSize:10,color:"#64748b"}}>{row.originalUser.name}</span>
                        <GuardChip gIdx={row.originalUser.gId}/>
                      </div>
                    )}
                  </div>
                  {row.isSubstitute && (
                    <span style={{fontSize:9,background:"#dcfce7",color:"#166534",
                      padding:"2px 7px",borderRadius:20,fontWeight:700,flexShrink:0}}>
                      Sustituto
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {absent.length > 0 && (
          <div>
            <p style={{fontSize:11,fontWeight:700,color:"#94a3b8",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:0.5}}>
              Ausente ({absent.length})
            </p>
            {absent.map((row, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                borderRadius:10,marginBottom:4,background:row.atype?.c+"12",
                border:`1px solid ${row.atype?.c}30`}}>
                <Avatar name={row.worker.name} size={30} color={GC[row.g]}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>{row.worker.name}</p>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
                    <GuardChip gIdx={row.g}/>
                    {row.atype && (
                      <span style={{fontSize:10,color:row.atype.c,background:row.atype.c+"20",
                        padding:"1px 6px",borderRadius:4,fontWeight:600}}>
                        {row.atype.l}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SWAP DETAIL MODAL ────────────────────────────────────────────────────────
function SwapDetailModal({ swap, users, currentUserId, onCancel, onClose, cancelLabel }) {
  const fromUser = users.find(u=>u.id===swap.fromId);
  const toUser   = users.find(u=>u.id===swap.toId);
  const iFrom    = fromUser?.gId??0;
  const iTo      = toUser?.gId??0;
  const fmt = d => d ? new Date(d).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:200,padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:20,
        padding:24,width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:800,color:"#0f172a"}}>Detalle del cambio</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#9ca3af",lineHeight:1}}>×</button>
        </div>

        {/* Shift info */}
        <div style={{background:"#f8fafc",borderRadius:12,padding:"10px 14px",marginBottom:14,
          display:"flex",alignItems:"center",gap:10}}>
          <ShiftChip shift={swap.fromShift}/>
          <span style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{swap.fromDate}</span>
          <span style={{fontSize:12,color:"#64748b"}}>{SI[swap.fromShift]?.h}</span>
        </div>

        {/* Parties */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:14}}>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
            <p style={{margin:0,fontSize:10,color:"#94a3b8",fontWeight:600}}>Cede turno</p>
            <p style={{margin:"4px 0 2px",fontSize:12,fontWeight:700,color:"#1e293b"}}>{fromUser?.name?.split(" ")[0]}</p>
            <GuardChip gIdx={iFrom}/>
          </div>
          <span style={{fontSize:18,color:"#94a3b8",textAlign:"center"}}>↔</span>
          <div style={{background:"#f8fafc",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
            <p style={{margin:0,fontSize:10,color:"#94a3b8",fontWeight:600}}>Cubre turno</p>
            <p style={{margin:"4px 0 2px",fontSize:12,fontWeight:700,color:"#1e293b"}}>{toUser?.name?.split(" ")[0]}</p>
            <GuardChip gIdx={iTo}/>
          </div>
        </div>

        {/* Timestamps */}
        <div style={{borderTop:"1px solid #f1f5f9",paddingTop:12,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:"#94a3b8"}}>Solicitado</span>
            <span style={{fontSize:11,color:"#1e293b",fontWeight:600}}>{fmt(swap.proposedAt)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:"#94a3b8"}}>Aceptado</span>
            <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>{fmt(swap.acceptedAt)}</span>
          </div>
        </div>

        <button onClick={onCancel}
          style={{width:"100%",padding:"10px",borderRadius:12,border:"2px solid #fee2e2",
            background:"#fff",color:"#dc2626",fontWeight:700,fontSize:13,cursor:"pointer"}}>
          ✕ {cancelLabel ?? "Anular cambio"}
        </button>
      </div>
    </div>
  );
}
// ─── GUARD SHIFT MODAL ───────────────────────────────────────────────────────
function GuardShiftModal({ date, shift, gIdx, users, absences, swaps, extraShifts, supplements, onClose }) {
  const dateStr = ds(date);
  const gUsers  = users.filter(u=>u.gId===gIdx&&u.id!==0);
  const rows = gUsers.map(u=>{
    const abs  = absences.find(a=>a.userId===u.id&&a.date===dateStr&&a.shift===shift);
    const swA  = swaps.find(s=>s.status==="approved"&&s.fromId===u.id&&s.fromDate===dateStr&&s.fromShift===shift);
    const ex   = extraShifts.find(e=>e.userId===u.id&&e.date===dateStr&&e.shift===shift);
    const at   = abs?AT.find(a=>a.id===abs.reason):null;
    const coverer = swA?users.find(x=>x.id===swA.toId):null;
    return {u,abs,swA,ex,at,coverer};
  });
  const swIn = swaps.filter(s=>{
    if(s.status!=="approved"||s.fromDate!==dateStr||s.fromShift!==shift) return false;
    return users.find(x=>x.id===s.fromId)?.gId===gIdx;
  });
  const working = rows.filter(r=>!r.abs&&!r.swA).length + swIn.length;
  const low     = working < 3;
  const supp    = supplements.find(s=>s.date===dateStr&&s.shift===shift);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:100,padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:20,
        padding:24,width:"100%",maxWidth:420,maxHeight:"85vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <ShiftChip shift={shift}/>
              <span style={{fontSize:15,fontWeight:800,color:"#0f172a"}}>
                {date.getDate()} de {MONTHS[date.getMonth()]} {date.getFullYear()}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <GuardChip gIdx={gIdx}/>
              <span style={{fontSize:12,color:SI[shift].t}}>{SI[shift].h}</span>
              <span style={{fontSize:12,fontWeight:700,color:low?"#dc2626":"#16a34a"}}>
                {working} trabajando{low?" ⚠️":""}
              </span>
              {supp&&<span style={{fontSize:11,color:"#16a34a",fontWeight:700}}>+{supp.amount}€</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#9ca3af",lineHeight:1}}>×</button>
        </div>
        {rows.map(({u,abs,swA,ex,at,coverer})=>{
          const isLibre = abs && at?.r;
          const isForceMajeure = abs && !at?.r;
          const bg   = isLibre?"#4ade80":isForceMajeure?"#f87171":swA?"#f8fafc":"#f0fdf4";
          const bdr  = isLibre?"#16a34a":isForceMajeure?"#dc2626":swA?"#9ca3af":"#22c55e";
          const label= abs?at?.l:swA?"Cambiado":ex?"Extra":"Trabajando";
          const lc   = isLibre?"#14532d":isForceMajeure?"#7f1d1d":swA?"#6b7280":"#15803d";
          return (
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
              borderRadius:10,marginBottom:6,background:bg,borderLeft:`3px solid ${bdr}`}}>
              <Avatar name={u.name} size={30} color={GC[gIdx]}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.name}</p>
                {swA&&coverer&&(
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#64748b"}}>
                    Cubierto por <b>{coverer.name.split(" ")[0]}</b> · G{(coverer.gId??0)+1}
                  </p>
                )}
              </div>
              <span style={{fontSize:10,fontWeight:700,background:lc+"20",color:lc,
                padding:"2px 8px",borderRadius:20,flexShrink:0}}>{label}</span>
              {ex&&<span style={{fontSize:10}}>{ex.compensation==="economic"?"💰":"📅"}</span>}
            </div>
          );
        })}
        {swIn.length>0&&(
          <div style={{marginTop:8,borderTop:"1px solid #f1f5f9",paddingTop:10}}>
            <p style={{fontSize:11,fontWeight:700,color:"#94a3b8",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:0.5}}>
              Cubriendo de otras guardias
            </p>
            {swIn.map(s=>{
              const sub=users.find(x=>x.id===s.toId);
              const orig=users.find(x=>x.id===s.fromId);
              return sub?(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                  borderRadius:10,marginBottom:6,background:"#f0fdf4",borderLeft:"3px solid #16a34a"}}>
                  <Avatar name={sub.name} size={30} color={GC[sub.gId??0]}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>{sub.name}</p>
                    <p style={{margin:"2px 0 0",fontSize:11,color:"#64748b"}}>
                      Cubre a <b>{orig?.name?.split(" ")[0]}</b> · G{(sub.gId??0)+1}
                    </p>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,background:"#dcfce7",color:"#15803d",
                    padding:"2px 8px",borderRadius:20}}>Cubriendo</span>
                </div>
              ):null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OFFER BUILDER MODAL ────────────────────────────────────────────────────
function OfferBuilderModal({ req, fromUser, currentUser, users, userWorksShift, checkConflict, onSubmit, onClose }) {
  const [options, setOptions] = useState([{date:"",shift:"M"}]);
  const inp = {border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",background:"white"};

  const addOpt  = () => options.length<5 && setOptions(o=>[...o,{date:"",shift:"M"}]);
  const remOpt  = i => options.length>1 && setOptions(o=>o.filter((_,j)=>j!==i));
  const updOpt  = (i,k,v) => setOptions(o=>o.map((x,j)=>j===i?{...x,[k]:v}:x));

  const validOptions = options.filter(o=>{
    if(!o.date) return false;
    if(isPastShift(o.date, o.shift)) return false;
    if(!userWorksShift(currentUser.id, o.date, o.shift)) return false;
    if(checkConflict(req.fromId, o.date, o.shift)) return false; // A must be able to cover it
    return true;
  });
  const canSubmit = validOptions.length > 0;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:200,padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:20,
        padding:24,width:"100%",maxWidth:440,maxHeight:"85vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:800,color:"#0f172a"}}>Hacer oferta de cambio</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#9ca3af",lineHeight:1}}>×</button>
        </div>

        {/* What A needs */}
        <div style={{background:"#f8fafc",borderRadius:12,padding:"10px 14px",marginBottom:16}}>
          <p style={{margin:0,fontSize:11,color:"#94a3b8",fontWeight:600}}>SOLICITUD DE {fromUser?.name?.toUpperCase()}</p>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
            <ShiftChip shift={req.fromShift}/>
            <span style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{req.fromDate}</span>
            <span style={{fontSize:12,color:"#64748b"}}>{SI[req.fromShift]?.h}</span>
          </div>
          <p style={{margin:"6px 0 0",fontSize:12,color:"#64748b"}}>
            Tú cubrirás este turno. A cambio, ofrece los días que quieres que te cubran:
          </p>
        </div>

        {/* Options B offers */}
        <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:"0 0 10px"}}>
          Mis opciones de retorno (mínimo 1, máximo 5):
        </p>
        {options.map((opt,i)=>{
          const isValid  = opt.date && !isPastShift(opt.date,opt.shift) && userWorksShift(currentUser.id, opt.date, opt.shift) && !checkConflict(req.fromId, opt.date, opt.shift);
          const isPast   = opt.date && isPastShift(opt.date, opt.shift);
          const noWork   = opt.date && !isPast && !userWorksShift(currentUser.id, opt.date, opt.shift);
          const aConflict= opt.date && !isPast && !noWork && checkConflict(req.fromId, opt.date, opt.shift);
          const errMsg   = isPast?"pasado" : noWork?"no trabajas" : aConflict?"la otra parte no puede":"";
          return (
            <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
              <input type="date" value={opt.date} onChange={e=>updOpt(i,"date",e.target.value)}
                style={{...inp,flex:1,borderColor:errMsg?"#fca5a5":"#e5e7eb"}}/>
              <select value={opt.shift} onChange={e=>updOpt(i,"shift",e.target.value)} style={{...inp,width:80}}>
                {["M","T","N"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {options.length>1&&<button onClick={()=>remOpt(i)}
                style={{width:28,height:28,borderRadius:"50%",background:"#fee2e2",border:"none",cursor:"pointer",color:"#dc2626",fontWeight:700,fontSize:14,flexShrink:0}}>×</button>}
              {isValid&&<span style={{fontSize:11,color:"#16a34a",flexShrink:0}}>✓</span>}
              {errMsg&&<span style={{fontSize:10,color:"#dc2626",flexShrink:0,maxWidth:80,lineHeight:1.2}}>{errMsg}</span>}
            </div>
          );
        })}

        {options.length<5&&(
          <button onClick={addOpt}
            style={{fontSize:12,color:"#0284c7",background:"#f0f9ff",border:"1px dashed #bae6fd",
              borderRadius:10,padding:"6px 12px",cursor:"pointer",fontWeight:600,marginBottom:16,width:"100%"}}>
            + Añadir otra opción
          </button>
        )}

        {!canSubmit&&<p style={{fontSize:11,color:"#dc2626",margin:"0 0 10px"}}>
          Añade al menos una opción válida en la que realmente trabajes
        </p>}

        <button onClick={()=>canSubmit&&onSubmit(validOptions)}
          disabled={!canSubmit}
          style={{width:"100%",padding:"11px",borderRadius:12,border:"none",fontWeight:700,fontSize:14,
            cursor:canSubmit?"pointer":"not-allowed",
            background:canSubmit?"#0f172a":"#e5e7eb",color:canSubmit?"white":"#9ca3af"}}>
          Enviar oferta ({validOptions.length} opción{validOptions.length!==1?"es":""})
        </button>
      </div>
    </div>
  );
}

function ExtraShiftForm({ users, onAdd, isMobile }) {
  const [uid, setUid] = useState("");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("M");
  const [comp, setComp] = useState("economic");
  const inp = {border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",background:"white"};
  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 80px 120px",gap:8,marginBottom:12}}>
      <select value={uid} onChange={e=>setUid(e.target.value)} style={{...inp,gridColumn:isMobile?"1/-1":undefined}}>
        <option value="">Seleccionar funcionario</option>
        {users.filter(u=>u.id!==0).map(u=><option key={u.id} value={u.id}>{u.name} (G{u.gId+1})</option>)}
      </select>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
      <select value={shift} onChange={e=>setShift(e.target.value)} style={inp}>
        {["M","T","N"].map(s=><option key={s}>{s}</option>)}
      </select>
      <select value={comp} onChange={e=>setComp(e.target.value)} style={{...inp,gridColumn:isMobile?"1/-1":undefined}}>
        <option value="economic">💰 Económico</option>
        <option value="days">📅 Días libres</option>
      </select>
      <button onClick={()=>{if(!uid||!date)return; onAdd({id:Date.now(),userId:Number(uid),date,shift,compensation:comp}); setUid("");setDate("");}}
        style={{gridColumn:"1/-1",background:"#0f172a",color:"white",border:"none",borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
        Asignar turno extra
      </button>
    </div>
  );
}

function SupplementForm({ onAdd, isMobile }) {
  const [date,setDate]=useState(""); const [shift,setShift]=useState("M");
  const [amount,setAmount]=useState(""); const [note,setNote]=useState("");
  const inp = {border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",background:"white"};
  return (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 80px 100px 1fr",gap:8,marginBottom:12}}>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
      <select value={shift} onChange={e=>setShift(e.target.value)} style={inp}>
        {["M","T","N"].map(s=><option key={s}>{s}</option>)}
      </select>
      <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="€ importe" style={inp}/>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota (opcional)" style={{...inp,gridColumn:isMobile?"1/-1":undefined}}/>
      <button onClick={()=>{if(!date||!amount)return; onAdd({id:Date.now(),date,shift,amount:Number(amount),note}); setDate("");setAmount("");setNote("");}}
        style={{gridColumn:"1/-1",background:"#0f172a",color:"white",border:"none",borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
        Registrar suplemento
      </button>
    </div>
  );
}

// ─── LOGIN SHELL — shared state lives here so it survives user switches ───────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // ── SHARED STATE (persists across logins) ──
  const [users, setUsers]             = useState(INIT_USERS);
  const [pending, setPending]         = useState(INIT_PENDING);
  const [absences, setAbsences]       = useState([]);
  const [swaps, setSwaps]             = useState([]);
  const [swapRequests, setSwapRequests] = useState([]); // unified request system
  const [extraShifts, setExtraShifts] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [notifs, setNotifs]           = useState([]);

  if (!currentUser) return <LoginScreen onLogin={u => setCurrentUser(u)} />;
  return (
    <MainApp
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
      users={users} setUsers={setUsers}
      pending={pending} setPending={setPending}
      absences={absences} setAbsences={setAbsences}
      swaps={swaps} setSwaps={setSwaps}
      swapRequests={swapRequests} setSwapRequests={setSwapRequests}
      extraShifts={extraShifts} setExtraShifts={setExtraShifts}
      supplements={supplements} setSupplements={setSupplements}
      notifs={notifs} setNotifs={setNotifs}
    />
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
function MainApp({ currentUser, onLogout,
  users, setUsers, pending, setPending,
  absences, setAbsences, swaps, setSwaps,
  swapRequests, setSwapRequests,
  extraShifts, setExtraShifts, supplements, setSupplements,
  notifs, setNotifs }) {

  // Navigation
  const [view, setView]         = useState("cal-general");

  // Calendar state
  const [calY, setCalY]         = useState(2026);
  const [calM, setCalM]         = useState(3);
  const [guardViewIdx, setGVI]  = useState(currentUser.gId ?? 0);
  const [guardROMode, setGROM]  = useState(false);

  // Modals
  const [genModal, setGenModal]     = useState(null);
  const [absModal, setAbsModal]     = useState(null);
  const [swapModal, setSwapModal]   = useState(null);
  const [guardModal, setGuardModal] = useState(null); // {date, shift, gIdx}

  // Admin tab
  const [adminTab, setAdminTab] = useState("pending");
  const [balEditId, setBalEditId] = useState(null);
  // Tablón — publish form
  const [tDate, setTDate]   = useState("");
  const [tShift, setTShift] = useState("M");
  const [tNote, setTNote]   = useState("");
  const [tTarget, setTTarget] = useState(""); // "" = open, userId = direct
  // Tablón modals
  const [offerModal, setOfferModal]   = useState(null); // requestId B is offering on
  const [acceptModal, setAcceptModal] = useState(null); // {requestId, offerId}

  // Responsive breakpoint — reactive so layout updates on resize/rotation
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isAdmin = currentUser.role === "admin";
  const myG     = currentUser.gId; // null for admin, 0-4 for users

  function addNotif(userId, text) {
    setNotifs(n=>[...n,{id:Date.now()+Math.random(),userId,text,read:false,ts:new Date()}]);
  }

  // ── CONFLICT VALIDATOR ─────────────────────────────────────────────────────
  // Returns null if ok, or error string
  function checkConflict(userId, dateStr, newShift) {
    const u = users.find(x => x.id === userId);
    if (!u || u.gId === null) return null;

    // Does this user actually work a given shift on a given date?
    const userWorks = (dStr, sh) => {
      const d = pd(dStr);
      const inSchedule  = getShifts(u.gId, d).includes(sh);
      const isAbsent    = !!absences.find(a => a.userId===userId && a.date===dStr && a.shift===sh);
      const isGivenAway = !!swaps.find(s => s.status==="approved" && s.fromId===userId && s.fromDate===dStr && s.fromShift===sh);
      const isCovering  = !!swaps.find(s => s.status==="approved" && s.toId===userId   && s.fromDate===dStr && s.fromShift===sh);
      return (inSchedule && !isAbsent && !isGivenAway) || isCovering;
    };

    const date    = pd(dateStr);
    const prevStr = ds(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
    const nextStr = ds(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));

    if (newShift === "N") {
      if (userWorks(dateStr, "T")) return "No se puede trabajar T y N el mismo día";
      if (userWorks(nextStr,  "M")) return "No se puede trabajar N y M el día siguiente";
    }
    if (newShift === "T" && userWorks(dateStr, "N")) return "No se puede trabajar T y N el mismo día";
    if (newShift === "M" && userWorks(prevStr,  "N")) return "No se puede trabajar N y M en días consecutivos";
    return null;
  }

  // ── CASCADE: notify voluntaries when shift goes critical ───────────────────
  function cascadeCheck(gIdx, dateStr, shift, newAbsences) {
    const date = pd(dateStr);
    const allWorkers = users.filter(u=>u.gId===gIdx&&u.id!==0);
    const working = allWorkers.filter(u=>{
      if(newAbsences.find(a=>a.userId===u.id&&a.date===dateStr&&a.shift===shift)) return false;
      if(swaps.find(s=>s.status==="approved"&&s.fromId===u.id&&s.fromDate===dateStr&&s.fromShift===shift)) return false;
      return true;
    });
    if(working.length<3) {
      // Notify users with voluntary absences that day
      const voluntaryAbsent = newAbsences.filter(a=>
        a.date===dateStr&&a.shift===shift&&
        AT.find(at=>at.id===a.reason)?.r&&
        allWorkers.find(u=>u.id===a.userId)
      );
      voluntaryAbsent.forEach(a=>{
        addNotif(a.userId,`⚠️ El turno ${shift} del ${dateStr} ha quedado por debajo del mínimo. Tu solicitud de libre puede quedar anulada. Por favor, revisa tu disponibilidad.`);
      });
    }
  }

  // ── SHIFT ENGINE ───────────────────────────────────────────────────────────
  function getWorking(gIdx, date, shift) {
    const dateStr = ds(date);
    if(!getShifts(gIdx,date).includes(shift)) return [];
    return users.filter(u=>{
      if(u.gId!==gIdx||u.id===0) return false;
      if(absences.find(a=>a.userId===u.id&&a.date===dateStr&&a.shift===shift)) return false;
      if(swaps.find(s=>s.status==="approved"&&s.fromId===u.id&&s.fromDate===dateStr&&s.fromShift===shift)) return false;
      return true;
    });
  }
  // Returns swaps where someone from OUTSIDE gIdx is covering a slot that belongs to gIdx
  // The slot is identified by fromDate/fromShift (the slot that was given away by fromId)
  function getSwappedIn(gIdx, date, shift) {
    const dateStr = ds(date);
    return swaps.filter(s => {
      if (s.status !== "approved") return false;
      if (s.fromDate !== dateStr || s.fromShift !== shift) return false;
      const fromUser = users.find(u => u.id === s.fromId);
      return fromUser?.gId === gIdx;
    });
  }
  function countW(gIdx, date, shift) {
    return getWorking(gIdx, date, shift).length + getSwappedIn(gIdx, date, shift).length;
  }

  // ── CALENDAR HELPERS ───────────────────────────────────────────────────────
  function prevMonth() { if(calM===0){setCalM(11);setCalY(y=>y-1);}else setCalM(m=>m-1); }
  function nextMonth() { if(calM===11){setCalM(0);setCalY(y=>y+1);}else setCalM(m=>m+1); }

  const days  = dim(calY,calM);
  const blank = fdow(calY,calM);

  // ── NAV ITEMS ──────────────────────────────────────────────────────────────
  const navItems = [
    {id:"cal-general",  ico:"📅", lbl:"Cal. General"},
    {id:"cal-guardia",  ico:"🛡️", lbl:"Cal. Guardia"},
    ...(myG!==null?[{id:"cal-personal",ico:"👤",lbl:"Mi Calendario"}]:[]),
    {id:"tablon",       ico:"📋", lbl:"Tablón de Cambios"},
    {id:"stats",        ico:"📊", lbl:"Estadísticas"},
    ...(isAdmin?[{id:"admin",ico:"⚙️",lbl:"Administración"}]:[]),
    {id:"notifs",       ico:"🔔", lbl:"Notificaciones"},
  ];
  const myNotifs    = notifs.filter(n=>n.userId===currentUser.id);
  const unread      = myNotifs.filter(n=>!n.read).length;
  const pendingCnt  = pending.length;
  // Count pending offers on MY requests (A waiting for offers) + offers I need to respond to (B)
  const directInCnt = swapRequests.filter(r=>
    (r.toId===currentUser.id && r.status==="open") ||
    (r.fromId===currentUser.id && r.status==="offered")
  ).length;

  // Does a user actually work a given shift? (schedule + swaps - absences)
  function userWorksShift(userId, dateStr, shift) {
    const u = users.find(x=>x.id===userId);
    if(!u||u.gId===null) return false;
    const d = pd(dateStr);
    const inSched    = getShifts(u.gId, d).includes(shift);
    const isAbsent   = !!absences.find(a=>a.userId===userId&&a.date===dateStr&&a.shift===shift);
    const isGivenAway= !!swaps.find(s=>s.status==="approved"&&s.fromId===userId&&s.fromDate===dateStr&&s.fromShift===shift);
    const isCovering = !!swaps.find(s=>s.status==="approved"&&s.toId===userId&&s.fromDate===dateStr&&s.fromShift===shift);
    return (inSched && !isAbsent && !isGivenAway) || isCovering;
  }

  function getBadge(id) {
    if(id==="admin") return pendingCnt>0?pendingCnt:0;
    if(id==="notifs") return unread;
    if(id==="tablon") return directInCnt;
    return 0;
  }

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const sidebar = {width:210,background:"linear-gradient(180deg,#0f172a 0%,#1e3558 100%)",
    flexShrink:0,display:"flex",flexDirection:"column",minHeight:"100vh"};
  const card = {background:"white",borderRadius:16,border:"1px solid #e5e7eb",padding:isMobile?14:20};
  const inp  = {border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",background:"white",width:"100%",boxSizing:"border-box"};

  // ─── RENDER VIEWS ──────────────────────────────────────────────────────────

  const renderCalGeneral = () => {
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:900,color:"#0f172a"}}>Calendario General</h2>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={prevMonth} style={{width:isMobile?44:32,height:isMobile?44:32,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:isMobile?20:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <span style={{fontWeight:700,color:"#334155",width:isMobile?150:130,textAlign:"center",fontSize:isMobile?15:14}}>{MONTHS[calM]} {calY}</span>
            <button onClick={nextMonth} style={{width:isMobile?44:32,height:isMobile?44:32,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:isMobile?20:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          </div>
        </div>

        {/* Weekday headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
          {WDAYS.map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#94a3b8",padding:"4px 0"}}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {Array(blank).fill(null).map((_,i)=><div key={`b${i}`}/>)}
          {Array(days).fill(null).map((_,i)=>{
            const day  = i+1;
            const date = new Date(calY,calM,day);
            const dstr = ds(date);
            const isToday = dstr===TODAY;

            const shiftData = ["M","T","N"].map(sh=>{
              let total=0;
              for(let g=0;g<5;g++) total += getShifts(g,date).includes(sh)?countW(g,date,sh):0;
              return {sh,total};
            }).filter(x=>x.total>0);

            return (
              <div key={day} style={{border:isToday?`2px solid #f59e0b`:"1px solid #e5e7eb",
                borderRadius:isMobile?8:12,padding:isMobile?"4px 3px":"6px 5px",minHeight:isMobile?68:80,background:isToday?"#fffbeb":"white"}}>
                <div style={{fontSize:isMobile?12:11,fontWeight:700,color:isToday?"#b45309":"#94a3b8",marginBottom:isMobile?3:4}}>{day}</div>
                {shiftData.map(({sh,total})=>{
                  const low=total<3;
                  return (
                    <button key={sh} onClick={()=>setGenModal({date,shift:sh})}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",
                        padding:isMobile?"4px 4px":"2px 4px",borderRadius:5,border:"none",marginBottom:2,cursor:"pointer",
                        background:low?"#fee2e2":SI[sh].bg,borderLeft:`3px solid ${low?"#dc2626":SI[sh].c}`}}>
                      <span style={{fontSize:isMobile?11:10,fontWeight:700,color:low?"#dc2626":SI[sh].t}}>{sh}</span>
                      <span style={{fontSize:isMobile?11:10,fontWeight:700,color:low?"#dc2626":SI[sh].t}}>{total}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:16,marginTop:16,flexWrap:"wrap"}}>
          {Object.entries(SI).map(([k,v])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:3,background:v.c}}/>
              <span style={{fontSize:11,color:"#64748b"}}>{k} – {v.l}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:10,height:10,borderRadius:3,background:"#fee2e2",borderLeft:"3px solid #dc2626"}}/>
            <span style={{fontSize:11,color:"#64748b"}}>Crítico (&lt;3)</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCalGuardia = () => {
    const gIdx = guardROMode ? guardViewIdx : (isAdmin ? guardViewIdx : myG);
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <h2 style={{margin:0,fontSize:20,fontWeight:900,color:"#0f172a"}}>Calendario de Guardia</h2>
            {guardROMode&&<span style={{fontSize:11,background:"#f1f5f9",color:"#64748b",padding:"2px 8px",borderRadius:20,fontWeight:600}}>Solo lectura</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",flexShrink:0,paddingBottom:2}}>
            {[0,1,2,3,4].map(g=>(
              <button key={g} onClick={()=>{
                if(isAdmin){setGVI(g);setGROM(false);}
                else if(g===myG){setGVI(g);setGROM(false);}
                else{setGVI(g);setGROM(true);}
              }} style={{padding:isMobile?"6px 12px":"4px 10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:isMobile?13:11,flexShrink:0,
                background:gIdx===g?GC[g]:GC[g]+"20",color:gIdx===g?"white":GC[g]}}>G{g+1}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={prevMonth} style={{width:isMobile?44:30,height:isMobile?44:30,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:isMobile?20:15,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <span style={{fontWeight:700,color:"#334155",width:isMobile?130:110,textAlign:"center",fontSize:isMobile?14:13}}>{MONTHS[calM]} {calY}</span>
            <button onClick={nextMonth} style={{width:isMobile?44:30,height:isMobile?44:30,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:isMobile?20:15,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
          {WDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#94a3b8",padding:"4px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {Array(fdow(calY,calM)).fill(null).map((_,i)=><div key={`b${i}`}/>)}
          {Array(dim(calY,calM)).fill(null).map((_,i)=>{
            const day   = i+1;
            const date  = new Date(calY,calM,day);
            const dstr  = ds(date);
            const shifts= getShifts(gIdx,date);
            const isFree= shifts.length===0;
            const isToday=dstr===TODAY;
            return (
              <div key={day} style={{border:isToday?`2px solid ${GC[gIdx]}`:"1px solid #e5e7eb",
                borderRadius:isMobile?8:12,padding:isMobile?"4px 3px":"5px",minHeight:isFree?(isMobile?48:55):(isMobile?64:75),
                background:isFree?"#f9fafb":"white"}}>
                <div style={{fontSize:isMobile?12:11,fontWeight:700,color:isToday?GC[gIdx]:"#94a3b8",marginBottom:3}}>{day}</div>
                {isFree&&<div style={{fontSize:isMobile?11:10,color:"#d1d5db",fontWeight:700}}>L</div>}
                {shifts.map(sh=>{
                  const total = countW(gIdx,date,sh);
                  const low   = total<3;
                  const supp  = supplements.find(s=>s.date===dstr&&s.shift===sh);
                  return (
                    <button key={sh} onClick={()=>setGuardModal({date,shift:sh,gIdx})}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                        width:"100%",padding:isMobile?"5px 4px":"3px 4px",borderRadius:6,border:"none",
                        marginBottom:3,cursor:"pointer",
                        background:low?"#fee2e2":SI[sh].bg,
                        borderLeft:`3px solid ${low?"#ef4444":SI[sh].c}`}}>
                      <span style={{fontSize:isMobile?11:9,fontWeight:700,color:low?"#dc2626":SI[sh].t}}>
                        {sh}{low?" ⚠️":""}
                      </span>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        {supp&&<span style={{fontSize:isMobile?10:8,color:"#16a34a",fontWeight:700}}>€</span>}
                        <span style={{fontSize:isMobile?11:9,fontWeight:700,color:low?"#dc2626":SI[sh].t}}>{total}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalPersonal = () => {
    if(myG===null) return <p style={{color:"#64748b"}}>El administrador no tiene calendario personal.</p>;
    const user=currentUser;
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <h2 style={{margin:0,fontSize:20,fontWeight:900,color:"#0f172a"}}>Mi Calendario</h2>
            <p style={{margin:"4px 0 0",fontSize:13,color:GC[myG],fontWeight:600}}>
              Guardia {myG+1} · {user.name} · {yos(user.sd)} años de servicio
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={prevMonth} style={{width:isMobile?44:30,height:isMobile?44:30,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:isMobile?20:15,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <span style={{fontWeight:700,color:"#334155",width:isMobile?130:110,textAlign:"center",fontSize:isMobile?14:13}}>{MONTHS[calM]} {calY}</span>
            <button onClick={nextMonth} style={{width:isMobile?44:30,height:isMobile?44:30,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:isMobile?20:15,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:isMobile?2:3,marginBottom:3}}>
          {WDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:isMobile?12:11,fontWeight:700,color:"#94a3b8",padding:"4px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:isMobile?2:3,marginBottom:20}}>
          {Array(fdow(calY,calM)).fill(null).map((_,i)=><div key={`b${i}`}/>)}
          {Array(dim(calY,calM)).fill(null).map((_,i)=>{
            const day=i+1; const date=new Date(calY,calM,day); const dstr=ds(date);
            const shifts  = getShifts(myG,date);
            const isToday = dstr===TODAY;
            const extras  = extraShifts.filter(e=>e.userId===user.id&&e.date===dstr);
            // Shifts covered for other guards (toId=me, fromDate=dstr)
            const covering = swaps.filter(s=>
              s.status==="approved" && s.toId===user.id && s.fromDate===dstr
              && !shifts.includes(s.fromShift)
            );
            return (
              <div key={day} style={{border:isToday?`2px solid ${GC[myG]}`:"1px solid #e5e7eb",borderRadius:isMobile?8:12,
                padding:isMobile?"4px 3px":"5px",minHeight:isMobile?64:75,
                background:shifts.length===0&&!extras.length&&!covering.length?"#f9fafb":"white"}}>
                <div style={{fontSize:isMobile?12:11,fontWeight:700,color:isToday?GC[myG]:"#94a3b8",marginBottom:3}}>{day}</div>
                {shifts.length===0&&!extras.length&&!covering.length&&<div style={{fontSize:isMobile?11:10,color:"#d1d5db",fontWeight:700}}>Libre</div>}
                {shifts.map(sh=>{
                  const abs=absences.find(a=>a.userId===user.id&&a.date===dstr&&a.shift===sh);
                  const swA = swaps.find(s=>s.status==="approved"&&s.fromId===user.id&&s.fromDate===dstr&&s.fromShift===sh);
                  const swI = swaps.find(s=>s.status==="approved"&&s.toId===user.id&&s.fromDate===dstr&&s.fromShift===sh);
                  const at  = abs ? AT.find(a=>a.id===abs.reason) : null;
                  const supp = supplements.find(s=>s.date===dstr&&s.shift===sh);
                  const wc  = countW(myG,date,sh);
                  // Fondo: verde si libre (cualquier motivo), ámbar si trabajas o cubres, gris si cedido
                  const cellBg  = abs ? "#4ade80" : swA ? "#e5e7eb" : "#fde68a";
                  const cellBdr = abs ? "#16a34a" : swA ? "#9ca3af" : "#d97706";
                  const cellTxt = abs ? "#14532d" : swA ? "#6b7280"  : "#78350f";
                  const statusLabel = abs ? (at?.l ?? "Libre") : swA ? "Cambiado" : swI ? "Cubriendo" : "Trabajando";
                  const pillBg  = abs ? "#dcfce7" : swA ? "#f1f5f9" : "#d1fae5";
                  const pillCol = abs ? "#15803d" : swA ? "#6b7280"  : "#065f46";
                  return (
                    <div key={sh} style={{borderRadius:6,padding:isMobile?"5px 5px":"3px 5px",marginBottom:3,
                      background:cellBg, borderLeft:`3px solid ${cellBdr}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:2}}>
                        <span style={{fontSize:isMobile?12:9,fontWeight:700,color:cellTxt}}>{sh}</span>
                        {supp&&<span style={{fontSize:isMobile?10:8,color:"#15803d",fontWeight:700}}>+{supp.amount}€</span>}
                      </div>
                      <span
                        onClick={swA ? ()=>setSwapModal({swap:swA,role:"from"}) : undefined}
                        style={{display:"inline-block",fontSize:isMobile?10:8,fontWeight:700,marginTop:1,
                          padding:"1px 5px",borderRadius:4,background:pillBg,color:pillCol,
                          cursor:swA?"pointer":"default",
                          textDecoration:swA?"underline":"none"}}>
                        {statusLabel}
                      </span>
                      {!abs&&!swA&&(
                        <button onClick={()=>setAbsModal({date,shift:sh})}
                          style={{fontSize:isMobile?10:8,color:cellTxt,background:"none",border:"none",cursor:"pointer",padding:isMobile?"3px 0":"1px 0",fontWeight:700,display:"block"}}>
                          + solicitar libre
                        </button>
                      )}
                      {swA&&(()=>{
                        const isPast = isPastShift(dstr, sh);
                        return !isPast ? (
                          <button onClick={()=>{
                            const cancelConflict = checkConflict(user.id, dstr, sh);
                            if(cancelConflict){ alert(`No se puede anular el cambio: ${cancelConflict}`); return; }
                            setSwaps(s=>s.filter(x=>x.id!==swA.id));
                            addNotif(swA.toId,`🔄 ${currentUser.name} ha anulado el cambio del ${dstr} turno ${sh}`);
                          }} style={{fontSize:8,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:"1px 0",fontWeight:700,display:"block"}}>
                            ✕ anular cambio
                          </button>
                        ) : null;
                      })()}
                      {abs&&at?.r&&(
                        <button onClick={()=>{
                          const cancelConflict = checkConflict(user.id, dstr, sh);
                          if(cancelConflict) { alert(`No se puede anular este libre: ${cancelConflict}`); return; }
                          setAbsences(a=>a.filter(x=>!(x.userId===user.id&&x.date===dstr&&x.shift===sh)));
                        }} style={{fontSize:8,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:"1px 0",fontWeight:700,display:"block"}}>
                          ✕ cancelar libre
                        </button>
                      )}
                    </div>
                  );
                })}
                {extras.map(e=>(
                  <div key={e.id} style={{borderRadius:6,padding:"3px 5px",marginBottom:3,background:"#fef9c3",borderLeft:"3px solid #eab308"}}>
                    <span style={{fontSize:9,fontWeight:700,color:"#92400e"}}>{e.shift} Extra</span>
                    <div style={{fontSize:9,color:"#92400e"}}>{e.compensation==="economic"?"💰 Pago":"📅 Días"}</div>
                  </div>
                ))}
                {covering.map(s=>{
                  const isPast = isPastShift(dstr, s.fromShift);
                  const supp2  = supplements.find(x=>x.date===dstr&&x.shift===s.fromShift);
                  return (
                    <div key={s.id} style={{borderRadius:6,padding:"3px 5px",marginBottom:3,background:"#fde68a",borderLeft:"3px solid #d97706"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:2}}>
                        <span style={{fontSize:9,fontWeight:700,color:"#78350f"}}>{s.fromShift}</span>
                        {supp2&&<span style={{fontSize:8,color:"#15803d",fontWeight:700}}>+{supp2.amount}€</span>}
                      </div>
                      <span onClick={()=>setSwapModal({swap:s,role:"to"})}
                        style={{display:"inline-block",fontSize:8,fontWeight:700,marginTop:1,
                          padding:"1px 5px",borderRadius:4,background:"#d1fae5",color:"#065f46",
                          cursor:"pointer",textDecoration:"underline"}}>
                        Cubriendo
                      </span>
                      {!isPast&&(
                        <button onClick={()=>{
                          setSwaps(sw=>sw.filter(x=>x.id!==s.id));
                          addNotif(s.fromId,`🔄 ${currentUser.name} ha anulado el cambio del ${dstr} turno ${s.fromShift}`);
                        }} style={{fontSize:8,color:"#dc2626",background:"none",border:"none",cursor:"pointer",padding:"1px 0",fontWeight:700,display:"block"}}>
                          ✕ anular cambio
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Balance */}
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e3558)",borderRadius:16,padding:20,color:"white"}}>
          <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#f59e0b"}}>Saldo de días disponibles</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
            {AT.filter(a=>a.r).map(a=>{
              const bal=user.bal?.[a.id]??0;
              const used=absences.filter(ab=>ab.userId===user.id&&ab.reason===a.id).length;
              const rem=Math.max(0,bal-used);
              return (
                <div key={a.id} style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 14px"}}>
                  <p style={{margin:0,fontSize:10,color:"#94a3b8"}}>{a.l}</p>
                  <p style={{margin:"4px 0 0",fontSize:22,fontWeight:900,color:rem<2?"#f87171":"white"}}>{rem}</p>
                  <p style={{margin:0,fontSize:10,color:"#64748b"}}>{used} usados de {bal}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTablon = () => {
    // swapRequest model:
    // { id, fromId, fromDate, fromShift, toId(null=open), note, ts, status:"open"|"offered"|"confirmed"|"cancelled",
    //   offers:[{id, offeredBy, options:[{date,shift}], chosenIdx, status:"pending"|"accepted"|"rejected", ts}] }

    const myRequests = swapRequests.filter(r=>r.fromId===currentUser.id && r.status!=="cancelled");
    const openForMe  = swapRequests.filter(r=>
      r.status==="open" && r.fromId!==currentUser.id &&
      (r.toId===null || r.toId===currentUser.id)
    );
    const offeredToMe = swapRequests.filter(r=>
      r.status==="offered" && r.fromId===currentUser.id
    );

    const isBlocked = myG===null;
    const otherUsers = users.filter(u=>u.id!==0&&u.id!==currentUser.id&&u.gId!==null);

    // Validation: does the current user actually work tDate/tShift?
    const publishConflict = tDate&&tShift ? (!userWorksShift(currentUser.id,tDate,tShift) ? "No trabajas ese turno ese día" : isPastShift(tDate,tShift) ? "El turno ya ha comenzado" : null) : null;

    const fmt = d => d ? new Date(d).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";

    return (
      <div>
        <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:900,color:"#0f172a"}}>Tablón de Cambios</h2>

        {/* ── PUBLISH REQUEST ── */}
        {!isBlocked&&(
          <div style={{...card,marginBottom:20}}>
            <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#1e293b"}}>Solicitar cobertura de turno</h3>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 100px 1fr",gap:8,marginBottom:8}}>
              <input type="date" value={tDate} onChange={e=>setTDate(e.target.value)} style={inp}/>
              <select value={tShift} onChange={e=>setTShift(e.target.value)} style={inp}>
                {["M","T","N"].map(s=><option key={s} value={s}>{s} – {SI[s].l}</option>)}
              </select>
              <select value={tTarget} onChange={e=>setTTarget(e.target.value)} style={inp}>
                <option value="">Solicitud abierta (cualquiera)</option>
                {otherUsers.map(u=><option key={u.id} value={u.id}>{u.name} (G{u.gId+1})</option>)}
              </select>
            </div>
            <input value={tNote} onChange={e=>setTNote(e.target.value)} placeholder="Nota opcional" style={{...inp,marginBottom:8}}/>
            {tDate&&publishConflict&&<p style={{fontSize:11,color:"#dc2626",margin:"0 0 8px",fontWeight:600}}>⛔ {publishConflict}</p>}
            <button onClick={()=>{
              if(publishConflict||!tDate) return;
              const req={id:Date.now(),fromId:currentUser.id,fromDate:tDate,fromShift:tShift,
                toId:tTarget?Number(tTarget):null,note:tNote,ts:new Date(),status:"open",offers:[]};
              setSwapRequests(r=>[req,...r]);
              if(tTarget) addNotif(Number(tTarget),`📨 ${currentUser.name} te pide cobertura para el ${tDate} turno ${tShift}`);
              setTDate("");setTNote("");setTTarget("");
            }} disabled={!!publishConflict||!tDate}
              style={{background:publishConflict||!tDate?"#e5e7eb":(myG!==null?GC[myG]:"#0f172a"),
                color:publishConflict||!tDate?"#9ca3af":"white",border:"none",borderRadius:10,
                padding:"9px 20px",fontWeight:700,fontSize:13,cursor:publishConflict||!tDate?"not-allowed":"pointer"}}>
              Publicar solicitud
            </button>
          </div>
        )}

        {/* ── OFFERS WAITING FOR MY CONFIRMATION ── */}
        {offeredToMe.length>0&&(
          <div style={{marginBottom:20}}>
            <p style={{fontSize:11,fontWeight:700,color:"#f59e0b",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:0.5}}>
              ⏳ Ofertas recibidas — elige una opción ({offeredToMe.length})
            </p>
            {offeredToMe.map(req=>{
              const pendingOffers = req.offers.filter(o=>o.status==="pending");
              return (
                <div key={req.id} style={{...card,marginBottom:10,borderLeft:`4px solid #f59e0b`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <ShiftChip shift={req.fromShift}/>
                    <span style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{req.fromDate}</span>
                    <span style={{fontSize:12,color:"#64748b"}}>{req.note}</span>
                  </div>
                  {pendingOffers.map(offer=>{
                    const offerer = users.find(u=>u.id===offer.offeredBy);
                    return (
                      <div key={offer.id} style={{background:"#fef9ee",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid #fde68a"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <Avatar name={offerer?.name||"?"} size={28} color={GC[offerer?.gId??0]}/>
                          <span style={{fontSize:13,fontWeight:700,color:"#1e293b"}}>{offerer?.name}</span>
                          <GuardChip gIdx={offerer?.gId??0}/>
                          <span style={{fontSize:11,color:"#94a3b8"}}>propone {offer.options.length} opción{offer.options.length>1?"es":""}</span>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {offer.options.map((opt,i)=>{
                            const conflict = checkConflict(currentUser.id, opt.date, opt.shift);
                            const works    = userWorksShift(currentUser.id, opt.date, opt.shift);
                            const blocked  = !!conflict;
                            return (
                              <button key={i} disabled={blocked} onClick={()=>{
                                if(blocked) return;
                                // Confirm: create two swaps
                                const now = new Date();
                                setSwaps(s=>[...s,
                                  {id:Date.now(),   fromId:req.fromId,  toId:offer.offeredBy, fromDate:req.fromDate,  fromShift:req.fromShift,  status:"approved",proposedAt:req.ts,acceptedAt:now},
                                  {id:Date.now()+1, fromId:offer.offeredBy, toId:req.fromId, fromDate:opt.date, fromShift:opt.shift, status:"approved",proposedAt:req.ts,acceptedAt:now},
                                ]);
                                setSwapRequests(rs=>rs.map(r=>r.id===req.id?{...r,status:"confirmed"}:r));
                                addNotif(offer.offeredBy,`✅ ${currentUser.name} ha aceptado tu oferta: tú cubres ${req.fromDate}/${req.fromShift}, te cubre ${opt.date}/${opt.shift}`);
                              }} style={{padding:"6px 12px",borderRadius:10,border:"none",fontWeight:700,fontSize:12,cursor:blocked?"not-allowed":"pointer",
                                background:blocked?"#f1f5f9":"#dcfce7",color:blocked?"#9ca3af":"#15803d",opacity:blocked?0.6:1}}>
                                <ShiftChip shift={opt.shift} small/> {opt.date}
                                {blocked&&<span style={{fontSize:10,color:"#dc2626",marginLeft:4}}>↔ conflicto</span>}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={()=>{
                          setSwapRequests(rs=>rs.map(r=>r.id===req.id?{...r,offers:r.offers.map(o=>o.id===offer.id?{...o,status:"rejected"}:o)}:r));
                          addNotif(offer.offeredBy,`❌ ${currentUser.name} ha rechazado tu oferta de cambio`);
                        }} style={{marginTop:8,fontSize:11,color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                          Rechazar oferta
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={()=>setSwapRequests(rs=>rs.map(r=>r.id===req.id?{...r,status:"cancelled"}:r))}
                    style={{fontSize:11,color:"#94a3b8",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>
                    Cancelar solicitud
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MY OPEN REQUESTS ── */}
        {myRequests.filter(r=>r.status==="open").length>0&&(
          <div style={{marginBottom:20}}>
            <p style={{fontSize:11,fontWeight:700,color:"#94a3b8",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:0.5}}>
              Mis solicitudes abiertas
            </p>
            {myRequests.filter(r=>r.status==="open").map(req=>(
              <div key={req.id} style={{...card,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,padding:"12px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <ShiftChip shift={req.fromShift}/>
                  <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{req.fromDate}</span>
                  {req.toId&&<span style={{fontSize:11,color:"#64748b"}}>→ {users.find(u=>u.id===req.toId)?.name?.split(" ")[0]}</span>}
                  {req.note&&<span style={{fontSize:12,color:"#94a3b8"}}>"{req.note}"</span>}
                </div>
                <button onClick={()=>setSwapRequests(rs=>rs.map(r=>r.id===req.id?{...r,status:"cancelled"}:r))}
                  style={{fontSize:12,color:"#ef4444",background:"#fee2e2",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>
                  Retirar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── AVAILABLE REQUESTS (make offers) ── */}
        <p style={{fontSize:11,fontWeight:700,color:"#94a3b8",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:0.5}}>
          Solicitudes disponibles ({openForMe.length})
        </p>
        {openForMe.length===0?(
          <div style={{textAlign:"center",padding:"40px 0",color:"#cbd5e1",fontSize:14}}>No hay solicitudes disponibles</div>
        ):openForMe.map(req=>{
          const fromUser = users.find(u=>u.id===req.fromId);
          const gI = fromUser?.gId??0;
          const myOfferExists = req.offers.some(o=>o.offeredBy===currentUser.id&&o.status==="pending");
          return (
            <div key={req.id} style={{...card,marginBottom:8,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar name={fromUser?.name||"?"} size={36} color={GC[gI]}/>
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:"#1e293b"}}>{fromUser?.name}</p>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}>
                      <GuardChip gIdx={gI}/><ShiftChip shift={req.fromShift} small/>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{req.fromDate}</span>
                      {req.note&&<span style={{fontSize:11,color:"#94a3b8"}}>· {req.note}</span>}
                    </div>
                    {req.offers.length>0&&<p style={{margin:"3px 0 0",fontSize:10,color:"#94a3b8"}}>{req.offers.filter(o=>o.status==="pending").length} oferta(s) pendiente(s)</p>}
                  </div>
                </div>
                {!isBlocked&&!myOfferExists&&(()=>{
                  const bConflict = checkConflict(currentUser.id, req.fromDate, req.fromShift);
                  return bConflict ? (
                    <span style={{fontSize:11,color:"#dc2626",fontWeight:600,maxWidth:200,textAlign:"right"}}>
                      ⛔ No puedes cubrir: {bConflict}
                    </span>
                  ) : (
                    <button onClick={()=>setOfferModal(req.id)}
                      style={{background:myG!==null?GC[myG]:"#0f172a",color:"white",border:"none",borderRadius:10,
                        padding:"8px 16px",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                      Hacer oferta
                    </button>
                  );
                })()}
                {myOfferExists&&<span style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>Oferta enviada ⏳</span>}
              </div>
            </div>
          );
        })}

        {/* ── OFFER MODAL ── */}
        {offerModal&&(()=>{
          const req = swapRequests.find(r=>r.id===offerModal);
          if(!req) return null;
          const fromUser = users.find(u=>u.id===req.fromId);
          return (
            <OfferBuilderModal
              req={req} fromUser={fromUser}
              currentUser={currentUser} users={users}
              userWorksShift={userWorksShift} checkConflict={checkConflict}
              onSubmit={options=>{
                const offer={id:Date.now(),offeredBy:currentUser.id,options,status:"pending",ts:new Date()};
                setSwapRequests(rs=>rs.map(r=>r.id===req.id?{...r,status:"offered",offers:[...r.offers,offer]}:r));
                addNotif(req.fromId,`📨 ${currentUser.name} te ha hecho una oferta de cambio para el ${req.fromDate} turno ${req.fromShift}`);
                setOfferModal(null);
              }}
              onClose={()=>setOfferModal(null)}/>
          );
        })()}
      </div>
    );
  };

  const renderStats = () => {
    const allWorkers = users.filter(u=>u.id!==0);
    const now=new Date();
    const absThisMonth=absences.filter(a=>{const d=pd(a.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    const swapsDone=swaps.filter(s=>s.status==="approved");
    const economicExtras=extraShifts.filter(e=>e.compensation==="economic");
    const daysExtras=extraShifts.filter(e=>e.compensation==="days");

    return (
      <div>
        <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:900,color:"#0f172a"}}>Estadísticas</h2>

        {/* Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
          {[
            {l:"Total funcionarios",v:allWorkers.length,bg:"linear-gradient(135deg,#0f172a,#1e3558)",c:"white"},
            {l:"Ausencias este mes",v:absThisMonth.length,bg:"linear-gradient(135deg,#dc2626,#9f1239)",c:"white"},
            {l:"Cambios realizados",v:swapsDone.length,bg:"linear-gradient(135deg,#059669,#0284c7)",c:"white"},
            {l:"Turnos extra asignados",v:extraShifts.length,bg:"linear-gradient(135deg,#7c3aed,#e11d48)",c:"white"},
          ].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:16,padding:"16px 20px",color:s.c}}>
              <p style={{margin:0,fontSize:11,opacity:0.7}}>{s.l}</p>
              <p style={{margin:"6px 0 0",fontSize:30,fontWeight:900}}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Ausencias por motivo */}
        <div style={{...card,marginBottom:16}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#1e293b"}}>Ausencias por motivo</h3>
          {AT.map(a=>{
            const cnt=absences.filter(ab=>ab.reason===a.id).length;
            const pct=absences.length?Math.round(cnt/absences.length*100):0;
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:a.c,flexShrink:0}}/>
                <span style={{fontSize:13,color:"#334155",flex:1}}>{a.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#1e293b",minWidth:20,textAlign:"right"}}>{cnt}</span>
                <div style={{width:80,height:6,background:"#f1f5f9",borderRadius:3,flexShrink:0}}>
                  <div style={{width:`${pct}%`,height:"100%",background:a.c,borderRadius:3}}/>
                </div>
              </div>
            );
          })}
          {absences.length===0&&<p style={{fontSize:13,color:"#94a3b8"}}>Sin ausencias registradas</p>}
        </div>

        {/* Turnos extra */}
        <div style={{...card,marginBottom:16}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#1e293b"}}>Turnos extra</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:"#fef9c3",borderRadius:12,padding:"12px 16px"}}>
              <p style={{margin:0,fontSize:11,color:"#92400e"}}>Compensación económica</p>
              <p style={{margin:"4px 0 0",fontSize:24,fontWeight:900,color:"#78350f"}}>{economicExtras.length}</p>
            </div>
            <div style={{background:"#ecfdf5",borderRadius:12,padding:"12px 16px"}}>
              <p style={{margin:0,fontSize:11,color:"#064e3b"}}>Compensación en días</p>
              <p style={{margin:"4px 0 0",fontSize:24,fontWeight:900,color:"#065f46"}}>{daysExtras.length}</p>
            </div>
          </div>
        </div>

        {/* Saldo por guardia */}
        {!isAdmin&&myG!==null&&(
          <div style={card}>
            <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#1e293b"}}>Saldo de días – Guardia {myG+1}</h3>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #e5e7eb"}}>
                    <th style={{textAlign:"left",padding:"6px 8px",color:"#64748b",fontWeight:600}}>Funcionario</th>
                    {AT.filter(a=>a.r).map(a=><th key={a.id} style={{textAlign:"center",padding:"6px 4px",color:a.c,fontWeight:600,fontSize:10}}>{a.l.split(" ")[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u=>u.gId===myG&&u.id!==0).map(u=>(
                    <tr key={u.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                      <td style={{padding:"6px 8px",fontWeight:600,color:"#1e293b"}}>{u.name.split(" ")[0]}</td>
                      {AT.filter(a=>a.r).map(a=>{
                        const bal=u.bal?.[a.id]??0;
                        const used=absences.filter(ab=>ab.userId===u.id&&ab.reason===a.id).length;
                        const rem=Math.max(0,bal-used);
                        return <td key={a.id} style={{textAlign:"center",padding:"6px 4px"}}>
                          <span style={{fontWeight:700,color:rem<2?"#dc2626":"#1e293b"}}>{rem}</span>
                          <span style={{fontSize:10,color:"#94a3b8"}}>/{bal}</span>
                        </td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAdmin = () => {
    const balUser = balEditId ? users.find(u=>u.id===balEditId) : null;
    return (
    <div>
      <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:900,color:"#0f172a"}}>Panel de Administración</h2>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[{id:"pending",l:`Solicitudes${pendingCnt>0?` (${pendingCnt})`:""}`},{id:"users",l:"Usuarios"},{id:"balances",l:"Saldos"},{id:"extra",l:"Turnos Extra"},{id:"supplements",l:"Suplementos"}].map(t=>(
          <button key={t.id} onClick={()=>setAdminTab(t.id)}
            style={{padding:"7px 16px",borderRadius:10,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",
              background:adminTab===t.id?"#0f172a":"#f1f5f9",color:adminTab===t.id?"white":"#64748b"}}>
            {t.l}
          </button>
        ))}
      </div>

      {adminTab==="pending"&&(
        pending.length===0?(
          <div style={{textAlign:"center",padding:"40px 0",color:"#cbd5e1"}}>No hay solicitudes pendientes</div>
        ):pending.map(u=>(
          <div key={u.id} style={{...card,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Avatar name={u.name} size={40} color={GC[u.gId]}/>
                <div>
                  <p style={{margin:0,fontSize:14,fontWeight:700,color:"#1e293b"}}>{u.name}</p>
                  <p style={{margin:"2px 0 0",fontSize:12,color:"#94a3b8"}}>{u.email} · {u.phone}</p>
                  <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                    <GuardChip gIdx={u.gId}/>
                    <span style={{fontSize:10,color:"#94a3b8"}}>Carnet: {u.cardNum}</span>
                    <span style={{fontSize:10,color:"#94a3b8"}}>Posesión: {u.sd}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setUsers(us=>[...us,{...u,approved:true}]);setPending(p=>p.filter(x=>x.id!==u.id));}}
                  style={{background:"#16a34a",color:"white",border:"none",borderRadius:10,padding:"7px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Aprobar</button>
                <button onClick={()=>setPending(p=>p.filter(x=>x.id!==u.id))}
                  style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:10,padding:"7px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Rechazar</button>
              </div>
            </div>
          </div>
        ))
      )}

      {adminTab==="users"&&[0,1,2,3,4].map(g=>(
        <div key={g} style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:GC[g],marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
            Guardia {g+1}
            <span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>({users.filter(u=>u.gId===g&&u.id!==0).length} funcionarios)</span>
          </div>
          {users.filter(u=>u.gId===g&&u.id!==0).map(u=>(
            <div key={u.id} style={{...card,display:"flex",alignItems:"center",justifyContent:"space-between",
              marginBottom:4,padding:"10px 14px",borderLeft:`4px solid ${GC[g]}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar name={u.name} size={28} color={GC[g]}/>
                <div>
                  <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{u.name}</span>
                  <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>{u.cardNum}</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:"#64748b"}}>{yos(u.sd)} años</span>
                <button onClick={()=>{setAdminTab("balances");setBalEditId(u.id);}}
                  style={{fontSize:10,background:"#f0f9ff",color:"#0284c7",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>
                  Editar saldo
                </button>
                <button onClick={()=>setAbsModal({date:new Date(),shift:"M",targetUserId:u.id,gIdx:u.gId})}
                  style={{fontSize:10,background:"#fef9c3",color:"#92400e",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>
                  Marcar ausencia
                </button>
                <span style={{fontSize:10,background:"#dcfce7",color:"#16a34a",padding:"2px 8px",borderRadius:20,fontWeight:600}}>Activo</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {adminTab==="balances"&&(
        <div>
          {/* User selector */}
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:"#64748b",fontWeight:600,display:"block",marginBottom:6}}>Seleccionar funcionario</label>
            <select value={balEditId??""} onChange={e=>setBalEditId(Number(e.target.value)||null)} style={{...inp,maxWidth:300}}>
              <option value="">-- Seleccionar --</option>
              {users.filter(u=>u.id!==0).map(u=><option key={u.id} value={u.id}>{u.name} (G{u.gId+1})</option>)}
            </select>
          </div>
          {balUser&&(
            <div style={card}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <Avatar name={balUser.name} size={36} color={GC[balUser.gId]}/>
                <div>
                  <p style={{margin:0,fontWeight:700,fontSize:14,color:"#1e293b"}}>{balUser.name}</p>
                  <p style={{margin:0,fontSize:12,color:"#64748b"}}>{yos(balUser.sd)} años de servicio · vacaciones base: {vacDays(yos(balUser.sd))} días</p>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {AT.filter(a=>a.r).map(a=>{
                  const cur=balUser.bal?.[a.id]??0;
                  const used=absences.filter(ab=>ab.userId===balUser.id&&ab.reason===a.id).length;
                  return (
                    <div key={a.id} style={{background:"#f8fafc",borderRadius:12,padding:"12px 14px",border:"1px solid #e5e7eb"}}>
                      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:a.c}}>{a.l}</p>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <button onClick={()=>setUsers(us=>us.map(u=>u.id===balUser.id?{...u,bal:{...u.bal,[a.id]:Math.max(0,(u.bal?.[a.id]??0)-1)}}:u))}
                          style={{width:28,height:28,borderRadius:8,background:"#fee2e2",border:"none",cursor:"pointer",fontWeight:900,fontSize:16,color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                        <span style={{fontSize:20,fontWeight:900,color:"#1e293b",minWidth:28,textAlign:"center"}}>{cur}</span>
                        <button onClick={()=>setUsers(us=>us.map(u=>u.id===balUser.id?{...u,bal:{...u.bal,[a.id]:(u.bal?.[a.id]??0)+1}}:u))}
                          style={{width:28,height:28,borderRadius:8,background:"#dcfce7",border:"none",cursor:"pointer",fontWeight:900,fontSize:16,color:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                        <span style={{fontSize:11,color:"#94a3b8",marginLeft:4}}>{used} usados</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!balUser&&<div style={{textAlign:"center",padding:"40px 0",color:"#cbd5e1",fontSize:13}}>Selecciona un funcionario para editar su saldo</div>}
        </div>
      )}

      {adminTab==="extra"&&(
        <div>
          <ExtraShiftForm users={users} isMobile={isMobile} onAdd={e=>{setExtraShifts(es=>[...es,e]);addNotif(e.userId,`📋 El administrador te ha asignado un turno extra ${e.shift} el día ${e.date} (comp: ${e.compensation==="economic"?"económica":"días libres"})`)}}/>
          {extraShifts.map(e=>{
            const u=users.find(x=>x.id===e.userId);
            return (
              <div key={e.id} style={{...card,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,padding:"10px 14px",background:"#fefce8"}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <ShiftChip shift={e.shift} small/>
                  <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{u?.name}</span>
                  <span style={{fontSize:12,color:"#94a3b8"}}>{e.date}</span>
                  <span style={{fontSize:12}}>{e.compensation==="economic"?"💰 Pago":"📅 Días libres"}</span>
                </div>
                <button onClick={()=>setExtraShifts(es=>es.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {adminTab==="supplements"&&(
        <div>
          <SupplementForm isMobile={isMobile} onAdd={s=>setSupplements(ss=>[...ss,s])}/>
          {supplements.map(s=>(
            <div key={s.id} style={{...card,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,padding:"10px 14px",background:"#f0fdf4"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <ShiftChip shift={s.shift} small/>
                <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{s.date}</span>
                <span style={{fontSize:14,fontWeight:700,color:"#16a34a"}}>+{s.amount}€</span>
                {s.note&&<span style={{fontSize:12,color:"#94a3b8"}}>{s.note}</span>}
              </div>
              <button onClick={()=>setSupplements(ss=>ss.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );};

  const renderNotifs = () => (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:"#0f172a"}}>Notificaciones</h2>
        {myNotifs.length>0&&<button onClick={()=>setNotifs(n=>n.map(x=>({...x,read:true})))}
          style={{fontSize:12,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Marcar todas leídas</button>}
      </div>
      {myNotifs.length===0?(
        <div style={{textAlign:"center",padding:"50px 0",color:"#cbd5e1",fontSize:14}}>Sin notificaciones</div>
      ):myNotifs.map(n=>(
        <div key={n.id} style={{...card,marginBottom:8,padding:"12px 16px",background:n.read?"white":"#eff6ff",borderLeft:`3px solid ${n.read?"#e5e7eb":"#3b82f6"}`}}>
          <p style={{margin:0,fontSize:13,color:"#1e293b"}}>{n.text}</p>
          <p style={{margin:"4px 0 0",fontSize:11,color:"#94a3b8"}}>{n.ts.toLocaleString("es-ES")}</p>
        </div>
      ))}
    </div>
  );

  // ─── ABSENCE MODAL LOGIC ───────────────────────────────────────────────────
  const absModalData = useMemo(()=>{
    if(!absModal) return null;
    // Admin can pass targetUserId and gIdx directly
    const gIdx = absModal.gIdx ?? myG;
    const targetUserId = absModal.targetUserId ?? currentUser.id;
    if(gIdx===null||gIdx===undefined) return null;
    const {date,shift}=absModal;
    const wc=countW(gIdx,date,shift);
    return {date,shift,gIdx,workingCount:wc,targetUserId};
  },[absModal,myG,absences,swaps,users]);

  // ─── LAYOUT ────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile&&(
        <div style={sidebar}>
          <div style={{padding:"20px 16px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#f59e0b,#ef4444)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🛡️</div>
              <div>
                <p style={{margin:0,color:"white",fontWeight:900,fontSize:14,letterSpacing:-0.3}}>GestorTurnos</p>
                <p style={{margin:0,color:"#475569",fontSize:10}}>Gestión de Guardias</p>
              </div>
            </div>
          </div>
          <div style={{margin:"0 10px 10px",padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Avatar name={currentUser.name} size={30} color={myG!==null?GC[myG]:"#f59e0b"}/>
              <div style={{minWidth:0}}>
                <p style={{margin:0,color:"white",fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentUser.name}</p>
                <p style={{margin:0,fontSize:10,color:myG!==null?GCS[myG]:"#f59e0b"}}>{isAdmin?"Administrador":`Guardia ${myG+1}`}</p>
              </div>
            </div>
          </div>
          <nav style={{flex:1,padding:"0 8px"}}>
            {navItems.map(item=>{
              const active=view===item.id;
              const badge=getBadge(item.id);
              return (
                <button key={item.id} onClick={()=>setView(item.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                    borderRadius:10,border:"none",marginBottom:2,cursor:"pointer",textAlign:"left",
                    background:active?"rgba(255,255,255,0.1)":"transparent",
                    borderLeft:`3px solid ${active?"#f59e0b":"transparent"}`}}>
                  <span style={{fontSize:14}}>{item.ico}</span>
                  <span style={{fontSize:12,fontWeight:600,color:active?"white":"#94a3b8",flex:1}}>{item.lbl}</span>
                  {badge>0&&<span style={{fontSize:10,background:"#ef4444",color:"white",width:18,height:18,
                    borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{badge}</span>}
                </button>
              );
            })}
          </nav>
          <div style={{padding:"8px 8px 16px"}}>
            <button onClick={onLogout}
              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,
                border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",cursor:"pointer"}}>
              <span style={{fontSize:13}}>🚪</span>
              <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,overflowY:"auto",background:"#f8fafc",paddingBottom:isMobile?72:0}}>

        {/* Mobile top bar */}
        {isMobile&&(
          <div style={{background:"linear-gradient(135deg,#0f172a,#1e3558)",padding:"12px 16px",
            display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>🛡️</span>
              <div>
                <span style={{color:"white",fontWeight:900,fontSize:14}}>GestorTurnos</span>
                <div style={{color:"#94a3b8",fontSize:10,lineHeight:1.3}}>v {__BUILD_DATE__}</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Avatar name={currentUser.name} size={32} color={myG!==null?GC[myG]:"#f59e0b"}/>
              <button onClick={onLogout} style={{background:"rgba(255,255,255,0.1)",border:"none",
                borderRadius:8,padding:"8px 14px",color:"white",fontSize:13,cursor:"pointer",fontWeight:600}}>
                Salir
              </button>
            </div>
          </div>
        )}

        <div style={{maxWidth:980,margin:"0 auto",padding:isMobile?"12px 12px 0":"24px"}}>
          {view==="cal-general"  && renderCalGeneral()}
          {view==="cal-guardia"  && renderCalGuardia()}
          {view==="cal-personal" && renderCalPersonal()}
          {view==="tablon"       && renderTablon()}
          {view==="stats"        && renderStats()}
          {view==="admin"        && isAdmin && renderAdmin()}
          {view==="notifs"       && renderNotifs()}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,
          background:"linear-gradient(180deg,#0f172a,#1e293b)",
          borderTop:"1px solid rgba(255,255,255,0.08)",
          display:"flex",alignItems:"stretch",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
          {navItems.map(item=>{
            const active=view===item.id;
            const badge=getBadge(item.id);
            return (
              <button key={item.id} onClick={()=>setView(item.id)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  minHeight:56,padding:"6px 2px",border:"none",cursor:"pointer",position:"relative",
                  background:active?"rgba(245,158,11,0.15)":"transparent",
                  borderTop:active?"2px solid #f59e0b":"2px solid transparent"}}>
                <span style={{fontSize:20,lineHeight:1}}>{item.ico}</span>
                <span style={{fontSize:10,fontWeight:active?700:500,
                  color:active?"#f59e0b":"#64748b",marginTop:3,whiteSpace:"nowrap",
                  overflow:"hidden",maxWidth:"100%",textOverflow:"ellipsis",padding:"0 2px"}}>
                  {item.lbl.split(" ")[0]}
                </span>
                {badge>0&&(
                  <span style={{position:"absolute",top:6,right:"50%",transform:"translateX(10px)",
                    fontSize:9,background:"#ef4444",color:"white",width:17,height:17,
                    borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── MODALS ── */}
      {swapModal&&(
        <SwapDetailModal
          swap={swapModal.swap} users={users} currentUserId={currentUser.id}
          cancelLabel={swapModal.role==="from"?"Anular cambio (dejas de ceder)":"Anular cambio (dejas de cubrir)"}
          onCancel={()=>{
            const s = swapModal.swap;
            if(swapModal.role==="from"){
              const cancelConflict = checkConflict(currentUser.id, s.fromDate, s.fromShift);
              if(cancelConflict){ alert(`No se puede anular el cambio: ${cancelConflict}`); return; }
              addNotif(s.toId,`🔄 ${currentUser.name} ha anulado el cambio del ${s.fromDate} turno ${s.fromShift}`);
            } else {
              addNotif(s.fromId,`🔄 ${currentUser.name} ha anulado el cambio del ${s.fromDate} turno ${s.fromShift}`);
            }
            setSwaps(sw=>sw.filter(x=>x.id!==s.id));
            setSwapModal(null);
          }}
          onClose={()=>setSwapModal(null)}/>
      )}
      {guardModal&&(
        <GuardShiftModal date={guardModal.date} shift={guardModal.shift} gIdx={guardModal.gIdx}
          users={users} absences={absences} swaps={swaps}
          extraShifts={extraShifts} supplements={supplements}
          onClose={()=>setGuardModal(null)}/>
      )}
      {genModal&&(
        <GeneralModal date={genModal.date} shift={genModal.shift}
          users={users} absences={absences} swaps={swaps} onClose={()=>setGenModal(null)}/>
      )}
      {absModal&&absModalData&&(
        <AbsenceModal
          date={absModalData.date} shift={absModalData.shift}
          gIdx={absModalData.gIdx} workingCount={absModalData.workingCount}
          shiftConflict={null}
          onConfirm={reason=>{
            const dateStr=ds(absModal.date);
            const targetUserId = absModalData.targetUserId ?? currentUser.id;
            // For voluntary absences, check that requesting libre doesn't expose
            // a conflict the OTHER WAY: e.g. have swapCover N and request T libre
            // is fine; but requesting libre of a shift adjacent to a swap-covered shift
            // that creates T→N or N→M is an edge case already prevented by checkConflict
            // on the cancel side. Here we just record the absence.
            const newAbs={id:Date.now(),userId:targetUserId,date:dateStr,shift:absModal.shift,reason};
            const newAbsList=[...absences,newAbs];
            setAbsences(newAbsList);
            const at=AT.find(a=>a.id===reason);
            if(!at?.r && absModalData.gIdx!==null) {
              cascadeCheck(absModalData.gIdx, dateStr, absModal.shift, newAbsList);
            }
            setAbsModal(null);
          }}
          onClose={()=>setAbsModal(null)}/>
      )}
    </div>
  );
}
