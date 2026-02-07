import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

const statusMap = {
  "Pendiente": { bg: "#ef4444", icon: "⏳" },
  "Proceso": { bg: "#3b82f6", icon: "🛠️" },
  "Terminado": { bg: "#10b981", icon: "✅" },
  "Entregado": { bg: "#6366f1", icon: "📦" }
};

function App() {
  const [entrar, setEntrar] = useState(false);
  const [tiempo, setTiempo] = useState(new Date());
  const [seccion, setSeccion] = useState('A'); 
  const [lista, setLista] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [historialId, setHistorialId] = useState(null);

  // Reloj y Fecha
  useEffect(() => {
    const timer = setInterval(() => setTiempo(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Firebase Real-time
  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  // Estadísticas para Historial
  const entregados = lista.filter(r => r.pagado);
  const totalCaja = entregados.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const promedio = entregados.length > 0 ? (totalCaja / entregados.length).toFixed(0) : 0;

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  const filtrados = lista.filter(r => 
    r.cliente?.toLowerCase().includes(search.toLowerCase()) || 
    r.equipo?.toLowerCase().includes(search.toLowerCase()) ||
    r.idTicket?.toString().includes(search)
  );

  // 1. PANTALLA DE INICIO (RELOJ Y FECHA)
  if (!entrar) {
    return (
      <div className="welcome-screen">
        <p className="date-display">
          {tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="clock">
          {tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </h1>
        <button className="btn-action" style={{ width: '240px', marginTop: '30px' }} onClick={() => setEntrar(true)}>
          ENTRAR A TRABAJAR
        </button>
        <p style={{ marginTop: '50px', fontSize: '0.7rem', color: '#475569', letterSpacing: '2px' }}>LOLOO HUB • SERVICE OS v2.0</p>
      </div>
    );
  }

  // 2. INTERFAZ DE TRABAJO
  return (
    <div className="container">
      <nav>
        <button className={`nav-btn ${seccion === 'A' ? 'active' : ''}`} onClick={() => setSeccion('A')}>RECEPCIÓN</button>
        <button className={`nav-btn ${seccion === 'B' ? 'active' : ''}`} onClick={() => setSeccion('B')}>TALLER</button>
        <button className={`nav-btn ${seccion === 'C' ? 'active' : ''}`} onClick={() => setSeccion('C')}>CAJA</button>
        <button className={`nav-btn ${seccion === 'D' ? 'active' : ''}`} onClick={() => setSeccion('D')}>HISTORIAL</button>
      </nav>

      {/* RECEPCIÓN */}
      {seccion === 'A' && (
        <section className="card">
          <h2>📝 Nuevo Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("¡Equipo ingresado al sistema!"); e.target.reset();
          }}>
            <div className="grid-2">
              <div className="form-group"><label>Dueño / Cliente</label><input name="nom" required /></div>
              <div className="form-group"><label>WhatsApp</label><input name="tel" required /></div>
            </div>
            <div className="form-group"><label>Equipo y Modelo</label><input name="dev" required /></div>
            <div className="form-group"><label>Falla que presenta</label><textarea name="fall" rows="2" required /></div>
            <button className="btn-action">REGISTRAR ENTRADA</button>
          </form>
        </section>
      )}

      {/* TALLER */}
      {seccion === 'B' && (
        <section>
          <h2>🛠️ Órdenes en Curso</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card medical-card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>{r.equipo}</strong>
                  <span className="badge" style={{background: statusMap[r.estado].bg}}>{statusMap[r.estado].icon} {r.estado}</span>
                </div>
                <div className="data-grid">
                  <div className="data-item"><label>Cliente</label><span>{r.cliente}</span></div>
                  <div className="data-item"><label>ID Ticket</label><span>#{r.idTicket}</span></div>
                  <div className="data-item" style={{gridColumn:'span 2'}}><label>Problema Reportado</label><span>{r.falla || r.queja}</span></div>
                </div>
                <button className="btn-action" style={{padding:'10px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "CERRAR FICHA" : "ABRIR PARA REPARAR"}
                </button>
                {selectedId === r.fid && (
                  <div className="details-box" style={{marginTop:'15px', background:'rgba(0,0,0,0.2)', padding:'15px', borderRadius:'15px'}}>
                    <div className="form-group"><label>Diagnóstico y Notas</label><textarea defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} /></div>
                    <div className="grid-2">
                      <div className="form-group"><label>Precio Final ($)</label><input type="number" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Estado</label>
                        <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Proceso">En Reparación</option>
                          <option value="Terminado">LISTO / TERMINADO</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : <div className="empty-state"><div className="empty-icon">☕</div><p>No hay equipos pendientes.</p></div>}
        </section>
      )}

      {/* CAJA */}
      {seccion === 'C' && (
        <section>
          <h2>💰 Cobros Pendientes</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><h3>{r.cliente}</h3><p style={{margin:0, opacity:0.6}}>{r.equipo}</p></div>
                <h2 style={{color:'#10b981'}}>${r.precio}</h2>
              </div>
              <div className="grid-2" style={{marginTop:'20px'}}>
                <select id={`m-${r.fid}`}><option value="Efectivo">💵 Efectivo</option><option value="Transferencia">💳 Transferencia</option><option value="Tarjeta">💳 Tarjeta</option></select>
                <button className="btn-action" onClick={() => procesarPago(r)}>FINALIZAR COBRO</button>
              </div>
            </div>
          ))}
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length === 0 && <div className="empty-state"><div className="empty-icon">✨</div><p>Caja al día.</p></div>}
        </section>
      )}

      {/* HISTORIAL */}
      {seccion === 'D' && (
        <section>
          <div className="stats-grid">
            <div className="stat-box"><small>TOTAL CAJA</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>ENTREGADOS</small><strong>{entregados.length}</strong></div>
            <div className="stat-box"><small>PROM. TICKET</small><strong>${promedio}</strong></div>
          </div>
          <input className="card" style={{width:'100%', marginBottom:'15px', padding:'15px'}} placeholder="🔍 Buscar cliente o equipo..." onChange={(e) => setSearch(e.target.value)} />
          {filtrados.map(r => (
            <div key={r.fid} className="card" style={{cursor:'pointer', padding:'15px'}} onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span><strong>#{r.idTicket}</strong> {r.cliente}</span>
                <span className="badge" style={{background: r.pagado ? '#10b981' : '#64748b'}}>{r.pagado ? 'PAGADO' : 'HISTORIAL'}</span>
              </div>
              {historialId === r.fid && (
                <div style={{marginTop:'10px', fontSize:'0.85rem', padding:'10px', background:'rgba(0,0,0,0.2)', borderRadius:'10px'}}>
                  <p><strong>Modelo:</strong> {r.equipo}</p>
                  <p><strong>Diagnóstico:</strong> {r.diagnostico || 'S/D'}</p>
                  <p><strong>Pago:</strong> {r.metodoPago || 'Efectivo'}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub 2025 Copyright DERECHOS DE AUTOR</p>
        <p>Desar
