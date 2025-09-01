import cron from "node-cron";
import mongoose from "mongoose";
import { Issue } from "../models/Issues.js";
import { Participation } from "../models/Participations.js";
import { resolveIssueLogic, removeIssueLogic } from "../controllers/issue.controller.js";
import dayjs from "dayjs";

/**
 * Función que revisa los issues que han llegado a su fecha de cierre
 * y aplica la lógica de finalización automática
 */
const checkAndCloseIssues = async () => {
  try {
    // Obtener la fecha de hoy en formato 'DD-MM-YYYY'
    const todayStr = dayjs().format("DD-MM-YYYY");

    // Buscar todos los issues activos cuya closureDate coincide con hoy
    const issuesToClose = await Issue.find({
      active: true,
      closureDate: todayStr,
    });

    for (const issue of issuesToClose) {
      // Obtener los expertos aceptados
      const participations = await Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      });

      const allEvaluated = participations.every(p => p.evaluationCompleted);

      if (allEvaluated) {
        // Todos valoraron
        if (issue.isConsensus) {
          await resolveIssueLogic(issue._id, { forceFinalize: true });
        } else {
          await resolveIssueLogic(issue._id);
        }
      } else {
        // No todos valoraron
        if (!issue.isConsensus || !issueHasPreviousConsensus(issue)) {
          await removeIssueLogic(issue._id);
        } else {
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

const issueHasPreviousConsensus = (issue) => {
  return issue.consensusMaxPhases && issue.consensusMaxPhases > 0;
};

// Cron job: se ejecuta todos los días a las 00:00 del servidor
cron.schedule("0 0 * * *", () => {
  console.log("Ejecutando cron job para cerrar issues por fecha...");
  checkAndCloseIssues();
});
