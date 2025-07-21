// Importa el módulo de mongoose para interactuar con MongoDB.
import { mongoose } from "mongoose";
// Importa dotenv para cargar variables de entorno desde un archivo .env.
import dotenv from "dotenv";

// Carga las variables de entorno definidas en el archivo .env.
dotenv.config()

// Establece una conexión con la base de datos de MongoDB usando la URI definida en las variables de entorno.
mongoose.connect(process.env.URI_MONGODB)
  // Si la conexión es exitosa, imprime un mensaje en la consola.
  .then(() => console.log('Connected to MongoDB'))
  // Si ocurre un error durante la conexión, imprime el error en la consola.
  .catch(err => console.error(err))


  