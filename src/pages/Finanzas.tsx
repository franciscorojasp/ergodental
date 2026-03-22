// src/pages/Finanzas.tsx
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPagos, getEgresos, createPago, createEgreso,
  getPacientes, getProveedores, getPersonal,
  calcularComision, TABLA_REFERENCIAS, BANCOS_VE,
  type Pago, type Egreso, type Paciente, type Proveedor, type Personal,
  type MetodoPago, type TipoReferencia,
} from '../api';
import { useMoneda } from '../contexts/MonedaContext';
import { useAuth } from '../contexts/AuthContext';
import { useClinica } from '../contexts/ClinicaContext';
import { generarReportePDF } from '../utils/reportes';

type PeriodoReporte = 'Semanal' | 'Quincenal' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
type Tab = 'resumen' | 'ingresos' | 'egresos' | 'creditos' | 'doctores' | 'comisiones';

const DIAS_CREDITO = [5, 10, 15, 20, 25, 30] as const;

const METODO_ICON: Record<MetodoPago, string> = {
  'Efectivo BS':'💵','Pago Móvil':'📱','Transferencia BS':'🏦','Punto de Venta BS':'📟',
  'Efectivo USD':'💲','USDT':'₮','PayPal':'🅿️','Zelle':'⚡','Binance':'🟡',
};
const METODO_GROUP: Record<MetodoPago, string> = {
  'Efectivo BS':'Bolívares','Pago Móvil':'Bolívares','Transferencia BS':'Bolívares','Punto de Venta BS':'Bolívares',
  'Efectivo USD':'Divisas','USDT':'Divisas','PayPal':'Divisas','Zelle':'Divisas','Binance':'Divisas',
};
const ESTADO_BADGE: Record<string,string> = {
  Pagado:'badge-success',Pendiente:'badge-warning',Vencido:'badge-danger',Parcial:'badge-admin',
};
const REF_ICON: Record<TipoReferencia,string> = {
  'Profesional-Especialista':'👨‍⚕️','Paciente-Clinica':'🏥','Foraneo-30':'🌍','Foraneo-10':'🌐',
};

function daysBetween(d1:string,d2:string){
  return Math.abs((new Date(d1).getTime()-new Date(d2).getTime())/86400000);
}
function isInPeriod(dateStr:string,periodo:PeriodoReporte):boolean{
  const days={Semanal:7,Quincenal:15,Mensual:30,Trimestral:90,Semestral:180,Anual:365};
  return daysBetween(dateStr,new Date().toISOString().split('T')[0])<=days[periodo];
}

