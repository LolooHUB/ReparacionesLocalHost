import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

const statusMap = {
  "Pendiente": { class: "badge", bg: "#ef4444", icon: "⏳" },
  "Proceso": { class: "badge", bg: "#3b82f6", icon: "🛠️" },
  "Terminado": { class: "badge", bg: "#10b981", icon: "✅" },
  "Entregado": { class: "badge", bg: "#6366f1", icon: "📦" }
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
    // Enviamos el monto como parámetro en la URL
    window.open(`https://facturasonlineweb.web.app/?monto=${monto}`, '_blank');
  };

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met === "Tarjeta" || met === "Transferencia") {
      abrirFacturadora(r.precio);
    }
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

      {/* RECEPCIÓN */}
      {seccion === 'A' && (
        <section className="card">
          <h2>📝 Nuevo Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("¡Registrado!"); e.target.reset();
          }}>
            <div className="grid-2">
              <div className="form-group"><label>Cliente</label><input name="nom" required /></div>
              <div className="form-group"><label>WhatsApp</label><input name="tel" required /></div>
            </div>
            <div className="form-group"><label>Equipo</label><input name="dev" required /></div>
            <div className="form-group"><label>Falla</label><textarea name="fall" rows="2" required /></div>
            <button className="btn-action">🚀 Guardar Orden</button>
          </form>
          <button onClick={() => abrirFacturadora()} className="btn-factura">🔗 Ir a Facturadora Online</button>
        </section>
      )}

      {/* TALLER */}
      {seccion === 'B' && (
        <section>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>{r.equipo}</strong>
                <span className="badge" style={{background: statusMap[r.estado].bg}}>{statusMap[r.estado].icon} {r.estado}</span>
              </div>
              <p style={{fontSize:'0.9rem', color:'#94a3b8'}}>Ticket #{r.idTicket} | Cliente: {r.cliente}</p>
              <button className="btn-action" style={{padding:'8px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                {selectedId === r.fid ? "Cerrar" : "🔧 Gestionar"}
              </button>
              {selectedId === r.fid && (
                <div className="details-box">
                  <div className="form-group"><label>Diagnóstico</label>
                  <textarea defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} /></div>
                  <div className="grid-2">
                    <div className="form-group"><label>Precio ($)</label>
                    <input type="number" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} /></div>
                    <div className="form-group"><label>Estado</label>
                    <select value={r.estado} onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Proceso">En Reparación</option>
                      <option value="Terminado">TERMINADO</option>
                    </select></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* CAJA */}
      {seccion === 'C' && (
        <section>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <h3>{r.cliente}</h3>
                <h2 style={{color:'#10b981'}}>${r.precio}</h2>
              </div>
              <p>{r.equipo}</p>
              <div className="grid-2">
                <select id={`m-${r.fid}`}>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">💳 Transferencia</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                </select>
                <button className="btn-action" onClick={() => procesarPago(r)}>💰 Cobrar</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* HISTORIAL */}
      {seccion === 'D' && (
        <section>
          {lista.filter(r => r.estado === 'Entregado' || r.estado === 'Terminado').map(r => (
            <div key={r.fid} className="card" style={{opacity: 0.8}}>
              <p><strong>#{r.idTicket}</strong> - {r.cliente} | {r.equipo}</p>
              <span className="badge" style={{background: r.pagado ? '#10b981':'#f59e0b'}}>
                {r.pagado ? `PAGADO con ${r.metodoPago}` : 'PENDIENTE DE PAGO'}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;
