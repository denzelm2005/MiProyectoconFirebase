import React, { useEffect, useState } from "react";
import { View, StyleSheet,Button,Alert } from "react-native";
import { db } from "../database/firebaseconfig.js";
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import FormularioProductos from "../Components/FormularioProductos.js";
import TablaProductos from "../Components/TablaProductos.js";

const Productos = ({ cerrarSesion}) => {
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "" });
  const [idProducto, setIdProducto] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const cargarDatos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(data);
    } catch (error) {
      console.error("Error al obtener documentos:", error);
    }
  };

  const eliminarProducto = async (id) => {
    try {
      await deleteDoc(doc(db, "productos", id));
      cargarDatos(); // Recargar lista
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const manejoCambio = (campo, valor) => {
    setNuevoProducto((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const guardarProducto = async () => {
    if (nuevoProducto.nombre && nuevoProducto.precio) {
      try {
        await addDoc(collection(db, "productos"), {
          nombre: nuevoProducto.nombre,
          precio: parseFloat(nuevoProducto.precio),
        });
        setNuevoProducto({ nombre: "", precio: "" });
        cargarDatos();
      } catch (error) {
        console.error("Error al registrar producto:", error);
      }
    } else {
      alert("Por favor, complete todos los campos.");
    }
  };

  const actualizarProducto = async () => {
    if (nuevoProducto.nombre && nuevoProducto.precio && idProducto) {
      try {
        await updateDoc(doc(db, "productos", idProducto), {
          nombre: nuevoProducto.nombre,
          precio: parseFloat(nuevoProducto.precio),
        });
        setNuevoProducto({ nombre: "", precio: "" });
        setIdProducto(null);
        setModoEdicion(false);
        cargarDatos();
      } catch (error) {
        console.error("Error al actualizar producto:", error);
      }
    } else {
      alert("Por favor, complete todos los campos.");
    }
  };

  const editarProducto = (producto) => {
    setNuevoProducto({ nombre: producto.nombre, precio: producto.precio.toString() });
    setIdProducto(producto.id);
    setModoEdicion(true);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Cerrar Sesión" onPress={cerrarSesion} />
      
      <FormularioProductos
        nuevoProducto={nuevoProducto}
        manejoCambio={manejoCambio}
        guardarProducto={guardarProducto}
        actualizarProducto={actualizarProducto}
        modoEdicion={modoEdicion}
      />
      <TablaProductos
        productos={productos}
        eliminarProducto={eliminarProducto}
        editarProducto={editarProducto}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 2.7, padding: 20 },
});

export default Productos;