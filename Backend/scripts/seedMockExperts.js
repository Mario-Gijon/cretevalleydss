import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { User } from "../models/Users.js";

// Development-only seed script for mock experts used in UI testing.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run mock expert seed in production.");
  process.exit(1);
}

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const MOCK_EXPERT_NAMES = [
  "Sofia Marin",
  "Lucas Ferreira",
  "Elena Kovacs",
  "Daniel Ortega",
  "Marta Silva",
  "Adrian Popescu",
  "Clara Jimenez",
  "Tomas Novak",
  "Irene Santos",
  "Victor Ionescu",
  "Paula Romero",
  "Nicolas Duarte",
  "Alicia Moreno",
  "Bruno Costa",
  "Teresa Nowak",
  "Javier Molina",
  "Natalia Petrov",
  "Hector Ruiz",
  "Carla Mendes",
  "Mateo Delgado",
  "Eva Dimitrova",
  "Ruben Lozano",
  "Laura Campos",
  "Sergio Vidal",
  "Beatriz Alonso",
  "Marcos Pereira",
  "Diana Stancu",
  "Pablo Herrera",
  "Ines Navarro",
  "Gabriel Mendez",
];

const MOCK_UNIVERSITIES = [
  "University of Crete",
  "Technical University of Madrid",
  "University of Valencia",
  "Polytechnic University of Catalonia",
  "University of Granada",
  "Autonomous University of Barcelona",
  "University of Porto",
  "University of Lisbon",
  "University of Coimbra",
  "National Technical University of Athens",
  "Aristotle University of Thessaloniki",
  "University of Patras",
  "Sapienza University of Rome",
  "University of Bologna",
  "University of Milan",
  "Delft University of Technology",
  "KU Leuven",
  "Ghent University",
  "University of Vienna",
  "Charles University",
  "University of Warsaw",
  "Jagiellonian University",
  "Comenius University Bratislava",
  "University of Ljubljana",
  "University of Zagreb",
  "University of Bucharest",
  "Babes-Bolyai University",
  "Sofia University St. Kliment Ohridski",
  "University of Cyprus",
  "Malta College of Arts, Science and Technology",
];

const MOCK_EXPERTS = Array.from({ length: 30 }, (_, index) => {
  const expertNumber = index + 1;
  const twoDigitNumber = String(expertNumber).padStart(2, "0");

  return {
    name: MOCK_EXPERT_NAMES[index],
    university: MOCK_UNIVERSITIES[index],
    email: `expert${twoDigitNumber}@cretevalley.test`,
    password: `expert${twoDigitNumber}`,
    role: "user",
    accountConfirm: true,
  };
});

const seedMockExperts = async () => {
  await connectDB();

  let createdCount = 0;
  let skippedCount = 0;

  for (const expert of MOCK_EXPERTS) {
    const existingUser = await User.findOne({ email: expert.email });

    if (existingUser) {
      skippedCount += 1;
      continue;
    }

    await User.create(expert);
    createdCount += 1;
  }

  console.log("Mock expert seed completed.");
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped existing: ${skippedCount}`);
};

try {
  await seedMockExperts();
} catch (error) {
  console.error("Mock expert seed failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.connection.close().catch(() => {});
}
