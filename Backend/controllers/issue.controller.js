// Importa el modelo de usuario desde el archivo correspondiente.
import { User } from '../models/Users.js'
import { Issue } from '../models/Issues.js';
import { IssueModel } from '../models/Models.js';
import { Alternative } from '../models/Alternatives.js';
import { Criterion } from '../models/Criteria.js';
import { Participation } from '../models/Participations.js';
import { Evaluation } from '../models/Evaluations.js';
import { Consensus } from '../models/Consensus.js';
import { Notification } from '../models/Notificacions.js';
import { ExitUserIssue } from '../models/ExitUserIssue.js';
import { buildCriterionTree, categorizeParticipations, getUserActiveIssueIds, getUserFinishedIssueIds } from '../utils/getAllActiveIssuesUtils.js';
import { createAlternatives, createCriteria, createEvaluations, createParticipations } from '../utils/createIssueUtils.js';
import { Resend } from 'resend'
import { validateFinalEvaluations } from '../utils/validateFinalEvaluations.js';
import axios from "axios"
import { createAlternativesRankingsSection, createAnalyticalGraphsSection, createExpertsRatingsSection, createSummarySection } from '../utils/finishedIssueInfoUtils.js';
import mongoose from 'mongoose';
import { sendExpertInvitationEmail } from '../utils/sendEmails.js';

// Crea una instancia de Resend con la clave API.
const resend = new Resend(process.env.APIKEY_RESEND)

/**
 * Controlador para obtener información de los modelos.
 */
export const modelsInfo = async (req, res) => {
  try {
    // Obtener todos los documentos de IssueModel, excluyendo los campos _id y __v
    const models = await IssueModel.find().select('-_id -__v')

    // Responder con los modelos obtenidos
    return res.status(200).json({ success: true, data: models })
  } catch (err) {
    // Capturar y registrar el error
    console.error(err)

    // Responder con error de servidor
    return res.status(500).json({ success: false, msg: 'Server error' })
  }
}

/**
 * Controlador para obtener todos los usuarios con cuenta confirmada.
 */
export const getAllUsers = async (req, res) => {
  try {
    // Buscar usuarios con cuenta confirmada, seleccionar solo campos necesarios
    const users = await User.find({ accountConfirm: true }).select('-_id name university email')

    // Responder con la lista de usuarios
    return res.status(200).json({ success: true, data: users })
  } catch (err) {
    // Capturar y registrar el error
    console.error(err)

    // Responder con error de servidor
    return res.status(500).json({ success: false, msg: 'Server error' })
  }
}

/**
 * Controlador para crear un nuevo problema (issue) usando transacción.
 */
