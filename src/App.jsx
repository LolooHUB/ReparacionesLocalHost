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
  const [seccion, setSeccion] = useState('A'); 
  const [lista, setLista] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState(""); // Estado para el buscador
  const [historialId, setHistorialId] = useState(null); // Para expandir historial

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  const abrirFacturadora = (monto = 0) => {
    const url = monto > 0 ? `https://facturasonlineweb.web.app/?monto=${monto}` : `https://facturasonlineweb.web.app/`;
    window.open(url, '_blank');
  };

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met === "Tarjeta" || met === "Transferencia") abrirFacturadora(r.precio);
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  // Filtro de búsqueda para el historial
  const itemsFiltrados = lista.filter(r => 
    r.cliente?.toLowerCase().includes(search.toLowerCase()) || 
    r.equipo?.toLowerCase().includes(search.toLowerCase()) ||
    r.idTicket?.toString().includes(search)
  );

  return (
    <div className="container">
      <nav>
        <button className={`nav-btn ${seccion === 'A' ? 'active' : ''}`} onClick={() => setSeccion('A')}>RECEPCIÓN</button>
        <button className={`nav-btn ${seccion === 'B' ? 'active' : ''}`} onClick={() => setSeccion('B')}>TALLER</button>
        <button className={`nav-btn ${seccion === 'C' ? 'active' : ''}`} onClick={() => setSeccion('C')}>CAJA</button>
        <button className={`nav-btn ${seccion === 'D' ? 'active' : ''}`} onClick={() => setSeccion('D')}>HISTORIAL</button>
      </nav>

      {/* SECCIÓN A: RECEPCIÓN */}
      {seccion === 'A' && (
        <section className="card">
          <h2>📝 Nuevo Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("Orden registrada"); e.target.reset();
          }}>
            <div className="grid-2">
              <div className="form-group"><label>Cliente</label><input name="nom" required /></div>
              <div className="form-group"><label>WhatsApp</label><input name="tel" required /></div>
            </div>
            <div className="form-group"><label>Equipo</label><input name="dev" required /></div>
            <div className="form-group"><label>Falla</label><textarea name="fall" rows="2" required /></div>
            <button className="btn-action">Guardar Ingreso</button>
          </form>
          <button onClick={() => abrirFacturadora()} className="btn-factura">Abrir Facturadora Externa ↗</button>
        </section>
      )}

      {/* SECCIÓN B: TALLER */}
      {seccion === 'B' && (
        <section>
          <h2>🛠️ Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>{r.equipo}</strong>
                  <span className="badge" style={{background: statusMap[r.estado].bg}}>{r.estado}</span>
                </div>
                <p style={{fontSize:'0.8rem', color:'#94a3b8'}}>#{r.idTicket} | {r.cliente}</p>
                <button className="btn-action" style={{padding:'8px', marginTop:'10px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "Cerrar" : "🔧 Gestionar"}
                </button>
                {selectedId === r.fid && (
                  <div className="details-box">
                    <textarea placeholder="Diagnóstico..." defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
                    <div className="grid-2">
                      <input type="number" placeholder="Precio" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
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
          ) : <div className="empty-state"><span>☕</span><p>Taller vacío</p></div>}
        </section>
      )}

      {/* SECCIÓN C: CAJA */}
      {seccion === 'C' && (
        <section>
          <h2>💰 Caja</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length > 0 ? (
            lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
              <div key={r.fid} className="card">
                <h3>{r.cliente} - <span style={{color:'#10b981'}}>${r.precio}</span></h3>
                <div className="grid-2">
                  <select id={`m-${r.fid}`}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                  <button className="btn-action" onClick={() => procesarPago(r)}>Cobrar</button>
                </div>
              </div>
            ))
          ) : <div className="empty-state"><span>✨</span><p>Sin cobros pendientes</p></div>}
        </section>
      )}

      {/* SECCIÓN D: HISTORIAL CON BUSCADOR */}
      {seccion === 'D' && (
        <section>
          <h2>📚 Historial Completo</h2>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input 
              className="search-input"
              placeholder="Buscar por cliente, equipo o ticket..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {itemsFiltrados.map(r => (
            <div key={r.fid} className="card" style={{padding:'15px'}}>
              <div style={{display:'flex', justifyContent:'space-between', cursor:'pointer'}} onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)}>
                <span><strong>#{r.idTicket}</strong> {r.cliente}</span>
                <span style={{fontSize:'0.8rem', color: r.pagado ? '#10b981':'#ef4444'}}>
                  {r.pagado ? '✅ PAGADO' : '⏳ PENDIENTE'} {historialId === r.fid ? '▲' : '▼'}
                </span>
              </div>
              
              {historialId === r.fid && (
                <div className="history-detail">
                  <p><strong>Dispositivo:</strong> {r.equipo}</p>
                  <p><strong>Falla inicial:</strong> {r.falla || r.queja}</p>
                  <p><strong>Diagnóstico técnico:</strong> {r.diagnostico || "Sin datos"}</p>
                  <p><strong>Total cobrado:</strong> ${r.precio}</p>
                  {r.pagado && <p><strong>Método:</strong> {r.metodoPago}</p>}
                  <p style={{fontSize:'0.7rem', color:'#64748b'}}>Fecha: {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Reciente'}</p>
                </div>
              )}
            </div>
          ))}
          {itemsFiltrados.length === 0 && <p style={{textAlign:'center', color:'#64748b'}}>No se encontraron resultados.</p>}
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
