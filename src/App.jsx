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

  const notificarCliente = (r) => {
    const msj = `👋 Hola ${r.cliente}, tu ${r.equipo} ya está listo! Total: $${r.precio}.`;
    window.open(`https://wa.me/${r.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msj)}`, '_blank');
  };

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met === "Tarjeta" || met === "Transferencia") abrirFacturadora(r.precio);
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

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
              <div className="form-group"><label>Cliente</label><input name="nom" placeholder="Nombre" required /></div>
              <div className="form-group"><label>WhatsApp</label><input name="tel" placeholder="Número" required /></div>
            </div>
            <div className="form-group"><label>Equipo</label><input name="dev" placeholder="Modelo" required /></div>
            <div className="form-group"><label>Falla</label><textarea name="fall" rows="2" required /></div>
            <button className="btn-action">Guardar Ingreso</button>
          </form>
          <button onClick={() => abrirFacturadora()} className="btn-factura">Ir a Facturadora ↗</button>
        </section>
      )}

      {/* SECCIÓN B: TALLER */}
      {seccion === 'B' && (
        <section>
          <h2>🛠️ Equipos en Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <strong>{r.equipo}</strong>
                  <span className="badge" style={{background: statusMap[r.estado].bg}}>{statusMap[r.estado].icon} {r.estado}</span>
                </div>
                <p style={{fontSize:'0.9rem', color:'#94a3b8', margin:'10px 0'}}>Ticket #{r.idTicket} | {r.cliente}</p>
                <button className="btn-action" style={{padding:'10px', fontSize:'0.8rem'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "Cerrar" : "🔧 Diagnosticar"}
                </button>
                {selectedId === r.fid && (
                  <div className="details-box">
                    <div className="form-group"><label>Diagnóstico</label><textarea defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} /></div>
                    <div className="grid-2">
                      <div className="form-group"><label>Precio ($)</label><input type="number" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Estado</label>
                        <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Proceso">En Reparación</option>
                          <option value="Terminado">TERMINAR</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">☕</span>
              <p>No hay equipos para reparar.<br/>¡Momento de un café!</p>
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN C: CAJA */}
      {seccion === 'C' && (
        <section>
          <h2>💰 Pendientes de Cobro</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length > 0 ? (
            lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <h3>{r.cliente}</h3>
                  <h2 style={{color:'#10b981', margin:0}}>${r.precio}</h2>
                </div>
                <p>{r.equipo}</p>
                <div className="grid-2">
                  <select id={`m-${r.fid}`}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                  <button className="btn-action" onClick={() => procesarPago(r)}>Cobrar</button>
                </div>
                <button className="btn-action btn-wa" onClick={() => notificarCliente(r)}>Avisar por WhatsApp</button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✨</span>
              <p>No hay cobros pendientes.<br/>¡Todo al día!</p>
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN D: HISTORIAL */}
      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          {lista.filter(r => r.estado === 'Entregado' || r.estado === 'Terminado').map(r => (
            <div key={r.fid} className="card" style={{opacity: 0.8}}>
              <strong>#{r.idTicket} - {r.cliente}</strong>
              <p style={{margin:'5px 0'}}>{r.equipo} | {r.pagado ? `Pagado (${r.metodoPago})` : 'Sin pagar'}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;
