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

  const abrirFacturadora = (monto = 0) => {
    window.open(`https://facturasonlineweb.web.app/?monto=${monto}`, '_blank');
  };

  const Bitacora = ({ r }) => (
    <div className="log-box fade-in-inicio">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.6}}>📅 {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Reciente'}</p>
      </div>
      {(r.diagnostico || r.precio) && (
        <div className="log-sub">
          <label>🛠️ Taller</label>
          <p>📝 {r.diagnostico || 'En revisión...'}</p>
          <p>💵 <strong>${r.precio || 0}</strong></p>
        </div>
      )}
      {r.pagado && (
        <div className="log-sub">
          <label>💰 Caja</label>
          <p>💳 {r.metodoPago} - ✅ Finalizado</p>
        </div>
      )}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen fade-in-inicio">
        <p className="date-display">✨ {tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</h1>
        <button className="btn-action" style={{ width: '220px' }} onClick={() => setEntrar(true)}>
          ⚡ ENTRAR A LABURAR
        </button>
      </div>
    );
  }

  return (
    <div className="container fade-in-sistema">
      <nav>
        <button className={`nav-btn ${seccion === 'A' ? 'active' : ''}`} onClick={() => setSeccion('A')}>📥 REC</button>
        <button className={`nav-btn ${seccion === 'B' ? 'active' : ''}`} onClick={() => setSeccion('B')}>🛠️ TALLER</button>
        <button className={`nav-btn ${seccion === 'C' ? 'active' : ''}`} onClick={() => setSeccion('C')}>💰 CAJA</button>
        <button className={`nav-btn ${seccion === 'D' ? 'active' : ''}`} onClick={() => setSeccion('D')}>📚 HIST</button>
      </nav>

      {seccion === 'A' && (
        <section className="card stagger-card">
          <h2>📝 Nuevo Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("✅ Equipo registrado con éxito"); e.target.reset();
          }}>
            <input name="nom" placeholder="👤 Nombre del Cliente" required />
            <input name="tel" placeholder="📱 WhatsApp" required />
            <input name="dev" placeholder="💻 Equipo / Modelo" required />
            <textarea name="fall" placeholder="❌ Falla reportada..." required />
            <button className="btn-action">🚀 GUARDAR INGRESO</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Órdenes en Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map((r, i) => (
              <div key={r.fid} className="card stagger-card" style={{animationDelay: `${i * 0.1}s`}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <strong>📱 {r.equipo}</strong>
                  <span className="badge" style={{color: 'var(--accent)', fontSize:'0.7rem'}}>⚙️ {r.estado}</span>
                </div>
                <Bitacora r={r} />
                <button className="btn-action" style={{marginTop:'15px', height:'40px', fontSize:'0.8rem'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "✖️ CERRAR" : "🔧 GESTIONAR"}
                </button>
                {selectedId === r.fid && (
                  <div className="fade-in-inicio" style={{marginTop:'15px'}}>
                    <textarea placeholder="¿Qué le hiciste?" defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
                    <div className="grid-2" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                      <input type="number" placeholder="Precio $" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
                      <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                        <option value="Pendiente">⏳ Pendiente</option>
                        <option value="Proceso">🛠️ En Proceso</option>
                        <option value="Terminado">✅ Terminar</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">☕</span>
              <p>Taller despejado. ¡Buen momento para un break!</p>
            </div>
          )}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Pendientes de Cobro</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map((r, i) => (
            <div key={r.fid} className="card stagger-card" style={{animationDelay: `${i * 0.1}s`}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <h3>👤 {r.cliente}</h3>
                <h3 style={{color:'#10b981'}}>${r.precio}</h3>
              </div>
              <p>📱 {r.equipo}</p>
              <div className="grid-2" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                <select id={`m-${r.fid}`}>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                </select>
                <button className="btn-action" onClick={() => {
                  const met = document.getElementById(`m-${r.fid}`).value;
                  if (met !== "Efectivo") abrirFacturadora(r.precio);
                  actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
                }}>💸 COBRAR</button>
              </div>
            </div>
          ))}
          <div className="stats-grid">
            <div className="stat-box"><small>💰 TOTAL</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>📦 ENTREGAS</small><strong>{entregadosCount}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial Reciente</h2>
          <input className="card" style={{width:'100%', marginBottom:'20px'}} placeholder="🔍 Buscar cliente o equipo..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase())).slice(0, 15).map((r, i) => (
            <div key={r.fid} className="card stagger-card" style={{cursor:'pointer', animationDelay: `${i * 0.05}s`}} onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span><strong>#{r.idTicket}</strong> {r.cliente}</span>
                <span style={{fontSize:'0.7rem'}}>{r.pagado ? '✅ COBRADO' : '⏳ TALLER'}</span>
              </div>
              {historialId === r.fid && <Bitacora r={r} />}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>🚀 LolooHub 2025 • Software de Gestión Profesional</p>
        <p>Desarrollado con ❤️ por <a href="https://github.com/LolooHUB" target="_blank">LolooHUB</a></p>
      </footer>
    </div>
  );
}

export default App;
