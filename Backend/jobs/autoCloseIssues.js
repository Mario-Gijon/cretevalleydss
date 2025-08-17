// cron/closeIssuesDaily.js
import cron from "node-cron";
import mongoose from "mongoose";
import { Issue } from "../models/Issues.js";
import { Participation } from "../models/Participations.js";
import { resolveIssueLogic, removeIssueLogic } from "../controllers/issue.controller.js";

/**
 * Función que revisa los issues que han llegado a su fecha de cierre
 * y aplica la lógica de finalización automática
 */
const checkAndCloseIssues = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Solo consideramos el día, ignorando la hora

    // Buscar todos los issues activos cuya fecha de cierre ya pasó o es hoy
    const issuesToClose = await Issue.find({
      active: true,
      closureDate: { $lte: today }
    });

    for (const issue of issuesToClose) {
      // Obtener los expertos aceptados
      const participations = await Participation.find({
        issue: issue._id,
        invitationStatus: "accepted"
      });

      const allEvaluated = participations.every(p => p.evaluationCompleted);

      if (allEvaluated) {
        // Todos valoraron
        if (issue.isConsensus) {
          // Issue de consenso: resolvemos y finalizamos como si fuese la última ronda
          await resolveIssueLogic(issue._id, { forceFinalize: true });
        } else {
          // Issue normal: resolvemos y finalizamos
          await resolveIssueLogic(issue._id);
        }
      } else {
        // No todos valoraron
        if (!issue.isConsensus || !issueHasPreviousConsensus(issue)) {
          // Issue normal o primera ronda de consenso: borrar
          await removeIssueLogic(issue._id);
        } else {
          // Issue de consenso con al menos una ronda previa: finalizar sin resolver
          issue.active = false;
          await issue.save();
          console.log(`Issue de consenso finalizado sin resolverse: ${issue.name}`);
        }
      }
    }
  } catch (err) {
    console.error("Error al cerrar issues automáticamente:", err);
  }
};

/**
 * Función auxiliar para comprobar si ya hay fases de consenso previas
 */
const issueHasPreviousConsensus = (issue) => {
  return issue.consensusMaxPhases && issue.consensusMaxPhases > 0;
};

// Configuración del cron job: se ejecuta todos los días a las 00:00
cron.schedule("0 0 * * *", () => {
  console.log("Ejecutando cron job para cerrar issues por fecha...");
  checkAndCloseIssues();
});
