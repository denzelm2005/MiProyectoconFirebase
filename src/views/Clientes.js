import React, { useEffect, useState } from "react";
import { View, StyleSheet,ScrollView } from "react-native";
import { db } from "../database/firebaseconfig.js";
import { collection, getDocs,deleteDoc, doc } from "firebase/firestore";
import ListaClientes from "../Components/ListaClientes.js";
import FormularioClientes from "../Components/FormularioClientes.js";
import TablaClientes from "../Components/TablaCliente.js"; // Asegúrate de que este path sea correcto

const Clientes = () => {
  const [clientes, setClientes] = useState([]);

  const cargarDatos = async () => {
    try {
      // Colección cambiada a "clientes"
      const querySnapshot = await getDocs(collection(db, "clientes")); 
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClientes(data);
    } catch (error) {
      console.error("Error al obtener documentos:", error);
    }
  };

  // Función de eliminación adaptada para "clientes"
  const eliminarCliente = async (id) => {
    try {
      // Referencia al documento de la colección "clientes"
      await deleteDoc(doc(db, "clientes", id)); 
      cargarDatos(); // recargar lista
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <View style={styles.container}>
<ScrollView>
      <FormularioClientes cargarDatos={cargarDatos} />
      {/* Se añade el componente TablaClientes con los datos y la función de eliminación */}
      <TablaClientes 
        clientes={clientes}
        eliminarCliente={eliminarCliente} 
      /> 
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex:2.5, padding:30 },
});

export default Clientes;