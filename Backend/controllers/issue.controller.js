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
import { validateFinalEvaluations, validateFinalPairwiseEvaluations } from '../utils/validateFinalEvaluations.js';
import axios from "axios"
import { createAlternativesRankingsSection, createAnalyticalGraphsSection, createExpertsPairwiseRatingsSection, createExpertsRatingsSection, createSummarySection } from '../utils/finishedIssueInfoUtils.js';
import mongoose from 'mongoose';
import { sendExpertInvitationEmail } from '../utils/sendEmails.js';
import dayjs from 'dayjs';
import { normalizeParams } from '../utils/normalizeParams.js';

// Crea una instancia de Resend con la clave API.
const resend = new Resend(process.env.APIKEY_RESEND)

// Controlador para obtener información de los modelos.
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

// Controlador para obtener todos los usuarios con cuenta confirmada.
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

// Controlador para crear un nuevo problema (issue) usando transacción.
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
      withConsensus,
      criteria,
      addedExperts,
      domainExpressions,
      closureDate,
      consensusMaxPhases,
      consensusThreshold,
      paramValues
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
    const model = await IssueModel.findOne({ name: selectedModel.name }).session(session);
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
    if (addedExperts.length <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, obj: "addedExperts", msg: "Must be at least two experts" });
    }

    const issue = new Issue({
      admin: req.uid,
      model: model._id,
      isConsensus: withConsensus,
      name: issueName,
      description: issueDescription,
      active: true,
      creationDate: dayjs().format("DD-MM-YYYY"),
      closureDate: closureDate ? dayjs(closureDate).format("DD-MM-YYYY") : null,
      ...(model.isConsensus && {
        consensusMaxPhases,
        consensusThreshold,
      }),
      modelParameters: paramValues
    });

    // Guardar el problema en la base de datos con sesión
    await issue.save({ session });

    console.log(issue)

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

// Devuelve todos los problemas activos para el usuario actual
export const getAllActiveIssues = async (req, res) => {
  try {
    // Obtener el ID del usuario a partir del token (añadido previamente en middleware)
    const userId = req.uid;

    // Obtener todos los IDs de problemas activos en los que participa el usuario (como admin o experto)
    const issueIds = await getUserActiveIssueIds(userId);

    // Si el usuario no participa en ningún problema activo, devolver una lista vacía
    if (issueIds.length === 0) {
      return res.json({ success: true, issues: [] });
    }

    // Buscar todos los problemas activos por ID y poblar los campos necesarios (modelo y admin)
    const issues = await Issue.find({ _id: { $in: issueIds } })
      .populate("model", "name isConsensus isPairwise") // Poblar solo los campos relevantes del modelo
      .populate("admin", "email") // Poblar solo el email del admin
      .lean(); // Convertir documentos a objetos JS "planos"

    // Obtener todas las participaciones de expertos relacionadas con esos problemas
    const allParticipations = await Participation.find({ issue: { $in: issueIds } })
      .populate("expert", "email") // Poblar solo el email del experto
      .lean();

    // Obtener todas las alternativas asociadas a los problemas
    const alternatives = await Alternative.find({ issue: { $in: issueIds } }).lean();

    // Obtener todos los criterios asociados a los problemas
    const criteria = await Criterion.find({ issue: { $in: issueIds } }).lean();

    // Obtener las fases de consenso de los problemas (solo campos issue y phase)
    const consensusPhases = await Consensus.find({ issue: { $in: issueIds } }, "issue phase").lean();

    // Crear un mapa con el número de fases de consenso por problema (issueId -> count)
    const consensusPhaseCountMap = consensusPhases.reduce((acc, curr) => {
      const issueId = curr.issue.toString();
      acc[issueId] = acc[issueId] ? acc[issueId] + 1 : 1;
      return acc;
    }, {});

    // Formatear los datos de cada problema para enviarlos al frontend
    const formattedIssues = issues.map((issue) => {
      // Clasificar las participaciones por tipo (participaron, pendientes, etc.)
      const {
        participatedExperts,
        pendingExperts,
        notAcceptedExperts,
        acceptedButNotEvaluated,
        isExpert
      } = categorizeParticipations(
        allParticipations.filter((part) => part.issue._id.equals(issue._id)),
        userId
      );

      console.log(issue)

      // Devolver un objeto con todos los datos necesarios del problema
      return {
        name: issue.name, // Nombre del problema
        creator: issue.admin.email, // Email del administrador
        description: issue.description, // Descripción del problema
        model: issue.model.name, // Nombre del modelo asociado
        isPairwise: issue.model.isPairwise, // Si se usan evaluaciones pareadas
        isConsensus: issue.isConsensus, // Si tiene fases de consenso

        // Si es de consenso, incluir información adicional
        ...(issue.model.isConsensus && {
          consensusMaxPhases: issue.consensusMaxPhases || "Unlimited", // Máx. fases permitidas
          consensusThreshold: issue.consensusThreshold, // Umbral de consenso
          consensusCurrentPhase: consensusPhaseCountMap[issue._id.toString()] + 1 || 1, // Fase actual (la siguiente a la última registrada)
        }),

        creationDate: issue.creationDate || null,
        closureDate: issue.closureDate || null,

        isAdmin: issue.admin._id.toString() === userId, // Si el usuario actual es admin
        isExpert, // Si el usuario actual es experto en este problema

        // Listado de alternativas del problema (ordenadas alfabéticamente)
        alternatives: alternatives
          .filter((alt) => alt.issue.toString() === issue._id.toString())
          .map((alt) => alt.name)
          .sort(),

        // Criterios del problema estructurados en árbol
        criteria: buildCriterionTree(criteria, issue._id),

        // Si el usuario ha evaluado (aparece como experto que ya completó la evaluación)
        evaluated: participatedExperts.map((part) => part.expert._id.toString()).includes(userId),

        // Número total de expertos (participaron, pendientes, rechazaron, aceptaron pero no evaluaron)
        totalExperts: participatedExperts.length + pendingExperts.length + notAcceptedExperts.length + acceptedButNotEvaluated.length,

        // Listado de expertos por categoría (ordenados por email)
        participatedExperts: participatedExperts.map((part) => part.expert.email).sort(),
        pendingExperts: pendingExperts.map((part) => part.expert.email).sort(),
        notAcceptedExperts: notAcceptedExperts.map((part) => part.expert.email).sort(),
        acceptedButNotEvaluatedExperts: acceptedButNotEvaluated.map((part) => part.expert.email).sort(),
      };
    });

    // Devolver la respuesta con los problemas formateados
    res.json({ success: true, issues: formattedIssues });

  } catch (error) {
    // Capturar errores y devolver una respuesta con status 500
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching active issues" });
  }
};

