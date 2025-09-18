import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ========== APP META ==========
const TEAM_NAME = "ACRT";

// ========== SUPABASE ==========
const DEFAULT_SUPABASE_URL = "https://bmmaavlavvdfjcxhmhxz.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbWFhdmxhdnZkZmpjeGhtaHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNDk0MzgsImV4cCI6MjA3MzcyNTQzOH0.tE1jZ1hmLiEDAj4m-bAoQD01EPL4MbS3hM6SaCeHuIc";
const url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || (typeof window !== 'undefined' && window.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const key = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || (typeof window !== 'undefined' && window.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
const supabase = (url && key) ? createClient(url, key) : null;

// ========== SEED / CONSTANTS ==========
const JOUR_MOMENTS = [
  { jour: "Vendredi", moment: "Dîner" },
  { jour: "Samedi", moment: "Petit-déj" },
  { jour: "Samedi", moment: "Lunch" },
  { jour: "Samedi", moment: "Dîner" },
  { jour: "Dimanche", moment: "Lunch" },
];

const seedParticipants = [
  { id: "p1", name: "Alice L.", role: "Catering", allergies: "", presences: { "Vendredi-Dîner": false, "Samedi-Petit-déj": true, "Samedi-Lunch": true, "Samedi-Dîner": true, "Dimanche-Lunch": false }, pilotSessions: [] },
  { id: "p2", name: "Bob P.", role: "Pilote", allergies: "Sans gluten", presences: { "Vendredi-Dîner": true, "Samedi-Petit-déj": false, "Samedi-Lunch": true, "Samedi-Dîner": false, "Dimanche-Lunch": true }, pilotSessions: [ { jour: "Samedi", start: "12:00", end: "12:30" } ] },
  { id: "p3", name: "Charly M.", role: "Staff", allergies: "", presences: { "Vendredi-Dîner": true, "Samedi-Petit-déj": false, "Samedi-Lunch": true, "Samedi-Dîner": true, "Dimanche-Lunch": true }, pilotSessions: [] },
];

const seedArticles = [
  { id: "a1", type: "Nourriture", jour: "Samedi", moment: "Lunch", article: "Pizza", unite: "portion/pers", portion: 1.5, budget: 3.5, statut: "À faire", notes: "", recipe: [
    { name: "Pâte à pizza", unit: "pièce", perUnit: 1 },
    { name: "Sauce tomate", unit: "portion", perUnit: 1 },
    { name: "Fromage", unit: "portion", perUnit: 1 },
  ] },
  { id: "a2", type: "Boisson", jour: "Samedi", moment: "Boissons", article: "Eau", unite: "litre/pers", portion: 1.0, budget: 0.3, statut: "À faire", notes: "Mettre au frais", recipe: [] },
  { id: "a3", type: "Matériel", jour: "", moment: "", article: "BBQ électrique", unite: "", portion: 0, budget: 0, statut: "À faire", notes: "Rallonges", recipe: [] },
  { id: "a4", type: "Matériel", jour: "", moment: "", article: "Glacière", unite: "", portion: 0, budget: 0, statut: "Fait", notes: "", recipe: [] },
];

// ========== LOCAL STORAGE ==========
const LS_KEY = "catering24_state_v6";
const loadState = () => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveState = (state) => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} };

// ========== HELPERS ==========
const countPresence = (participants, jour, moment) => participants.filter(p => p.presences && p.presences[`${jour}-${moment}`]).length;

function aggregateCoursesWithRecipes(articles, participants) {
  const res = {};
  for (const a of articles) {
    if (a.type === "Matériel") continue;
    const n = a.jour && a.moment ? countPresence(participants, a.jour, a.moment) : 0;
    const units = Math.round((a.portion || 0) * n);
    if (!a.recipe || a.recipe.length === 0) {
      res[a.article] = (res[a.article] || 0) + units;
      continue;
    }
    for (const ing of a.recipe) {
      const key = `${ing.name} (${ing.unit || ''})`.trim();
      res[key] = (res[key] || 0) + units * (Number(ing.perUnit) || 0);
    }
  }
  return res;
}

