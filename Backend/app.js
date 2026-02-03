// Importa las dependencias necesarias para la aplicación.
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import "./database/db.js"  // Conexión a la base de datos.
import authRouter from "./routes/auth.route.js" // Rutas de autenticación.
import issueRouter from "./routes/issue.route.js"
import cookieParser from 'cookie-parser' // Para poder manejar las cookies en las solicitudes HTTP.
import path from 'path';

// Configura las variables de entorno.
dotenv.config({ path: `.env.${process.env.NODE_ENV}`});

// Crea una instancia de la aplicación express.
const app = express()

// Define el puerto en el que el servidor escuchará las solicitudes.
const PORT = process.env.PORT || 6000

// Define una lista blanca de orígenes permitidos para CORS.
const whiteList = [
  process.env.ORIGIN_FRONT,
  process.env.ORIGIN_BACK,
  process.env.ORIGIN_APIMODELS,
  process.env.ORIGIN_CRETEVALLEY,
  process.env.ORIGIN_SULEIMAN,
]

// Configura el middleware CORS con opciones personalizadas.
app.use(cors({
  origin: function (origin, callback) {
    // Si el origen de la solicitud está en la lista blanca, permite la solicitud.
    if (!origin || whiteList.includes(origin)) {
      return callback(null, true)
    } else {
      // Si el origen no está permitido, devuelve un mensaje de error.
      return callback("Not allowed by CORS: " + origin + " unauthorized")
    }
  },
  credentials: true,  // Permite que las cookies y cabeceras de autenticación se envíen con la solicitud.
}));

// Middleware para analizar el cuerpo de las solicitudes entrantes con formato JSON.
app.use(express.json());

// Middleware para analizar las cookies de las solicitudes entrantes.
app.use(cookieParser());

// Usa las rutas de autenticación definidas en `authRouter` para las solicitudes a `/auth`.
app.use("/api/auth", authRouter)

// Usa las rutas de autenticación definidas en `authRouter` para las solicitudes a `/auth`.
app.use("/api/issues", issueRouter)

// === Servir Frontend ===
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
// Todas las rutas no capturadas por la API devuelven el index.html (para React Router)
app.get('*', (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});



// Inicia el servidor y lo pone a escuchar en el puerto configurado.
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`) })

