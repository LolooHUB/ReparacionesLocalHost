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
  const [search, setSearch] = useState("");
  const [historialId, setHistorialId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  // Lógica de Estadísticas
  const entregados = lista.filter(r => r.pagado);
  const totalCaja = entregados.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const promedio = entregados.length > 0 ? (totalCaja / entregados.length).toFixed(0) : 0;

  const abrirFacturadora = (monto = 0) => {
    const url = monto > 0 ? `https://facturasonlineweb.web.app/?monto=${monto}` : `https://facturasonlineweb.web.app/`;
    window.open(url, '_blank');
  };

  const notificarCliente = (r) => {
    const msj = `👋 Hola ${r.cliente}, tu ${r.equipo} está listo! Total: $${r.precio}.`;
    window.open(`https://wa.me/${r.telefono?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(msj)}`, '_blank');
  };

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met === "Tarjeta" || met === "Transferencia") abrirFacturadora(r.precio);
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  const filtrados = lista.filter(r => 
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
            <button className="btn-action">Guardar en Base de Datos</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Taller (Cartillas Médicas)</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card medical-card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>{r.equipo}</strong>
                  <span className="badge" style={{background: statusMap[r.estado].bg}}>{r.estado}</span>
                </div>
                <div className="data-grid">
                  <div className="data-item"><label>Paciente</label><span>{r.cliente}</span></div>
                  <div className="data-item"><label>Ticket</label><span>#{r.idTicket}</span></div>
                  <div className="data-item" style={{gridColumn:'span 2'}}><label>Sintomas</label><span>{r.falla || r.queja}</span></div>
                </div>
                <button className="btn-action" onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "Cerrar Ficha" : "Ver Detalle / Reparar"}
                </button>
                {selectedId === r.fid && (
                  <div className="details-box" style={{marginTop:'15px'}}>
                    <textarea placeholder="Diagnóstico..." defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
                    <div className="grid-2" style={{marginTop:'10px'}}>
                      <input type="number" placeholder="Precio" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
                      <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Proceso">En Proceso</option>
                        <option value="Terminado">Finalizar</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : <div className="empty-state"><div className="empty-icon">☕</div><p>Taller despejado</p></div>}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Caja y Cobranzas</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length > 0 ? (
            lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <h3>{r.cliente}</h3>
                  <h2 style={{color:'#10b981'}}>${r.precio}</h2>
                </div>
                <div className="grid-2">
                  <select id={`m-${r.fid}`}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                  <button className="btn-action" onClick={() => procesarPago(r)}>Cobrar</button>
                </div>
                <button className="btn-action btn-wa" onClick={() => notificarCliente(r)}>Notificar por WhatsApp</button>
              </div>
            ))
          ) : <div className="empty-state"><div className="empty-icon">✨</div><p>Sin cobros pendientes</p></div>}
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <div className="stats-grid">
            <div className="stat-box"><small>TOTAL CAJA</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>ENTREGADOS</small><strong>{entregados.length}</strong></div>
            <div className="stat-box"><small>PROMEDIO</small><strong>${promedio}</strong></div>
          </div>

          <input className="card" style={{width:'100%', marginBottom:'15px', padding:'15px'}} placeholder="🔍 Buscar cliente, equipo o ticket..." onChange={(e) => setSearch(e.target.value)} />

          {filtrados.map(r => (
            <div key={r.fid} className="card" style={{cursor:'pointer'}} onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span><strong>#{r.idTicket}</strong> {r.cliente}</span>
                <span className="badge" style={{background: r.pagado ? '#10b981' : '#64748b'}}>{r.pagado ? 'PAGADO' : 'HISTORIAL'}</span>
              </div>
              {historialId === r.fid && (
                <div style={{marginTop:'15px', padding:'15px', background:'rgba(0,0,0,0.2)', borderRadius:'10px', fontSize:'0.85rem'}}>
                  <p><strong>Equipo:</strong> {r.equipo}</p>
                  <p><strong>Diagnóstico:</strong> {r.diagnostico || 'N/A'}</p>
                  <p><strong>Pago:</strong> {r.metodoPago || 'N/A'}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub 2025 Copyright DERECHOS DE AUTOR</p>
        <p>Desarrollado por <a href="https://github.com/LolooHUB" target="_blank">LolooHUB</a></p>
      </footer>
    </div>
  );
}

export default App;