export const removeIssue = async (req, res) => {
  const { issueName } = req.body;
  const userId = req.uid; // ID del usuario autenticado extraído del token

  // Iniciar una sesión de Mongoose para la transacción
  const session = await mongoose.startSession();

  try {
    // Iniciar transacción
    session.startTransaction();

    // Buscar el Issue por nombre
    const issue = await Issue.findOne({ name: issueName }).session(session);

    // Comprobar si el Issue existe
    if (!issue) {
      await session.abortTransaction(); // Cancelar la transacción si no existe
      session.endSession();
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Comprobar si el usuario autenticado es el admin del Issue
    if (issue.admin.toString() !== userId) {
      await session.abortTransaction(); // Cancelar si no es admin
      session.endSession();
      return res.status(403).json({ success: false, msg: "You are not the admin of this issue" });
    }

    // Comprobar si el Issue está activo
    if (!issue.active) {
      await session.abortTransaction(); // Cancelar si no está activo
      session.endSession();
      return res.status(400).json({ success: false, msg: "Issue is not active and cannot be deleted" });
    }

    // Eliminar todas las evaluaciones relacionadas con este Issue
    await Evaluation.deleteMany({ issue: issue._id }).session(session);

    // Eliminar todas las alternativas relacionadas
    await Alternative.deleteMany({ issue: issue._id }).session(session);

    // Eliminar todos los criterios relacionados
    await Criterion.deleteMany({ issue: issue._id }).session(session);

    // Eliminar todas las participaciones relacionadas
    await Participation.deleteMany({ issue: issue._id }).session(session);

    // Eliminar todos los registros de consenso relacionados
    await Consensus.deleteMany({ issue: issue._id }).session(session);

    // Eliminar todas las notificaciones relacionadas
    await Notification.deleteMany({ issue: issue._id }).session(session);

    // Finalmente eliminar el propio Issue
    await Issue.deleteOne({ _id: issue._id }).session(session);

    // Confirmar la transacción
    await session.commitTransaction();
    session.endSession();

    // Devolver respuesta exitosa
    return res.status(200).json({ success: true, msg: `Issue ${issue.name} removed` });

  } catch (err) {
    // Si ocurre cualquier error, hacer rollback de los cambios
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while deleting the issue", error: err.message });
  }
};

// Controlador para obtener todos los issues finalizados en los que participa el usuario autenticado
export const getAllFinishedIssues = async (req, res) => {
  try {
    const userId = req.uid; // Obtener el ID del usuario autenticado desde el token (middleware)

    // Obtener los IDs de los issues finalizados donde participa el usuario
    const issueIds = await getUserFinishedIssueIds(userId);

    // Si el usuario no participa en ningún issue finalizado, devolver una lista vacía
    if (issueIds.length === 0) {
      return res.json({ success: true, issues: [] });
    }

    // Buscar en la base de datos todos los issues correspondientes a los IDs obtenidos
    const issues = await Issue.find({ _id: { $in: issueIds } })
      .populate("model", "name") // Obtener información del modelo (solo nombre y si usa consenso)
      .populate("admin", "email")            // Obtener información del administrador (solo email)
      .lean();                               // Convertir documentos Mongoose a objetos JS planos para mejor rendimiento

    // Formatear los issues para enviar solo la información necesaria al frontend
    const formattedIssues = issues.map((issue) => ({
      name: issue.name, // Nombre del issue
      description: issue.description, // Descripción del issue
      creationDate: issue.creationDate, // Formatear fecha de creación (solo YYYY-MM-DD)
      closureDate: issue.closureDate ?? null, // Fecha de cierre si existe
      isAdmin: issue.admin._id.toString() === userId, // Indicar si el usuario autenticado es el admin del issue
    }));

    // Devolver los issues formateados
    res.json({ success: true, issues: formattedIssues });

  } catch (error) {
    // Capturar y mostrar errores inesperados
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching finished issues" });
  }
};

export const getNotifications = async (req, res) => {
  // Obtenemos el ID del usuario autenticado desde el token
  const userId = req.uid;

  try {
    // Obtenemos todas las notificaciones del usuario ordenadas por fecha de creación descendente
    // También populamos el email del experto y el nombre del problema asociado
    const notifications = await Notification.find({ expert: userId })
      .sort({ createdAt: -1 })
      .populate("expert", "email")
      .populate("issue", "name");

    // Obtenemos las participaciones del usuario como experto
    const participations = await Participation.find({ expert: userId });

    // Transformamos las notificaciones para incluir el estado de respuesta del experto
    const formattedNotifications = notifications.map((notification) => {
      // Buscamos la participación del experto para el problema relacionado con esta notificación
      const participation = participations.find(p =>
        p.issue.toString() === notification.issue._id.toString()
      );

      // Inicializamos el estado de respuesta
      let responseStatus = false;

      // Si existe participación, comprobamos el estado de la invitación
      if (participation) {
        if (participation.invitationStatus === "accepted") {
          responseStatus = "Invitation accepted";
        } else if (participation.invitationStatus === "declined") {
          responseStatus = "Invitation declined";
        }
      }

      // Devolvemos la notificación formateada con todos los campos necesarios
      return {
        _id: notification._id,
        header: notification.type === "invitation" ? "Invitation" : notification.issue.name,
        message: notification.message,
        userEmail: notification.expert ? notification.expert.email : "Usuario eliminado",
        issueName: notification.issue ? notification.issue.name : "Problema eliminado",
        requiresAction: notification.requiresAction,
        read: notification.read ?? false,
        createdAt: notification.createdAt,
        responseStatus: responseStatus,
      };
    });

    // Respondemos con la lista de notificaciones ya formateadas
    return res.status(200).json({
      success: true,
      notifications: formattedNotifications
    });

  } catch (err) {
    // En caso de error, devolvemos un estado 500 con mensaje de error
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while getting notifications"
    });
  }
};

