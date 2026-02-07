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

  // Configuración de tu Empresa
  const configEmpresa = {
    nom: "TecnoService",
    cuit: "20334445551",
    pago: "MI.ALIAS.PAGO"
  };

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

  // GENERADOR DE URL SEGÚN TU DICCIONARIO
  const abrirFacturadorCompleto = (r) => {
    let url = `https://facturasonlineweb.web.app/?eNom=${encodeURIComponent(configEmpresa.nom)}&eCuit=${configEmpresa.cuit}&ePago=${configEmpresa.pago}`;
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
    const desc = prompt("Descripción del cambio/reparación:");
    const precio = prompt("Valor de este cambio ($):");
    if (desc && precio) {
      const nuevosArt = [...(r.articulos || []), { desc, precio: Number(precio) }];
      const nuevoTotal = nuevosArt.reduce((acc, curr) => acc + curr.precio, 0);
      actualizarReparacion(r.fid, { articulos: nuevosArt, precio: nuevoTotal });
    }
  };

  const Bitacora = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.6}}>📅 {r.fecha?.toDate ? r.fecha.toDate().toLocaleString() : 'Pendiente'}</p>
      </div>
      {r.articulos && r.articulos.length > 0 && (
        <div className="log-sub">
          <label>🛠️ Taller (Detalle)</label>
          {r.articulos.map((a, i) => (
            <p key={i} style={{fontSize:'0.8rem'}}>• {a.desc}: <strong>${a.precio}</strong></p>
          ))}
          <p style={{marginTop:'5px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'5px'}}>
            Total: <strong>${r.precio}</strong>
          </p>
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
            alert("✅ Ingreso Guardado"); e.target.reset();
          }}>
            <input name="nom" placeholder="👤 Nombre Cliente" required />
            <input name="tel" placeholder="📱 WhatsApp (solo números)" required />
            <input name="dev" placeholder="💻 Equipo / Modelo" required />
            <textarea name="fall" placeholder="❌ Problema reportado" required />
            <button className="btn-action">💾 REGISTRAR ENTRADA</button>
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
                  <strong>📱 {r.equipo}</strong>
                  <span style={{fontSize:'0.7rem', color:'var(--accent)'}}>{r.estado}</span>
                </div>
                <Bitacora r={r} />
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
                  <button className="btn-action" style={{fontSize:'0.7rem', background:'rgba(255,255,255,0.1)'}} onClick={() => agregarArticulo(r)}>
                    ➕ Cargar Item
                  </button>
                  <button className="btn-action" style={{fontSize:'0.7rem', background:'#10b981'}} onClick={() => actualizarReparacion(r.fid, { estado: 'Terminado' })}>
                    ✅ Finalizar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state"><span className="empty-icon">☕</span><p>Todo al día. Momento de un café.</p></div>
          )}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Cobros</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <h3>👤 {r.cliente}</h3>
              <p>Total: <strong>${r.precio}</strong></p>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
                <select id={`m-${r.fid}`}>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                </select>
                <button className="btn-action" onClick={() => {
                  const met = document.getElementById(`m-${r.fid}`).value;
                  if (met !== "Efectivo") abrirFacturadorCompleto(r);
                  actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
                }}>💸 COBRAR</button>
              </div>
            </div>
          ))}
          <div className="stats-grid">
            <div className="stat-box"><small>RECAUDADO</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>ENTREGAS</small><strong>{entregadosCount}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input className="card" style={{width:'100%'}} placeholder="🔍 Buscar cliente o equipo..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase()) || r.equipo?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistorialId(historialId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>#{r.idTicket} - {r.cliente}</strong>
                <span style={{fontSize:'0.7rem'}}>{r.pagado ? '✅ COBRADO' : '⏳ TALLER'}</span>
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
