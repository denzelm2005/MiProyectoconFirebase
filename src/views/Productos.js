import React, { useEffect, useState } from "react";
import { View, StyleSheet,Button,Alert, Text } from "react-native";
import { db } from "../database/firebaseconfig.js";
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc,query, where, orderBy, limit } from "firebase/firestore";
import FormularioProductos from "../Components/FormularioProductos.js";
import TablaProductos from "../Components/TablaProductos.js";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";






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


 const extraerYGuardarMascotas = async () => {
    try {
        // Abrir selector de documentos para elegir archivo Excel
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          Alert.alert("Cancelado", "No se seleccionó ningún archivo.");
          return;
        }

        const { uri, name } = result.assets[0];
        console.log(`Archivo seleccionado: ${name} en ${uri}`);

        // Leer el archivo como base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Enviar a Lambda para procesar
        const response = await fetch(
          "https://vt401nza89.execute-api.us-east-2.amazonaws.com/extraerexcel", // <-- REVISA Y AJUSTA ESTA URL
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ archivoBase64: base64 }),
          }
        );

        if (!response.ok) {
          throw new Error(`Error HTTP en lambda: ${response.status}`);
        }

        const body = await response.json();
        const { datos } = body;

        if (!datos || !Array.isArray(datos) || datos.length === 0) {
          Alert.alert(
            "Error",
            "No se encontraron datos en el Excel o el archivo está vacío(o)."
          );
          return;
        }

        console.log("Datos extraídos del Excel:", datos);

        // Guardar cada fila en la collección 'mascotas'
        let guardados = 0;
        let errores = 0;

        for (const mascota of datos) {
          try {
            // Columnas 'nombre', 'edad', 'raza' (ajusta si los headers son diferentes)
            await addDoc(collection(db, "mascotas"), {
              nombre: mascota.nombre || "",
              edad: mascota.edad || 0,
              raza: mascota.raza || "",
            });
            guardados++;
          } catch (err) {
            console.error("Error guardando mascota:", mascota, err);
            errores++;
          }
        }

        Alert.alert(
          "Éxito",
          `Se guardaron ${guardados} mascotas en la colección. Errores: ${errores}`,
          [{ text: "OK" }]
        );
      } catch (error) {
        console.error("Error en extraerYGuardarMascotas:", error);
        Alert.alert(
          "Error",
          `Error procesando el Excel: ${error.message}`
        );
      }
    };
    


 const extraerYGuardarBicicletas = async () => {
    try {
        // Abrir selector de documentos para elegir archivo Excel
        const result = await DocumentPicker.getDocumentAsync({
            type: [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
            ],
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            Alert.alert("Cancelado", "No se seleccionó ningún archivo.");
            return;
        }

        const { uri, name } = result.assets[0];
        console.log(`Archivo seleccionado: ${name} en ${uri}`);

        // Leer el archivo como base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Enviar a Lambda para procesar
        const response = await fetch(
            "https://vt401nza89.execute-api.us-east-2.amazonaws.com/extraerexcel", // <-- REVISA Y AJUSTA ESTA URL
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ archivoBase64: base64 }),
            }
        );

        if (!response.ok) {
            throw new Error(`Error HTTP en lambda: ${response.status}`);
        }

        const body = await response.json();
        const { datos } = body;

        if (!datos || !Array.isArray(datos) || datos.length === 0) {
            Alert.alert(
                "Error",
                "No se encontraron datos en el Excel o el archivo está vacío(o)."
            );
            return;
        }

        console.log("Datos extraídos del Excel:", datos);

        // --- INICIO DE ADAPTACIÓN: Colección 'bicicletas' ---
        let guardados = 0;
        let errores = 0;

        for (const item of datos) {
            try {
                // Mapeo de columnas: marca, modelo, tipo, precio, color
                const columnas = {
                    marca: item.marca || "",
                    modelo: item.modelo || "",
                    tipo: item.tipo || "",
                    // Convertimos el precio a un número decimal, por si viene como texto
                    precio: parseFloat(item.precio) || 0,
                    color: item.color || "",
                };

                // ✅ Colección corregida a "bicicletas"
                await addDoc(collection(db, "bicicletas"), {
                    marca: columnas.marca,
                    modelo: columnas.modelo,
                    tipo: columnas.tipo,
                    precio: columnas.precio,
                    color: columnas.color,
                });
                guardados++;
            } catch (err) {
                console.error("Error guardando bicicleta:", item, err);
                errores++;
            }
        }

        Alert.alert(
            "Éxito",
            // ✅ Mensaje corregido a "bicicletas"
            `Se guardaron ${guardados} bicicletas en la colección. Errores: ${errores}`,
            [{ text: "OK" }]
        );
        // --- FIN DE ADAPTACIÓN ---
    } catch (error) {
        console.error("Error en extraerYGuardarBicicletas:", error);
        Alert.alert(
            "Error",
            `Error procesando el Excel: ${error.message}`
        );
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

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) 
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};




 // 🚀 FUNCIÓN DE EXCEL FINALIZADA
    const generarExcel = async () => {
  try {
    const datosParaExcel = [
      { nombre: "Producto A", categoria: "Electrónicos", precio: 100 },
      { nombre: "Producto B", categoria: "Ropa", precio: 50 },
      { nombre: "Producto C", categoria: "Electrónicos", precio: 75 }
    ];

    const response = await fetch("https://fs52lfchbe.execute-api.us-east-2.amazonaws.com/generarexcel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datos: datosParaExcel })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    // Obtención de ArrayBuffer y conversión a base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    // Ruta para guardar el archivo temporalmente
    const fileUri = FileSystem.documentDirectory + "reporte.xlsx";

    // Escribir el archivo Excel en el sistema de archivos
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Compartir el archivo generado
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Descargar Reporte Excel"
      });
    } else {
      alert("Compartir no disponible. Revisa la consola para logs.");
    }

  } catch (error) {
    console.error("Error generando Excel:", error);
    alert("Error: " + error.message);
  }
};