// ========== TINY UI SYSTEM (AÉRÉ) ==========
const surface = {
  card: { border:'1px solid #e5e7eb', borderRadius:20, background:'#fff', padding:16, marginBottom:16, boxShadow:'0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)' },
  dialog: { border:'1px solid #e5e7eb', borderRadius:20, padding:20, maxWidth:760 },
  btnBase: { borderRadius:14, padding:'10px 14px', cursor:'pointer', fontWeight:600, transition:'all .15s ease' },
  input: { padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:12, width:'100%', background:'#fff' },
  subtle: { color:'#6b7280' },
};

const Wrap = ({ title, right, children }) => (
  <div style={surface.card}>
    {(title || right) && (
      <div style={{ display:'flex', alignItems:'center', marginBottom:10 }}>
        {title && <div style={{ fontWeight:800, fontSize:16 }}>{title}</div>}
        <div style={{ marginLeft:'auto' }}>{right}</div>
      </div>
    )}
    {children}
  </div>
);

const Row = ({ gap=10, align='center', wrap=false, style, children }) => (
  <div style={{ display:'flex', gap, alignItems:align, flexWrap: wrap? 'wrap':'nowrap', ...style }}>{children}</div>
);

const Btn = ({ variant='solid', style, ...props }) => (
  <button {...props} style={{
    ...surface.btnBase,
    border: variant==='solid'? '1px solid #111827' : variant==='danger'? '1px solid #ef4444' : '1px solid #e5e7eb',
    background: variant==='solid'? '#111827' : variant==='danger'? '#fee2e2' : '#fff',
    color: variant==='solid'? '#fff' : variant==='danger'? '#991b1b' : '#111827',
    ...style
  }} />
);

const Input = (p) => <input {...p} style={surface.input} />
const Textarea = (p) => <textarea {...p} style={{...surface.input, minHeight:86}} />
const Select = (p) => <select {...p} style={surface.input} />
const Badge = ({ children, tone='neutral' }) => {
  const map = { neutral:'#e5e7eb', success:'#bbf7d0', warning:'#fde68a' };
  return <span style={{ border:'1px solid #e5e7eb', background: map[tone] || map.neutral, borderRadius:999, padding:'4px 10px', fontSize:12 }}>{children}</span>
}

// ========== FORMS ==========
const ParticipantForm = ({ initial, onSubmit, onCancel }) => {
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState(initial?.role || "");
  const [allergies, setAllergies] = useState(initial?.allergies || "");
  const [presences, setPresences] = useState(initial?.presences || {});
  const [pilotSessions, setPilotSessions] = useState(initial?.pilotSessions || []);

  const addSession = () => setPilotSessions(prev=>[...prev, { jour: "Samedi", start: "12:00", end: "12:30" }]);
  const updSession = (i,k,v) => setPilotSessions(prev=> prev.map((s,idx)=> idx===i? { ...s, [k]: v } : s));
  const delSession = (i) => setPilotSessions(prev=> prev.filter((_,idx)=> idx!==i));

  return (
    <div style={{ display:'grid', gap:14 }}>
      <Row gap={12} wrap>
        <div style={{ flex:1 }}>
          <div>Nom</div>
          <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex. Alice L." />
        </div>
        <div style={{ width:260 }}>
          <div>Rôle</div>
          <Input value={role} onChange={e=>setRole(e.target.value)} placeholder="Pilote / Staff / Catering…" />
        </div>
      </Row>
      <div>
        <div>Allergies / Régimes</div>
        <Input value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="Sans gluten, vegan, etc." />
      </div>
      <div>
        <div>Présences</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:10, marginTop:8 }}>
          {JOUR_MOMENTS.map((jm,i)=> (
            <label key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:12 }}>
              <input type="checkbox" checked={!!presences[`${jm.jour}-${jm.moment}`]} onChange={e=> setPresences(prev=> ({ ...prev, [`${jm.jour}-${jm.moment}`]: e.target.checked })) } />
              {jm.jour} {jm.moment}
            </label>
          ))}
        </div>
      </div>

      {role.toLowerCase()==='pilote' && (
        <div>
          <div style={{ fontWeight:700, marginBottom:8 }}>Tranches de roulage (Pilote)</div>
          <div style={{ display:'grid', gap:10 }}>
            {pilotSessions.map((s, i)=> (
              <Row key={i} gap={10} wrap>
                <div style={{ width:180 }}>
                  <div>Jour</div>
                  <Select value={s.jour} onChange={e=>updSession(i,'jour', e.target.value)}>
                    {[...new Set(JOUR_MOMENTS.map(j=>j.jour))].map(j=> <option key={j} value={j}>{j}</option>)}
                  </Select>
                </div>
                <div style={{ width:140 }}>
                  <div>Début</div>
                  <Input value={s.start} onChange={e=>updSession(i,'start', e.target.value)} placeholder="HH:MM" />
                </div>
                <div style={{ width:140 }}>
                  <div>Fin</div>
                  <Input value={s.end} onChange={e=>updSession(i,'end', e.target.value)} placeholder="HH:MM" />
                </div>
                <Btn variant='ghost' onClick={()=>delSession(i)}>Supprimer</Btn>
              </Row>
            ))}
            <Row>
              <Btn variant='outline' onClick={addSession}>+ Ajouter une tranche</Btn>
            </Row>
          </div>
        </div>
      )}

      <Row gap={10} style={{ justifyContent:'flex-end' }}>
        <Btn variant='outline' onClick={onCancel}>Annuler</Btn>
        <Btn onClick={()=> onSubmit({ ...(initial||{}), name, role, allergies, presences, pilotSessions })}>Enregistrer</Btn>
      </Row>
    </div>
  );
};

