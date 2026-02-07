:root {
  --primary: #3b82f6;
  --accent: #60a5fa;
  --bg: #0f172a;
  --card-bg: rgba(30, 41, 59, 0.7);
  --text: #f1f5f9;
  --border: rgba(255, 255, 255, 0.1);
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--bg);
  background-image: 
    linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
}

/* Pantalla de Inicio */
.welcome-screen {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
}

.clock {
  font-size: clamp(4rem, 15vw, 7rem);
  font-weight: 900;
  color: #fff;
  margin: 0;
  letter-spacing: -2px;
  text-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
}

.date-display {
  font-size: clamp(1rem, 4vw, 1.4rem);
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 4px;
  margin-bottom: 20px;
  font-weight: 300;
}

/* Interfaz Principal */
.container { max-width: 800px; margin: 0 auto; padding: 20px; animation: fadeIn 0.8s ease-out; }

nav {
  display: flex; gap: 8px; margin-bottom: 30px;
  background: rgba(15, 23, 42, 0.8);
  padding: 10px; border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  position: sticky; top: 10px; z-index: 100;
}

.nav-btn {
  flex: 1; padding: 12px; border: none; border-radius: 12px;
  background: transparent; color: #94a3b8;
  font-weight: 600; cursor: pointer; transition: 0.3s;
  font-size: 0.75rem;
}

.nav-btn.active { background: var(--primary); color: white; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); }

.card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 25px; border-radius: 24px;
  margin-bottom: 20px;
}

/* Estilo Ficha Taller */
.medical-card { border-left: 6px solid var(--primary); }
.data-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 15px; margin: 15px 0;
  background: rgba(0, 0, 0, 0.25);
  padding: 15px; border-radius: 15px;
}
.data-item label { display: block; font-size: 0.65rem; color: var(--accent); text-transform: uppercase; margin-bottom: 3px; }
.data-item span { font-weight: 500; }

/* Estadísticas */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.stat-box { background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 18px; text-align: center; border: 1px solid rgba(59, 130, 246, 0.2); }
.stat-box small { font-size: 0.6rem; color: var(--accent); display: block; }
.stat-box strong { font-size: 1.2rem; color: #fff; }

/* Botones y Form */
.btn-action {
  background: var(--primary); color: white; border: none;
  padding: 15px; border-radius: 14px; font-weight: 700;
  cursor: pointer; width: 100%; transition: 0.2s;
}
.btn-action:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4); }

.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px; }
input, textarea, select { background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); color: white; padding: 12px; border-radius: 12px; font-size: 1rem; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #64748b; }
.empty-icon { font-size: 4rem; line-height: 1; margin-bottom: 10px; }

footer { text-align: center; margin-top: 40px; padding: 30px; border-top: 1px solid var(--border); color: #475569; font-size: 0.8rem; }
footer a { color: var(--accent); text-decoration: none; font-weight: bold; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
