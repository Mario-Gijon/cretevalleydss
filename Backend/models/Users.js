// Importa las funciones necesarias de Mongoose para definir y trabajar con esquemas y modelos.
import { model, Schema } from "mongoose"
// Importa bcryptjs para realizar el hashing de contraseñas y la comparación.
import bcrypt from "bcryptjs"
// Usamos moment para formatear la fecha
import moment from 'moment'

// Define un esquema de Mongoose para representar a los usuarios.
const userSchema = new Schema({
  name: { type: String, required: true },
  university: { type: String, required: true },
  email: { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user", index: true },
  tokenConfirm: { type: String, default: null },
  emailTokenConfirm: { type: String, default: null },
  accountConfirm: { type: Boolean, default: false },
  accountCreation: {
    type: String,
    default: () => moment().format("D of MMMM, YYYY"),
  },
});

// Middleware de Mongoose que se ejecuta antes de guardar un documento en la base de datos.
userSchema.pre('save', async function (next) {
  try {
    // Verifica si el documento es nuevo o si el campo "password" fue modificado.
    if (this.isNew || this.isModified('password')) {
      // Genera un "salt" para el proceso de hashing de contraseñas.
      const salt = await bcrypt.genSalt(10)
      // Hash la contraseña del usuario antes de guardarla en la base de datos.
      this.password = await bcrypt.hash(this.password, salt)
    }
  } catch (err) {
    // Maneja errores durante el proceso de hashing y los registra.
    console.error(err)
    throw new Error("Failed hashing password")
  } finally {
    // Llama a la función "next" para continuar con el guardado del documento.
    next()
  }
})

// Método personalizado para comparar la contraseña proporcionada con la almacenada.
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // Compara la contraseña ingresada con la almacenada en la base de datos.
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (err) {
    // Maneja errores durante la comparación de contraseñas y los registra.
    console.error(err)
    return false // Devuelve "false" en caso de error.
  }
}

// Crea un modelo de Mongoose basado en el esquema definido y lo exporta.
export const User = model('User', userSchema);



/* const users = [
  {
    
    "name": "Laura Martínez",
    "university": "Universidad de Granada",
    "email": "laura.martinez@ugr.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "15 of March, 2025",
    
  },
  {
    
    "name": "Carlos Sánchez",
    "university": "Universidad de Sevilla",
    "email": "carlos.sanchez@us.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "20 of February, 2025",
    
  },
  {
    
    "name": "Ana López",
    "university": "Universidad de Málaga",
    "email": "ana.lopez@uma.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "10 of April, 2025",
    
  },
  {
    
    "name": "Javier Gómez",
    "university": "Universidad de Córdoba",
    "email": "javier.gomez@uco.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "5 of May, 2025",
    
  },
  {
    
    "name": "Sofía Ruiz",
    "university": "Universidad de Almería",
    "email": "sofia.ruiz@ual.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "25 of June, 2025",
    
  },
  {
    
    "name": "Miguel Torres",
    "university": "Universidad de Cádiz",
    "email": "miguel.torres@uca.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "12 of July, 2025",
    
  },
  {
    
    "name": "Elena Castro",
    "university": "Universidad de Huelva",
    "email": "elena.castro@uhu.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "8 of August, 2025",
    
  },
  {
    
    "name": "David Navarro",
    "university": "Universidad de Jaén",
    "email": "david.navarro@ujaen.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "30 of September, 2025",
    
  },
  {
    
    "name": "Lucía Díaz",
    "university": "Universidad de Granada",
    "email": "lucia.diaz@ugr.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "14 of October, 2025",
    
  },
  {
    
    "name": "Pablo Jiménez",
    "university": "Universidad de Sevilla",
    "email": "pablo.jimenez@us.es",
    "password": "$2a$10$DURb0joS8nkD.zuyxIPilup9vT.gkYKjwnZ5s6z0mvYde/rkIKAy6",
    "tokenConfirm": null,
    "accountConfirm": true,
    "accountCreation": "22 of November, 2025",
    
  }
]

const seedDB = async () => {
  try {
    // Eliminar usuarios existentes (opcional)
    await User.deleteMany({});
    console.log("Usuarios antiguos eliminados");

    // Insertar usuarios nuevos
    await User.insertMany(users);
    console.log("Usuarios insertados correctamente");

    
  } catch (error) {
    console.error("Error al insertar los usuarios:", error);
    
  }
};



seedDB();
 */

/* ===========================
   DEV SEED: Create Admin User
   Ejecuta SOLO si SEED_ADMIN=true
   =========================== */

  

  
