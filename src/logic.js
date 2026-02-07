import { db } from './firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

// Genera el ID de 5 números
export const generarIdUnico = () => {
    return Math.floor(10000 + Math.random() * 90000);
};

// Guarda el equipo en Firestore
export const registrarEquipo = async (datos) => {
    const idGenerado = generarIdUnico();
    try {
        await addDoc(collection(db, "reparaciones"), {
            idTicket: idGenerado,
            cliente: datos.nombre,
            telefono: datos.tel,
            equipo: datos.dispositivo,
            falla: datos.queja,
            estado: "Pendiente",
            diagnostico: "",
            precio: 0,
            pagado: false,
            fecha: new Date().toISOString()
        });
        return idGenerado;
    } catch (e) {
        console.error("Error en logic.js:", e);
        throw e;
    }
};

// Actualiza datos (usado por técnicos y pagos)
export const actualizarReparacion = async (docId, dataExtra) => {
    const docRef = doc(db, "reparaciones", docId);
    await updateDoc(docRef, dataExtra);
};