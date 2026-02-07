import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

function App() {
  const [entrar, setEntrar] = useState(false);
  const [tiempo, setTiempo] = useState(new Date());
  const [seccion, setSeccion] = useState('A'); 
  const [lista, setLista] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // Taller
  const [histId, setHistId] = useState(null); // Historial
  const [search, setSearch] = useState("");

  const miEmpresa = { nom: "TecnoService", cuit: "20334445551", pago: "MI.ALIAS.PAGO" };

  useEffect(() => {
    const timer = setInterval(() => setTiempo(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snap) => setLista(snap.docs.map(d => ({ ...d.data(), fid: d.id }))));
  }, []);

  const totalCaja = lista.filter(r => r.pagado).reduce((acc, c) => acc + (c.precio || 0), 0);

  const facturar = (r) => {
    let url = `https://facturasonlineweb.web.app/?eNom=${encodeURIComponent(miEmpresa.nom)}&eCuit=${miEmpresa.cuit}&ePago=${miEmpresa.pago}`;
    url += `&cNom=${encodeURIComponent(r.cliente)}&tel=${r.telefono?.replace(/\D/g, '')}&tipoF=C`;
    r.articulos?.forEach((a, i) => url += `&articulo${i+1}=${encodeURIComponent(a.desc)}&monto${i+1}=${a.precio}&cant${i+1}=1`);
    window.open(url, '_blank');
  };

  const addItem = (r) => {
    const desc = prompt("🛠️ ¿Qué repuesto o trabajo cargamos?");
    const precio = prompt("💰 ¿Precio?");
    if (desc && precio) {
      const nuevosArt = [...(r.articulos || []), { desc, precio: Number(precio) }];
      const nuevoTotal = nuevosArt.reduce((acc, curr) => acc + curr.precio, 0);
      actualizarReparacion(r.fid, { articulos: nuevosArt, precio: nuevoTotal });
    }
  };

  const BitacoraInfo = ({ r }) => (
    <div className="log-box">
      <div className="log-sub">
        <label>📥 Recepción</label>
        <p><strong>Falla:</strong> {r.falla || r.queja}</p>
        <p style={{fontSize:'0.7rem', opacity:0.5}}>📅 {r.fecha?.toDate?.().toLocaleString() || 'Reciente'}</p>
      </div>
      {r.articulos?.length > 0 && (
        <div className="log-sub">
          <label>🛠️ Detalle del Trabajo</label>
          {r.articulos.map((a, i) => (
            <div key={i} className="item-row">
              <span>• {a.desc}</span>
              <strong>${a.precio}</strong>
            </div>
          ))}
          <p style={{marginTop:'8px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'8px'}}>
            Total Final: <strong>${r.precio}</strong>
          </p>
        </div>
      )}
      {r.pagado && (
        <div className="log-sub" style={{marginTop:'10px'}}>
          <label>💰 Pago Confirmado</label>
          <p>✅ {r.metodoPago || 'Efectivo'}</p>
        </div>
      )}
    </div>
  );

  if (!entrar) {
    return (
      <div className="welcome-screen">
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</h1>
        <button className="btn-action" style={{width:'200px', marginTop:'20px'}} onClick={() => setEntrar(true)}>🚀 INICIAR</button>
      </div>
    );
  }

  return (
    <div className="container">
      <nav>
        <button className={`nav-btn ${seccion === 'A' ? 'active' : ''}`} onClick={() => setSeccion('A')}>📥 REC</button>
        <button className={`nav-btn ${seccion === 'B' ? 'active' : ''}`} onClick={() => setSeccion('B')}>🛠️ TALLER</button>
        <button className={`nav-btn ${seccion === 'C' ? 'active' : ''}`} onClick={() => setSeccion('C')}>💰 CAJA</button>
        <button className={`nav-btn ${seccion === 'D' ? 'active' : ''}`} onClick={() => setSeccion('D')}>📚 HIST</button>
      </nav>

      {seccion === 'A' && (
        <section className="card">
          <h2>📝 Registro de Ingreso</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("🚀 Registrado"); e.target.reset();
          }}>
            <input name="nom" placeholder="👤 Cliente" required />
            <input name="tel" placeholder="📱 WhatsApp" required />
            <input name="dev" placeholder="💻 Equipo" required />
            <textarea name="fall" placeholder="❌ Problema" required />
            <button className="btn-action">✨ GUARDAR ENTRADA</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Taller (ID Select)</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <strong>📱 {r.equipo}</strong>
                  <p style={{margin:0, fontSize:'0.75rem', opacity:0.6}}>#{r.idTicket} - {r.cliente}</p>
                </div>
                <button className="nav-btn active" style={{flex:'none', padding:'8px 15px'}} onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}>
                  {selectedId === r.fid ? "✖️" : "ABRIR"}
                </button>
              </div>
              {selectedId === r.fid && (
                <div style={{marginTop:'15px'}}>
                  <BitacoraInfo r={r} />
                  <button className="btn-action" style={{margin:'10px 0', background:'rgba(255,255,255,0.1)'}} onClick={() => addItem(r)}>➕ ITEM</button>
                  <button className={`btn-action ${r.articulos?.length > 0 ? 'btn-ready' : ''}`} disabled={!r.articulos?.length} onClick={() => {actualizarReparacion(r.fid, { estado: 'Terminado' }); setSelectedId(null);}}>
                    ✅ TERMINAR
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Cobros</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <h3>👤 {r.cliente}</h3>
              <p>📱 {r.equipo}</p>
              <div className="item-row"><span>Monto:</span> <strong>${r.precio}</strong></div>
              <div className="grid-2" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
                <select id={`m-${r.fid}`} style={{marginBottom:0}}>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">🏦 Transferencia</option>
                  <option value="Tarjeta">💳 Tarjeta</option>
                </select>
                <button className="btn-action" onClick={() => {
                  const met = document.getElementById(`m-${r.fid}`).value;
                  if (met !== "Efectivo") facturar(r);
                  actualizarReparacion(r.fid, { pagado: true, estado: 'Entregado', metodoPago: met });
                }}>💸 COBRAR</button>
              </div>
            </div>
          ))}
          <div className="stats-grid">
            <div className="stat-box"><small>Caja</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>Entregas</small><strong>{lista.filter(r => r.pagado).length}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial Completo</h2>
          <input placeholder="🔍 Buscar por nombre o equipo..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase()) || r.equipo?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" onClick={() => setHistId(histId === r.fid ? null : r.fid)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <strong>{r.cliente}</strong>
                  <p style={{margin:0, fontSize:'0.8rem', opacity:0.6}}>{r.equipo}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{fontSize:'0.7rem', display:'block'}}>{r.pagado ? '✅ PAGADO' : '🛠️ PENDIENTE'}</span>
                  <strong style={{fontSize:'0.9rem'}}>${r.precio || 0}</strong>
                </div>
              </div>
              {histId === r.fid && <BitacoraInfo r={r} />}
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub Premium 2026 • Gestionando con éxito 🚀</p>
      </footer>
    </div>
  );
}

export default App;