export const createIssue = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    // Iniciar transacción
    session.startTransaction();

    // Extraer información del problema desde el cuerpo de la petición
    const {
      issueName,
      issueDescription,
      selectedModel,
      alternatives,
      criteria,
      addedExperts,
      domainExpressions,
      closureDate,
      consensusMaxPhases,
      consensusThreshold,
    } = req.body.issueInfo;

    // Validar que no exista un problema con el mismo nombre
    const existingIssue = await Issue.findOne({ name: issueName }).session(session);
    if (existingIssue) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, obj: "issueName", msg: "Issue name already exists" });
    }

    // Validar que el modelo seleccionado exista
    const model = await IssueModel.findOne({ name: selectedModel }).session(session);
    if (!model) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, obj: "selectedModel", msg: "Model does not exist" });
    }

    // Validar que haya al menos dos alternativas
    if (alternatives.length <= 1) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, obj: "alternatives", msg: "Must be at least two alternatives" });
    }

    // Validar que haya al menos dos expertos
    if (addedExperts.length <= 1) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, obj: "addedExperts", msg: "Must be at least two experts" });
    }

    // Crear el nuevo problema con los datos proporcionados
    const issue = new Issue({
      admin: req.uid,
      model: model._id,
      isConsensus: model.isConsensus,
      name: issueName,
      description: issueDescription,
      active: true,
      creationDate: new Date(),
      closureDate: closureDate || null,
      ...(model.isConsensus && {
        consensusMaxPhases,
        consensusThreshold,
      }),
    });

    // Guardar el problema en la base de datos con sesión
    await issue.save({ session });

    // Crear alternativas asociadas al problema con sesión
    const createdAlternatives = await createAlternatives(alternatives, issue._id, session);

    // Crear criterios asociados al problema con sesión y obtener solo los criterios hoja
    const leafCriteria = await createCriteria(criteria, issue._id, null, session);

    // Obtener el email del administrador que creó el problema con sesión
    const admin = await User.findById(req.uid).session(session);
    if (!admin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, msg: "Admin not found" });
    }
    const adminEmail = admin.email;

    // Crear participaciones de expertos con sesión, marcando al admin como aceptado
    const expertMap = await createParticipations(addedExperts, issue._id, adminEmail, session);

    // Crear evaluaciones iniciales con sesión para cada experto, alternativa y criterio hoja
    await createEvaluations(
      domainExpressions,
      expertMap,
      createdAlternatives,
      leafCriteria,
      issue._id,
      model.isPairwise,
      null,
      session
    );

    // Enviar invitaciones por correo a los expertos (excepto al admin)
    await Promise.all(
      addedExperts.map(async (expertEmail) => {
        if (expertEmail !== adminEmail) {
          // Buscar al experto por su email (no necesita sesión para lectura)
          const expert = await User.findOne({ email: expertEmail });
          if (!expert) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              msg: `Expert with email ${expertEmail} not found`,
            });
          }

          // Crear notificación para el experto invitado (sin sesión)
          const notification = new Notification({
            expert: expert._id,
            issue: issue._id,
            type: "invitation",
            message: `You have been invited by ${admin.name} to participate in ${issueName}.`,
            read: false,
            requiresAction: true,
          });

          // Guardar notificación en la base de datos
          await notification.save();

          await sendExpertInvitationEmail({ expertEmail, issueName, issueDescription, adminEmail });
        }
      })
    );

    // Confirmar la transacción
    await session.commitTransaction();
    session.endSession();

    // Responder con éxito indicando que el problema fue creado
    return res
      .status(201)
      .json({ success: true, msg: `Issue ${issue.name} created successfully` });
  } catch (error) {
    // Abortamos transacción en caso de error
    await session.abortTransaction();
    session.endSession();

    // Capturar y registrar cualquier error
    console.error(error);

    // Responder con error de servidor
    return res.status(500).json({ success: false, msg: "Server error creating issue" });
  }
};


export const getAllActiveIssues = async (req, res) => {
  try {
    const userId = req.uid;

    // Obtener los IDs de los problemas donde participa el usuario
    const issueIds = await getUserActiveIssueIds(userId);
    if (issueIds.length === 0) {
      return res.json({ success: true, issues: [] });
    }

    // Consultar los problemas activos y sus datos
    const issues = await Issue.find({ _id: { $in: issueIds } })
      .populate("model", "name isConsensus isPairwise")
      .populate("admin", "email")
      .lean();

    // Obtener todas las participaciones de expertos
    const allParticipations = await Participation.find({ issue: { $in: issueIds } })
      .populate("expert", "email")
      .lean();

    // Obtener alternativas y criterios
    const alternatives = await Alternative.find({ issue: { $in: issueIds } }).lean();
    const criteria = await Criterion.find({ issue: { $in: issueIds } }).lean();

    // Obtener todos los registros de consenso relacionados con estos problemas
    const consensusPhases = await Consensus.find({ issue: { $in: issueIds } }, "issue phase").lean();

    // Crear un mapa de issueId -> número de fases
    const consensusPhaseCountMap = consensusPhases.reduce((acc, curr) => {
      const issueId = curr.issue.toString();
      acc[issueId] = acc[issueId] ? acc[issueId] + 1 : 1;
      return acc;
    }, {});


    // Formatear los issues
    const formattedIssues = issues.map((issue) => {
      const {
        participatedExperts,
        pendingExperts,
        notAcceptedExperts,
        acceptedButNotEvaluated, // Nueva categoría
        isExpert
      } = categorizeParticipations(
        allParticipations.filter((part) => part.issue._id.equals(issue._id)),
        userId
      );

      return {
        name: issue.name,
        creator: issue.admin.email,
        description: issue.description,
        model: issue.model.name,
        isPairwise: issue.model.isPairwise,
        isConsensus: issue.model.isConsensus,
        ...(issue.model.isConsensus && {
          consensusMaxPhases: issue.consensusMaxPhases || "Unlimited",
          consensusThreshold: issue.consensusThreshold,
          consensusCurrentPhase: consensusPhaseCountMap[issue._id.toString()] + 1 || 1,
        }),
        creationDate: issue.creationDate.toISOString().split("T")[0],
        closureDate: issue.closureDate ? issue.closureDate.toISOString().split("T")[0] : null,
        isAdmin: issue.admin._id.toString() === userId,
        isExpert,
        alternatives: alternatives.filter((alt) => alt.issue.toString() === issue._id.toString()).map((alt) => alt.name).sort(),
        criteria: buildCriterionTree(criteria, issue._id),
        evaluated: participatedExperts.map((part) => part.expert._id.toString()).includes(userId),
        totalExperts: participatedExperts.length + pendingExperts.length + notAcceptedExperts.length + acceptedButNotEvaluated.length, // Incluye la nueva categoría
        participatedExperts: participatedExperts.map((part) => part.expert.email).sort(),
        pendingExperts: pendingExperts.map((part) => part.expert.email).sort(),
        notAcceptedExperts: notAcceptedExperts.map((part) => part.expert.email).sort(),
        acceptedButNotEvaluatedExperts: acceptedButNotEvaluated.map((part) => part.expert.email).sort(), // Agrega los expertos que aceptaron pero no evaluaron
      };
    });

    res.json({ success: true, issues: formattedIssues });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching active issues" });
  }
};

