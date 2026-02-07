import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { registrarEquipo, actualizarReparacion } from './logic';

function App() {
  const [entrar, setEntrar] = useState(false);
  const [tiempo, setTiempo] = useState(new Date());
  const [seccion, setSeccion] = useState('A'); 
  const [lista, setLista] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // Para elegir equipo en Taller
  const [search, setSearch] = useState("");

  const eConf = { nom: "TecnoService", cuit: "20334445551", pago: "MI.ALIAS.PAGO" };

  useEffect(() => {
    const timer = setInterval(() => setTiempo(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reparaciones"), orderBy("fecha", "desc"));
    return onSnapshot(q, (snap) => setLista(snap.docs.map(d => ({ ...d.data(), fid: d.id }))));
  }, []);

  const totalCaja = lista.filter(r => r.pagado).reduce((acc, c) => acc + (c.precio || 0), 0);

  const abrirFacturador = (r) => {
    let url = `https://facturasonlineweb.web.app/?eNom=${encodeURIComponent(eConf.nom)}&eCuit=${eConf.cuit}&ePago=${eConf.pago}`;
    url += `&cNom=${encodeURIComponent(r.cliente)}&tel=${r.telefono?.replace(/\D/g, '')}&tipoF=C`;
    r.articulos?.forEach((a, i) => url += `&articulo${i+1}=${encodeURIComponent(a.desc)}&monto${i+1}=${a.precio}&cant${i+1}=1`);
    window.open(url, '_blank');
  };

  const agregarArticulo = (r) => {
    const desc = prompt("🛠️ ¿Qué repuesto o trabajo agregamos?");
    const precio = prompt("💰 Precio ($):");
    if (desc && precio) {
      const nuevosArt = [...(r.articulos || []), { desc, precio: Number(precio) }];
      const nuevoTotal = nuevosArt.reduce((acc, curr) => acc + curr.precio, 0);
      actualizarReparacion(r.fid, { articulos: nuevosArt, precio: nuevoTotal });
    }
  };

  if (!entrar) {
    return (
      <div className="welcome-screen">
        <h1 className="clock">{tiempo.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</h1>
        <button className="btn-action" style={{width:'200px', marginTop:'20px'}} onClick={() => setEntrar(true)}>🚀 ENTRAR</button>
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
          <h2>📝 Recepción</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = e.target.elements;
            await registrarEquipo({ nombre: d.nom.value, tel: d.tel.value, dispositivo: d.dev.value, queja: d.fall.value });
            alert("✅ Ingreso Exitoso"); e.target.reset();
          }}>
            <input name="nom" placeholder="👤 Cliente" required />
            <input name="tel" placeholder="📱 WhatsApp" required />
            <input name="dev" placeholder="💻 Equipo" required />
            <textarea name="fall" placeholder="❌ Falla reportada" required />
            <button className="btn-action">💾 GUARDAR INGRESO</button>
          </form>
        </section>
      )}

      {seccion === 'B' && (
        <section>
          <h2>🛠️ Gestión de Taller</h2>
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').map(r => (
            <div key={r.fid} className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <strong>📱 {r.equipo}</strong>
                  <p style={{margin:0, fontSize:'0.75rem', opacity:0.6}}>🆔 #{r.idTicket} - {r.cliente}</p>
                </div>
                <button 
                  className="nav-btn active" 
                  style={{flex:'none', padding:'8px 15px'}}
                  onClick={() => setSelectedId(selectedId === r.fid ? null : r.fid)}
                >
                  {selectedId === r.fid ? "CERRAR" : "ELEGIR"}
                </button>
              </div>

              {selectedId === r.fid && (
                <div className="tech-detail fade-in">
                  <p style={{fontSize:'0.8rem'}}><strong>Falla inicial:</strong> {r.falla || r.queja}</p>
                  <hr style={{opacity:0.1}} />
                  <h4>Cargos de Reparación:</h4>
                  {r.articulos?.map((a, i) => (
                    <div key={i} className="item-row">
                      <span>• {a.desc}</span>
                      <strong>${a.precio}</strong>
                    </div>
                  ))}
                  <button className="btn-action" style={{margin:'15px 0', background:'rgba(255,255,255,0.1)'}} onClick={() => agregarArticulo(r)}>
                    ➕ AGREGAR ITEM
                  </button>
                  
                  <button 
                    className={`btn-action ${r.articulos?.length > 0 ? 'btn-ready' : ''}`}
                    disabled={!r.articulos || r.articulos.length === 0}
                    onClick={() => {
                      actualizarReparacion(r.fid, { estado: 'Terminado' });
                      setSelectedId(null);
                    }}
                  >
                    ✅ DAR POR LISTO
                  </button>
                  {!r.articulos?.length && <small style={{display:'block', textAlign:'center', marginTop:'5px', color:'#f87171'}}>Debes cargar mínimo 1 ítem para terminar</small>}
                </div>
              )}
            </div>
          ))}
          {lista.filter(r => r.estado !== 'Terminado' && r.estado !== 'Entregado').length === 0 && (
            <div className="card" style={{textAlign:'center'}}>☕ Taller despejado.</div>
          )}
        </section>
      )}

      {seccion === 'C' && (
        <section>
          <h2>💰 Cobros y Salidas</h2>
          {lista.filter(r => r.estado === 'Terminado' && !r.pagado).map(r => (
            <div key={r.fid} className="card">
              <h3>👤 {r.cliente}</h3>
              <div className="item-row"><span>Total a pagar:</span> <strong>${r.precio}</strong></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
                <select id={`m-${r.fid}`} style={{marginBottom:0}}>
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
          ))}
          <div className="stats-grid">
            <div className="stat-box"><small>Caja Hoy</small><strong>${totalCaja}</strong></div>
            <div className="stat-box"><small>Equipos Salidos</small><strong>{lista.filter(r => r.pagado).length}</strong></div>
          </div>
        </section>
      )}

      {seccion === 'D' && (
        <section>
          <h2>📚 Historial</h2>
          <input placeholder="🔍 Buscar cliente o equipo..." onChange={(e) => setSearch(e.target.value)} />
          {lista.filter(r => r.cliente?.toLowerCase().includes(search.toLowerCase())).map(r => (
            <div key={r.fid} className="card" style={{opacity:0.8}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>{r.cliente} - {r.equipo}</strong>
                <span>{r.pagado ? '✅' : '🛠️'}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      <footer>
        <p>LolooHub 2026 • Sistema de Gestión de Taller</p>
      </footer>
    </div>
  );
}

export default App;
