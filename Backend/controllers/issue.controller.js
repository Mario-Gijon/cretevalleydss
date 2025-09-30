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
import { ExpressionDomain } from '../models/ExpressionDomain.js';

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

export const getExpressionsDomain = async (req, res) => {
  try {
    const userId = req.uid;

    const [globals, userDomains] = await Promise.all([
      ExpressionDomain.find({ isGlobal: true }),
      ExpressionDomain.find({ user: userId, isGlobal: { $ne: true } })
    ]);

    console.log(globals, userDomains)

    return res.json({
      success: true,
      data: {
        globals,
        userDomains
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Error fetching domains" });
  }
};

// Controlador para crear un dominio de expresión
export const createExpressionDomain = async (req, res) => {
  const { name, type, numericRange, linguisticLabels, isGlobal } = req.body;

  console.log(req.body)

  try {
    if (isGlobal && !req.user.isAdmin) {
      return res.status(403).json({ success: false, msg: "Only admin can create global domains" });
    }

    const newDomain = new ExpressionDomain({
      name,
      type,
      numericRange,
      linguisticLabels,
      isGlobal,
      user: isGlobal ? null : req.uid // 👈 ahora "user"
    });

    await newDomain.save();

    return res.status(201).json({ success: true, msg: `Domain ${newDomain.name} created successfully`, data: newDomain });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Error creating domain" });
  }
};

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
      domainAssignments,
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
      domainAssignments,
      expertMap,
      createdAlternatives,
      leafCriteria,
      issue._id,
      model.isPairwise,
      null,
      session,
      req.uid // 👈 pasamos el id del admin
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

export const removeExpressionDomain = async (req, res) => {
  const { id } = req.body;

  console.log(id)

  try {
    const domain = await ExpressionDomain.findById(id);

    if (!domain) {
      return res.status(404).json({ success: false, msg: "Domain not found" });
    }

    if (domain.isGlobal) {
      if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, msg: "Only admin can delete global domains" });
      }
    } else if (String(domain.user) !== req.uid) { // 👈 aquí también user
      return res.status(403).json({ success: false, msg: "Not authorized to delete this domain" });
    }

    await domain.deleteOne();

    return res.status(200).json({ success: true, msg: "Domain deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Error deleting domain" });
  }
};

export const updateExpressionDomain = async (req, res) => {
  const { id, updatedDomain } = req.body;
  const userId = req.uid;

  if (!id || !updatedDomain) {
    return res.status(400).json({ success: false, msg: "Missing required fields" });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const domain = await ExpressionDomain.findById(id).session(session);

    if (!domain) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, msg: "Domain not found" });
    }

    if (!domain.isGlobal && String(domain.user) !== userId) { // 👈 check con user
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    if (updatedDomain.name) domain.name = updatedDomain.name;
    if (updatedDomain.type) domain.type = updatedDomain.type;
    if (updatedDomain.numericRange) domain.numericRange = updatedDomain.numericRange;
    if (updatedDomain.linguisticLabels) domain.linguisticLabels = updatedDomain.linguisticLabels;

    await domain.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      msg: `Domain updated successfully`,
      data: domain
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating the domain",
      error: err.message
    });
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
  const userId = req.uid;

  try {
    const { issueName, evaluations } = req.body;

    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      return res
        ? res.status(404).json({ success: false, msg: "Issue not found" })
        : { success: false, msg: "Issue not found" };
    }

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

    const alternatives = await Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean();
    const alternativeMap = new Map(alternatives.map((alt) => [alt.name, alt._id]));

    const criteria = await Criterion.find({ issue: issue._id }).lean();
    const criterionMap = new Map(criteria.map((crit) => [crit.name, crit._id]));

    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    const bulkOperations = [];

    for (const [criterionName, evaluationsByExpert] of Object.entries(evaluations)) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue;

      for (const evaluationData of evaluationsByExpert) {
        const { id: alternativeName, expressionDomain, ...comparisons } = evaluationData;
        const alternativeId = alternativeMap.get(alternativeName);
        if (!alternativeId) continue;

        for (const [comparedAlternativeName, value] of Object.entries(comparisons)) {
          if (comparedAlternativeName === alternativeName) continue;

          const comparedAlternativeId = alternativeMap.get(comparedAlternativeName);
          if (!comparedAlternativeId) continue;

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
                  expressionDomain: expressionDomain?.id || null,
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

    return res
      ? res.status(200).json({ success: true, msg: "Evaluations saved successfully" })
      : { success: true, msg: "Evaluations saved successfully" };
  } catch (err) {
    console.error(err);
    return res
      ? res.status(500).json({ success: false, msg: "An error occurred while saving evaluations" })
      : { success: false, msg: "An error occurred while saving evaluations" };
  }
};