export const removeIssue = async (req, res) => {
  const { issueName } = req.body;
  const userId = req.uid; // ID del usuario autenticado

  try {
    // Verificar si el Issue existe
    const issue = await Issue.findOne({ name: issueName });

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Verificar si el usuario es el administrador del Issue
    if (issue.admin.toString() !== userId) {
      return res.status(403).json({ success: false, msg: "You are not the admin of this issue" });
    }

    // Verificar si el Issue está activo
    if (!issue.active) {
      return res.status(400).json({ success: false, msg: "Issue is not active and cannot be deleted" });
    }

    // Eliminar evaluaciones asociadas a las alternativas antes de eliminar las alternativas
    await Evaluation.deleteMany({ issue: issue._id });

    // Eliminar alternativas asociadas al Issue
    await Alternative.deleteMany({ issue: issue._id });

    // Eliminar criterios asociados al Issue
    await Criterion.deleteMany({ issue: issue._id });

    // Eliminar participaciones asociadas al Issue
    await Participation.deleteMany({ issue: issue._id });

    // Eliminar registros de consenso asociados al Issue
    await Consensus.deleteMany({ issue: issue._id });

    // Eliminar notificaciones asociados al Issue
    await Notification.deleteMany({ issue: issue._id });

    // Eliminar el Issue en sí
    await Issue.deleteOne({ _id: issue._id });

    return res.status(200).json({ success: true, msg: `Issue ${issue.name} removed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while deleting the issue", error: err.message });
  }
};

export const getAllFinishedIssues = async (req, res) => {
  try {
    const userId = req.uid;

    // Obtener los IDs de los problemas donde participa el usuario
    const issueIds = await getUserFinishedIssueIds(userId);
    if (issueIds.length === 0) {
      return res.json({ success: true, issues: [] });
    }

    // Consultar los problemas activos y sus datos
    const issues = await Issue.find({ _id: { $in: issueIds } })
      .populate("model", "name isConsensus")
      .populate("admin", "email")
      .lean();

    // Formatear los issues
    const formattedIssues = issues.map((issue) => (
      {
        name: issue.name,
        description: issue.description,
        creationDate: issue.creationDate.toISOString().split("T")[0],
        closureDate: issue.closureDate ? issue.closureDate.toISOString().split("T")[0] : null,
        isAdmin: issue.admin._id.toString() === userId,
      }
    ));

    res.json({ success: true, issues: formattedIssues });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching active issues" });
  }
};

export const getNotifications = async (req, res) => {
  const userId = req.uid;

  try {
    // Obtenemos las notificaciones del usuario
    const notifications = await Notification.find({ expert: userId })
      .sort({ createdAt: -1 })
      .populate("expert", "email") // Obtener solo el email del experto
      .populate("issue", "name");  // Obtener solo el nombre del issue

    // Obtenemos las participaciones del usuario
    const participations = await Participation.find({ expert: userId });

    // Transformamos las notificaciones para agregar la respuesta del experto
    const formattedNotifications = notifications.map((notification) => {
      // Buscamos la participación correspondiente para este problema
      const participation = participations.find(p => p.issue.toString() === notification.issue._id.toString());

      let responseStatus = false;
      if (participation) {
        if (participation.invitationStatus === "accepted") {
          responseStatus = "Invitation accepted";
        } else if (participation.invitationStatus === "declined") {
          responseStatus = "Invitation declined";
        }
      }

      return {
        _id: notification._id,
        header: notification.type === "invitation" ? "Invitation" : notification.issue.name,
        message: notification.message,
        userEmail: notification.expert ? notification.expert.email : "Usuario eliminado",
        issueName: notification.issue ? notification.issue.name : "Problema eliminado",
        requiresAction: notification.requiresAction,
        read: notification.read ?? false,
        createdAt: notification.createdAt,
        responseStatus: responseStatus, // Añadimos el estado de respuesta aquí
      };
    });

    return res.status(200).json({ success: true, notifications: formattedNotifications });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while getting notifications" });
  }
};


export const markAllNotificationsAsRead = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    await Notification.updateMany(
      { expert: userId, read: false }, // Filtrar solo las no leídas del usuario
      { read: true } // Marcar como leídas
    );

    return res.status(200).json({ success: true, msg: "Notifications marked as read" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while updating notifications" });
  }
};

export const changeInvitationStatus = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado
  const { issueName, action } = req.body; // El nombre del issue y el nuevo estado de la invitación

  try {
    // Buscar el problema por su nombre
    const issue = await Issue.findOne({ name: issueName });

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Buscar la participación del usuario en ese problema
    const participation = await Participation.findOne({ issue: issue._id, expert: userId });

    if (!participation) {
      return res.status(404).json({ success: false, msg: "No participation found for the user in this issue" });
    }

    // Actualizar el estado de la invitación
    participation.invitationStatus = action; // action debe ser "accepted" o "declined"

    // Si el estado es "accepted", puede ser útil actualizar también si la evaluación ha comenzado
    if (action === "accepted") {
      participation.evaluationCompleted = false; // Esto depende de cómo lo manejes
    }

    // Guardar los cambios en la base de datos
    await participation.save();

    // Enviar un mensaje personalizado dependiendo de la acción
    const message = action === "accepted"
      ? `Invitation to issue ${issueName} accepted`
      : `Invitation to issue ${issueName} declined`;

    // Responder con éxito y el mensaje adecuado
    return res.status(200).json({ success: true, msg: message });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while updating invitation status" });
  }
};

export const removeNotificationById = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado
  const { notificationId } = req.body; // ID de la notificación a eliminar desde el cuerpo de la solicitud

  try {
    // Busca la notificación por ID y asegúrate de que pertenece al usuario
    const notification = await Notification.findOne({ _id: notificationId, expert: userId });

    if (!notification) {
      return res.status(404).json({ success: false, msg: "Notification not found" });
    }

    // Elimina la notificación
    await Notification.deleteOne({ _id: notificationId });

    // Responder con éxito
    return res.status(200).json({ success: true, msg: "Message removed" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while removing notification" });
  }
};

export const saveEvaluations = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    const { issueName, evaluations } = req.body;

    // Buscar el problema (Issue) por nombre
    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      if (res) {
        return res.status(404).json({ success: false, msg: "Issue not found" });
      } else {
        return { success: false, msg: "Issue not found" }
      }
    }

    // Verificar que el usuario tiene participación activa como experto en este Issue
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted"
    });

    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant in this issue"
      });
    }


    // Obtener todas las alternativas asociadas a este problema y mapear por nombre
    const alternatives = await Alternative.find({ issue: issue._id }).lean();
    const alternativeMap = new Map(alternatives.map((alt) => [alt.name, alt._id]));

    // Obtener todos los criterios asociados al problema y mapear por nombre
    const criteria = await Criterion.find({ issue: issue._id }).lean();
    const criterionMap = new Map(criteria.map((crit) => [crit.name, crit._id]));

    const bulkOperations = [];

    // Obtener última fase de consenso
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;


    for (const [criterionName, evaluationsByExpert] of Object.entries(evaluations)) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue; // Ignorar si el criterio no existe

      for (const evaluationData of evaluationsByExpert) {
        const { id: alternativeName, ...comparisons } = evaluationData;
        const alternativeId = alternativeMap.get(alternativeName);
        if (!alternativeId) continue; // Ignorar si la alternativa no existe

        for (const [comparedAlternativeName, value] of Object.entries(comparisons)) {
          if (comparedAlternativeName === alternativeName) continue; // Saltar la diagonal

          const comparedAlternativeId = alternativeMap.get(comparedAlternativeName);
          if (!comparedAlternativeId) continue; // Ignorar si la alternativa comparada no existe

          bulkOperations.push({
            updateOne: {
              filter: {
                expert: userId,
                alternative: alternativeId,
                comparedAlternative: comparedAlternativeId,
                criterion: criterionId,
              },
              update: {
                $set: {
                  value,
                  timestamp: new Date(),
                  issue: issue._id,
                  consensusPhase: currentPhase,
                },
              },
              upsert: true,
            },
          });

        }
      }
    }

    if (bulkOperations.length > 0) {
      await Evaluation.bulkWrite(bulkOperations);
    }

    console.log("Received evaluations:", evaluations);
    console.log("Generated bulk operations:", bulkOperations.length);


    if (res) {
      return res.status(200).json({ success: true, msg: "Evaluations saved successfully" });
    }
    return { success: true, msg: "Evaluations saved successfully" };

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while saving evaluations" });
  }
};


export const getEvaluations = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    const { issueName } = req.body; // Nombre del problema (issue)

    // Buscar el problema (Issue) por nombre
    const issue = await Issue.findOne({ name: issueName });
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Crear un objeto para almacenar las evaluaciones por criterio
    const evaluationsByCriterion = {};

    // Buscar las evaluaciones asociadas al usuario y al issue específico
    const evaluations = await Evaluation.find({
      issue: issue._id,
      expert: userId,
      $and: [
        { value: { $ne: "" } },  // Asegura que 'value' no esté vacío
        { value: { $ne: null } }  // Asegura que 'value' no sea null
      ]
    })
      .populate("alternative")
      .populate("comparedAlternative")
      .populate("criterion");


    // Organizar las evaluaciones en una estructura similar a la del frontend
    evaluations.forEach((evaluation) => {
      const { criterion, alternative, comparedAlternative, value } = evaluation;

      // Asegurarse de que el valor no sea nulo ni vacío
      if (value === null || value === "" || value === " ") {
        return;
      }

      const criterionName = criterion.name;

      // Si no existe la clave para el criterio en el objeto evaluationsByCriterion, la inicializamos
      if (!evaluationsByCriterion[criterionName]) {
        evaluationsByCriterion[criterionName] = {};
      }

      const alternativeName = alternative.name;
      const comparedAlternativeName = comparedAlternative ? comparedAlternative.name : null;

      // Inicializamos las evaluaciones para cada alternativa si no existen
      if (!evaluationsByCriterion[criterionName][alternativeName]) {
        evaluationsByCriterion[criterionName][alternativeName] = {};
      }

      // Asignamos el valor de la evaluación al par de alternativas comparadas
      if (comparedAlternativeName) {
        evaluationsByCriterion[criterionName][alternativeName][comparedAlternativeName] = value;
      } else {
        evaluationsByCriterion[criterionName][alternativeName][""] = value; // Para evaluaciones estándar sin comparación
      }
    });

    // Formatear la respuesta en la estructura que deseas
    const formattedEvaluations = {};

    for (const criterionName in evaluationsByCriterion) {
      const evaluationsForCriterion = evaluationsByCriterion[criterionName];
      const evaluationsList = Object.entries(evaluationsForCriterion).map(([alternativeName, comparisons]) => ({
        id: alternativeName,
        ...comparisons,
      }));

      formattedEvaluations[criterionName] = evaluationsList;
    }

    // Obtener el último consensus registrado para este issue
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });

    // Enviar la respuesta con las evaluaciones formateadas
    return res.status(200).json({ success: true, evaluations: formattedEvaluations, collectiveEvaluations: latestConsensus?.collectiveEvaluations || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while fetching evaluations" });
  }
};

// Método para enviar las valoraciones
export const sendEvaluations = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    const { issueName, evaluations } = req.body;

    // Primero validamos las evaluaciones antes de guardarlas
    const validation = validateFinalEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({ success: false, criterion: validation.error.criterion, msg: validation.error.message }); // Cambié error.message por message
    }

    // Llamamos al método saveEvaluations para guardar las valoraciones
    const saveResult = await saveEvaluations(req);
    if (!saveResult.success) {
      return res.status(500).json({ success: false, msg: saveResult.msg });
    }

    // Obtener el issueId a partir del nombre del issue (se asume que el nombre es único)
    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Actualizar la participación del experto, marcando la evaluación como completada
    const participation = await Participation.findOneAndUpdate(
      { issue: issue._id, expert: userId }, // Condición: issue y expert
      { $set: { evaluationCompleted: true } }, // Actualización: se marca como completada
      { new: true } // Devuelve el documento actualizado
    );

    if (!participation) {
      return res.status(404).json({ success: false, msg: "Participation not found" });
    }

    return res.status(200).json({ success: true, msg: "Evaluations sent successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while sending evaluations" });
  }
};

// Método para resolver el problema
export const resolveIssue = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    const { issueName } = req.body;

    // Buscar el problema por nombre
    const issue = await Issue.findOne({ name: issueName });

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Verificar que el usuario sea el creador del problema
    if (issue.admin.toString() !== userId) {
      return res.status(403).json({ success: false, msg: "Unauthorized: Only the issue creator can resolve it" });
    }

    // Verificar que todos los expertos hayan completado su evaluación
    const pendingEvaluations = await Participation.find({
      issue: issue._id,
      evaluationCompleted: false,
      invitationStatus: "accepted"
    });

    if (pendingEvaluations.length > 0) {
      return res.status(400).json({ success: false, msg: "Not all experts have completed their evaluations" });
    }

    // Obtener alternativas y solo los criterios hoja
    const alternatives = await Alternative.find({ issue: issue._id });

    const criteria = await Criterion.find({ issue: issue._id, isLeaf: true }); // Solo criterios hoja
    /* const participations = await Participation.find({ issue: issue._id }).populate("expert"); */

    const participations = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted"
    }).populate("expert");

    const matrices = {};

    await Promise.all(participations.map(async participation => {
      const expertName = participation.expert.email;
      matrices[expertName] = {};

      await Promise.all(criteria.map(async criterion => {
        const matrixSize = alternatives.length;

        const pairwiseMatrix = Array.from({ length: matrixSize }, (_, i) =>
          Array.from({ length: matrixSize }, (_, j) => (i === j ? 0.5 : null))
        );

        const evaluations = await Evaluation.find({
          issue: issue._id,
          expert: participation.expert._id,
          criterion: criterion._id
        }).populate("alternative comparedAlternative");

        console.log(`Evaluations for ${expertName} on criterion ${criterion.name}:`, evaluations);

        for (const evaluation of evaluations) {
          if (evaluation.comparedAlternative) {
            const i = alternatives.findIndex(a => a._id.equals(evaluation.alternative._id));
            const j = alternatives.findIndex(a => a._id.equals(evaluation.comparedAlternative._id));
            if (i !== -1 && j !== -1) {
              pairwiseMatrix[i][j] = evaluation.value;
            }
          }
        }

        matrices[expertName][criterion.name] = pairwiseMatrix;
      }));
    }));


    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000"; // Fallback a localhost si no está definida

    console.log("Matrices to send:", matrices);

    // Hacer la petición POST a la API con el objeto matrices
    const response = await axios.post(
      `${apimodelsUrl}/herrera_viedma_crp`,
      { matrices: matrices, consensusThreshold: issue.consensusThreshold },
      { headers: { "Content-Type": "application/json" } }
    );

    const { success, msg, results: { alternatives_rankings, cm, collective_evaluations, plots_graphic } } = response.data;

    if (!success) {
      return res.status(400).json({ success: false, msg });
    }

    // Asociar los correos electrónicos a los puntos de los expertos
    const expertPointsMap = {};
    participations.forEach((participation, index) => {
      const email = participation.expert.email;
      expertPointsMap[email] = plots_graphic.expert_points[index];
    });

    const plotsGraphicWithEmails = {
      expert_points: expertPointsMap,
      collective_point: plots_graphic.collective_point,
    };


    const rankedAlternatives = alternatives_rankings.map(index => alternatives[index].name);

    // Transformar collective_evaluations a formato legible con nombres de alternativas
    const transformedCollectiveEvaluations = {};

    criteria.forEach((criterion, critIdx) => {
      collective_evaluations
      const matrix = collective_evaluations[criterion.name]; // matriz del criterio
      if (!matrix) return;

      const transformedMatrix = matrix.map((row, rowIndex) => {
        const obj = { id: alternatives[rowIndex].name };
        row.forEach((value, colIndex) => {
          obj[alternatives[colIndex].name] = value;
        });
        return obj;
      });

      transformedCollectiveEvaluations[criterion.name] = transformedMatrix;
    });

    // Obtener el último consenso guardado para este issue
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });

    // Si hay consenso anterior, la siguiente fase es +1; si no, empezamos en 1
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    const consensus = new Consensus({
      issue: issue._id,
      phase: currentPhase,
      level: cm,
      timestamp: new Date(),
      collectiveEvaluations: transformedCollectiveEvaluations, // Ahora con nombres
      details: {
        rankedAlternatives,
        matrices,
        plotsGraphic: plotsGraphicWithEmails
      }
    });

    await consensus.save();

    await Promise.all(participations.map(async participation => {
      await Promise.all(criteria.map(async criterion => {
        const evaluations = await Evaluation.find({
          issue: issue._id,
          expert: participation.expert._id,
          criterion: criterion._id
        });

        for (const evaluation of evaluations) {
          if (evaluation.consensusPhase !== null) {
            // Solo guardamos si ya hay una fase previa (para no guardar si es la primera vez)
            evaluation.history.push({
              phase: evaluation.consensusPhase,
              value: evaluation.value,
              timestamp: evaluation.timestamp,
            });
          }

          // Actualizamos a la nueva fase (aunque después lo vuelvas a sobreescribir con los resultados)
          evaluation.consensusPhase = currentPhase + 1;
          evaluation.timestamp = new Date();

          await evaluation.save();
        }
      }));
    }));

    // Verificar si se llegó a la fase máxima
    if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {

      issue.active = false;
      await issue.save();

      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issueName}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives
      });

    }

    // Verificar si se alcanzó el umbral de consenso
    if (cm >= issue.consensusThreshold) {

      issue.active = false;
      await issue.save();

      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issueName}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives
      });
    }

    // Mensaje por defecto si no se alcanzó ni el umbral ni el número máximo
    await Participation.updateMany(
      { issue: issue._id },
      { $set: { evaluationCompleted: false } }
    );

    // Mensaje por defecto si no se alcanzó ni el umbral ni el número máximo
    return res.status(200).json({
      success: true,
      finished: false,
      msg: `Issue '${issueName}' conensus threshold not reached. Another round is needed.`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while resolving the issue" });
  }
};

export const getFinishedIssueInfo = async (req, res) => {
  const userId = req.uid;

  try {
    const { issueName } = req.body;

    // 1. Buscar el problema por nombre
    const issue = await Issue.findOne({ name: issueName });

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // 2. Verificar si el usuario es el administrador del Issue
    /* if (issue.admin.toString() !== userId) {]]
      return res.status(403).json({ success: false, msg: "You are not the admin of this issue" });
    } */

    const summary = await createSummarySection(issue._id);

    const alternativesRankings = await createAlternativesRankingsSection(issue._id)

    const expertsRatings = await createExpertsRatingsSection(issue._id)

    const analyticalGraphs = await createAnalyticalGraphsSection(issue._id)

    const issueInfo = {
      summary,
      alternativesRankings,
      expertsRatings,
      analyticalGraphs
    };

    res.json({ success: true, msg: "Issue info sent", issueInfo });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching full issue info" });
  }
};

export const removeFinishedIssue = async (req, res) => {
  const { issueName } = req.body;
  const userId = req.uid; // ID del usuario autenticado

  try {
    // Buscar el issue por nombre
    const issue = await Issue.findOne({ name: issueName });

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Verificar si está activo
    if (issue.active) {
      return res.status(400).json({ success: false, msg: "Issue is still active" });
    }

    // Buscar si ya existe un registro previo
    const previousExit = await ExitUserIssue.findOne({ issue: issue._id, user: userId });

    if (previousExit) {
      // Guardar evento anterior en history
      const past = {
        timestamp: previousExit.timestamp,
        phase: previousExit.phase,
        reason: previousExit.reason || null,
      };

      previousExit.history = previousExit.history ? [...previousExit.history, past] : [past];
      previousExit.timestamp = new Date();
      previousExit.phase = null;
      previousExit.reason = null;

      await previousExit.save();
    } else {
      // Crear nuevo registro de salida
      await ExitUserIssue.create({
        issue: issue._id,
        user: userId,
        timestamp: new Date(),
        phase: null,
        reason: "Issue finished and removed for user",
        hidden: true, // el usuario lo oculta
      });
    }

    return res.status(200).json({ success: true, msg: `Issue ${issue.name} removed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while removing the issue",
      error: err.message,
    });
  }
};

