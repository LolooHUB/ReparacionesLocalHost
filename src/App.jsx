import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

// Mapeo de estados a estilos de badge y emojis
const statusMap = {
  "Pendiente": { text: "Pendiente", class: "badge-pending", emoji: "⏳" },
  "Proceso": { text: "En Proceso", class: "badge-process", emoji: "🛠️" },
  "Terminado": { text: "Listo", class: "badge-done", emoji: "✅" },
  "Entregado": { text: "Entregado", class: "badge-delivered", emoji: "📦" },
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

  const notificarCliente = (r) => {
    const msj = `👋 Hola ${r.cliente}, tu ${r.equipo} ya está listo! Costo: $${r.precio}.`;
    window.open(`https://wa.me/${r.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msj)}`, '_blank');
  };

  const procesarPago = (r) => {
    const met = document.getElementById(`m-${r.fid}`).value;
    if (met === "Tarjeta" || met === "Transferencia") {
      window.open("https://facturasonlineweb.web.app/", "_blank");
    }
    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
  };

  return (
    <div className="container">
      <nav>
        <button className={`nav-btn ${seccion === 'A' ? 'active' : ''}`} onClick={() => setSeccion('A')}>📝 RECEPCIÓN</button>
        <button className={`nav-btn ${seccion === 'B' ? 'active' : ''}`} onClick={() => setSeccion('B')}>⚙️ TÉCNICOS</button>
        <button className={`nav-btn ${seccion === 'C' ? 'active' : ''}`} onClick={() => setSeccion('C')}>💰 CAJA</button>
        <button className={`nav-btn ${seccion === 'D' ? 'active' : ''}`} onClick={() => setSeccion('D')}>📚 HISTORIAL</button>
      </nav>

      {/* SECCIÓN A: RECEPCIÓN */}
      {seccion === 'A' && (
        <section>
          <div className="card">
            <h2>📝 Ingreso de Dispositivo</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = e.target.elements;
              await registrarEquipo({ 
                nombre: d.nom.value, 
                tel: d.tel.value, 
                dispositivo: d.dev.value, 
                queja: d.fall.value 
              });
              alert("✅ ¡Orden creada!");
              e.target.reset();
            }}>
              <div className="grid-2">
                <input name="nom" placeholder="Cliente" required />
                <input name="tel" placeholder="WhatsApp" required />
              </div>
              <input name="dev" placeholder="Equipo" required />
              <textarea name="fall" placeholder="Falla..." rows="3" required />
              <button className="btn-action" style={{ width: '100%', marginTop: '20px' }}>REGISTRAR INGRESO</button>
            </form>
            <a href="https://facturasonlineweb.web.app/" target="_blank" rel="noreferrer" className="btn-factura">
              FACTURADORA ONLINE ↗
            </a>
          </div>
        </section>
      )}

      {/* SECCIÓN B: TÉCNICOS */}
      {seccion === 'B' && (
        <section>
          <h2>⚙️ Taller</h2>
          {lista.filter(r => r.estado === 'Pendiente' || r.estado === 'Proceso').map(r => (
            <div key={r.fid} className="card">
              <div className="flex-between">
                <strong>#{r.idTicket} - {r.equipo}</strong>
                <span className={`badge ${statusMap[r.estado].class}`}>{statusMap[r.estado].text}</span>
              </div>
              <button className="btn-action" style={{ marginTop: '15px' }} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                {selectedId === r.fid ? "➖ Cerrar" : "➕ Diagnosticar"}
              </button>
              {selectedId === r.fid && (
                <div className="details-box">
                  <textarea defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} placeholder="Escribir diagnóstico..." />
                  <div className="grid-2">
                    <input type="number" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} placeholder="Precio $" />
                    <select onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })} value={r.estado}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Proceso">En Proceso</option>
                      <option value="Terminado">MARCAR TERMINADO</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* SECCIÓN C: CAJA */}
      {seccion === 'C' && (
        <section>
          <h2>💰 Caja</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <div className="flex-between">
                <h3>{r.cliente}</h3>
                <h3 style={{ color: '#22c55e' }}>${r.precio}</h3>
              </div>
              <div className="grid-2">
                <select id={`m-${r.fid}`}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta (Abre Fact.)</option>
                </select>
                <button className="btn-action" onClick={() => procesarPago(r)}>COBRAR</button>
              </div>
              <button className="btn-action btn-wa" style={{ width: '100%', marginTop: '10px' }} onClick={() => notificarCliente(r)}>Notificar WhatsApp ✅</button>
            </div>
          ))}
        </section>
      )}

      {/* SECCIÓN D: HISTORIAL */}
      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          {lista.filter(r => r.estado === 'Terminado' || r.estado === 'Entregado').map(r => (
            <div key={r.fid} className="card" style={{ opacity: 0.8 }}>
              <div className="flex-between">
                <span><strong>#{r.idTicket}</strong> - {r.cliente}</span>
                <span className={`badge ${statusMap[r.estado].class}`}>{statusMap[r.estado].text}</span>
              </div>
              <p style={{ fontSize: '0.9rem' }}>{r.equipo} | {r.pagado ? `Pagado con ${r.metodoPago}` : 'Pendiente'}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;