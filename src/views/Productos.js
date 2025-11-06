import React, { useEffect, useState } from "react";
import { View, StyleSheet,Button,Alert, Text } from "react-native";
import { db } from "../database/firebaseconfig.js";
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc,query, where, orderBy, limit } from "firebase/firestore";
import FormularioProductos from "../Components/FormularioProductos.js";
import TablaProductos from "../Components/TablaProductos.js";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
// Asegúrate de importar 'db', 'getDocs', y 'collection' de Firebase si no lo has hecho.

const Productos = ({ cerrarSesion}) => {
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "" });
  const [idProducto, setIdProducto] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Lista de colecciones utilizada según tu indicación
  const colecciones = ["productos", "usuarios", "edades", "ciudades"];

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

  // Lógica para cargar los datos de UNA colección (Individual) - Original
  const cargarDatosFirebase = async (nombreColeccion) => {

    if (!nombreColeccion || typeof nombreColeccion !== 'string') {
      console.error("Error: Se requiere un nombre de colección válido.");
      return;
    }

    try {
      const datosExportados = {};

      // Obtener la referencia a la colección específica
      const snapshot = await getDocs(collection(db, nombreColeccion));

      // Mapear los documentos y agregarlos al objeto de resultados
      datosExportados[nombreColeccion] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return datosExportados;

    } catch (error) {
      console.error(`Error extrayendo datos de la colección '${nombreColeccion}':`, error);
    }
  };

  // -----------------------------------------------------
  // *** NUEVA LÓGICA DE EXPORTACIÓN Y COPIADO ***
  // -----------------------------------------------------

  // 1. Lógica para cargar TODOS los datos (Total)
  const cargarDatosFirebaseTodo = async () => {
    try {
      const datosExportados = {};
        
      for (const col of colecciones) {
        // Itera sobre la lista de colecciones definida
        const snapshot = await getDocs(collection(db, col));
            
        datosExportados[col] = snapshot.docs.map(((doc) => ({
          id: doc.id,
          ...doc.data(),
        })));
      }

      return datosExportados;
    } catch (error) {
      console.error("Error extrayendo datos:", error);
    }
  };


  // 2. Exportación y Copiado (Universal para Individuales)
  // Sustituye la lógica de tu 'exportarDatos' y la hace dinámica.
  const exportarColeccion = async (nombreColeccion) => {
    try {
      const datos = await cargarDatosFirebase(nombreColeccion); // Carga la colección específica
      if (!datos) return;

      // Formatea los datos para el archivo y el portapapeles
      const jsonString = JSON.stringify(datos, null, 2);
      const baseFileName = `${nombreColeccion}_datos.txt`; // Nombre de archivo dinámico

      // Copiar datos al portapapeles
      await Clipboard.setStringAsync(jsonString);
      console.log(`Datos de '${nombreColeccion}' copiados al portapapeles.`);

      // Verificar si la función de compartir está disponible
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "La función Compartir/Guardar no está disponible en tu dispositivo");
        return;
      }

      // Guardar el archivo temporalmente
      const fileUri = FileSystem.cacheDirectory + baseFileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Abrir el diálogo de compartir
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Compartir datos de Firebase: ${nombreColeccion}`
      });

      Alert.alert("Éxito", `Datos de ${nombreColeccion} copiados al portapapeles y listos para compartir.`);
    } catch (error) {
      console.error("Error al exportar y compartir:", error);
      Alert.alert("Error", "Error al exportar o compartir: " + error.message);
    }
  };


  // 3. Exportación y Copiado (Total)
  const exportarTodo = async () => {
    try {
      const datos = await cargarDatosFirebaseTodo(); // Carga TODAS las colecciones
      console.log("Todos los datos cargados:", datos);

      const jsonString = JSON.stringify(datos, null, 2);
      const baseFileName = "datos_firebase_todo.txt";

      await Clipboard.setStringAsync(jsonString);
      console.log("Datos (JSON) copiados al portapapeles.");

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "La función Compartir/Guardar no está disponible en tu dispositivo");
        return;
      }

      const fileUri = FileSystem.cacheDirectory + baseFileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Compartir TODOS los datos de Firebase (JSON)'
      });

      Alert.alert("Éxito", "Todos los datos copiados al portapapeles y listos para compartir.");
    } catch (error) {
      console.error("Error al exportar todo:", error);
      Alert.alert("Error", "Error al exportar todo: " + error.message);
    }
  };

  // -----------------------------------------------------
  // *** FIN LÓGICA DE EXPORTACIÓN ***
  // -----------------------------------------------------

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
      Alert.alert("Advertencia", "Por favor, complete todos los campos.");
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
      Alert.alert("Advertencia", "Por favor, complete todos los campos.");
    }
  };

  const editarProducto = (producto) => {
    setNuevoProducto({ nombre: producto.nombre, precio: producto.precio.toString() });
    setIdProducto(producto.id);
    setModoEdicion(true);
  };


  const obtenerCiudadesGuatemalaMasPobladas = async () => {
    try {
      console.log(" Consulta: Obtener las 2 ciudades más pobladas de Guatemala");

      const ref = collection(db, "ciudades");
      const q = query(
        ref,
        where("pais", "==", "Guatemala"),
        orderBy("poblacion", "desc"),
        limit(2)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("No hay ciudades de Guatemala.");
        return;
      }

      console.log("Resultados:");
      snapshot.forEach((doc) => {
        console.log(`ID: ${doc.id}`, doc.data());
      });
    } catch (error) {
      console.error("Error en la consulta:", error);
    }
  };

  const listarCiudadesHonduras = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");
      
      const q = query(
        ciudadesRef,
        where("pais", "==", "Honduras"),
        where("poblacion", ">", 700),
        orderBy("nombre", "asc"),
        limit(3)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontraron ciudades de Honduras con población mayor a 700k.");
        return;
      }

      console.log("--- 2. Ciudades de Honduras > 700k ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          `ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}k, País: ${data.pais}`
        );
      });

    } catch (error) {
      console.error("Error al obtener ciudades de Honduras:", error);
    }
  };

  const listarCiudadesElSalvador = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");

      const q = query(
        ciudadesRef,
        where("pais", "==", "El Salvador"),
        orderBy("poblacion", "asc"),
        limit(2)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontraron ciudades de El Salvador.");
        return;
      }

      console.log("--- 3. Ciudades de El Salvador (población ascendente) ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}, País: ${data.pais}`);
      });
    } catch (error) {
      console.error("Error al obtener ciudades de El Salvador:", error);
    }
  };


  const listarCiudadesCentroamerica = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");

      const q = query(
        ciudadesRef,
        where("poblacion", "<=", 300000),
        orderBy("pais", "desc"),
        limit(4)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontraron ciudades centroamericanas con población ≤ 300k.");
        return;
      }

      console.log("--- 4. Ciudades centroamericanas ≤ 300k ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}, País: ${data.pais}`);
      });
    } catch (error) {
      console.error("Error al obtener ciudades centroamericanas:", error);
    }
  };


  const obtenerCiudadesPoblacionAlta = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");
      
      const q = query(
        ciudadesRef,
        where("poblacion", ">", 900),
        orderBy("nombre", "asc"),
        limit(3)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontraron ciudades con población mayor a 900k.");
        return;
      }

      console.log("--- 5. 3 Ciudades con Población > 900k ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          `ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}k, País: ${data.pais}`
        );
      });

    } catch (error) {
      console.error("Error al obtener ciudades de población alta:", error);
    }
  };


  const listarCiudadesGuatemalaCompleto = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");
      
      const q = query(
        ciudadesRef,
        where("pais", "==", "Guatemala"),
        orderBy("poblacion", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontraron ciudades de Guatemala.");
        return;
      }

      console.log("--- 6. Ciudades de Guatemala (Top 5) ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          `ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}k, País: ${data.pais}`
        );
      });

    } catch (error) {
      console.error("Error al obtener todas las ciudades de Guatemala:", error);
    }
  };


  const obtenerCiudadesRangoPoblacion = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");
      
      const q = query(
        ciudadesRef,
        where("poblacion", ">=", 200),
        where("poblacion", "<=", 600),
        orderBy("pais", "asc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontraron ciudades con población entre 200k y 600k."); 
        return;
      }

      console.log("--- 7. Ciudades entre 200k y 600k (Top 5) ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          `ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}k, País: ${data.pais}`
        );
      });

    } catch (error) {
      console.error("Error al obtener ciudades por rango de población:", error);
    }
  };


  const obtenerCiudadesMayorPoblacionGeneral = async () => {
    try {
      const ciudadesRef = collection(db, "ciudades");
      
      const q = query(
        ciudadesRef,
        orderBy("poblacion", "desc"),
        orderBy("region", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("No se encontró ninguna ciudad."); 
        return;
      }

      console.log("--- 8. 5 Ciudades con Mayor Población (Ordenado por Región Desc.) ---");
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          `ID: ${doc.id}, Nombre: ${data.nombre}, Población: ${data.poblacion}k, País: ${data.pais}, Región: ${data.region}`
        );
      });

    } catch (error) {
      console.error("Error al obtener las 5 ciudades más pobladas:", error);
    }
  };


  useEffect(() => {
    obtenerCiudadesGuatemalaMasPobladas();
    listarCiudadesHonduras();
    listarCiudadesElSalvador();
    listarCiudadesCentroamerica();
    obtenerCiudadesPoblacionAlta();
    listarCiudadesGuatemalaCompleto();
    obtenerCiudadesRangoPoblacion();
    obtenerCiudadesMayorPoblacionGeneral();
    cargarDatos();
    
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Cerrar Sesión" onPress={cerrarSesion} />
      
      {/* Botones de Exportación (Individual y Total) */}
      <View style={styles.exportContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.exportTitle}>Exportación Individual</Text>
        </View>
        
        {/* Genera botones individuales para cada una de las 4 colecciones */}
        {colecciones.map((nombreColeccion) => (
          <View key={nombreColeccion} style={styles.buttonWrapper}>
            <Button 
              title={`Exportar: ${nombreColeccion.toUpperCase()}`}
              onPress={() => exportarColeccion(nombreColeccion)}
            />
          </View>
        ))}
        
        <View style={styles.separator} />
        
        {/* Botón de Exportación Total */}
        <View style={styles.buttonWrapper}>
          <Button 
            title="Exportar TODAS las Colecciones" 
            onPress={exportarTodo} 
            color="#28a745" // Color diferente para destacar la exportación total
          />
        </View>
      </View>
      
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
  exportContainer: {
    marginVertical: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  exportTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonWrapper: {
    marginVertical: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
  }
});

export default Productos;