import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const [{ default: app }, { connectDB }] = await Promise.all([
  import("./app.js"),
  import("./database/db.js"),
]);

const PORT = process.env.PORT || 6000;

/**
 * Arranca la aplicación tras establecer la conexión con MongoDB.
 *
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

startServer();