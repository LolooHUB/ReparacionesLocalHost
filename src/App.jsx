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

  // Datos para Facturador
  const eConf = { nom: "TecnoService", cuit: "20334445551", pago: "MI.ALIAS.PAGO" };

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

  const agregarItem = (r) => {
    const desc = prompt("🛠️ Descripción del trabajo/repuesto:");
    const precio = prompt("💰 Precio ($):");
    if (desc && precio) {
      const nuevosArt = [...(r.articulos || []), { desc, precio: Number(precio) }];
      const nuevoTotal = nuevosArt.reduce((acc, curr) => acc + curr.precio, 0);
      actualizarReparacion(r.fid, { articulos: nuevosArt, precio: nuevoTotal });
    }
  };

  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.6}}>📅 {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Reciente'}</p>
      </div>
      {r.articulos?.length > 0 && (
        <div className="log-sub">
          <label>🛠️ Taller</label>
          {r.articulos.map((a, i) => (
            <p key={i}>• {a.desc}: <strong>${a.precio}</strong></p>
          ))}
          <p style={{marginTop:'5px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'5px'}}>Total: <strong>${r.precio}</strong></p>
        </div>
      )}
      {r.pagado && (
        <div className="log-sub">
          <label>💰 Caja</label>
          <p>✅ Pagado ({r.metodoPago})</p>
        </div>
      )}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen fade-in-inicio">
        <p className="date-display">✨ {tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</h1>
        <button className="btn-action" style={{ width: '220px' }} onClick={() => setEntrar(true)}>🚀 ENTRAR A TRABAJAR</button>
      </div>
    );
  }

  return (
    <div className="container fade-in-sistema">
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
            alert("✅ Registrado"); e.target.reset();
          }}>
            <input name="nom" placeholder="👤 Cliente" required />
            <input name="tel" placeholder="📱 WhatsApp" required />
            <input name="dev" placeholder="💻 Equipo" required />
            <textarea name="fall" placeholder="❌ Falla" required />
            <button className="btn-action">💾 GUARDAR ENTRADA</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Gestión de Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <strong>📱 {r.equipo} (ID: #{r.idTicket})</strong>
                  <button className="nav-btn active" style={{flex:'none', padding:'8px 15px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                    {selectedId === r.fid ? "✖️ CERRAR" : "⚙️ ELEGIR"}
                  </button>
                </div>
                {selectedId === r.fid && (
                  <div className="fade-in-sistema" style={{marginTop:'15px'}}>
                    <Bitacora r={r} />
                    <button className="btn-action" style={{margin:'10px 0', background:'rgba(255,255,255,0.1)'}} onClick={() => agregarItem(r)}>➕ AGREGAR TRABAJO</button>
                    <button 
                      className={`btn-action ${r.articulos?.length > 0 ? 'btn-ready' : ''}`} 
                      disabled={!r.articulos?.length} 
                      onClick={() => {actualizarReparacion(r.fid, { estado: 'Terminado' }); setSelectedId(null);}}
                    >
                      ✅ MARCAR COMO LISTO
                    </button>
                    {!r.articulos?.length && <p style={{fontSize:'0.7rem', color:'#f87171', textAlign:'center', marginTop:'8px'}}>Carga al menos un ítem para terminar</p>}
                  </div>
                )}
              </div>
            ))
          ) : <div className="empty-state"><span className="empty-icon">☕</span><p>Nada en taller.</p></div>}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Caja</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length > 0 ? (
            lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
              <div key={r.fid} className="card">
                <h3>👤 {r.cliente} - ${r.precio}</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                  <select id={`m-${r.fid}`}>
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Transferencia">🏦 Transferencia</option>
                    <option value="Tarjeta">💳 Tarjeta</option>
                  </select>
                  <button className="btn-action" onClick={() => {
                    const met = document.getElementById(`m-${r.fid}`).value;
                    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
                  }}>💸 COBRAR</button>
                </div>
              </div>
            ))
          ) : <div className="empty-state"><span className="empty-icon">💸</span><p>Nada para cobrar.</p></div>}
          <div className="stats-grid">
            <div className="stat-box"><small>RECAUDADO</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>ENTREGADOS</small><strong>{entregadosCount}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input className="card" style={{width:'100%'}} placeholder="🔍 Buscar cliente..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>#{r.idTicket} - {r.cliente}</strong>
                <span>{r.pagado ? '✅' : '🛠️'}</span>
              </div>
              {historialId === r.fid && <Bitacora r={r} />}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub 2026 • Desarrollado por <a href="https://github.com/LolooHUB" target="_blank">LolooHUB</a> 🚀</p>
      </footer>
    </div>
  );
}

export default App;
