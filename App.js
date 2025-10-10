
import React from "react";
import Productos from "./src/views/Productos";
import Clientes from "./src/views/Clientes";
import Promedio from "./src/views/Promedio";
import SumNum from "./src/views/SumNum";
import Triangulos from "./src/views/Triangulos";
import IMC from "./src/views/IMC";
import Usuarios from "./src/views/Usuarios";

import { View, StyleSheet,ScrollView } from "react-native";

export default function App( ) {

return (
<>
<ScrollView>
<Productos />
<Clientes />
<Promedio />
<SumNum />
<Triangulos />
<IMC />
<Usuarios />

</ScrollView>
</>
);
}