// Marcar todas las notificaciones como leídas para el usuario autenticado
export const markAllNotificationsAsRead = async (req, res) => {
  const userId = req.uid;

  try {
    // Actualizar todas las notificaciones no leídas del usuario como leídas
    await Notification.updateMany(
      { expert: userId, read: false },
      { read: true }
    );

    return res.status(200).json({
      success: true,
      msg: "Notifications marked as read",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating notifications",
    });
  }
};

// Cambiar el estado de la invitación del usuario para un problema específico
export const changeInvitationStatus = async (req, res) => {
  const userId = req.uid;
  const { issueName, action } = req.body;

  const session = await mongoose.startSession();

  try {
    // Iniciar la transacción
    session.startTransaction();

    // Buscar el problema por su nombre
    const issue = await Issue.findOne({ name: issueName }).session(session);

    if (!issue) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    // Buscar la participación del usuario en ese problema
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
    }).session(session);

    if (!participation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        msg: "No participation found for the user in this issue",
      });
    }

    // Actualizar el estado de la invitación
    participation.invitationStatus = action;

    // Si acepta la invitación, dejar la evaluación como no completada
    if (action === "accepted") {
      participation.evaluationCompleted = false;
    }

    // Guardar los cambios en la participación
    await participation.save({ session });

    // Confirmar la transacción
    await session.commitTransaction();
    session.endSession();

    // Preparar el mensaje de respuesta
    const message =
      action === "accepted"
        ? `Invitation to issue ${issueName} accepted`
        : `Invitation to issue ${issueName} declined`;

    return res.status(200).json({
      success: true,
      msg: message,
    });
  } catch (err) {
    // Cancelar la transacción en caso de error
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating invitation status",
    });
  }
};