// ── Barra proporcional de desglose ────────────────────────────────────────────
function DesgloseBar({monto,tipoReferencia,fmt}:{monto:number;tipoReferencia:TipoReferencia;fmt:(n:number)=>string}){
  const d=calcularComision(monto,tipoReferencia);
  const regla=TABLA_REFERENCIAS.find(r=>r.tipo===tipoReferencia)!;
  return(
    <div style={{marginTop:'10px'}}>
      <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:'4px',textTransform:'uppercase',fontWeight:600}}>
        Desglose · {regla.label}
      </div>
      <div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',gap:2}}>
        <div title={`Clínica ${d.pctClinicaEfectivo}%`} style={{flex:d.clinica,background:'var(--primary)',borderRadius:3}}/>
        {d.foraneo>0&&<div title={`Foráneo ${d.pctForaneoEfectivo}%`} style={{flex:d.foraneo,background:'var(--warning)',borderRadius:3}}/>}
        <div title={`Profesional ${d.pctProfesionalEfectivo}%`} style={{flex:d.profesional,background:'var(--success)',borderRadius:3}}/>
      </div>
      <div style={{display:'flex',gap:'12px',marginTop:'5px',flexWrap:'wrap'}}>
        {[
          {label:'🏥 Clínica',    value:d.clinica,     pct:d.pctClinicaEfectivo,     color:'var(--primary)'},
          ...(d.foraneo>0?[{label:'🌍 Foráneo', value:d.foraneo, pct:d.pctForaneoEfectivo, color:'var(--warning)'}]:[]),
          {label:'👨‍⚕️ Profesional',value:d.profesional, pct:d.pctProfesionalEfectivo, color:'var(--success)'},
        ].map(item=>(
          <div key={item.label} style={{fontSize:'0.78rem'}}>
            <span style={{color:'var(--text-muted)'}}>{item.label}: </span>
            <strong style={{color:item.color}}>{fmt(item.value)}</strong>
            <span style={{color:'var(--text-muted)'}}> ({item.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Finanzas(){
  const [tab,setTab]                     = useState<Tab>('resumen');
  const [periodo,setPeriodo]             = useState<PeriodoReporte>('Mensual');
  const [pagos,setPagos]                 = useState<Pago[]>([]);
  const [egresos,setEgresos]             = useState<Egreso[]>([]);
  const [pacientes,setPacientes]         = useState<Paciente[]>([]);
  const [personal,setPersonal]           = useState<Personal[]>([]);
  const [proveedores,setProveedores]     = useState<Proveedor[]>([]);
  const [modalPago,setModalPago]         = useState(false);
  const [modalEgreso,setModalEgreso]     = useState(false);
  const [expandedPago,setExpandedPago]   = useState<string|null>(null);
  const [saving,setSaving]               = useState(false);
  // Doctor detail expand in doctores tab
  const [doctorExpanded,setDoctorExpanded] = useState<string|null>(null);

  const { fmt, tasaBCV } = useMoneda();
  const { user }         = useAuth();
  const { clinica }      = useClinica();

  const hoy  = new Date().toLocaleDateString('en-CA');

  const [formPago,setFormPago]=useState({
    pacienteId:'', doctorId:'', concepto:'', monto:0, tasaCambio:tasaBCV,
    metodoPago:'Pago Móvil' as MetodoPago,
    tipoPago:'Contado' as Pago['tipoPago'],
    diasCredito:15 as typeof DIAS_CREDITO[number],
    fecha:hoy, notas:'',
    tipoReferencia:'' as TipoReferencia|'', referidorNombre:'',
    // Venezuelan fields
    bancoEmisor: '', numeroReferencia: '', telefonoOrigen: '',
  });

  const [formEgreso,setFormEgreso]=useState({
    concepto:'',categoria:'Suministros' as Egreso['categoria'],
    monto:0,tasaCambio:tasaBCV,metodoPago:'Transferencia BS' as MetodoPago,
    proveedorId:'',fecha:hoy,notas:'',
  });

  useEffect(()=>{
    getPagos().then(data => setPagos(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id)));
    getEgresos().then(data => setEgresos(data.filter(e => clinica.id === 'consolidado' || e.clinicaId === clinica.id)));
    getPacientes().then(data => setPacientes(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id)));
    getPersonal().then(data => setPersonal(data.filter(p => p.clinicaId === clinica.id && p.tipo==='Odontólogo'&& p.activo)));
    getProveedores().then(data => setProveedores(data.filter(x => x.clinicaId === clinica.id && x.activo)));
  },[clinica.id]);

  // Auto-fill referral + doctor from patient + appointment
  const onPacienteChange=(id:string)=>{
    const pac=pacientes.find(p=>p.id===id);
    setFormPago(f=>({...f,pacienteId:id,tipoReferencia:pac?.tipoReferencia||'',referidorNombre:pac?.referidorNombre||''}));
  };

  const desglosePreview=useMemo(()=>{
    if(formPago.monto>0&&formPago.tipoReferencia) return calcularComision(formPago.monto,formPago.tipoReferencia as TipoReferencia);
    return null;
  },[formPago.monto,formPago.tipoReferencia]);

  // Pagos filtrados por periodo
  const pagosFiltrados   =useMemo(()=>pagos.filter(p=>isInPeriod(p.fecha,periodo)),[pagos,periodo]);
  const egresosFiltrados =useMemo(()=>egresos.filter(e=>isInPeriod(e.fecha,periodo)),[egresos,periodo]);

  const totalIngresos      = pagosFiltrados.filter(p=>p.estado==='Pagado'||p.estado==='Parcial').reduce((s,p)=>s+p.monto,0);
  const totalEgresos       = egresosFiltrados.reduce((s,e)=>s+e.monto,0);
  const balance            = totalIngresos-totalEgresos;
  const creditosPendientes = pagos.filter(p=>p.tipoPago==='Crédito'&&p.estado==='Pendiente');
  const totalCreditos      = creditosPendientes.reduce((s,p)=>s+p.monto,0);

  // ── Comisiones foráneos ───────────────────────────────────────────────────
  const comisionesData=useMemo(()=>{
    const cobrados=pagosFiltrados.filter(p=>p.estado==='Pagado'||p.estado==='Parcial');
    const totalesClinica   =cobrados.reduce((s,p)=>p.tipoReferencia?s+calcularComision(p.monto,p.tipoReferencia).clinica:s,0);
    const totalesProf      =cobrados.reduce((s,p)=>p.tipoReferencia?s+calcularComision(p.monto,p.tipoReferencia).profesional:s,0);
    const totalesForaneo   =cobrados.reduce((s,p)=>p.tipoReferencia?s+calcularComision(p.monto,p.tipoReferencia).foraneo:s,0);
    // Por referidor
    const porRef:Record<string,{nombre:string;tipo:TipoReferencia;monto:number;comision:number;pagos:number}>={};
    for(const p of cobrados){
      if(!p.tipoReferencia||!p.referidorNombre) continue;
      const k=p.referidorNombre;
      const com=calcularComision(p.monto,p.tipoReferencia).foraneo;
      if(!porRef[k]) porRef[k]={nombre:p.referidorNombre!,tipo:p.tipoReferencia,monto:0,comision:0,pagos:0};
      porRef[k].monto+=p.monto; porRef[k].comision+=com; porRef[k].pagos+=1;
    }
    return{totalesClinica,totalesProf,totalesForaneo,porRef};
  },[pagosFiltrados]);

  // ── Honorarios de doctores ────────────────────────────────────────────────
  const doctoresData=useMemo(()=>{
    const cobrados=pagosFiltrados.filter(p=>p.estado==='Pagado'||p.estado==='Parcial');
    // Agrupar por doctor
    const porDoctor:Record<string,{
      id:string; nombre:string;
      totalGenerado:number; honorarios:number;
      pagos:Pago[];
      porReferencia:Record<TipoReferencia,{monto:number;honorarios:number;pagos:number}>;
    }>={};
    for(const p of cobrados){
      if(!p.doctorId||!p.doctorNombre) continue;
      const k=p.doctorId;
      if(!porDoctor[k]) porDoctor[k]={id:k,nombre:p.doctorNombre!,totalGenerado:0,honorarios:0,pagos:[],porReferencia:{} as Record<TipoReferencia,{monto:number;honorarios:number;pagos:number}>};
      const hon=p.tipoReferencia?calcularComision(p.monto,p.tipoReferencia).profesional:0;
      porDoctor[k].totalGenerado+=p.monto;
      porDoctor[k].honorarios+=hon;
      porDoctor[k].pagos.push(p);
      if(p.tipoReferencia){
        if(!porDoctor[k].porReferencia[p.tipoReferencia])
          porDoctor[k].porReferencia[p.tipoReferencia]={monto:0,honorarios:0,pagos:0};
        porDoctor[k].porReferencia[p.tipoReferencia].monto+=p.monto;
        porDoctor[k].porReferencia[p.tipoReferencia].honorarios+=hon;
        porDoctor[k].porReferencia[p.tipoReferencia].pagos+=1;
      }
    }
    return Object.values(porDoctor).sort((a,b)=>b.honorarios-a.honorarios);
  },[pagosFiltrados]);

  const totalHonorarios=doctoresData.reduce((s,d)=>s+d.honorarios,0);

  // Guardar ingreso
  const handleSavePago=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);
    try{
      const pac=pacientes.find(p=>p.id===formPago.pacienteId);
      const doc=personal.find(p=>p.id===formPago.doctorId);
      const fechaV=formPago.tipoPago==='Crédito'?new Date(Date.now()+formPago.diasCredito*86400000).toISOString().split('T')[0]:undefined;
      const nuevo=await createPago({
        clinicaId: clinica.id,
        pacienteId:formPago.pacienteId,
        pacienteNombre:pac?`${pac.nombre} ${pac.apellido}`:'',
        concepto:formPago.concepto,monto:formPago.monto,
        montoBs:METODO_GROUP[formPago.metodoPago]==='Bolívares'?formPago.monto*formPago.tasaCambio:0,
        tasaCambio:formPago.tasaCambio,metodoPago:formPago.metodoPago,
        tipoPago:formPago.tipoPago,
        diasCredito:formPago.tipoPago==='Crédito'?formPago.diasCredito:undefined,
        fechaVencimiento:fechaV,fecha:formPago.fecha,
        estado:formPago.tipoPago==='Crédito'?'Pendiente':'Pagado',
        notas:formPago.notas,
        tipoReferencia:(formPago.tipoReferencia||undefined) as TipoReferencia|undefined,
        referidorNombre:formPago.referidorNombre||undefined,
        doctorId:formPago.doctorId||undefined,
        doctorNombre:doc?`${doc.nombre} ${doc.apellido}`:undefined,
        // Detailed fields
        bancoEmisor: formPago.bancoEmisor || undefined,
        numeroReferencia: formPago.numeroReferencia || undefined,
        telefonoOrigen: formPago.telefonoOrigen || undefined,
      });
      setPagos(prev=>[nuevo,...prev]);
      setModalPago(false);
    }finally{setSaving(false);}
  };

  // Guardar egreso
  const handleSaveEgreso=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);
    try{
      const prov=proveedores.find(p=>p.id===formEgreso.proveedorId);
      const nuevo=await createEgreso({
        clinicaId: clinica.id,
        concepto:formEgreso.concepto,categoria:formEgreso.categoria,
        monto:formEgreso.monto,
        montoBs:METODO_GROUP[formEgreso.metodoPago]==='Bolívares'?formEgreso.monto*formEgreso.tasaCambio:0,
        tasaCambio:formEgreso.tasaCambio,metodoPago:formEgreso.metodoPago,
        proveedorId:formEgreso.proveedorId||undefined,proveedorNombre:prov?.nombre,
        fecha:formEgreso.fecha,notas:formEgreso.notas,
      });
      setEgresos(prev=>[nuevo,...prev]);
      setModalEgreso(false);
    }finally{setSaving(false);}
  };

  const PERIODOS:PeriodoReporte[]=['Semanal','Quincenal','Mensual','Trimestral','Semestral','Anual'];

  // ── PDF Exportar ──────────────────────────────────────────────────
  const generarPDF = async () => {
    const cobrados = pagosFiltrados.filter(p => p.estado==='Pagado'||p.estado==='Parcial');
    await generarReportePDF({
      titulo: `Reporte Financiero – ${tab.charAt(0).toUpperCase()+tab.slice(1)}`,
      clinica: clinica.nombre,
      subtitulo: `Periodo: ${periodo} · Moneda: ${fmt(1).startsWith('$')?'USD':'Bs'} · Tasa BCV: Bs ${tasaBCV.toLocaleString('es-VE',{maximumFractionDigits:0})}`,
      usuario: user?.nombre,
      columnas: tab==='ingresos'||tab==='resumen'
        ? ['Fecha','Paciente','Doctor','Concepto','Monto USD','Monto Bs','Estado','Referencia']
        : tab==='egresos'
        ? ['Fecha','Concepto','Categoría','Monto USD','Método','Proveedor']
        : tab==='doctores'
        ? ['Doctor','Servicios','Total Generado','Honorario']
        : ['Paciente','Concepto','Monto','Plazo','Estado'],
      filas: tab==='ingresos'||tab==='resumen'
        ? cobrados.map(p=>[p.fecha,p.pacienteNombre,p.doctorNombre||'—',p.concepto,fmt(p.monto),
            fmt(p.monto, 0),p.estado,
            TABLA_REFERENCIAS.find(r=>r.tipo===p.tipoReferencia)?.label||'—'])
        : tab==='egresos'
        ? egresosFiltrados.map(e=>[e.fecha,e.concepto,e.categoria,fmt(e.monto),e.metodoPago,e.proveedorNombre||'—'])
        : tab==='doctores'
        ? doctoresData.map(d=>[d.nombre,String(d.pagos.length),fmt(d.totalGenerado),fmt(d.honorarios)])
        : pagos.filter(p=>p.tipoPago==='Crédito').map(p=>[p.pacienteNombre,p.concepto,fmt(p.monto),`${p.diasCredito??'—'} días`,p.estado]),
      totales: [
        {label:`Ingresos (${periodo}):`, valor: fmt(totalIngresos)},
        {label:`Egresos (${periodo}):`,  valor: fmt(totalEgresos)},
        {label:'Balance neto:',           valor: fmt(balance)},
      ],
      notas: ['Los honorarios se calculan según la tabla de referencias vigente.',
        `Tasa BCV aplicada: Bs ${tasaBCV.toLocaleString('es-VE',{maximumFractionDigits:0})} / $1 USD`],
    });
  };
  const TABS:{key:Tab;label:string}[]=[
    {key:'resumen',    label:'📊 Resumen'},
    {key:'ingresos',   label:'💰 Ingresos'},
    {key:'egresos',    label:'💸 Egresos'},
    {key:'creditos',   label:'⏳ Créditos'},
    {key:'doctores',   label:'👨‍⚕️ Doctores'},
    {key:'comisiones', label:'🔗 Comisiones'},
  ];

  return(
    <div>
      {/* Header */}
      <div className="page-header">
        <div><h1>Finanzas</h1><p>Ingresos · Egresos · Honorarios · Comisiones</p></div>
        <div className="action-grid">
          <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} onClick={generarPDF}>📄 PDF</button>
          <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }} onClick={()=>setModalEgreso(true)}>+ Egreso</button>
          <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={()=>setModalPago(true)}>+ Ingreso</button>
        </div>
      </div>

      {/* Selector periodo */}
      <div className="filter-grid" style={{ marginBottom:'20px' }}>
        {PERIODOS.map(p=>(
          <button key={p} onClick={()=>setPeriodo(p)} className="btn btn-ghost btn-sm"
            style={periodo===p?{borderColor:'var(--primary)',color:'var(--primary)',background:'var(--primary-dim)', justifyContent:'center'}:{justifyContent:'center'}}>
            {p}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid-responsive" style={{ marginBottom:'22px' }}>
        {[
          {label:`Ingresos (${periodo})`,  value: fmt(totalIngresos, 0),          icon:'💰',color:'var(--success)'},
          {label:`Egresos (${periodo})`,   value: fmt(totalEgresos, 0),            icon:'💸',color:'var(--danger)'},
          {label:'Balance neto',            value: fmt(balance, 0),                icon:'📊',color:balance>=0?'var(--success)':'var(--danger)'},
          {label:'Créditos pendientes',     value: fmt(totalCreditos, 0),          icon:'⏳',color:'var(--warning)'},
          {label:'Honorarios doctores',     value: fmt(totalHonorarios, 0),        icon:'👨‍⚕️',color:'var(--accent)'},
          {label:'Comisión foráneos',       value: fmt(comisionesData.totalesForaneo, 0),icon:'🌍',color:'var(--primary)'},
        ].map((s,i)=>(
          <motion.div key={s.label} className="stat-card" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
            <div className="stat-icon" style={{background:`color-mix(in srgb, ${s.color} 15%, transparent)`}}>{s.icon}</div>
            <div className="stat-value" style={{color:s.color,fontSize:'1.35rem'}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="filter-grid" style={{ marginBottom:'18px' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} className="btn btn-ghost btn-sm"
            style={tab===t.key?{borderColor:'var(--primary)',color:'var(--primary)',background:'var(--primary-dim)', justifyContent:'center'}:{justifyContent:'center'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {tab==='resumen'&&(
        <div className="grid-responsive" style={{ gap:'18px' }}>
          <motion.div className="glass" style={{padding:'20px'}} initial={{opacity:0}} animate={{opacity:1}}>
            <h3 style={{fontWeight:700,marginBottom:'12px'}}>💳 Por método de pago</h3>
            {Object.entries(pagosFiltrados.reduce((acc,p)=>({...acc,[p.metodoPago]:(acc[p.metodoPago]||0)+p.monto}),{} as Record<string,number>))
              .sort(([,a],[,b])=>b-a).map(([m,t])=>(
                <div key={m} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:'0.88rem'}}>{METODO_ICON[m as MetodoPago]} {m}</span>
                  <span style={{fontWeight:700,color:'var(--success)'}}>{fmt(t, 0)}</span>
                </div>
              ))}
          </motion.div>
          <motion.div className="glass" style={{padding:'20px'}} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}>
            <h3 style={{fontWeight:700,marginBottom:'12px'}}>🔗 Distribución por beneficiario</h3>
            {[
              {label:'🏥 Clínica',     value:comisionesData.totalesClinica, color:'var(--primary)'},
              {label:'👨‍⚕️ Profesional', value:comisionesData.totalesProf,   color:'var(--success)'},
              {label:'🌍 Foráneos',    value:comisionesData.totalesForaneo, color:'var(--warning)'},
            ].map(item=>(
              <div key={item.label} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:'0.88rem'}}>{item.label}</span>
                <span style={{fontWeight:700,color:item.color}}>{fmt(item.value)}</span>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ── INGRESOS ── */}
      {tab==='ingresos'&&(
        <motion.div className="glass" initial={{opacity:0}} animate={{opacity:1}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Paciente</th><th>Doctor</th><th>Concepto</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {pagos.map(p=>(
                  <>
                  <tr key={p.id} style={{cursor:'pointer'}} onClick={()=>setExpandedPago(expandedPago===p.id?null:p.id)}>
                    <td style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>{p.fecha}</td>
                    <td style={{fontWeight:600}}>{p.pacienteNombre}</td>
                    <td style={{color:'var(--text-secondary)',fontSize:'0.84rem'}}>{p.doctorNombre||'—'}</td>
                    <td>{p.concepto}</td>
                    <td style={{fontWeight:700,color:'var(--success)'}}>{fmt(p.monto)}</td>
                    <td>{METODO_ICON[p.metodoPago]} {p.metodoPago}</td>
                    <td>
                      {p.tipoReferencia?(
                        <span style={{fontSize:'0.78rem',color:'var(--accent)'}}>
                          {REF_ICON[p.tipoReferencia]} {TABLA_REFERENCIAS.find(r=>r.tipo===p.tipoReferencia)?.label}
                        </span>
                      ):<span style={{color:'var(--text-muted)'}}>—</span>}
                    </td>
                    <td><span className={`badge ${ESTADO_BADGE[p.estado]}`}>{p.estado}</span></td>
                    <td style={{color:'var(--primary)',fontSize:'0.8rem'}}>{expandedPago===p.id?'▲':'▼'}</td>
                  </tr>
                  {expandedPago===p.id&&p.tipoReferencia&&(
                    <tr key={`${p.id}-d`}>
                      <td colSpan={9} style={{background:'var(--bg-card)',padding:'12px 20px'}}>
                        <DesgloseBar monto={p.monto} tipoReferencia={p.tipoReferencia} fmt={fmt}/>
                        <div style={{display:'flex',gap:'18px',marginTop:'6px',fontSize:'0.78rem'}}>
                          {p.referidorNombre&&<div style={{color:'var(--text-secondary)'}}>Referidor: <strong>{p.referidorNombre}</strong></div>}
                          {p.doctorNombre&&<div style={{color:'var(--text-secondary)'}}>Doctor: <strong>{p.doctorNombre}</strong> · Honorario: <strong style={{color:'var(--success)'}}>
                            {fmt(calcularComision(p.monto,p.tipoReferencia).profesional)}
                          </strong></div>}
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── EGRESOS ── */}
      {tab==='egresos'&&(
        <motion.div className="glass" initial={{opacity:0}} animate={{opacity:1}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto USD</th><th>Monto Bs</th><th>Método</th><th>Proveedor</th></tr></thead>
              <tbody>
                {egresos.map(e=>(
                  <tr key={e.id}>
                    <td style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>{e.fecha}</td>
                    <td style={{fontWeight:600}}>{e.concepto}</td>
                    <td><span className="badge badge-muted">{e.categoria}</span></td>
                    <td style={{fontWeight:700,color:'var(--danger)'}}>{fmt(e.monto)}</td>
                    <td style={{color:'var(--text-secondary)',fontSize:'0.82rem'}}>
                      {(e.monto * tasaBCV).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                    </td>
                    <td>{METODO_ICON[e.metodoPago]} {e.metodoPago}</td>
                    <td style={{color:'var(--text-secondary)'}}>{e.proveedorNombre||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── CRÉDITOS ── */}
      {tab==='creditos'&&(
        <motion.div className="glass" initial={{opacity:0}} animate={{opacity:1}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Paciente</th><th>Concepto</th><th>Monto</th><th>Plazo</th><th>Vencimiento</th><th>Estado</th><th>Notas</th></tr></thead>
              <tbody>
                {pagos.filter(p=>p.tipoPago==='Crédito').map(p=>{
                  const vencido=p.fechaVencimiento&&p.fechaVencimiento<hoy&&p.estado==='Pendiente';
                  return(
                    <tr key={p.id}>
                      <td style={{fontWeight:600}}>{p.pacienteNombre}</td>
                      <td>{p.concepto}</td>
                      <td style={{fontWeight:700,color:'var(--warning)'}}>{fmt(p.monto)}</td>
                      <td>{p.diasCredito} días</td>
                      <td style={{color:vencido?'var(--danger)':'var(--text-secondary)'}}>{p.fechaVencimiento||'—'}{vencido?' ⚠️':''}</td>
                      <td><span className={`badge ${ESTADO_BADGE[p.estado]}`}>{vencido?'Vencido':p.estado}</span></td>
                      <td style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>{p.notas||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── DOCTORES ── */}
      {tab==='doctores'&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}}>
          {/* Resumen total */}
          <div className="glass" style={{padding:'20px',marginBottom:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontWeight:800}}>👨‍⚕️ Honorarios por Doctor — {periodo}</h3>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Total honorarios a pagar</div>
                <div style={{fontWeight:800,fontSize:'1.4rem',color:'var(--success)'}}>{fmt(totalHonorarios)}</div>
              </div>
            </div>

            {doctoresData.length===0?(
              <div style={{color:'var(--text-muted)',textAlign:'center',padding:'30px'}}>No hay pagos cobrados en este periodo</div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                {doctoresData.map(doc=>{
                  const pct=doc.totalGenerado>0?(doc.honorarios/doc.totalGenerado*100).toFixed(1):'0';
                  const isExp=doctorExpanded===doc.id;
                  return(
                    <div key={doc.id} style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
                      {/* Cabecera del doctor */}
                      <div style={{
                        display:'flex',alignItems:'center',gap:'14px',padding:'14px 18px',
                        background:'var(--bg-card)',cursor:'pointer',
                      }} onClick={()=>setDoctorExpanded(isExp?null:doc.id)}>
                        <div style={{
                          width:44,height:44,borderRadius:'50%',flexShrink:0,
                          background:'linear-gradient(135deg,var(--primary),var(--accent))',
                          display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,
                        }}>
                          {doc.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:'1rem'}}>{doc.nombre}</div>
                          <div style={{fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:'2px'}}>
                            {doc.pagos.length} servicios · Total generado: {fmt(doc.totalGenerado)}
                          </div>
                        </div>
                        {/* Barra de honorarios */}
                        <div style={{textAlign:'right',minWidth:'120px'}}>
                          <div style={{fontWeight:800,fontSize:'1.2rem',color:'var(--success)'}}>
                            {fmt(doc.honorarios)}
                          </div>
                          <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>
                            {pct}% del total generado
                          </div>
                        </div>
                        <div style={{color:'var(--primary)',marginLeft:'8px'}}>{isExp?'▲':'▼'}</div>
                      </div>

                      {/* Detalle expandible: desglose por tipo de referencia */}
                      {isExp&&(
                        <div style={{padding:'16px 18px',borderTop:'1px solid var(--border)'}}>
                          <div style={{fontWeight:700,fontSize:'0.82rem',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'12px'}}>
                            Honorarios por tipo de referencia
                          </div>
                          <div className="table-wrap">
                            <table>
                              <thead><tr><th>Tipo de referencia</th><th>Servicios</th><th>Monto generado</th><th>% Profesional</th><th>Honorario</th></tr></thead>
                              <tbody>
                                {(Object.entries(doc.porReferencia) as [TipoReferencia,{monto:number;honorarios:number;pagos:number}][])
                                  .sort(([,a],[,b])=>b.honorarios-a.honorarios)
                                  .map(([tipo,data])=>{
                                    const regla=TABLA_REFERENCIAS.find(r=>r.tipo===tipo)!;
                                    return(
                                      <tr key={tipo}>
                                        <td>
                                          <span style={{fontSize:'0.82rem',fontWeight:700}}>
                                            {REF_ICON[tipo]} {regla.label}
                                          </span>
                                          <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{regla.descripcion}</div>
                                        </td>
                                        <td style={{textAlign:'center'}}>{data.pagos}</td>
                                        <td style={{fontWeight:600}}>{fmt(data.monto)}</td>
                                        <td style={{textAlign:'center'}}>
                                          <span style={{fontWeight:800,color:'var(--success)',fontSize:'1rem'}}>
                                            {regla.pctProfesional}%
                                          </span>
                                          {regla.pctForaneo>0&&(
                                            <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>
                                              (del {100-regla.pctForaneo}% neto)
                                            </div>
                                          )}
                                        </td>
                                        <td style={{fontWeight:800,fontSize:'1.05rem',color:'var(--success)'}}>
                                          {fmt(data.honorarios)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                              <tfoot>
                                <tr style={{borderTop:'2px solid var(--border)'}}>
                                  <td colSpan={4} style={{fontWeight:700,textAlign:'right',color:'var(--text-muted)',paddingRight:'12px'}}>
                                    Total honorarios:
                                  </td>
                                  <td style={{fontWeight:800,fontSize:'1.1rem',color:'var(--success)'}}>
                                    {fmt(doc.honorarios)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Lista de pagos individuales del doctor */}
                          <div style={{marginTop:'14px'}}>
                            <div style={{fontWeight:700,fontSize:'0.8rem',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'8px'}}>Detalle de servicios</div>
                            {doc.pagos.map(p=>{
                              const regla=p.tipoReferencia?TABLA_REFERENCIAS.find(r=>r.tipo===p.tipoReferencia):null;
                              const hon=p.tipoReferencia?calcularComision(p.monto,p.tipoReferencia).profesional:0;
                              return(
                                <div key={p.id} style={{
                                  display:'flex',alignItems:'center',gap:'12px',
                                  padding:'8px 10px',borderRadius:'var(--radius-sm)',
                                  background:'var(--bg-card)',marginBottom:'4px',fontSize:'0.84rem',
                                }}>
                                  <div style={{flex:1}}>
                                    <span style={{fontWeight:600}}>{p.concepto}</span>
                                    <span style={{color:'var(--text-muted)',marginLeft:'8px',fontSize:'0.76rem'}}>{p.fecha} · {p.pacienteNombre}</span>
                                  </div>
                                  {regla&&(
                                    <span style={{fontSize:'0.74rem',color:'var(--accent)',whiteSpace:'nowrap'}}>
                                      {REF_ICON[p.tipoReferencia!]} {regla.label}
                                    </span>
                                  )}
                                  <div style={{textAlign:'right',minWidth:'80px'}}>
                                    <div style={{color:'var(--text-secondary)',fontSize:'0.76rem'}}>{fmt(p.monto)} total</div>
                                    <div style={{fontWeight:700,color:'var(--success)'}}>+{fmt(hon)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nota metodológica */}
          <div className="glass" style={{padding:'14px 18px',fontSize:'0.8rem',color:'var(--text-secondary)'}}>
            <strong style={{color:'var(--primary)'}}>📌 Metodología de cálculo:</strong> Los honorarios del doctor corresponden al{' '}
            <strong>% Profesional</strong> de la tabla de referencias según quién refirió al paciente.
            Para foráneos, el foráneo cobra su % y el doctor recibe su % del monto neto restante.
          </div>
        </motion.div>
      )}

      {/* ── COMISIONES ── */}
      {tab==='comisiones'&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}}>
          {/* Tabla oficial */}
          <div className="glass" style={{padding:'20px',marginBottom:'18px'}}>
            <h3 style={{fontWeight:800,marginBottom:'14px'}}>📋 Tabla Referencias y Porcentajes</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Referido por</th><th>Descripción</th>
                    <th style={{color:'var(--primary)'}}>% Clínica</th>
                    <th style={{color:'var(--warning)'}}>% Foráneo</th>
                    <th style={{color:'var(--success)'}}>% Profesional</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLA_REFERENCIAS.map(r=>(
                    <tr key={r.tipo}>
                      <td style={{fontWeight:700}}>{REF_ICON[r.tipo]} {r.label}</td>
                      <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{r.descripcion}</td>
                      <td><span style={{fontWeight:800,color:'var(--primary)'}}>{r.pctClinica}%</span></td>
                      <td><span style={{fontWeight:800,color:r.pctForaneo>0?'var(--warning)':'var(--text-muted)'}}>{r.pctForaneo>0?`${r.pctForaneo}%`:'—'}</span></td>
                      <td><span style={{fontWeight:800,color:'var(--success)'}}>{r.pctProfesional}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Comisiones a foráneos */}
          <div className="glass" style={{padding:'20px'}}>
            <h3 style={{fontWeight:800,marginBottom:'14px'}}>💰 Comisiones a pagar — {periodo}</h3>
            {Object.keys(comisionesData.porRef).length===0?(
              <div style={{color:'var(--text-muted)',textAlign:'center',padding:'30px'}}>Sin comisiones foráneas en este periodo</div>
            ):(
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Referidor</th><th>Tipo</th><th># Pagos</th><th>Total generado</th><th>Comisión a pagar</th></tr></thead>
                  <tbody>
                    {Object.values(comisionesData.porRef).map(r=>(
                      <tr key={r.nombre}>
                        <td style={{fontWeight:700}}>{r.nombre}</td>
                        <td><span className="badge badge-warning">{TABLA_REFERENCIAS.find(x=>x.tipo===r.tipo)?.label}</span></td>
                        <td>{r.pagos}</td>
                        <td style={{color:'var(--success)',fontWeight:700}}>{fmt(r.monto)}</td>
                        <td style={{color:'var(--warning)',fontWeight:800,fontSize:'1rem'}}>{fmt(r.comision)}</td>
                      </tr>
                    ))}
                    <tr style={{borderTop:'2px solid var(--border)'}}>
                      <td colSpan={4} style={{fontWeight:700,textAlign:'right',color:'var(--text-muted)'}}>Total:</td>
                      <td style={{fontWeight:800,color:'var(--warning)',fontSize:'1.05rem'}}>{fmt(comisionesData.totalesForaneo)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── MODAL INGRESO ── */}
      <AnimatePresence>
        {modalPago&&(
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModalPago(false)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:660}}>
              <div className="modal-header">
                <h3>💰 Registrar Ingreso</h3>
                <button className="btn-close" onClick={()=>setModalPago(false)}>✕</button>
              </div>
              <form onSubmit={handleSavePago}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Paciente *</label>
                      <select className="input" required value={formPago.pacienteId} onChange={e=>onPacienteChange(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Doctor *</label>
                      <select className="input" required value={formPago.doctorId} onChange={e=>setFormPago(f=>({...f,doctorId:e.target.value}))}>
                        <option value="">Seleccionar...</option>
                        {personal.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}{p.especialidad?` — ${p.especialidad}`:''}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Concepto *</label>
                    <input className="input" required value={formPago.concepto} onChange={e=>setFormPago(f=>({...f,concepto:e.target.value}))} placeholder="Ej: Limpieza dental, Ortodoncia mensualidad..."/>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Tipo de pago</label>
                      <select className="input" value={formPago.tipoPago} onChange={e=>setFormPago(f=>({...f,tipoPago:e.target.value as Pago['tipoPago']}))}>
                        <option>Contado</option><option>Abono</option><option>Crédito</option>
                      </select>
                    </div>
                    {formPago.tipoPago==='Crédito'&&(
                      <div className="input-group">
                        <label>Plazo</label>
                        <select className="input" value={formPago.diasCredito} onChange={e=>setFormPago(f=>({...f,diasCredito:Number(e.target.value) as typeof DIAS_CREDITO[number]}))}>
                          {DIAS_CREDITO.map(d=><option key={d} value={d}>{d} días</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                   <div className="grid-2">
                    <div className="input-group">
                      <label>Monto (USD) *</label>
                      <input className="input" type="number" step="0.01" required value={formPago.monto||''} onChange={e=>setFormPago(f=>({...f,monto:Number(e.target.value)}))}/>
                    </div>
                    <div className="input-group">
                      <label>Método de pago</label>
                      <select className="input" value={formPago.metodoPago} onChange={e=>setFormPago(f=>({...f,metodoPago:e.target.value as MetodoPago}))}>
                        <optgroup label="🇻🇪 Bolívares"><option>Efectivo BS</option><option>Pago Móvil</option><option>Transferencia BS</option><option>Punto de Venta BS</option></optgroup>
                        <optgroup label="💲 Divisas"><option>Efectivo USD</option><option>USDT</option><option>PayPal</option><option>Zelle</option><option>Binance</option></optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Venezuelan economic details */}
                  {['Pago Móvil', 'Transferencia BS', 'Punto de Venta BS', 'Zelle', 'Binance'].includes(formPago.metodoPago) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass" style={{ padding: '12px', marginBottom: '14px', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px' }}>DETALLES DE TRANSACCIÓN</div>
                      <div className="grid-2">
                        <div className="input-group">
                          <label>Banco Emisor</label>
                          <select className="input" value={formPago.bancoEmisor} onChange={e => setFormPago(f => ({ ...f, bancoEmisor: e.target.value }))}>
                            <option value="">Seleccionar banco...</option>
                            {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Nro. Referencia</label>
                          <input className="input" placeholder="Últimos 4-6 dígitos" value={formPago.numeroReferencia} onChange={e => setFormPago(f => ({ ...f, numeroReferencia: e.target.value }))} />
                        </div>
                      </div>
                      {formPago.metodoPago === 'Pago Móvil' && (
                        <div className="input-group" style={{ marginTop: '8px' }}>
                          <label>Teléfono Origen</label>
                          <input className="input" placeholder="04xx..." value={formPago.telefonoOrigen} onChange={e => setFormPago(f => ({ ...f, telefonoOrigen: e.target.value }))} />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Referencia */}
                  <div style={{borderTop:'1px solid var(--border)',paddingTop:'12px'}}>
                    <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'8px'}}>🔗 Referencia</div>
                    <div className="grid-2">
                      <div className="input-group">
                        <label>Tipo de referencia</label>
                        <select className="input" value={formPago.tipoReferencia} onChange={e=>setFormPago(f=>({...f,tipoReferencia:e.target.value as TipoReferencia|''}))}>
                          <option value="">Sin referencia</option>
                          {TABLA_REFERENCIAS.map(r=><option key={r.tipo} value={r.tipo}>{r.label}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Referidor</label>
                        <input className="input" placeholder="Nombre" value={formPago.referidorNombre} onChange={e=>setFormPago(f=>({...f,referidorNombre:e.target.value}))}/>
                      </div>
                    </div>

                    {/* Preview desglose incluyendo honorario del doctor */}
                    {desglosePreview&&(
                      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px 14px'}}>
                        <DesgloseBar monto={formPago.monto} tipoReferencia={formPago.tipoReferencia as TipoReferencia} fmt={fmt}/>
                        {formPago.doctorId&&(
                          <div style={{marginTop:'8px',padding:'8px',background:'rgba(0,255,100,0.06)',borderRadius:'6px',fontSize:'0.82rem'}}>
                            <span style={{color:'var(--text-muted)'}}>👨‍⚕️ Honorario doctor ({personal.find(p=>p.id===formPago.doctorId)?.nombre}): </span>
                            <strong style={{color:'var(--success)',fontSize:'1rem'}}>{fmt(desglosePreview.profesional)}</strong>
                            <span style={{color:'var(--text-muted)'}}> ({desglosePreview.pctProfesionalEfectivo}% del total)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Fecha</label>
                      <input className="input" type="date" value={formPago.fecha} onChange={e=>setFormPago(f=>({...f,fecha:e.target.value}))}/>
                    </div>
                    <div className="input-group">
                      <label>Notas</label>
                      <input className="input" value={formPago.notas} onChange={e=>setFormPago(f=>({...f,notas:e.target.value}))}/>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>setModalPago(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar Ingreso'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL EGRESO ── */}
      <AnimatePresence>
        {modalEgreso&&(
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModalEgreso(false)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:560}}>
              <div className="modal-header">
                <h3>💸 Registrar Egreso</h3>
                <button className="btn-close" onClick={()=>setModalEgreso(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveEgreso}>
                <div className="modal-body">
                  <div className="input-group"><label>Concepto *</label><input className="input" required value={formEgreso.concepto} onChange={e=>setFormEgreso(f=>({...f,concepto:e.target.value}))}/></div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Categoría</label>
                      <select className="input" value={formEgreso.categoria} onChange={e=>setFormEgreso(f=>({...f,categoria:e.target.value as Egreso['categoria']}))}>
                        <option>Suministros</option><option>Servicios</option><option>Nómina</option><option>Proveedor</option><option>Alquiler</option><option>Equipos</option><option>Otro</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Proveedor</label>
                      <select className="input" value={formEgreso.proveedorId} onChange={e=>setFormEgreso(f=>({...f,proveedorId:e.target.value}))}>
                        <option value="">Sin proveedor</option>
                        {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Monto (USD) *</label><input className="input" type="number" step="0.01" required value={formEgreso.monto||''} onChange={e=>setFormEgreso(f=>({...f,monto:Number(e.target.value)}))}/></div>
                    <div className="input-group">
                      <label>Método de pago</label>
                      <select className="input" value={formEgreso.metodoPago} onChange={e=>setFormEgreso(f=>({...f,metodoPago:e.target.value as MetodoPago}))}>
                        <optgroup label="🇻🇪 Bolívares"><option>Efectivo BS</option><option>Pago Móvil</option><option>Transferencia BS</option></optgroup>
                        <optgroup label="💲 Divisas"><option>Efectivo USD</option><option>USDT</option><option>PayPal</option><option>Zelle</option><option>Binance</option></optgroup>
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group"><label>Fecha</label><input className="input" type="date" value={formEgreso.fecha} onChange={e=>setFormEgreso(f=>({...f,fecha:e.target.value}))}/></div>
                    <div className="input-group"><label>Notas</label><input className="input" value={formEgreso.notas} onChange={e=>setFormEgreso(f=>({...f,notas:e.target.value}))}/></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>setModalEgreso(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar Egreso'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
