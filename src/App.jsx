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

  // Reloj dinámico
  useEffect(() => {
    const timer = setInterval(() => setTiempo(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Firebase en tiempo real
  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  const totalCaja = lista.filter(r => r.pagado).reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const entregadosCount = lista.filter(r => r.pagado).length;

  const abrirFacturadora = (monto = 0) => {
    const url = monto > 0 ? `https://facturasonlineweb.web.app/?monto=${monto}` : `https://facturasonlineweb.web.app/`;
    window.open(url, '_blank');
  };

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met === "Transferencia" || met === "Tarjeta") abrirFacturadora(r.precio);
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  // Componente Bitácora: muestra Recepción (Falla + Fecha) y Taller
  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.6}}>
          Ingreso: {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Reciente'}
        </p>
      </div>
      {(r.diagnostico || r.precio) && (
        <div className="log-sub">
          <label>🛠️ Taller</label>
          <p><strong>Trabajo:</strong> {r.diagnostico || 'Pendiente'}</p>
          <p><strong>Presupuesto:</strong> ${r.precio || 0}</p>
        </div>
      )}
      {r.pagado && (
        <div className="log-sub">
          <label>💰 Caja</label>
          <p>Pago: {r.metodoPago} - ✅ Cobrado</p>
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
            <div className="form-group"><label>Cliente</label><input name="nom" required /></div>
            <div className="form-group"><label>WhatsApp</label><input name="tel" required /></div>
            <div className="form-group"><label>Equipo</label><input name="dev" required /></div>
            <div className="form-group"><label>Falla Reportada</label><textarea name="fall" required /></div>
            <button className="btn-action">Guardar Entrada</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>{r.equipo}</strong>
                <span style={{fontSize:'0.7rem', color:'var(--accent)'}}>{r.estado}</span>
              </div>
              <Bitacora r={r} />
              <button className="btn-action" style={{marginTop:'15px', padding:'10px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                {selectedId === r.fid ? "Cerrar" : "Actualizar Trabajo"}
              </button>
              {selectedId === r.fid && (
                <div style={{marginTop:'15px'}}>
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
          ))}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Caja</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <h3>{r.cliente} - ${r.precio}</h3>
              <p style={{fontSize:'0.8rem', opacity:0.7}}>{r.equipo}</p>
              <div className="grid-2" style={{marginTop:'10px'}}>
                <select id={`m-${r.fid}`}><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option></select>
                <button className="btn-action" onClick={() => procesarPago(r)}>Cobrar</button>
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
          <h2>📚 Historial Completo</h2>
          <input className="card" style={{width:'100%'}} placeholder="🔍 Buscar cliente, equipo o ticket..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase()) || r.equipo?.toLowerCase().includes(search.toLowerCase()) || r.idTicket?.toString().includes(search)).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span><strong>#{r.idTicket}</strong> {r.cliente}</span>
                <span style={{fontSize:'0.7rem', color: r.pagado ? '#10b981' : '#94a3b8'}}>{r.pagado ? '✅ COBRADO' : '⏳ EN CURSO'}</span>
              </div>
              <p style={{fontSize:'0.8rem', opacity:0.6, margin:'5px 0'}}>{r.equipo}</p>
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
