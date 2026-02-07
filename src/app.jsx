import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

function App() {
  const [seccion, setSeccion] = useState('A'); // A para Recepción, B para Técnicos
  const [lista, setLista] = useState([]);

  // Escuchar la base de datos
  useEffect(() => {
    return onSnapshot(collection(db, "reparaciones"), (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
  }, []);

  return (
    <div className="container">
      <nav>
        <button onClick={() => setSeccion('A')}>Recepción & Pagos</button>
        <button onClick={() => setSeccion('B')}>Panel Técnicos</button>
      </nav>

      {seccion === 'A' ? (
        <section>
          <h2>Registro de Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            const id = await registrarEquipo({
              nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value
            });
            alert("Registrado con ID: " + id);
            e.target.reset();
          }}>
            <input name="nom" placeholder="Nombre Cliente" required />
            <input name="tel" placeholder="Teléfono" required />
            <input name="dev" placeholder="Dispositivo (ej: Motor HP2)" required />
            <textarea name="fall" placeholder="¿Qué le pasa?" required />
            <button type="submit">Guardar y Generar ID</button>
          </form>

          <h2>Pendientes de Pago (Listos)</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <p>ID: {r.idTicket} | {r.cliente} | <b>Total: ${r.precio}</b></p>
              <button onClick={() => actualizarReparacion(r.fid, { pagado: true })}>Marcar Pagado</button>
            </div>
          ))}
        </section>
      ) : (
        <section>
          <h2>Panel de Trabajo (Técnicos)</h2>
          {lista.map(r => (
            <div key={r.fid} className="card">
              <h3>Ticket: {r.idTicket}</h3>
              <p>Equipo: {r.equipo} | Falla: {r.falla}</p>
              
              <select onChange={(e) => actualizarReparacion(r.fid, { estado: e.target.value })} value={r.estado}>
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Terminado">Terminado</option>
              </select>

              <input placeholder="Diagnóstico Final" onBlur={(e) => actualizarReparacion(r.fid, { diagnostico: e.target.value })} />
              <input type="number" placeholder="Precio Final $" onBlur={(e) => actualizarReparacion(r.fid, { precio: Number(e.target.value) })} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;