const cargarCiudadesFirebase = async () => {
  try {
    // Asegúrate de que 'db', 'getDocs' y 'collection' estén importados
    const snapshot = await getDocs(collection(db, "ciudades"));
    const ciudades = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return ciudades;
  } catch (error) {
    console.error("Error extrayendo ciudades:", error);
    return [];
  }
};


const generarExcelCiu = async () => {
    try {
        // Obtener solo datos de "ciudades"
        const ciudades = await cargarCiudadesFirebase();
        if (ciudades.length === 0) {
            throw new Error("No hay datos en la colección 'ciudades'.");
        }

        console.log("Ciudades para Excel:", ciudades);

        const response = await fetch("https://f53fuwpk3b.execute-api.us-east-2.amazonaws.com/generarExcelCiudad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datos: ciudades })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        // Obtención de ArrayBuffer y conversión a base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        // Ruta para guardar el archivo temporalmente
        const fileUri = FileSystem.documentDirectory + "reporte_ciudades.xlsx";

        // Escribir el archivo Excel
        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64
        });

        // Compartir
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                dialogTitle: "Descargar Reporte de Ciudades"
            });
        } else {
            alert("Compartir no disponible.");
        }

        alert("Excel de ciudades generado y listo para descargar.");

    } catch (error) {
        console.error("Error generando Excel:", error);
        alert(`Error: ${error.message}`);
    }
};




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

<View style={{ marginVertical: 10 }}>
  <Button title="Generar Excel" onPress={generarExcel} />
</View>
<View style={{ marginVertical: 10 }}>
  <Button title="Generar Excel Ciudades" onPress={generarExcelCiu} />
</View>

<Button title="Extraer Mascotas desde Excel" onPress={extraerYGuardarMascotas} />

<Button title="Extraer Bicicletas desde Excel" onPress={extraerYGuardarBicicletas} />

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