// Controlador para eliminar una notificación específica de un usuario
export const removeNotificationById = async (req, res) => {
  // Obtener el ID del usuario autenticado desde el token (middleware)
  const userId = req.uid;

  // Obtener el ID de la notificación a eliminar desde el cuerpo de la petición
  const { notificationId } = req.body;

  try {
    // Buscar la notificación por ID y asegurarse de que pertenece al usuario autenticado
    const notification = await Notification.findOne({ _id: notificationId, expert: userId });

    // Si no se encuentra la notificación o no pertenece al usuario, devolver 404
    if (!notification) {
      return res.status(404).json({ success: false, msg: "Notification not found" });
    }

    // Eliminar la notificación de la base de datos
    await Notification.deleteOne({ _id: notificationId });

    // Responder con éxito si se ha eliminado correctamente
    return res.status(200).json({ success: true, msg: "Message removed" });

  } catch (err) {
    // En caso de error inesperado, registrar el error y devolver un error 500
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while removing notification" });
  }
};

export const savePairwiseEvaluations = async (req, res) => {
  // Obtenemos el ID del usuario autenticado a partir del token
  const userId = req.uid;

  try {
    // Extraemos del body el nombre del problema y las evaluaciones enviadas
    const { issueName, evaluations } = req.body;

    // Buscamos el Issue en la base de datos por su nombre
    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      // Si no se encuentra el Issue, devolvemos 404 si hay res, o un objeto si es llamada interna
      if (res) {
        return res.status(404).json({ success: false, msg: "Issue not found" });
      } else {
        return { success: false, msg: "Issue not found" }
      }
    }

    // Verificamos que el usuario tiene participación activa como experto en este Issue
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted" // Solo participantes aceptados
    });

    if (!participation) {
      // Si no tiene participación activa, se bloquea el guardado de evaluaciones
      return res.status(403).json({ success: false, msg: "You are no longer a participant in this issue" });
    }

    // Obtenemos todas las alternativas del problema y creamos un mapa para acceder por nombre
    const alternatives = await Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean();
    const alternativeMap = new Map(alternatives.map((alt) => [alt.name, alt._id]));

    // Obtenemos todos los criterios del problema y creamos un mapa por nombre
    const criteria = await Criterion.find({ issue: issue._id }).lean();
    const criterionMap = new Map(criteria.map((crit) => [crit.name, crit._id]));

    // Inicializamos array para operaciones bulkWrite
    const bulkOperations = [];

    // Obtenemos la última fase de consenso registrada, si existe
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1; // Si no hay, fase = 1

    // Iteramos sobre cada criterio en las evaluaciones enviadas
    for (const [criterionName, evaluationsByExpert] of Object.entries(evaluations)) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue; // Si el criterio no existe en DB, ignoramos

      // Iteramos sobre las evaluaciones de cada alternativa para ese criterio
      for (const evaluationData of evaluationsByExpert) {
        const { id: alternativeName, ...comparisons } = evaluationData; // extraemos nombre de alternativa
        const alternativeId = alternativeMap.get(alternativeName);
        if (!alternativeId) continue; // Ignorar si la alternativa no existe en DB

        // Iteramos sobre cada comparación (otra alternativa) para este par
        for (const [comparedAlternativeName, value] of Object.entries(comparisons)) {
          if (comparedAlternativeName === alternativeName) continue; // Saltamos diagonal

          const comparedAlternativeId = alternativeMap.get(comparedAlternativeName);
          if (!comparedAlternativeId) continue; // Ignorar si la alternativa comparada no existe

          // Preparamos operación de actualización/upsert para MongoDB
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
                  value, // Valor de la evaluación
                  timestamp: new Date(), // Fecha actual
                  issue: issue._id, // Referencia al Issue
                  consensusPhase: currentPhase, // Fase de consenso actual
                },
              },
              upsert: true, // Insertar si no existe
            },
          });
        }
      }
    }

    // Si hay operaciones pendientes, ejecutamos bulkWrite
    if (bulkOperations.length > 0) {
      await Evaluation.bulkWrite(bulkOperations);
    }

    // Devolvemos respuesta exitosa
    if (res) {
      return res.status(200).json({ success: true, msg: "Evaluations saved successfully" });
    }
    return { success: true, msg: "Evaluations saved successfully" };

  } catch (err) {
    // Capturamos errores y devolvemos error 500
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while saving evaluations" });
  }
};

