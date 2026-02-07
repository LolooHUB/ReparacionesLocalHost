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

  // Configuración Facturador
  const eConf = { nom: "TecnoService", cuit: "20334445551", pago: "MI.ALIAS.PAGO" };

  useEffect(() => {
    const timer = setInterval(() => setTiempo(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setLista(snapshot.docs.map(d => ({ ...d.data(), fid: d.id })));
    });
    return () => unsub();
  }, []);

  // Función para construir el link según tu diccionario
  const abrirFacturador = (r) => {
    let url = `https://facturasonlineweb.web.app/?eNom=${encodeURIComponent(eConf.nom)}&eCuit=${eConf.cuit}&ePago=${eConf.pago}`;
    url += `&cNom=${encodeURIComponent(r.cliente)}&tel=${r.telefono?.replace(/\D/g, '')}&tipoF=C`;
    
    if (r.articulos && r.articulos.length > 0) {
      r.articulos.forEach((art, i) => {
        url += `&articulo${i+1}=${encodeURIComponent(art.desc)}&monto${i+1}=${art.precio}&cant${i+1}=1`;
      });
    } else {
      url += `&articulo1=Servicio%20Tecnico&monto1=${r.precio || 0}&cant1=1`;
    }
    window.open(url, '_blank');
  };

  const agregarArticulo = (r) => {
    const desc = prompt("🛠️ Descripción del repuesto/trabajo:");
    const precio = prompt("💰 Precio ($):");
    if (desc && precio) {
      const nuevosArt = [...(r.articulos || []), { desc, precio: Number(precio) }];
      const nuevoTotal = nuevosArt.reduce((acc, curr) => acc + curr.precio, 0);
      actualizarReparacion(r.fid, { articulos: nuevosArt, precio: nuevoTotal });
    }
  };

  const totalCaja = lista.filter(r => r.pagado).reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const entregadosCount = lista.filter(r => r.pagado).length;

  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.5}}>📅 {r.fecha?.toDate?.().toLocaleString() || 'Reciente'}</p>
      </div>
      {r.articulos?.length > 0 && (
        <div className="log-sub">
          <label>🛠️ Taller</label>
          {r.articulos.map((a, i) => <p key={i}>• {a.desc}: <strong>${a.precio}</strong></p>)}
          <p style={{marginTop:'5px', borderTop:'1px solid #333', paddingTop:'5px'}}>Total: <strong>${r.precio}</strong></p>
        </div>
      )}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen fade-in-inicio">
        <p className="date-display">✨ {tiempo.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</h1>
        <button className="btn-action" style={{ width: '220px' }} onClick={() => setEntrar(true)}>🚀 ENTRAR A TRABAJAR</button>
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
        <section className="card">
          <h2>📝 Nuevo Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("✅ Registrado"); e.target.reset();
          }}>
            <input name="nom" placeholder="👤 Cliente" required />
            <input name="tel" placeholder="📱 WhatsApp" required />
            <input name="dev" placeholder="💻 Equipo" required />
            <textarea name="fall" placeholder="❌ Falla" required />
            <button className="btn-action">💾 GUARDAR</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ En Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length > 0 ? (
            lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
              <div key={r.fid} className="card">
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>📱 {r.equipo}</strong>
                  <span style={{color:'var(--accent)'}}>{r.estado}</span>
                </div>
                <Bitacora r={r} />
                <div className="grid-2" style={{marginTop:'15px'}}>
                  <button className="btn-action" style={{background:'rgba(255,255,255,0.1)'}} onClick={() => agregarArticulo(r)}>➕ ITEM</button>
                  <button className="btn-action" style={{background:'#10b981'}} onClick={() => actualizarReparacion(r.fid, { estado: 'Terminado' })}>✅ LISTO</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state"><span className="empty-icon">☕</span><p>Todo tranqui por acá.</p></div>
          )}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Caja y Cobros</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).length > 0 ? (
            lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
              <div key={r.fid} className="card">
                <h3>👤 {r.cliente}</h3>
                <p>Monto: <strong>${r.precio}</strong></p>
                <div className="grid-2">
                  <select id={`m-${r.fid}`}>
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Transferencia">🏦 Transferencia</option>
                    <option value="Tarjeta">💳 Tarjeta</option>
                  </select>
                  <button className="btn-action" onClick={() => {
                    const met = document.getElementById(`m-${r.fid}`).value;
                    if (met !== "Efectivo") abrirFacturador(r);
                    actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
                  }}>💸 COBRAR</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state"><span className="empty-icon">💸</span><p>No hay cobros pendientes.</p></div>
          )}
          <div className="stats-grid">
            <div className="stat-box"><small>💰 TOTAL</small><h2>${totalCaja}</h2></div>
            <div className="stat-box"><small>📦 ENTREGAS</small><h2>{entregadosCount}</h2></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input className="card" style={{width:'100%'}} placeholder="🔍 Buscar cliente..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>#{r.idTicket} - {r.cliente}</strong>
                <span>{r.pagado ? '✅' : '⏳'}</span>
              </div>
              {historialId === r.fid && <Bitacora r={r} />}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub 2026 • <a href="https://github.com/LolooHUB" target="_blank">LolooHUB</a></p>
      </footer>
    </div>
  );
}

export default App;
