import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

function App() {
  const [entrar, setEntrar] = useState(false);
  const [tiempo, setTiempo] = useState(new Date());
  const [seccion, setSeccion] = useState('A'); 
  const [lista, setLista] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [historialId, setHistorialId] = useState(null);

  // Reloj funcionando al segundo
  useEffect(() => {
    const timer = setInterval(() => setTiempo(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  const totalCaja = lista.filter(r => r.pagado).reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const entregadosCount = lista.filter(r => r.pagado).length;

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  // El componente de Bitácora que pediste: Recepcion y Taller
  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub"><label>Recepcion</label><p><strong>Falla:</strong> {r.falla || r.queja}</p></div>
      {r.diagnostico && <div className="log-sub"><label>Taller</label><p><strong>Trabajo:</strong> {r.diagnostico}</p></div>}
      {r.pagado && <div className="log-sub"><label>Caja</label><p><strong>Pago:</strong> {r.metodoPago}</p></div>}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen fade-in-slow">
        <p className="date-display">{tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</h1>
        <button className="btn-action" style={{ width: '220px', marginTop: '20px' }} onClick={() => setEntrar(true)}>Entrar a trabajar</button>
      </div>
    );
  }

  return (
    <div className="container fade-in-slow">
      <nav>
        <button className={`nav-btn ${seccion === 'A' ? 'active' : ''}`} onClick={() => setSeccion('A')}>RECEPCIÓN</button>
        <button className={`nav-btn ${seccion === 'B' ? 'active' : ''}`} onClick={() => setSeccion('B')}>TALLER</button>
        <button className={`nav-btn ${seccion === 'C' ? 'active' : ''}`} onClick={() => setSeccion('C')}>CAJA</button>
        <button className={`nav-btn ${seccion === 'D' ? 'active' : ''}`} onClick={() => setSeccion('D')}>HISTORIAL</button>
      </nav>

      {seccion === 'A' && (
        <section className="card">
          <h2>📝 Nuevo Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("Registrado"); e.target.reset();
          }}>
            <input name="nom" placeholder="Nombre del Cliente" required style={{marginBottom:'10px', width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)', color:'white'}} />
            <input name="tel" placeholder="WhatsApp" required style={{marginBottom:'10px', width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)', color:'white'}} />
            <input name="dev" placeholder="Equipo (Modelo)" required style={{marginBottom:'10px', width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)', color:'white'}} />
            <textarea name="fall" placeholder="Falla reportada" required style={{marginBottom:'15px', width:'100%', padding:'12px', borderRadius:'10px', background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)', color:'white', minHeight:'80px'}} />
            <button className="btn-action">Guardar en Sistema</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <strong>{r.equipo}</strong>
                  <span style={{fontSize:'0.7rem', padding:'4px 10px', borderRadius:'20px', background: 'var(--primary)'}}>{r.estado}</span>
                </div>
                <Bitacora r={r} />
                <button className="btn-action" style={{marginTop:'15px', padding:'10px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>Actualizar</button>
                {selectedId === r.fid && (
                  <div style={{marginTop:'15px'}}>
                    <textarea placeholder="¿Qué trabajo se hizo?" defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} style={{width:'100%', background:'rgba(0,0,0,0.3)', color:'white', padding:'10px', borderRadius:'10px'}} />
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                      <input type="number" placeholder="Precio ($)" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} style={{background:'rgba(0,0,0,0.3)', color:'white', padding:'10px', borderRadius:'10px'}} />
                      <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })} style={{background:'rgba(0,0,0,0.3)', color:'white', padding:'10px', borderRadius:'10px'}}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Proceso">Proceso</option>
                        <option value="Terminado">Terminar</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : <div className="empty-state"><span className="empty-icon">☕</span><p>No hay trabajos pendientes</p></div>}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Caja</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <h3>{r.cliente}</h3>
                <h3 style={{color:'#10b981'}}>${r.precio}</h3>
              </div>
              <p style={{fontSize:'0.8rem', opacity:0.7}}>{r.equipo}</p>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                <select id={`m-${r.fid}`} style={{background:'rgba(0,0,0,0.3)', color:'white', padding:'10px', borderRadius:'10px'}}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
                <button className="btn-action" style={{padding:'10px'}} onClick={() => procesarPago(r)}>Cobrar</button>
              </div>
            </div>
          ))}
          <div className="stats-grid">
            <div className="stat-box"><small>RECAUDADO</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>ENTREGADOS</small><strong>{entregadosCount}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input className="card" style={{width:'100%', padding:'15px', marginBottom:'20px', boxSizing:'border-box'}} placeholder="🔍 Buscar cliente, equipo o ticket..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase()) || r.equipo?.toLowerCase().includes(search.toLowerCase()) || r.idTicket?.toString().includes(search)).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>#{r.idTicket} - {r.cliente}</strong>
                <span style={{fontSize:'0.7rem', color: r.pagado ? '#10b981' : '#94a3b8'}}>{r.pagado ? 'COBRADO' : 'PENDIENTE'}</span>
              </div>
              <p style={{fontSize:'0.8rem', opacity:0.6}}>{r.equipo}</p>
              {historialId === r.fid && <Bitacora r={r} />}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub 2025 Copyright DERECHOS DE AUTOR</p>
        <p>Desarrollado por <a href="https://github.com/LolooHUB" target="_blank" rel="noreferrer">LolooHUB</a></p>
      </footer>
    </div>
  );
}

export default App;