export const getPairwiseEvaluations = async (req, res) => {
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
export const sendPairwiseEvaluations = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    const { issueName, evaluations } = req.body;

    // Primero validamos las evaluaciones antes de guardarlas
    const validation = validateFinalPairwiseEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({ success: false, criterion: validation.error.criterion, msg: validation.error.message }); // Cambié error.message por message
    }

    // Llamamos al método savePairwiseEvaluations para guardar las valoraciones
    const saveResult = await savePairwiseEvaluations(req);
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
export const resolvePairwiseIssue = async (req, res) => {
  const userId = req.uid; // ID del usuario autenticado

  try {
    const { issueName, forceFinalize = false } = req.body;

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
    const alternatives = await Alternative.find({ issue: issue._id }).sort({ name: 1 });

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

    console.log("Matrices to send:", matrices);

    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000"; // Fallback a localhost si no está definida    

    const normalizedParams = normalizeParams(issue.modelParameters);

    // Hacer la petición POST a la API con el objeto matrices
    const response = await axios.post(
      `${apimodelsUrl}/herrera_viedma_crp`,
      { matrices: matrices, consensusThreshold: issue.consensusThreshold, modelParameters: normalizedParams },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Response from API:", response.data);

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
          console.log(evaluation)
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

    if (issue.isConsensus && forceFinalize) {
      // Si es de consenso y se está cerrando por fecha, se finaliza directamente
      issue.active = false;
      await issue.save();
      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issueName}' resolved as final round due to closure date.`,
        rankedAlternatives
      });
    }

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

export const removeFinishedIssue = async (req, res) => {
  const { issueName } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findOne({ name: issueName });

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (issue.active) {
      return res.status(400).json({ success: false, msg: "Issue is still active" });
    }

    // Buscar si ya existe un registro de salida para este usuario
    let previousExit = await ExitUserIssue.findOne({ issue: issue._id, user: userId });

    if (previousExit) {
      const past = {
        timestamp: previousExit.timestamp,
        phase: previousExit.phase,
        reason: previousExit.reason || null,
      };

      previousExit.history = previousExit.history ? [...previousExit.history, past] : [past];
      previousExit.timestamp = new Date();
      previousExit.phase = null;
      previousExit.reason = "Issue finished and removed for user";
      previousExit.hidden = true;

      await previousExit.save();
    } else {
      await ExitUserIssue.create({
        issue: issue._id,
        user: userId,
        timestamp: new Date(),
        phase: null,
        reason: "Issue finished and removed for user",
        hidden: true,
      });
    }

    // === Nueva parte: comprobar si todos los usuarios ya lo ocultaron ===
    const participants = await Participation.find({ issue: issue._id });
    const exits = await ExitUserIssue.find({ issue: issue._id, hidden: true });

    const allUsersHaveHidden = participants.every(p =>
      exits.some(e => e.user.toString() === p.expert.toString())
    );

    if (allUsersHaveHidden) {
      // eliminar definitivamente el issue y sus datos
      await Evaluation.deleteMany({ issue: issue._id });
      await Alternative.deleteMany({ issue: issue._id });
      await Criterion.deleteMany({ issue: issue._id });
      await Participation.deleteMany({ issue: issue._id });
      await Consensus.deleteMany({ issue: issue._id });
      await Notification.deleteMany({ issue: issue._id });
      await ExitUserIssue.deleteMany({ issue: issue._id });
      await Issue.deleteOne({ _id: issue._id });
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

// Exporta la función editExperts como un controlador asincrónico
export const editExperts = async (req, res) => {
  // Extrae los datos del cuerpo de la petición
  const { issueName, expertsToAdd, expertsToRemove } = req.body;
  // Obtiene el ID del usuario autenticado (admin)
  const userId = req.uid;

  try {
    // Busca el issue por nombre y trae también el modelo asociado
    const issue = await Issue.findOne({ name: issueName }).populate('model');
    // Si no existe el issue, devuelve error 404
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Verifica que el usuario autenticado es el admin del issue
    if (!issue.admin.equals(userId)) {
      return res.status(403).json({ success: false, msg: "Not authorized to edit this issue's experts." });
    }

    // Carga en paralelo las alternativas, criterios y último consenso del issue
    const [alternatives, criteria, latestConsensus] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }),
      Criterion.find({ issue: issue._id }),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }) // el último por fase
    ]);

    // Calcula la fase actual (si hay consenso previo, la siguiente; si no, fase 1)
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;
    console.log("Current phase:", currentPhase);

    // Mapa para vincular emails con IDs de usuarios expertos
    const expertMap = new Map();

    // Recorre los expertos que se quieren añadir
    for (const email of expertsToAdd) {
      // Busca al usuario por email
      const expertUser = await User.findOne({ email });
      if (!expertUser) continue; // si no existe, salta

      // Comprueba si ya participaba en este issue
      const existingParticipation = await Participation.findOne({ issue: issue._id, expert: expertUser._id });

      // Si nunca participó, se crea su participación y evaluaciones
      if (!existingParticipation) {
        // Comprueba si es el propio admin
        const isAdmin = expertUser._id.equals(userId);

        // Crea la participación del experto en el issue
        await Participation.create({
          issue: issue._id,
          expert: expertUser._id,
          invitationStatus: isAdmin ? "accepted" : "pending", // admin aceptado automáticamente
          evaluationCompleted: false,
          entryPhase: currentPhase   // guarda la fase en la que entra
        });

        // Añade al mapa de expertos
        expertMap.set(email, expertUser._id);

        // Si no es el admin, se envía invitación y notificación
        if (!isAdmin) {
          // Busca los datos del admin que invita
          const admin = await User.findById(userId);

          // Envía email de invitación
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

          // Crea una notificación interna en el sistema
          await Notification.create({
            expert: expertUser._id,
            issue: issue._id,
            type: "invitation",
            message: `You have been invited by ${admin.name} to participate in ${issue.name}.`,
            read: false,
            requiresAction: true
          });
        }

        // Comprueba si ya tenía evaluaciones previas
        const hasEvaluations = await Evaluation.exists({
          issue: issue._id,
          expert: expertUser._id
        });

        // Si nunca tuvo, se crean evaluaciones nuevas
        if (!hasEvaluations) {
          // Se define un objeto de dominios de expresión por cada alternativa y criterio
          const domainExpressions = {
            [email]: {}
          };

          // Recorre alternativas y criterios para crear estructura de evaluaciones
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

          // Llama a la función que genera las evaluaciones
          await createEvaluations(
            domainExpressions,
            expertMap,
            alternatives,
            criteria,
            issue._id,
            issue.model.isPairwise, // indica si el modelo es por comparaciones pareadas
            currentPhase
          );
        }
      }
    }

    // Recorre los expertos que se quieren eliminar (expulsar)
    for (const email of expertsToRemove) {
      // Busca al usuario por email
      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      // Busca su participación en el issue
      const participation = await Participation.findOne({ issue: issue._id, expert: expertUser._id });

      // Si participaba, se elimina su participación
      if (participation) {
        await Participation.deleteOne({ _id: participation._id });

        // Las evaluaciones no se eliminan (se mantiene el historial)
        const reason = "Expelled by admin";

        // Busca si ya hay un registro de salida del usuario en el issue
        const exit = await ExitUserIssue.findOne({ issue: issue._id, user: expertUser._id });

        // Si no hay, crea uno nuevo con historial
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
          // Si ya existe, se actualiza añadiendo nueva entrada en el historial
          exit.history.push({
            timestamp: new Date(),
            phase: currentPhase,
            reason
          });
          exit.phase = currentPhase; // se actualiza la fase de salida
          await exit.save();
        }
      }
    }

    // Respuesta exitosa
    return res.status(200).json({ success: true, msg: "Experts updated successfully." });
  } catch (err) {
    // Manejo de errores en caso de fallo
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while editing experts.",
      error: err.message
    });
  }
};