export const editExperts = async (req, res) => {
  const { issueName, expertsToAdd, expertsToRemove } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findOne({ name: issueName }).populate('model');
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (!issue.admin.equals(userId)) {
      return res.status(403).json({ success: false, msg: "Not authorized to edit this issue's experts." });
    }

    const [alternatives, criteria, latestConsensus] = await Promise.all([
      Alternative.find({ issue: issue._id }),
      Criterion.find({ issue: issue._id }),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 })
    ]);

    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;
    console.log("Current phase:", currentPhase);

    const expertMap = new Map();

    for (const email of expertsToAdd) {
      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      const existingParticipation = await Participation.findOne({ issue: issue._id, expert: expertUser._id });

      // Si no ha participado nunca, lo añadimos y creamos evaluaciones
      if (!existingParticipation) {
        const isAdmin = expertUser._id.equals(userId);

        await Participation.create({
          issue: issue._id,
          expert: expertUser._id,
          invitationStatus: isAdmin ? "accepted" : "pending",
          evaluationCompleted: false,
          entryPhase: currentPhase   // 👈 registrar la fase de entrada
        });

        expertMap.set(email, expertUser._id);

        // Solo se notifica si no es el propio admin
        if (!isAdmin) {
          const admin = await User.findById(userId);

          await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'You have been invited to an issue',
            html: `
              <html>
                <body>
                  <h2>You have been invited to the issue "${issue.name}"</h2>
                  <p>${admin.email} has invited you as an expert for the issue ${issue.name}. The issue description is:</p>
                  <p>${issue.description}</p>
                  <p>Accept the invitation to participate.</p>
                </body>
              </html>
            `
          });

          await Notification.create({
            expert: expertUser._id,
            issue: issue._id,
            type: "invitation",
            message: `You have been invited by ${admin.name} to participate in ${issue.name}.`,
            read: false,
            requiresAction: true
          });
        }

        // Solo crear evaluaciones si nunca ha tenido antes
        const hasEvaluations = await Evaluation.exists({
          issue: issue._id,
          expert: expertUser._id
        });

        if (!hasEvaluations) {
          const domainExpressions = {
            [email]: {}
          };

          for (const alt of alternatives) {
            domainExpressions[email][alt.name] = {};
            for (const crit of criteria) {
              domainExpressions[email][alt.name][crit.name] = {
                name: crit.name,
                data: "Numeric Float",
                children: false,
              };
            }
          }

          await createEvaluations(
            domainExpressions,
            expertMap,
            alternatives,
            criteria,
            issue._id,
            issue.model.isPairwise,
            currentPhase
          );
        }
      }
    }

    // Eliminar (expulsar) expertos
    for (const email of expertsToRemove) {
      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      const participation = await Participation.findOne({ issue: issue._id, expert: expertUser._id });

      if (participation) {
        await Participation.deleteOne({ _id: participation._id });

        // NO se eliminan las evaluaciones (mantener historial)
        const reason = "Expelled by admin";

        const exit = await ExitUserIssue.findOne({ issue: issue._id, user: expertUser._id });

        if (!exit) {
          await ExitUserIssue.create({
            issue: issue._id,
            user: expertUser._id,
            hidden: true,
            timestamp: new Date(),
            phase: currentPhase,
            reason,
            history: [{
              timestamp: new Date(),
              phase: currentPhase,
              reason
            }]
          });
        } else {
          exit.history.push({
            timestamp: new Date(),
            phase: currentPhase,
            reason
          });
          exit.phase = currentPhase;
          await exit.save();
        }
      }
    }

    return res.status(200).json({ success: true, msg: "Experts updated successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while editing experts.",
      error: err.message
    });
  }
};