const ArticleForm = ({ initial, onSubmit, onCancel }) => {
  const [type, setType] = useState(initial?.type || "Nourriture");
  const [jour, setJour] = useState(initial?.jour || "Samedi");
  const [moment, setMoment] = useState(initial?.moment || "Lunch");
  const [article, setArticle] = useState(initial?.article || "");
  const [unite, setUnite] = useState(initial?.unite || "portion/pers");
  const [portion, setPortion] = useState(initial?.portion || 1);
  const [budget, setBudget] = useState(initial?.budget || 0);
  const [statut, setStatut] = useState(initial?.statut || "À faire");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [recipe, setRecipe] = useState(initial?.recipe || []);

  const addIng = () => setRecipe(prev=>[...prev, { name: "", unit: "", perUnit: 0 }]);
  const updIng = (i,k,v) => setRecipe(prev=> prev.map((r,idx)=> idx===i? { ...r, [k]: k==='perUnit'? Number(v)||0 : v } : r));
  const delIng = (i) => setRecipe(prev=> prev.filter((_,idx)=> idx!==i));

  return (
    <div style={{ display:'grid', gap:14 }}>
      <Row gap={12} wrap>
        <div style={{ width:200 }}>
          <div>Type</div>
          <Select value={type} onChange={e=>setType(e.target.value)}>
            {['Nourriture','Boisson','Matériel'].map(t=> <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div style={{ width:200 }}>
          <div>Statut</div>
          <Select value={statut} onChange={e=>setStatut(e.target.value)}>
            {['À faire','Fait','Annulé'].map(s=> <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        {type!=="Matériel" && (
          <>
            <div style={{ width:200 }}>
              <div>Jour</div>
              <Select value={jour} onChange={e=>setJour(e.target.value)}>
                {[...new Set(JOUR_MOMENTS.map(j=>j.jour))].map(j=> <option key={j} value={j}>{j}</option>)}
              </Select>
            </div>
            <div style={{ width:200 }}>
              <div>Moment</div>
              <Select value={moment} onChange={e=>setMoment(e.target.value)}>
                {JOUR_MOMENTS.filter(j=>j.jour===jour).map(j=> <option key={j.moment} value={j.moment}>{j.moment}</option>)}
              </Select>
            </div>
          </>
        )}
      </Row>
      <Row gap={12} wrap>
        <div style={{ flex:1 }}>
          <div>Article</div>
          <Input value={article} onChange={e=>setArticle(e.target.value)} placeholder="Ex. Pizza / Eau / BBQ" />
        </div>
        {type!=="Matériel" && (
          <div style={{ width:220 }}>
            <div>Unité</div>
            <Select value={unite} onChange={e=>setUnite(e.target.value)}>
              {['pièce/pers','sandwich/pers','litre/pers','portion/pers'].map(u=> <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        )}
      </Row>
      {type!=="Matériel" && (
        <Row gap={12} wrap>
          <div style={{ width:220 }}>
            <div>Portion / pers</div>
            <Input type="number" step="0.1" value={portion} onChange={e=>setPortion(Number(e.target.value))} />
          </div>
          <div style={{ width:220 }}>
            <div>Budget (€/unité)</div>
            <Input type="number" step="0.1" value={budget} onChange={e=>setBudget(Number(e.target.value))} />
          </div>
        </Row>
      )}
      <div>
        <div>Notes</div>
        <Textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex. cuisson électrique uniquement, après roulage, etc." />
      </div>

      {type!=="Matériel" && (
        <div>
          <div style={{ fontWeight:700, marginBottom:8 }}>Recette (ingrédients par unité)</div>
          <div style={{ display:'grid', gap:10 }}>
            {recipe.map((r, i)=> (
              <Row key={i} gap={10} wrap>
                <div style={{ flex:1 }}>
                  <Input placeholder="Nom ingrédient" value={r.name} onChange={e=>updIng(i,'name', e.target.value)} />
                </div>
                <div style={{ width:160 }}>
                  <Input placeholder="Qté" type="number" step="0.1" value={r.perUnit} onChange={e=>updIng(i,'perUnit', e.target.value)} />
                </div>
                <div style={{ width:180 }}>
                  <Input placeholder="Unité" value={r.unit} onChange={e=>updIng(i,'unit', e.target.value)} />
                </div>
                <Btn variant='ghost' onClick={()=>delIng(i)}>Supprimer</Btn>
              </Row>
            ))}
            <Btn variant='outline' onClick={addIng}>+ Ajouter un ingrédient</Btn>
          </div>
        </div>
      )}

      <Row gap={10} style={{ justifyContent:'flex-end' }}>
        <Btn variant='outline' onClick={onCancel}>Annuler</Btn>
        <Btn onClick={()=> onSubmit({ ...(initial||{}), type, jour: type==="Matériel"? "" : jour, moment: type==="Matériel"? "" : moment, article, unite: type==="Matériel"? "" : unite, portion: type==="Matériel"? 0 : Number(portion)||0, budget: Number(budget)||0, statut, notes, recipe })}>Enregistrer</Btn>
      </Row>
    </div>
  );
};

// ========== APP ==========
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [status, setStatus] = useState(supabase ? 'supabase' : 'local');
  const [details, setDetails] = useState('');

  const persisted = (typeof window !== 'undefined') ? loadState() : null;
  const [participants, setParticipants] = useState(persisted?.participants || seedParticipants);
  const [articles, setArticles] = useState(persisted?.articles || seedArticles);

  const [openP, setOpenP] = useState(false);
  const [editingP, setEditingP] = useState(null);
  const [openA, setOpenA] = useState(false);
  const [editingA, setEditingA] = useState(null);
  const [q, setQ] = useState('');

  useEffect(()=>{ if (!supabase) return; setStatus('supabase'); },[]);
  useEffect(()=>{ if (!supabase) saveState({ participants, articles }); },[participants, articles]);

  const test = async () => {
    if (!supabase) { setStatus('local'); setDetails('Aucune config Supabase trouvée.'); return; }
    try {
      const { error } = await supabase.from('participants').select('id').limit(1);
      if (error) throw error;
      setStatus('ok'); setDetails('Connexion Supabase opérationnelle.');
    } catch (e) { setStatus('error'); setDetails(String(e && e.message ? e.message : e)); }
  };

  useEffect(()=>{
    if (!supabase) return;
    (async()=>{
      const { data: pData } = await supabase.from('participants').select('*');
      const { data: aData } = await supabase.from('articles').select('*, ingredients:article_ingredients(*)');
      const { data: prData } = await supabase.from('presences').select('*');
      const { data: psData } = await supabase.from('pilot_sessions').select('*');
      const P = (pData||[]).map(row=> ({
        id: row.id, name: row.name, role: row.role, allergies: row.allergies,
        presences: (prData||[]).filter(r=>r.participant_id===row.id).reduce((acc,r)=> ({...acc, [`${r.jour}-${r.moment}`]: !!r.present}), {}),
        pilotSessions: (psData||[]).filter(s=>s.participant_id===row.id).map(s=> ({ jour: s.jour, start: s.start_time, end: s.end_time }))
      }));
      const A = (aData||[]).map(row=> ({
        id: row.id, type: row.type, jour: row.jour, moment: row.moment, article: row.article, unite: row.unite,
        portion: Number(row.portion)||0, budget: Number(row.budget)||0, statut: row.statut, notes: row.notes||'',
        recipe: (row.ingredients||[]).map(ing=> ({ name: ing.name, unit: ing.unit, perUnit: Number(ing.per_unit)||0 }))
      }));
      if (P.length) setParticipants(P);
      if (A.length) setArticles(A);
    })();
  },[]);

  // CRUD
  const upsertParticipant = async (p) => {
    if (supabase) {
      const id = p.id && String(p.id).startsWith('p_') ? undefined : p.id;
      const { data: row } = await supabase.from('participants').upsert({ id, name: p.name, role: p.role, allergies: p.allergies }).select().single();
      const pid = (row && row.id) || p.id;
      await supabase.from('presences').delete().eq('participant_id', pid);
      const presRows = Object.entries(p.presences||{}).map(([k,v])=> { const [jour, moment] = k.split('-'); return { participant_id: pid, jour, moment, present: !!v }; });
      if (presRows.length) await supabase.from('presences').insert(presRows);
      await supabase.from('pilot_sessions').delete().eq('participant_id', pid);
      const sess = (p.pilotSessions||[]).map(s=> ({ participant_id: pid, jour: s.jour, start_time: s.start, end_time: s.end }));
      if (sess.length) await supabase.from('pilot_sessions').insert(sess);
    }
    setParticipants(prev=>{ const exists = prev.some(x=>x.id===p.id); return exists? prev.map(x=>x.id===p.id? p:x) : [...prev, { ...p, id: p.id || `p_${Date.now()}` }]; });
    setOpenP(false); setEditingP(null);
  };
  const deleteParticipant = async (id) => {
    if (supabase) {
      await supabase.from('pilot_sessions').delete().eq('participant_id', id);
      await supabase.from('presences').delete().eq('participant_id', id);
      await supabase.from('participants').delete().eq('id', id);
    }
    setParticipants(prev=> prev.filter(p=>p.id!==id));
  };

  const upsertArticle = async (a) => {
    let aid = a.id;
    if (supabase) {
      const id = a.id && String(a.id).startsWith('a_') ? undefined : a.id;
      const { data: row } = await supabase.from('articles').upsert({ id,
        type: a.type, jour: a.jour || null, moment: a.moment || null, article: a.article, unite: a.unite || null,
        portion: Number(a.portion)||0, budget: Number(a.budget)||0, statut: a.statut, notes: a.notes||null
      }).select().single();
      aid = (row && row.id) || a.id;
      await supabase.from('article_ingredients').delete().eq('article_id', aid);
      const ings = (a.recipe||[]).filter(r=>r.name).map(r=> ({ article_id: aid, name: r.name, unit: r.unit||'', per_unit: Number(r.perUnit)||0 }));
      if (ings.length) await supabase.from('article_ingredients').insert(ings);
    }
    setArticles(prev=>{ const exists = prev.some(x=>x.id===a.id); return exists? prev.map(x=>x.id===a.id? a:x) : [...prev, { ...a, id: a.id || aid || `a_${Date.now()}` }]; });
    setOpenA(false); setEditingA(null);
  };
  const deleteArticle = async (id) => {
    if (supabase) {
      await supabase.from('article_ingredients').delete().eq('article_id', id);
      await supabase.from('articles').delete().eq('id', id);
    }
    setArticles(prev=> prev.filter(a=>a.id!==id));
  };

  // Derived
  const equipment = useMemo(()=> articles.filter(a=>a.type==='Matériel'), [articles]);
  const equipDone = equipment.filter(e=>e.statut==='Fait').length;
  const equipProgress = equipment.length? Math.round(equipDone/equipment.length*100) : 0;
  const budget = useMemo(()=>{
    let total=0; for (const a of articles) { if (a.type!=="Matériel" && a.jour && a.moment) { const n = countPresence(participants, a.jour, a.moment); total += (a.budget||0) * (n * (a.portion||0)); } }
    return Math.round(total*100)/100;
  },[articles, participants]);
  const nbSamediLunch = countPresence(participants, 'Samedi', 'Lunch');
  const shopping = useMemo(()=> aggregateCoursesWithRecipes(articles, participants), [articles, participants]);

  // ========== DEV TESTS (console) ==========
  useEffect(()=>{
    // Test 1: budget calc
    const tParts = [
      { presences: { 'Samedi-Lunch': true } },
      { presences: { 'Samedi-Lunch': true } },
      { presences: { 'Samedi-Lunch': true } },
    ];
    const tArts = [ { type:'Nourriture', jour:'Samedi', moment:'Lunch', article:'Pizza', portion:2, budget:5 } ];
    let tBudget=0; for (const a of tArts) { const n = countPresence(tParts, a.jour, a.moment); tBudget += (a.budget||0) * (n * (a.portion||0)); }
    if (tBudget !== 30) console.error('[TEST] Budget expected 30, got', tBudget); else console.log('[TEST] Budget OK');

    // Test 2: recipe aggregation
    const rArts = [ { type:'Nourriture', jour:'Samedi', moment:'Lunch', article:'Pizza', portion:1, recipe:[{name:'Fromage', unit:'portion', perUnit:2}] } ];
    const agg = aggregateCoursesWithRecipes(rArts, tParts);
    if (agg['Fromage (portion)'] !== 6) console.error('[TEST] Recipe expected 6, got', agg['Fromage (portion)']); else console.log('[TEST] Recipe OK');
  },[]);

  // UI
  return (
    <div style={{fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto', padding:24, maxWidth:1200, margin:'0 auto'}}>
      {/* Header */}
      <Row gap={12} align='center' wrap>
        <h1 style={{fontSize:28, fontWeight:900, margin:'8px 0'}}>🏁 {TEAM_NAME} – Catering & Planning • 24h 2CV</h1>
      </Row>

      {/* Tabs */}
      <Row gap={8} wrap style={{ marginBottom:8 }}>
        {['dashboard','participants','repas','materiel','planning','config'].map(t=> (
          <Btn key={t} variant={t===tab?'solid':'outline'} onClick={()=>setTab(t)}>{t}</Btn>
        ))}
      </Row>

      {/* Dashboard */}
      {tab==='dashboard' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:16 }}>
          <Wrap title="Participants Samedi Lunch"><div style={{ fontSize:30, fontWeight:900 }}>{nbSamediLunch}</div><div style={{ color:'#6b7280' }}>basé sur les présences</div></Wrap>
          <Wrap title="Pizza portions (Samedi Lunch)"><div style={{ fontSize:30, fontWeight:900 }}>{Math.round(nbSamediLunch * ((articles.find(a=>a.article==='Pizza' && a.jour==='Samedi' && a.moment==='Lunch')?.portion) || 0))}</div><div style={{ color:'#6b7280' }}>portion(s) total</div></Wrap>
          <Wrap title="Budget estimé"><div style={{ fontSize:30, fontWeight:900 }}>{budget.toFixed(2)} €</div><div style={{ color:'#6b7280' }}>repas & boissons</div></Wrap>
          <Wrap title="Matériel prêt">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:30, fontWeight:900 }}>{equipProgress}%</div>
              <div style={{ flex:1, height:10, background:'#eee', borderRadius:10 }}><div style={{ width:`${equipProgress}%`, height:'100%', background:'#16a34a' }}/></div>
            </div>
            <div style={{ color:'#6b7280', marginTop:6 }}>{equipDone}/{equipment.length} éléments</div>
          </Wrap>
        </div>
      )}

      {/* Participants */}
      {tab==='participants' && (
        <Wrap title="Participants" right={<Btn variant='outline' onClick={()=>{ setEditingP(null); setOpenP(true); }}>+ Ajouter</Btn>}>
          <Row gap={10} wrap>
            <Input placeholder="Rechercher…" value={q} onChange={e=>setQ(e.target.value)} />
          </Row>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:16, marginTop:12 }}>
            {participants.filter(p=> (p.name||'').toLowerCase().includes(q.toLowerCase())).map(p=> (
              <div key={p.id} style={{ border:'1px solid #e5e7eb', borderRadius:20, background:'#fff', padding:16, marginBottom:0, boxShadow:'none' }}>
                <Row style={{ justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:800 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:'#6b7280' }}>{p.role}{p.allergies? ` • ${p.allergies}`: ''}</div>
                  </div>
                  <Row gap={6}>
                    <Btn variant='ghost' onClick={()=>{ setEditingP(p); setOpenP(true); }}>Éditer</Btn>
                    <Btn variant='danger' onClick={()=>deleteParticipant(p.id)}>Supprimer</Btn>
                  </Row>
                </Row>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:8, marginTop:10, fontSize:14 }}>
                  {JOUR_MOMENTS.map((jm,idx)=> (
                    <label key={idx} style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input type="checkbox" checked={!!(p.presences && p.presences[`${jm.jour}-${jm.moment}`])} onChange={async e=>{
                        const next = participants.map(x=> x.id===p.id? { ...x, presences:{...(x.presences||{}), [`${jm.jour}-${jm.moment}`]: e.target.checked }}: x);
                        setParticipants(next);
                        if (supabase) await upsertParticipant(next.find(x=>x.id===p.id));
                      }} />
                      {jm.jour.slice(0,1)}-{jm.moment}
                    </label>
                  ))}
                </div>
                {p.role && p.role.toLowerCase()==='pilote' && (
                  <div style={{ borderTop:'1px solid #eee', marginTop:10, paddingTop:10 }}>
                    <div style={{ fontSize:12, fontWeight:700 }}>Tranches de roulage</div>
                    <div style={{ marginLeft:16 }}>
                      {(p.pilotSessions||[]).map((s, i)=> (
                        <div key={i} style={{ fontSize:14 }}>{s.jour} • {s.start}–{s.end}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {openP && (
            <dialog open style={{ border:'1px solid #e5e7eb', borderRadius:20, padding:20, maxWidth:760 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontWeight:800 }}>Ajouter / éditer un participant</div>
                <Btn variant='ghost' onClick={()=>{ setOpenP(false); setEditingP(null); }}>Fermer</Btn>
              </div>
              <ParticipantForm initial={editingP} onSubmit={upsertParticipant} onCancel={()=>{ setOpenP(false); setEditingP(null); }} />
            </dialog>
          )}
        </Wrap>
      )}

      {/* Repas & Courses */}
      {tab==='repas' && (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
          <Wrap title="Articles (Nourriture & Boissons)" right={<Btn variant='outline' onClick={()=>{ setEditingA(null); setOpenA(true); }}>+ Ajouter</Btn>}>
            <Row gap={10} wrap>
              <Input placeholder="Rechercher…" value={q} onChange={e=>setQ(e.target.value)} />
            </Row>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:16, marginTop:12 }}>
              {articles.filter(a=> a.type!=="Matériel" && (`${a.type} ${a.article} ${a.jour} ${a.moment}`.toLowerCase().includes(q.toLowerCase()))).map(a=> (
                <div key={a.id} style={{ border:'1px solid #e5e7eb', borderRadius:20, background:'#fff', padding:16, marginBottom:0, boxShadow:'none' }}>
                  <Row style={{ justifyContent:'space-between' }}>
                    <div style={{ fontWeight:800 }}>{a.article}</div>
                    <Badge>{a.statut}</Badge>
                  </Row>
                  <div style={{ fontSize:12, color:'#6b7280' }}>{a.jour||'-'} • {a.moment||'-'} • {a.unite||'-'} × {a.portion||0}</div>
                  <Row style={{ justifyContent:'space-between', marginTop:8 }}>
                    <div>Qté totale (auto)</div>
                    <Badge tone='success'>{a.jour && a.moment ? Math.round(countPresence(participants, a.jour, a.moment) * (a.portion||0)) : 0}</Badge>
                  </Row>
                  {!!(a.recipe&&a.recipe.length) && (
                    <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>Ingrédients par unité : {a.recipe.map(r=>`${r.name} (${r.perUnit} ${r.unit})`).join(', ')}</div>
                  )}
                  <Row gap={8} style={{ marginTop:10 }}>
                    <Btn variant='ghost' onClick={()=>{ setEditingA(a); setOpenA(true); }}>Éditer</Btn>
                    <Btn variant='danger' onClick={()=>deleteArticle(a.id)}>Supprimer</Btn>
                  </Row>
                </div>
              ))}
            </div>
          </Wrap>

          <Wrap title="Liste de courses">
            <div style={{ display:'grid', gap:10 }}>
              {Object.entries(shopping).map(([label, qty])=> (
                <Row key={label} style={{ justifyContent:'space-between' }}>
                  <div>{label}</div><Badge>{qty}</Badge>
                </Row>
              ))}
            </div>
          </Wrap>
        </div>
      )}

      {/* Matériel */}
      {tab==='materiel' && (
        <Wrap title="Matériel" right={<Btn variant='outline' onClick={()=>{ setEditingA({ type:'Matériel'}); setOpenA(true); }}>+ Ajouter</Btn>}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:16 }}>
            {equipment.map(e=> (
              <div key={e.id} style={{ border:'1px solid #e5e7eb', borderRadius:20, background:'#fff', padding:16, marginBottom:0, boxShadow:'none', display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:800 }}>{e.article}</div>
                  <div style={{ fontSize:12, color:'#6b7280' }}>Statut</div>
                </div>
                <Row gap={8}>
                  <Badge>{e.statut}</Badge>
                  <Btn variant='ghost' onClick={()=>{ setEditingA(e); setOpenA(true); }}>Éditer</Btn>
                  <Btn variant='danger' onClick={()=>deleteArticle(e.id)}>Supprimer</Btn>
                </Row>
              </div>
            ))}
          </div>
        </Wrap>
      )}

      {/* Planning */}
      {tab==='planning' && (
        <Wrap title="Planning">
          <div style={{ display:'grid', gap:10, fontSize:14 }}>
            {participants.filter(p=> (p.pilotSessions||[]).length>0).map(p=> (
              <div key={p.id}>
                <div style={{ fontWeight:800 }}>{p.name} <span style={{ fontSize:12, color:'#6b7280' }}>(Pilote)</span></div>
                <ul style={{ marginTop:4 }}>
                  {(p.pilotSessions||[]).map((s, idx)=> (
                    <li key={idx}>{s.jour} • {s.start}–{s.end}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Wrap>
      )}

      {/* Config */}
      {tab==='config' && (
        <Wrap title="Configuration / Connexion">
          <div style={{ display:'grid', gap:12 }}>
            <Row gap={10} wrap>
              <Badge>Statut: {status}</Badge>
              <Btn variant='outline' onClick={test}>Tester connexion</Btn>
            </Row>
            <div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Supabase URL</div>
              <Input value={url} readOnly />
            </div>
            <div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Anon key (masquée)</div>
              <Input value={(key||'').slice(0,10) + '•••' } readOnly />
            </div>
            {details && <pre style={{ whiteSpace:'pre-wrap', background:'#f9fafb', padding:12, borderRadius:12, border:'1px solid #e5e7eb' }}>{details}</pre>}
          </div>
        </Wrap>
      )}

      {/* Dialogs */}
      {openA && (
        <dialog open style={{ border:'1px solid #e5e7eb', borderRadius:20, padding:20, maxWidth:760 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontWeight:800 }}>Ajouter / éditer un article</div>
            <Btn variant='ghost' onClick={()=>{ setOpenA(false); setEditingA(null); }}>Fermer</Btn>
          </div>
          <ArticleForm initial={editingA} onSubmit={upsertArticle} onCancel={()=>{ setOpenA(false); setEditingA(null); }} />
        </dialog>
      )}
    </div>
  );
}
