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

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met !== "Efectivo") abrirFacturadora(r.precio);
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.6}}>Ingreso: {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Reciente'}</p>
      </div>
      {(r.diagnostico || r.precio) && (
        <div className="log-sub">
          <label>🛠️ Taller</label>
          <p><strong>Notas:</strong> {r.diagnostico || 'En revisión'}</p>
          <p><strong>Precio:</strong> ${r.precio || 0}</p>
        </div>
      )}
      {r.pagado && (
        <div className="log-sub">
          <label>💰 Caja</label>
          <p>Pagado por {r.metodoPago}</p>
        </div>
      )}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen fade-in-inicio">
        <p className="date-display">{tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</h1>
        <button className="btn-action" style={{ width: '220px' }} onClick={() => setEntrar(true)}>Entrar a trabajar</button>
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
            alert("Registrado"); e.target.reset();
          }}>
            <input name="nom" placeholder="Cliente" required />
            <input name="tel" placeholder="WhatsApp" required />
            <input name="dev" placeholder="Equipo" required />
            <textarea name="fall" placeholder="Falla" required />
            <button className="btn-action">Guardar Entrada</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>{r.equipo}</strong>
                  <span style={{fontSize:'0.7rem', color:'var(--accent)'}}>{r.estado}</span>
                </div>
                <Bitacora r={r} />
                <button className="btn-action" style={{marginTop:'15px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>Gestionar</button>
                {selectedId === r.fid && (
                  <div style={{marginTop:'15px'}}>
                    <textarea placeholder="¿Qué se le hizo?" defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
                    <input type="number" placeholder="Precio ($)" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
                    <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Proceso">Proceso</option>
                      <option value="Terminado">Terminar</option>
                    </select>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">☕</span>
              <p>No hay equipos en taller. ¡Hora de un café!</p>
            </div>
          )}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Cobros Pendientes</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length > 0 ? (
            lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
              <div key={r.fid} className="card">
                <h3>{r.cliente} - ${r.precio}</h3>
                <select id={`m-${r.fid}`}><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option></select>
                <button className="btn-action" onClick={() => procesarPago(r)}>Cobrar</button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">💸</span>
              <p>Nada para cobrar por ahora.</p>
            </div>
          )}
          <div className="stats-grid">
            <div className="stat-box"><small>Recaudado</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>Entregados</small><strong>{entregadosCount}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input className="card" style={{width:'100%'}} placeholder="Buscar..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <strong>#{r.idTicket} - {r.cliente}</strong>
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
