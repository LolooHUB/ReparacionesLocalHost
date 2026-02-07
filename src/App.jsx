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

  // ARREGLO DEL RELOJ: Actualización por segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setTiempo(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  const entregados = lista.filter(r => r.pagado);
  const totalCaja = entregados.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const promedio = entregados.length > 0 ? (totalCaja / entregados.length).toFixed(0) : 0;

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  // COMPONENTE PARA MOSTRAR LA BITÁCORA EN TALLER E HISTORIAL
  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize: '0.7rem'}}>Ingreso: {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Reciente'}</p>
      </div>
      {(r.diagnostico || r.precio) && (
        <div className="log-sub">
          <label>🛠️ Taller</label>
          <p><strong>Trabajo:</strong> {r.diagnostico || 'En revisión'}</p>
          <p><strong>Costo:</strong> ${r.precio || 0}</p>
        </div>
      )}
      {r.pagado && (
        <div className="log-sub">
          <label>💰 Caja</label>
          <p><strong>Pago:</strong> {r.metodoPago} - ✅ Cobrado</p>
        </div>
      )}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen">
        <p className="date-display">{tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="clock">
          {tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </h1>
        <button className="btn-action" style={{ width: '220px', marginTop: '20px' }} onClick={() => setEntrar(true)}>ENTRAR A TRABAJAR</button>
        <p style={{ marginTop: '40px', fontSize: '0.7rem', color: '#475569' }}>LOLOO HUB • SERVICE OS v2.1</p>
      </div>
    );
  }

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
            alert("Registrado"); e.target.reset();
          }}>
            <div className="grid-2">
              <div className="form-group"><label>Cliente</label><input name="nom" required /></div>
              <div className="form-group"><label>WhatsApp</label><input name="tel" required /></div>
            </div>
            <div className="form-group"><label>Equipo</label><input name="dev" required /></div>
            <div className="form-group"><label>Falla Reportada</label><textarea name="fall" rows="2" required /></div>
            <button className="btn-action">REGISTRAR ENTRADA</button>
          </form>
        </section>
      )}

      {/* TALLER */}
      {seccion === 'B' && (
        <section>
          <h2>🛠️ Órdenes de Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>{r.equipo}</strong>
                  <span className="badge" style={{background: statusMap[r.estado].bg}}>{statusMap[r.estado].icon} {r.estado}</span>
                </div>
                <p style={{fontSize: '0.8rem', color:'#94a3b8'}}>#{r.idTicket} | {r.cliente}</p>
                
                <Bitacora r={r} /> {/* Bitácora siempre visible en Taller */}

                <button className="btn-action" style={{marginTop:'15px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "Cerrar" : "Actualizar Trabajo"}
                </button>

                {selectedId === r.fid && (
                  <div style={{marginTop:'15px', padding:'10px', background:'rgba(255,255,255,0.05)', borderRadius:'10px'}}>
                    <textarea placeholder="¿Qué se le hizo?" defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
                    <div className="grid-2" style={{marginTop:'10px'}}>
                      <input type="number" placeholder="Precio ($)" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
                      <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Proceso">Proceso</option>
                        <option value="Terminado">Terminar</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : <div className="empty-state"><span>☕</span><p>Taller limpio</p></div>}
        </section>
      )}

      {/* CAJA */}
      {seccion === 'C' && (
        <section>
          <h2>💰 Caja</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <h3>{r.cliente}</h3>
                <h2 style={{color:'#10b981'}}>${r.precio}</h2>
              </div>
              <p>{r.equipo}</p>
              <div className="grid-2">
                <select id={`m-${r.fid}`}><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option></select>
                <button className="btn-action" onClick={() => procesarPago(r)}>COBRAR</button>
              </div>
            </div>
          ))}
          <div className="stats-footer">
            <div className="stat-box"><small>TOTAL CAJA</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>EQUIPOS</small><strong>{entregados.length}</strong></div>
            <div className="stat-box"><small>PROM.</small><strong>${promedio}</strong></div>
          </div>
        </section>
      )}

      {/* HISTORIAL */}
      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input className="card" style={{width:'100%', marginBottom:'15px'}} placeholder="🔍 Buscar ticket, cliente o equipo..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase()) || r.equipo?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" style={{cursor:'pointer'}} onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span><strong>#{r.idTicket}</strong> {r.cliente}</span>
                <span className={`badge ${r.pagado ? 'pagado' : ''}`}>{r.pagado ? '✅ ENTREGADO' : '⏳ EN TALLER'}</span>
              </div>
              <p style={{margin: '5px 0', fontSize:'0.8rem'}}>{r.equipo}</p>
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
