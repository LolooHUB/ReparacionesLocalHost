import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

function App() {
  const [seccion, setSeccion] = useState('A'); 
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [selectedId, setSelectedId] = useState(null); // Para expandir detalles

  useEffect(() => {
    return onSnapshot(collection(db, "reparaciones"), (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  return (
    <div className="container">
      <nav>
        <button className={`nav-btn ${seccion==='A'?'active':''}`} onClick={() => setSeccion('A')}>Recepción</button>
        <button className={`nav-btn ${seccion==='B'?'active':''}`} onClick={() => setSeccion('B')}>Técnicos</button>
        <button className={`nav-btn ${seccion==='C'?'active':''}`} onClick={() => setSeccion('C')}>Caja/Pagos</button>
      </nav>

      {/* SECCIÓN A: REGISTRO */}
      {seccion === 'A' && (
        <section>
          <div className="card">
            <h2>Nuevo Ingreso de Equipo</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = e.target.elements;
              const id = await registrarEquipo({
                nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value
              });
              alert("¡Registrado! Ticket ID: " + id);
              e.target.reset();
            }}>
              <div className="grid-form">
                <input name="nom" placeholder="Nombre del Cliente" required />
                <input name="tel" placeholder="Teléfono de contacto" required />
              </div>
              <input name="dev" placeholder="Dispositivo y Modelo (ej: Motor Trifásico 5HP)" required />
              <textarea name="fall" placeholder="Falla reportada por el cliente..." rows="3" required />
              <button className="btn-action" type="submit" style={{width:'100%'}}>Generar Orden de Servicio</button>
            </form>
          </div>
        </section>
      )}

      {/* SECCIÓN B: TÉCNICOS */}
      {seccion === 'B' && (
        <section>
          <h2>Panel de Trabajo Técnico</h2>
          <input placeholder="Buscar por ID o Cliente..." onChange={(e)=>setFiltro(e.target.value)} />
          
          {lista.filter(r => r.idTicket.toString().includes(filtro)).map(r => (
            <div key={r.fid} className={`card ${r.estado}`}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span className="badge" style={{background: '#e2e8f0'}}>#{r.idTicket}</span>
                  <strong style={{marginLeft: '10px'}}>{r.equipo}</strong>
                </div>
                <span className={`badge ${r.estado}`}>{r.estado}</span>
              </div>

              <button className="btn-action" onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                {selectedId === r.fid ? "Cerrar Detalles" : "Ver Detalles y Diagnóstico"}
              </button>

              {selectedId === r.fid && (
                <div className="details-box">
                  <p><strong>Cliente:</strong> {r.cliente} ({r.telefono})</p>
                  <p><strong>Queja Original:</strong> {r.falla}</p>
                  <hr />
                  <label>Diagnóstico Técnico:</label>
                  <textarea defaultValue={r.diagnostico} onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
                  
                  <div className="grid-form">
                    <div>
                      <label>Precio Final ($):</label>
                      <input type="number" defaultValue={r.precio} onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label>Cambiar Estado:</label>
                      <select onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })} value={r.estado}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Proceso">En Reparación</option>
                        <option value="Terminado">Listo para Entrega</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* SECCIÓN C: PAGOS */}
      {seccion === 'C' && (
        <section>
          <h2>Equipos Terminados / Pendientes de Cobro</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card Terminado">
              <h3>Ticket #{r.idTicket} - {r.cliente}</h3>
              <p>Equipo: {r.equipo} | <strong>Total a Cobrar: ${r.precio}</strong></p>
              
              <div className="grid-form">
                <select id={`pago-${r.fid}`}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
                <button className="btn-action" style={{background: '#10b981'}} onClick={() => {
                  const metodo = document.getElementById(`pago-${r.fid}`).value;
                  actualizarReparacion(r.fid, { pagado: true, metodoPago: metodo });
                }}>Registrar Pago y Entregar</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;