export const getPairwiseEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { issueName } = req.body;
    const issue = await Issue.findOne({ name: issueName });
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    const evaluations = await Evaluation.find({
      issue: issue._id,
      expert: userId,
      value: { $ne: null }
    })
      .populate("alternative")
      .populate("comparedAlternative")
      .populate("criterion")
      .populate("expressionDomain");

    const evaluationsByCriterion = {};

    evaluations.forEach((evaluation) => {
      const { criterion, alternative, comparedAlternative, value, expressionDomain } = evaluation;
      if (!value || !criterion || !alternative) return;

      const criterionName = criterion.name;
      if (!evaluationsByCriterion[criterionName]) {
        evaluationsByCriterion[criterionName] = {};
      }

      const alternativeName = alternative.name;
      const comparedAlternativeName = comparedAlternative ? comparedAlternative.name : null;

      if (!evaluationsByCriterion[criterionName][alternativeName]) {
        evaluationsByCriterion[criterionName][alternativeName] = {};
      }

      const evalData = {
        value,
        domain: expressionDomain
          ? {
            id: expressionDomain._id,
            name: expressionDomain.name,
            type: expressionDomain.type,
            ...(expressionDomain.type === "numeric" && { range: expressionDomain.numericRange }),
            ...(expressionDomain.type === "linguistic" && { labels: expressionDomain.linguisticLabels }),
          }
          : null,
      };

      if (comparedAlternativeName) {
        evaluationsByCriterion[criterionName][alternativeName][comparedAlternativeName] = evalData;
      } else {
        evaluationsByCriterion[criterionName][alternativeName][""] = evalData;
      }
    });

    const formattedEvaluations = {};
    for (const criterionName in evaluationsByCriterion) {
      formattedEvaluations[criterionName] = Object.entries(evaluationsByCriterion[criterionName]).map(
        ([alternativeName, comparisons]) => ({
          id: alternativeName,
          ...comparisons,
        })
      );
    }

    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });

    return res.status(200).json({
      success: true,
      evaluations: formattedEvaluations,
      collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
    });
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

    console.log(rankedAlternatives)

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

    const issue = await Issue.findOne({ name: issueName }).lean();
    if (!issue) {
      return res
        ? res.status(404).json({ success: false, msg: "Issue not found" })
        : { success: false, msg: "Issue not found" };
    }

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

    const alternatives = await Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean();
    const alternativeMap = new Map(alternatives.map((alt) => [alt.name, alt._id]));

    const criteria = await Criterion.find({ issue: issue._id }).lean();
    const criterionMap = new Map(criteria.map((crit) => [crit.name, crit._id]));

    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    const bulkOperations = [];

    for (const [alternativeName, criterionEvaluations] of Object.entries(evaluations)) {
      const alternativeId = alternativeMap.get(alternativeName);
      if (!alternativeId) continue;

      for (const [criterionName, evalData] of Object.entries(criterionEvaluations)) {
        const criterionId = criterionMap.get(criterionName);
        if (!criterionId) continue;

        const { value, domain } = evalData;

        bulkOperations.push({
          updateOne: {
            filter: {
              expert: userId,
              alternative: alternativeId,
              criterion: criterionId,
              comparedAlternative: null,
            },
            update: {
              $set: {
                value,
                expressionDomain: domain?.id || null, // 👈 guardamos el ObjectId del dominio
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

    return res
      ? res.status(200).json({ success: true, msg: "Evaluations saved successfully" })
      : { success: true, msg: "Evaluations saved successfully" };
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

    const issue = await Issue.findOne({ name: issueName });
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // 🟢 Traer alternativas, criterios y dominios del issue
    const [alternatives, criteria, expressionDomains] = await Promise.all([
      Alternative.find({ issue: issue._id }).lean(),
      Criterion.find({ issue: issue._id }).lean(),
      ExpressionDomain.find({ issue: issue._id }).lean(),
    ]);

    const evalDocs = await Evaluation.find({
      issue: issue._id,
      expert: userId,
      comparedAlternative: null,
    })
      .populate("alternative")
      .populate("criterion")
      .populate("expressionDomain");

    const evaluationsByAlternative = {};

    // 🟢 Inicializamos TODAS las combinaciones alt-crit con dominio
    for (const alt of alternatives) {
      evaluationsByAlternative[alt.name] = {};
      for (const crit of criteria.filter(c => c.isLeaf)) {
        // Buscar la evaluación existente
        const evalDoc = evalDocs.find(e =>
          e.alternative._id.equals(alt._id) && e.criterion._id.equals(crit._id)
        );

        // Buscar dominio asociado (si lo tienes en otra colección/tabla)
        const domain = evalDoc?.expressionDomain || expressionDomains.find(d =>
          d.issue.equals(issue._id) &&
          /* si tienes reglas para asociar criterio con dominio, ponlas aquí */
          true
        );

        console.log(evaluationsByAlternative[alt.name][crit.name])

        evaluationsByAlternative[alt.name][crit.name] = {
          value: evalDoc?.value ?? "",
          domain: domain
            ? {
              id: domain._id,
              name: domain.name,
              type: domain.type,
              ...(domain.type === "numeric" && { range: domain.numericRange }),
              ...(domain.type === "linguistic" && { labels: domain.linguisticLabels }),
            }
            : null,
        };
      }
    }

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

    // Obtener el modelo completo del issue (para saber si es TOPSIS, BORDA, etc.)
    const model = await IssueModel.findById(issue.model);

    if (!model) {
      return res.status(404).json({ success: false, msg: "Issue model not found" });
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
      const matrixForExpert = [];

      for (const alt of alternatives) {
        const rowValues = [];

        for (const criterion of criteria) {
          const evaluation = await Evaluation.findOne({
            issue: issue._id,
            expert: participation.expert._id,
            criterion: criterion._id,
            alternative: alt._id
          }).populate("expressionDomain");

          let val = evaluation?.value ?? null;

          if (evaluation?.expressionDomain?.type === "linguistic") {
            // Buscar la etiqueta en el dominio
            const labelDef = evaluation.expressionDomain.linguisticLabels.find(
              (lbl) => lbl.label === val
            );
            if (labelDef) {
              val = labelDef.values; // [l, m, u]
            } else {
              val = null;
            }
          }

          rowValues.push(val);
        }

        matrixForExpert.push(rowValues);
      }

      matrices[expertName] = matrixForExpert;
    }));

    const normalizedModelParams = normalizeParams(issue.modelParameters);

    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000"; // Fallback a localhost si no está definida

    // Determinar la URL del endpoint según el nombre del modelo
    let modelUrl;
    switch (model.name.toUpperCase()) {
      case "TOPSIS":
        modelUrl = "topsis";
        break;
      case "FUZZY TOPSIS":
        modelUrl = "fuzzy_topsis";
        break;
      case "BORDA":
        modelUrl = "borda";
        break;
      case "ARAS":
        modelUrl = "aras";
        break;
      default:
        return res.status(400).json({ success: false, msg: `No API endpoint defined for model ${model.name}` });
    }


    // Hacer la petición POST a la API con el objeto matrices
    const response = await axios.post(
      `${apimodelsUrl}/${modelUrl}`,
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

    // results.collective_matrix es un array 2D: alternativas x criterios
    // altNames → nombres de alternativas
    // criteria → array de criterios (objetos) con nombre en criteria[i].name

    const collectiveEvaluations = {};

    // Iteramos por alternativas (filas)
    results.collective_matrix.forEach((row, altIdx) => {
      const altName = altNames[altIdx];
      collectiveEvaluations[altName] = {};

      // Iteramos por criterios (columnas)
      row.forEach((val, critIdx) => {
        const critName = criteria[critIdx].name;  // nombre del criterio
        collectiveEvaluations[altName][critName] = val;
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
        collective_scores: collectiveScoresByName,
        collective_ranking: rankedAlternatives,
      },
      collectiveEvaluations,  // <--- aquí va la matriz colectiva con formato experto
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