export const leaveIssue = async (req, res) => {
  const { issueName } = req.body;   // nombre del issue
  const userId = req.uid;           // ID del usuario que quiere salir

  try {
    // Buscar el issue
    const issue = await Issue.findOne({ name: issueName });
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Un admin no puede salirse de su propio issue
    if (issue.admin.equals(userId)) {
      return res.status(403).json({ success: false, msg: "An admin can not leave an issue" });
    }

    // Buscar la participación del usuario en el issue
    const participation = await Participation.findOne({ issue: issue._id, expert: userId });
    if (!participation) {
      return res.status(400).json({ success: false, msg: "You are not a participant of this issue" });
    }

    // Eliminar la participación activa (ya no aparece como miembro)
    await Participation.deleteOne({ _id: participation._id });

    // No se borran evaluaciones -> mantienen historial
    const reason = "Left by user";

    // Calcular fase actual (si hay consenso previo, fase+1, si no, fase 1)
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    // Revisar si ya existe un registro de salidas del usuario
    const exit = await ExitUserIssue.findOne({ issue: issue._id, user: userId });

    if (!exit) {
      // Si no existe, crear un nuevo documento de salida
      await ExitUserIssue.create({
        issue: issue._id,
        user: userId,
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
      // Si ya existe, añadir un nuevo registro al historial
      exit.history.push({
        timestamp: new Date(),
        phase: currentPhase,
        reason
      });
      exit.phase = currentPhase;
      await exit.save();
    }

    return res.status(200).json({ success: true, msg: "You have left the issue successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while leaving issue",
      error: err.message
    });
  }
};

// Función interna que resuelve un issue usando su _id
export const resolveIssueLogic = async (issueId, { forceFinalize = false } = {}) => {
  const issue = await Issue.findById(issueId);
  if (!issue) return;

  await resolvePairwiseIssue({
    uid: issue.admin,
    body: { issueName: issue.name, forceFinalize }
  }, {
    status: () => ({ json: (obj) => console.log(obj) }),
    json: (obj) => console.log(obj)
  });
};

// Función interna que elimina un issue usando su _id
export const removeIssueLogic = async (issueId) => {
  const issue = await Issue.findById(issueId);
  if (!issue) return;

  await removeIssue({
    uid: issue.admin,
    body: { issueName: issue.name }
  }, {
    status: () => ({ json: (obj) => console.log(obj) }),
    json: (obj) => console.log(obj)
  });
};

// Función para guardar evaluaciones de tipo AxC (Alternativa x Criterio)
export const saveEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { issueName, evaluations } = req.body;

    // Buscar el Issue
    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      if (res) {
        return res.status(404).json({ success: false, msg: "Issue not found" });
      } else {
        return { success: false, msg: "Issue not found" };
      }
    }

    // Verificar participación del experto
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted"
    });

    if (!participation) {
      return res
        ? res.status(403).json({ success: false, msg: "You are no longer a participant in this issue" })
        : { success: false, msg: "You are no longer a participant in this issue" };
    }

    // Mapas de alternativas y criterios
    const alternatives = await Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean();
    const alternativeMap = new Map(alternatives.map((alt) => [alt.name, alt._id]));

    const criteria = await Criterion.find({ issue: issue._id }).lean();
    const criterionMap = new Map(criteria.map((crit) => [crit.name, crit._id]));

    // Preparar operaciones bulkWrite
    const bulkOperations = [];

    // Última fase de consenso (si aplica)
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    // Iterar sobre alternativas
    for (const [alternativeName, criterionEvaluations] of Object.entries(evaluations)) {
      const alternativeId = alternativeMap.get(alternativeName);
      if (!alternativeId) continue;

      // Iterar sobre criterios de esa alternativa
      for (const [criterionName, value] of Object.entries(criterionEvaluations)) {
        const criterionId = criterionMap.get(criterionName);
        if (!criterionId) continue;

        bulkOperations.push({
          updateOne: {
            filter: {
              expert: userId,
              alternative: alternativeId,
              criterion: criterionId,
              comparedAlternative: null, // en AxC siempre null
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

    if (bulkOperations.length > 0) {
      await Evaluation.bulkWrite(bulkOperations);
    }

    if (res) {
      return res.status(200).json({ success: true, msg: "Evaluations saved successfully" });
    }
    return { success: true, msg: "Evaluations saved successfully" };
  } catch (err) {
    console.error(err);
    return res
      ? res.status(500).json({ success: false, msg: "An error occurred while saving evaluations" })
      : { success: false, msg: "An error occurred while saving evaluations" };
  }
};

export const getEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { issueName } = req.body;

    // Buscar el issue
    const issue = await Issue.findOne({ name: issueName });
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Buscar todas las evaluaciones de este usuario para este issue
    const evaluations = await Evaluation.find({
      issue: issue._id,
      expert: userId,
      comparedAlternative: null, // solo evaluaciones AxC
      $and: [
        { value: { $ne: "" } },
        { value: { $ne: null } }
      ]
    })
      .populate("alternative")
      .populate("criterion");

    // Transformar a formato { altName: { critName: value } }
    const evaluationsByAlternative = {};

    evaluations.forEach((evaluation) => {
      const { alternative, criterion, value } = evaluation;
      if (!alternative || !criterion) return;

      const alternativeName = alternative.name;
      const criterionName = criterion.name;

      if (!evaluationsByAlternative[alternativeName]) {
        evaluationsByAlternative[alternativeName] = {};
      }
      evaluationsByAlternative[alternativeName][criterionName] = value;
    });

    // Último consenso
    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });

    return res.status(200).json({
      success: true,
      evaluations: evaluationsByAlternative,
      collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while fetching evaluations" });
  }
};

export const sendEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { issueName, evaluations } = req.body;

    // Validar las evaluaciones
    const validation = validateFinalEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        alternative: validation.error.alternative,
        criterion: validation.error.criterion,
        msg: validation.error.message,
      });
    }

    // Guardar evaluaciones en BD
    const saveResult = await saveEvaluations(req); // -> este lo adaptamos abajo
    if (!saveResult.success) {
      return res.status(500).json({ success: false, msg: saveResult.msg });
    }

    // Obtener issueId
    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // Marcar participación como completada
    const participation = await Participation.findOneAndUpdate(
      { issue: issue._id, expert: userId },
      { $set: { evaluationCompleted: true } },
      { new: true }
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
    const { issueName, forceFinalize = false } = req.body;

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
    const alternatives = await Alternative.find({ issue: issue._id }).sort({ name: 1 });

    const criteria = await Criterion.find({ issue: issue._id, isLeaf: true }).sort({ name: 1 }); // Solo criterios hoja

    const criterionTypes = criteria.map(c => c.type === "benefit" ? "max" : "min");

    const participations = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted"
    }).populate("expert");

    const matrices = {};

    // Para cada experto
    await Promise.all(participations.map(async participation => {
      const expertName = participation.expert.email;

      // Inicializamos la matriz completa Alternativas x Criterios
      const matrixForExpert = [];

      // Iteramos sobre alternativas (filas)
      for (const alt of alternatives) {
        const rowValues = [];

        // Iteramos sobre criterios (columnas)
        for (const criterion of criteria) {
          // Buscamos la evaluación del experto para esta alternativa y criterio
          const evaluation = await Evaluation.findOne({
            issue: issue._id,
            expert: participation.expert._id,
            criterion: criterion._id,
            alternative: alt._id
          });

          // Si no hay valor, usamos 0 (o puedes usar null si prefieres)
          rowValues.push(evaluation?.value ?? null);
        }

        matrixForExpert.push(rowValues);
      }

      matrices[expertName] = matrixForExpert;
    }));

    const normalizedModelParams = normalizeParams(issue.modelParameters);


    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000"; // Fallback a localhost si no está definida

    // Hacer la petición POST a la API con el objeto matrices
    const response = await axios.post(
      `${apimodelsUrl}/topsis`,
      { matrices: matrices, modelParameters: normalizedModelParams, criterionTypes: criterionTypes },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Response from API:", response.data);

    // Después de recibir la respuesta del modelo
    const { success, msg, results } = response.data;
    if (!success) {
      return res.status(400).json({ success: false, msg });
    }

    // Mapear índices a nombres
    const altNames = alternatives.map((a) => a.name);

    // 1. Ranking colectivo → con nombres
    const rankedAlternatives = results.collective_ranking.map((idx) => altNames[idx]);

    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    // 2. Scores colectivos → objeto { alternativa: score }
    const collectiveScoresByName = {};
    results.collective_scores.forEach((score, idx) => {
      collectiveScoresByName[altNames[idx]] = score;
    });

    // 3. Ranking y scores de expertos → con nombres
    const expertScoresByName = {};
    const expertRankingsByName = {};
    Object.keys(results.expert_scores).forEach((expert) => {
      expertScoresByName[expert] = {};
      results.expert_scores[expert].forEach((score, idx) => {
        expertScoresByName[expert][altNames[idx]] = score;
      });

      expertRankingsByName[expert] = results.expert_rankings[expert].map((idx) => altNames[idx]);
    });

    // 4. Dispersion también con nombres
    const dispersionByName = {};
    Object.keys(results.dispersion).forEach((expert) => {
      dispersionByName[expert] = {};
      results.dispersion[expert].forEach((val, idx) => {
        dispersionByName[expert][altNames[idx]] = val;
      });
    });

    // 5. Heatmap: sustituimos cada fila por objeto { alternativa: valor }
    const heatmapDataByName = {};
    Object.keys(results.heatmap_data).forEach((rowIdx) => {
      const expertRow = results.heatmap_data[rowIdx];
      heatmapDataByName[rowIdx] = {};
      expertRow.forEach((val, idx) => {
        heatmapDataByName[rowIdx][altNames[idx]] = val;
      });
    });

    // Guardar en Consensus
    const consensus = new Consensus({
      issue: issue._id,
      phase: currentPhase,
      level: issue.isConsensus ? (results.cm ?? 0) : null,
      timestamp: new Date(),
      details: {
        rankedAlternatives,
        matrices,
        expert_scores: expertScoresByName,
        expert_rankings: expertRankingsByName,
        expert_mean: results.expert_mean,
        expert_std: results.expert_std,
        collective_scores: collectiveScoresByName,
        collective_ranking: rankedAlternatives,
        dispersion: dispersionByName,
        heatmap_data: heatmapDataByName,
      },
    });

    await consensus.save();


    // --- Lógica de cierre ---
    if (issue.isConsensus) {
      if (forceFinalize) {
        issue.active = false;
        await issue.save();
        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issueName}' resolved as final round due to closure date.`,
          rankedAlternatives,
        });
      }

      if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
        issue.active = false;
        await issue.save();
        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issueName}' resolved: maximum number of consensus rounds reached.`,
          rankedAlternatives,
        });
      }

      if (results.cm && results.cm >= issue.consensusThreshold) {
        issue.active = false;
        await issue.save();
        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issueName}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
          rankedAlternatives,
        });
      }

      // Si no se alcanzó el umbral → otra ronda
      await Participation.updateMany(
        { issue: issue._id },
        { $set: { evaluationCompleted: false } }
      );

      return res.status(200).json({
        success: true,
        finished: false,
        msg: `Issue '${issueName}' consensus threshold not reached. Another round is needed.`,
      });
    }
    // --- Si NO es de consenso, finalizamos directamente ---
    issue.active = false;
    await issue.save();
    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Issue '${issueName}' resolved.`,
      rankedAlternatives,
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
    const issue = await Issue.findOne({ name: issueName }).populate('model');

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    const summary = await createSummarySection(issue._id);

    const alternativesRankings = await createAlternativesRankingsSection(issue._id)

    const expertsRatings = issue.model.isPairwise ? await createExpertsPairwiseRatingsSection(issue._id) : await createExpertsRatingsSection(issue._id)

    const analyticalGraphs = issue.model.isPairwise ? await createAnalyticalGraphsSection(issue._id) : null

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