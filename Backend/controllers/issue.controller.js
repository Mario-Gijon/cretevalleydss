// Modelos
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
import { ExpressionDomain } from '../models/ExpressionDomain.js';
import { CriteriaWeightEvaluation } from '../models/CriteriaWeightEvaluation.js';
// Utils
import { getUserFinishedIssueIds } from '../utils/getUserFinishedIssueIds.js';
import { validateFinalEvaluations, validateFinalPairwiseEvaluations } from '../utils/validateFinalEvaluations.js';
import { createAlternativesRankingsSection, createAnalyticalGraphsSection, createExpertsPairwiseRatingsSection, createExpertsRatingsSection, createSummarySection } from '../utils/finishedIssueInfoUtils.js';
import { sendExpertInvitationEmail } from '../utils/sendEmails.js';
import { normalizeParams } from '../utils/normalizeParams.js';
import { validateFinalWeights } from '../utils/validateFinalWeights.js';
import { buildCriterionTree, getLeafNamesFromTree } from '../utils/buildCriteriaTree.js';
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";
// Librerias externas
import { Resend } from 'resend'
import axios from "axios"
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import { createIssueDomainSnapshots } from '../models/createIssueDomainSnapshots.js';

// Crea una instancia de Resend con la clave API.
const resend = new Resend(process.env.APIKEY_RESEND)

// Controlador para obtener información de los modelos.
export const modelsInfo = async (req, res) => {
  try {
    // Obtener todos los documentos de IssueModel, excluyendo los campos _id y __v
    const models = await IssueModel.find().select('-__v')

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
    const users = await User.find({ accountConfirm: true }).select('name university email')

    // Responder con la lista de usuarios
    return res.status(200).json({ success: true, data: users })
  } catch (err) {
    // Capturar y registrar el error
    console.error(err)

    // Responder con error de servidor
    return res.status(500).json({ success: false, msg: 'Server error' })
  }
}

// Obtener dominios de expresión
export const getExpressionsDomain = async (req, res) => {
  try {
    const userId = req.uid;

    const [globals, userDomains] = await Promise.all([
      ExpressionDomain.find({ isGlobal: true, user: null }).sort({ name: 1 }),
      ExpressionDomain.find({ isGlobal: false, user: userId }).sort({ name: 1 }),
    ]);

    return res.json({
      success: true,
      data: { globals, userDomains },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Error fetching domains" });
  }
};

// Controlador para crear un dominio de expresión
export const createExpressionDomain = async (req, res) => {
  try {
    let { name, type, numericRange, linguisticLabels, isGlobal } = req.body;

    // 1) Normalizar
    name = (name || "").trim();
    type = (type || "").trim();

    // ✅ globales no se crean desde aquí
    if (Boolean(isGlobal)) {
      return res.status(403).json({
        success: false,
        msg: "Global domains are not creatable. They are predefined and non-modifiable.",
      });
    }

    // 2) Validaciones básicas
    if (!name) {
      return res.status(400).json({ success: false, msg: "Name is required" });
    }
    if (!["numeric", "linguistic"].includes(type)) {
      return res.status(400).json({ success: false, msg: "Invalid type" });
    }

    // 3) Coherencia según tipo
    if (type === "numeric") {
      if (!numericRange || numericRange.min == null || numericRange.max == null) {
        return res.status(400).json({
          success: false,
          msg: "numericRange.min and numericRange.max are required for numeric domains",
        });
      }

      const min = Number(numericRange.min);
      const max = Number(numericRange.max);

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return res.status(400).json({ success: false, msg: "min/max must be numbers" });
      }
      if (min >= max) {
        return res.status(400).json({ success: false, msg: "min must be < max" });
      }

      numericRange = { min, max };
      linguisticLabels = [];
    }

    if (type === "linguistic") {
      if (!Array.isArray(linguisticLabels) || linguisticLabels.length === 0) {
        return res.status(400).json({
          success: false,
          msg: "linguisticLabels is required for linguistic domains",
        });
      }

      const seen = new Set();

      for (const lbl of linguisticLabels) {
        const label = (lbl?.label || "").trim();
        const values = lbl?.values;

        if (!label) {
          return res.status(400).json({ success: false, msg: "Label is required" });
        }
        if (seen.has(label)) {
          return res.status(400).json({ success: false, msg: `Duplicated label '${label}'` });
        }
        seen.add(label);

        if (!Array.isArray(values) || values.length < 2) {
          return res.status(400).json({
            success: false,
            msg: "values must be an array with at least 2 numbers",
          });
        }

        const numericValues = values.map(Number);
        if (!numericValues.every(Number.isFinite)) {
          return res.status(400).json({ success: false, msg: "values must be numbers" });
        }

        for (let j = 1; j < numericValues.length; j++) {
          if (numericValues[j] < numericValues[j - 1]) {
            return res.status(400).json({
              success: false,
              msg: "values must be ordered (non-decreasing)",
            });
          }
        }

        lbl.label = label;
        lbl.values = numericValues;
      }

      numericRange = undefined;
    }

    // 4) Crear y guardar (SIEMPRE de usuario)
    const newDomain = new ExpressionDomain({
      name,
      type,
      isGlobal: false,
      user: req.uid,
      ...(type === "numeric" ? { numericRange } : {}),
      ...(type === "linguistic" ? { linguisticLabels } : {}),
    });

    await newDomain.save();

    return res.status(201).json({
      success: true,
      msg: `Domain ${newDomain.name} created successfully`,
      data: newDomain,
    });
  } catch (err) {
    console.error(err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "A domain with the same name already exists (for this user).",
      });
    }

    return res.status(500).json({ success: false, msg: "Error creating domain" });
  }
};

// Controlador para crear un nuevo problema
export const createIssue = async (req, res) => {
  const session = await mongoose.startSession();

  // ✅ NEW: helper para normalizar pesos cuando hay 1 único leaf criterion
  const normalizeSingleWeight = (weightsMaybe) => {
    // undefined / null
    if (weightsMaybe == null) return [1];

    // number -> [number]
    if (typeof weightsMaybe === "number") return [weightsMaybe];

    // object {l,m,u} -> [object]
    if (typeof weightsMaybe === "object" && !Array.isArray(weightsMaybe)) return [weightsMaybe];

    if (Array.isArray(weightsMaybe)) {
      // Caso: [0.95,1,1] (triangular directo)
      const isTriangleArray =
        weightsMaybe.length === 3 &&
        weightsMaybe.every((x) => typeof x === "number" && Number.isFinite(x));

      if (isTriangleArray) return [weightsMaybe];

      // Caso: [[0.95,1,1]] o [{l,m,u}] o [1]
      const first = weightsMaybe[0];

      if (Array.isArray(first)) return [first];
      if (first && typeof first === "object") return [first];
      if (typeof first === "number") return [first];

      return [1];
    }

    return [1];
  };

  try {
    const info = req.body?.issueInfo || {};
    const {
      issueName,
      issueDescription,
      selectedModel,
      alternatives = [],
      withConsensus,
      criteria = [],
      addedExperts = [],
      domainAssignments,
      closureDate,
      consensusMaxPhases,
      consensusThreshold,
      paramValues = {},
      weightingMode,
    } = info;

    console.log(info)

    const cleanIssueName = (issueName || "").trim();
    if (!cleanIssueName) {
      return res.status(400).json({ success: false, obj: "issueName", msg: "Issue name is required" });
    }
    if (!Array.isArray(alternatives) || alternatives.length <= 1) {
      return res.status(400).json({ success: false, obj: "alternatives", msg: "Must be at least two alternatives" });
    }
    if (!Array.isArray(addedExperts) || addedExperts.length <= 0) {
      return res.status(400).json({ success: false, obj: "addedExperts", msg: "Must be at least one expert" });
    }
    if (!selectedModel?.name) {
      return res.status(400).json({ success: false, obj: "selectedModel", msg: "Model is required" });
    }

    const emailsToSend = [];

    await session.withTransaction(async () => {
      const existingIssue = await Issue.findOne({ name: cleanIssueName }).session(session);
      if (existingIssue) {
        const err = new Error("Issue name already exists");
        err.status = 400;
        err.obj = "issueName";
        throw err;
      }

      const model = await IssueModel.findOne({ name: selectedModel.name }).session(session);
      if (!model) {
        const err = new Error("Model does not exist");
        err.status = 400;
        err.obj = "selectedModel";
        throw err;
      }

      const admin = await User.findById(req.uid).session(session);
      if (!admin) {
        const err = new Error("Admin not found");
        err.status = 400;
        throw err;
      }
      const adminEmail = admin.email;

      const uniqueEmails = Array.from(new Set(addedExperts.map((e) => String(e).trim()).filter(Boolean)));

      const expertUsers = await User.find({ email: { $in: uniqueEmails } }).session(session);
      const expertByEmail = new Map(expertUsers.map((u) => [u.email, u]));

      const missing = uniqueEmails.filter((email) => !expertByEmail.has(email));
      if (missing.length > 0) {
        const err = new Error(`Experts not found: ${missing.join(", ")}`);
        err.status = 400;
        err.obj = "addedExperts";
        throw err;
      }

      // ============================
      // 1) Crear Issue (stage provisional)
      // ============================
      const issue = new Issue({
        admin: req.uid,
        model: model._id,
        isConsensus: withConsensus,
        name: cleanIssueName,
        description: issueDescription,
        active: true,
        creationDate: dayjs().format("DD-MM-YYYY"),
        closureDate: closureDate ? dayjs(closureDate).format("DD-MM-YYYY") : null,
        weightingMode,
        currentStage: "criteriaWeighting", // provisional
        ...(model.isConsensus && { consensusMaxPhases, consensusThreshold }),
        modelParameters: paramValues, // 👈 aquí ya entra lo que mande el front
      });

      await issue.save({ session });

      // ============================
      // 2) Alternativas
      // ============================
      const uniqueAltNames = Array.from(new Set(alternatives.map((a) => String(a).trim()).filter(Boolean)));
      if (uniqueAltNames.length <= 1) {
        const err = new Error("Must be at least two valid alternatives");
        err.status = 400;
        err.obj = "alternatives";
        throw err;
      }

      const createdAlternatives = [];
      for (const altName of uniqueAltNames) {
        const alt = new Alternative({ issue: issue._id, name: altName });
        await alt.save({ session });
        createdAlternatives.push(alt);
      }

      // ============================
      // 3) Criterios (y detectar leafCriteria)
      // ============================
      const leafCriteria = [];

      const createCriteriaRec = async (nodes, parentId = null) => {
        if (!Array.isArray(nodes)) return;

        for (const node of nodes) {
          const children = Array.isArray(node?.children) ? node.children : [];
          const isLeaf = children.length === 0;

          const crit = new Criterion({
            issue: issue._id,
            parentCriterion: parentId,
            name: String(node?.name || "").trim(),
            type: String(node?.type || "").trim(),
            isLeaf,
          });

          if (!crit.name) {
            const err = new Error("Criterion name is required");
            err.status = 400;
            err.obj = "criteria";
            throw err;
          }

          await crit.save({ session });

          if (isLeaf) leafCriteria.push(crit);
          else await createCriteriaRec(children, crit._id);
        }
      };

      await createCriteriaRec(criteria, null);

      if (leafCriteria.length === 0) {
        const err = new Error("At least one leaf criterion is required");
        err.status = 400;
        err.obj = "criteria";
        throw err;
      }

      // ============================
      // ✅ FIX: si hay 1 solo criterio hoja => NO hay fase de pesos
      // ============================
      const isSingleLeafCriterion = leafCriteria.length === 1;

      const weightingModesThatNeedWeightsStage = new Set([
        "simulatedConsensusBwm",
        "consensus",
        "bwm",
        "consensusBwm",
      ]);

      const needsWeightsStage =
        !isSingleLeafCriterion && weightingModesThatNeedWeightsStage.has(weightingMode);

      const initialStage = needsWeightsStage ? "criteriaWeighting" : "alternativeEvaluation";

      if (issue.currentStage !== initialStage) {
        issue.currentStage = initialStage;
      }

      // ✅ NEW: si es único criterio, NO pises lo que venga.
      // - Si el front mandó weights (crisp o difuso), lo respetamos.
      // - Si NO mandó nada, ponemos default.
      if (isSingleLeafCriterion) {
        const prevParams = issue.modelParameters || {};

        if (prevParams.weights != null) {
          // normaliza a "longitud 1" sin destruir formato (number, [l,m,u], {l,m,u}, etc.)
          issue.modelParameters = { ...prevParams, weights: normalizeSingleWeight(prevParams.weights) };
        } else {
          issue.modelParameters = { ...prevParams, weights: [1] };
        }
      }

      await issue.save({ session });

      // ============================
      // 4) Participations + notifications + emails
      // ============================
      for (const email of uniqueEmails) {
        const u = expertByEmail.get(email);
        const isAdminExpert = email === adminEmail;

        const part = new Participation({
          issue: issue._id,
          expert: u._id,
          invitationStatus: isAdminExpert ? "accepted" : "pending",
          evaluationCompleted: false,
          weightsCompleted: isSingleLeafCriterion ? true : false,
          entryPhase: null,
          entryStage: null,
          joinedAt: new Date(),
        });

        await part.save({ session });

        if (!isAdminExpert) {
          const notification = new Notification({
            expert: u._id,
            issue: issue._id,
            type: "invitation",
            message: `You have been invited by ${admin.name} to participate in ${cleanIssueName}.`,
            read: false,
            requiresAction: true,
          });

          await notification.save({ session });

          emailsToSend.push({
            expertEmail: email,
            issueName: cleanIssueName,
            issueDescription,
            adminEmail,
          });
        }
      }

      // ============================
      // 5) Dominios + snapshots + evaluaciones
      // ============================
      const initialConsensusPhase = null;
      const usedDomainIds = new Set();

      if (!domainAssignments?.experts || typeof domainAssignments.experts !== "object") {
        const err = new Error("domainAssignments.experts is required");
        err.status = 400;
        err.obj = "domainAssignments";
        throw err;
      }

      for (const email of Object.keys(domainAssignments.experts)) {
        if (!expertByEmail.has(email)) continue;

        const altBlock = domainAssignments.experts[email]?.alternatives || {};

        for (const altName of uniqueAltNames) {
          const critBlock = altBlock[altName]?.criteria || {};

          for (const leaf of leafCriteria) {
            const domId = critBlock[leaf.name];

            if (!domId) {
              const err = new Error(
                `Missing domain assignment for criterion '${leaf.name}' (expert ${email}, alternative ${altName})`
              );
              err.status = 400;
              err.obj = "domainAssignments";
              throw err;
            }
            usedDomainIds.add(String(domId));
          }
        }
      }

      const domainIdList = Array.from(usedDomainIds);

      const domainDocs = await ExpressionDomain.find({
        _id: { $in: domainIdList },
        $or: [{ isGlobal: true, user: null }, { isGlobal: false, user: req.uid }],
      })
        .select("_id name type numericRange linguisticLabels")
        .session(session);

      const existingSet = new Set(domainDocs.map((d) => String(d._id)));
      const missingDomains = domainIdList.filter((id) => !existingSet.has(id));
      if (missingDomains.length > 0) {
        const err = new Error(`ExpressionDomain not found or not accessible: ${missingDomains.join(", ")}`);
        err.status = 400;
        err.obj = "domainAssignments";
        throw err;
      }

      const snapshotMap = await createIssueDomainSnapshots({
        issueId: issue._id,
        domainDocs,
        session,
      });

      const isPairwise = Boolean(model.isPairwise);
      const altByName = new Map(createdAlternatives.map((a) => [a.name, a]));

      for (const email of Object.keys(domainAssignments.experts)) {
        const expertUser = expertByEmail.get(email);
        if (!expertUser) continue;

        const altBlock = domainAssignments.experts[email]?.alternatives || {};

        for (const altName of uniqueAltNames) {
          const altDoc = altByName.get(altName);
          if (!altDoc) continue;

          const critBlock = altBlock[altName]?.criteria || {};

          for (const leaf of leafCriteria) {
            const sourceDomainId = critBlock[leaf.name];
            const issueSnapshotId = snapshotMap.get(String(sourceDomainId));

            if (!issueSnapshotId) {
              const err = new Error(`Snapshot not found for domain ${String(sourceDomainId)}`);
              err.status = 400;
              err.obj = "domainAssignments";
              throw err;
            }

            if (isPairwise) {
              for (const comparedAlt of createdAlternatives) {
                if (String(comparedAlt._id) === String(altDoc._id)) continue;

                const evaluation = new Evaluation({
                  issue: issue._id,
                  expert: expertUser._id,
                  alternative: altDoc._id,
                  comparedAlternative: comparedAlt._id,
                  criterion: leaf._id,
                  expressionDomain: issueSnapshotId,
                  value: null,
                  timestamp: null,
                  history: [],
                  consensusPhase: initialConsensusPhase,
                });

                await evaluation.save({ session });
              }
            } else {
              const evaluation = new Evaluation({
                issue: issue._id,
                expert: expertUser._id,
                alternative: altDoc._id,
                comparedAlternative: null,
                criterion: leaf._id,
                expressionDomain: issueSnapshotId,
                value: null,
                timestamp: null,
                history: [],
                consensusPhase: initialConsensusPhase,
              });

              await evaluation.save({ session });
            }
          }
        }
      }

      // ============================
      // 6) CriteriaWeightEvaluation docs
      // ============================
      const expertIds = uniqueEmails.map((email) => expertByEmail.get(email)._id);
      const criteriaNames = leafCriteria.map((c) => c.name);

      if (!isSingleLeafCriterion) {
        if (weightingMode === "simulatedConsensusBwm") {
          const docs = expertIds.map((expertId) => ({
            issue: issue._id,
            expert: expertId,
            bestCriterion: "",
            worstCriterion: "",
            bestToOthers: Object.fromEntries(criteriaNames.map((n) => [n, null])),
            othersToWorst: Object.fromEntries(criteriaNames.map((n) => [n, null])),
            consensusPhase: 1,
            completed: false,
          }));
          await CriteriaWeightEvaluation.insertMany(docs, { session });
        }

        if (weightingMode === "consensus") {
          const docs = expertIds.map((expertId) => ({
            issue: issue._id,
            expert: expertId,
            manualWeights: Object.fromEntries(criteriaNames.map((n) => [n, null])),
            consensusPhase: 1,
            completed: false,
          }));
          await CriteriaWeightEvaluation.insertMany(docs, { session });
        }
      } else {
        if (weightingMode === "consensus") {
          const only = criteriaNames[0];
          const docs = expertIds.map((expertId) => ({
            issue: issue._id,
            expert: expertId,
            manualWeights: { [only]: 1 },
            consensusPhase: 1,
            completed: true,
          }));
          await CriteriaWeightEvaluation.insertMany(docs, { session });
        }

        if (weightingMode === "simulatedConsensusBwm") {
          const only = criteriaNames[0];
          const docs = expertIds.map((expertId) => ({
            issue: issue._id,
            expert: expertId,
            bestCriterion: only,
            worstCriterion: only,
            bestToOthers: { [only]: 1 },
            othersToWorst: { [only]: 1 },
            consensusPhase: 1,
            completed: true,
          }));
          await CriteriaWeightEvaluation.insertMany(docs, { session });
        }
      }
    });

    for (const payload of emailsToSend) {
      try {
        await sendExpertInvitationEmail(payload);
      } catch (e) {
        console.error("Failed sending invitation email:", payload.expertEmail, e);
      }
    }

    return res.status(201).json({
      success: true,
      msg: `Issue ${String(req.body?.issueInfo?.issueName || "").trim()} created successfully`,
    });
  } catch (error) {
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        obj: error.obj,
        msg: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Server error creating issue",
    });
  } finally {
    session.endSession();
  }
};


export const getAllActiveIssues = async (req, res) => {
  const userId = String(req.uid || "");

  try {
    // -----------------------------
    // ✅ “Constantes” internas
    // -----------------------------
    const STAGE_META = {
      criteriaWeighting: { key: "criteriaWeighting", label: "Criteria weighting", short: "Weighting", colorKey: "info" },
      weightsFinished: { key: "weightsFinished", label: "Weights finished", short: "Weights done", colorKey: "warning" },
      alternativeEvaluation: { key: "alternativeEvaluation", label: "Alternative evaluation", short: "Evaluation", colorKey: "info" },
      // opcional por si tienes un stage real con este nombre en DB
      alternativeConsensus: { key: "alternativeConsensus", label: "Alternative consensus", short: "Consensus", colorKey: "success" },
      finished: { key: "finished", label: "Finished", short: "Finished", colorKey: "success" },
    };

    // ✅ Colores por tipo (TU regla):
    // - evaluate => info (azul)
    // - waiting  => success (verde)
    // - compute/resolve => warning (amarillo)
    const ACTION_META = {
      resolveIssue: {
        key: "resolveIssue",
        label: "Resolve issue",
        role: "admin",
        severity: "warning",
        sortPriority: 0,
      },
      computeWeights: {
        key: "computeWeights",
        label: "Compute weights",
        role: "admin",
        severity: "warning",
        sortPriority: 10,
      },
      evaluateWeights: {
        key: "evaluateWeights",
        label: "Evaluate weights",
        role: "expert",
        severity: "info",
        sortPriority: 30,
      },
      evaluateAlternatives: {
        key: "evaluateAlternatives",
        label: "Evaluate alternatives",
        role: "expert",
        severity: "info",
        sortPriority: 40,
      },
      waitingAdmin: {
        key: "waitingAdmin",
        label: "Waiting admin",
        role: "expert",
        severity: "success",
        sortPriority: 60,
      },
    };

    const safeOid = (v) => (v ? String(v) : "");
    const uniq = (arr) => Array.from(new Set(arr));

    const inc = (obj, key) => {
      obj[key] = (obj[key] || 0) + 1;
      return obj;
    };

    // -----------------------------
    // ✅ helpers workflow/modelParameters
    // -----------------------------
    const cleanModelParameters = (mp) => {
      const obj = mp && typeof mp === "object" ? { ...mp } : {};
      // ✅ NO enviar weights (ya aparece en criteria)
      if ("weights" in obj) delete obj.weights;
      return obj;
    };

    const detectHasDirectWeights = (issue) => {
      // ✅ estable: lo que se decidió al crear el issue
      const wm = String(issue?.weightingMode || "").toLowerCase();
      if (["manual", "direct", "predefined", "fixed"].includes(wm)) return true;

      // si el creador metió weights directamente en modelParameters al crear el issue
      const w = issue?.modelParameters?.weights;
      if (Array.isArray(w) && w.length > 0 && w.some((x) => x !== null && x !== undefined)) return true;

      return false;
    };

    // ✅ consenso “enabled” (estable), NO “active”
    // Ajusta aquí si tienes un flag más específico para consenso de alternativas
    const detectHasAlternativeConsensusEnabled = (issue) => {
      return Boolean(issue?.isConsensus);
    };

    const buildWorkflowStepsStable = ({ hasDirectWeights, hasAlternativeConsensus }) => {
      if (hasDirectWeights) {
        return [
          { key: "weightsAssigned", label: "Weights assigned" },
          { key: "alternativeEvaluation", label: "Alternative evaluation" },
          ...(hasAlternativeConsensus ? [{ key: "alternativeConsensus", label: "Alternative consensus" }] : []),
          { key: "readyResolve", label: "Ready to resolve" },
        ];
      }

      return [
        { key: "criteriaWeighting", label: "Criteria weighting" },
        { key: "weightsFinished", label: "Weights finished" },
        { key: "alternativeEvaluation", label: "Alternative evaluation" },
        ...(hasAlternativeConsensus ? [{ key: "alternativeConsensus", label: "Alternative consensus" }] : []),
        { key: "readyResolve", label: "Ready to resolve" },
      ];
    };

    // -----------------------------
    // 1) IDs de issues activos (admin + expert accepted)
    // -----------------------------
    const [adminIssues, acceptedParticipations] = await Promise.all([
      Issue.find({ admin: userId, active: true }).select("_id").lean(),
      Participation.find({ expert: userId, invitationStatus: "accepted" })
        .populate({ path: "issue", match: { active: true }, select: "_id" })
        .lean(),
    ]);

    const adminIssueIds = adminIssues.map((i) => safeOid(i._id));
    const expertIssueIds = acceptedParticipations
      .filter((p) => p.issue)
      .map((p) => safeOid(p.issue._id));

    const issueIds = uniq([...adminIssueIds, ...expertIssueIds]);

    if (issueIds.length === 0) {
      return res.json({
        success: true,
        issues: [],
        tasks: { total: 0, byType: {} },
        taskCenter: { total: 0, sections: [] },
        filtersMeta: {
          defaults: { role: "all", stage: "all", action: "all", sort: "smart", q: "" },
          roleOptions: [
            { value: "all", label: "All roles" },
            { value: "admin", label: "Admin" },
            { value: "expert", label: "Expert" },
            { value: "both", label: "Admin & Expert" },
            { value: "viewer", label: "Viewer" },
          ],
          stageOptions: [
            { value: "all", label: "All stages" },
            ...Object.values(STAGE_META).map((s) => ({ value: s.key, label: s.label })),
          ],
          actionOptions: [
            { value: "all", label: "All actions" },
            { value: "waitingExperts", label: "Waiting experts" },
            ...Object.values(ACTION_META)
              .sort((a, b) => a.sortPriority - b.sortPriority)
              .map((a) => ({ value: a.key, label: a.label })),
            { value: "none", label: "No pending action" },
          ],
          sortOptions: [
            { value: "smart", label: "Smart" },
            { value: "nameAsc", label: "Name (A→Z)" },
            { value: "nameDesc", label: "Name (Z→A)" },
            { value: "deadlineSoon", label: "Deadline (soonest)" },
          ],
          counts: { roles: {}, stages: {}, actions: {} },
        },
      });
    }

    // -----------------------------
    // 2) Carga masiva de datos
    // -----------------------------
    const [issues, allParticipations, alternatives, criteria, consensusPhases] = await Promise.all([
      Issue.find({ _id: { $in: issueIds } })
        .populate("model")
        .populate("admin", "email name")
        .lean(),
      Participation.find({ issue: { $in: issueIds } })
        .populate("expert", "email")
        .lean(),
      Alternative.find({ issue: { $in: issueIds } }).lean(),
      Criterion.find({ issue: { $in: issueIds } }).lean(),
      Consensus.find({ issue: { $in: issueIds } }, "issue phase").lean(),
    ]);

    // -----------------------------
    // 3) Maps para rendimiento
    // -----------------------------
    const consensusPhaseCountMap = consensusPhases.reduce((acc, curr) => {
      const id = safeOid(curr.issue);
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const participationMap = allParticipations.reduce((acc, p) => {
      const id = safeOid(p.issue);
      if (!acc[id]) acc[id] = [];
      acc[id].push(p);
      return acc;
    }, {});

    const alternativesMap = alternatives.reduce((acc, a) => {
      const id = safeOid(a.issue);
      if (!acc[id]) acc[id] = [];
      acc[id].push(a);
      return acc;
    }, {});

    // -----------------------------
    // 4) Task Center agregado
    // -----------------------------
    const tasksByType = {
      resolveIssue: [],
      computeWeights: [],
      evaluateWeights: [],
      evaluateAlternatives: [],
      waitingAdmin: [],
    };

    // -----------------------------
    // 5) Construcción de issues formateados
    // -----------------------------
    const formattedIssues = issues.map((issue) => {
      const issueIdStr = safeOid(issue._id);

      // participaciones
      const issueParticipations = participationMap[issueIdStr] || [];
      const isAdminUser = safeOid(issue.admin?._id) === userId;

      const acceptedExperts = issueParticipations.filter((p) => p.invitationStatus === "accepted");
      const pendingExperts = issueParticipations.filter((p) => p.invitationStatus === "pending");
      const declinedExperts = issueParticipations.filter((p) => p.invitationStatus === "declined");

      const hasPending = pendingExperts.length > 0;
      const realParticipants = acceptedExperts;

      // progreso
      const totalAccepted = acceptedExperts.length;
      const weightsDone = acceptedExperts.filter((p) => p.weightsCompleted).length;
      const evalsDone = acceptedExperts.filter((p) => p.evaluationCompleted).length;

      const realWeightsDone = realParticipants.filter((p) => p.weightsCompleted).length;
      const realEvalsDone = realParticipants.filter((p) => p.evaluationCompleted).length;

      const isExpertAccepted = acceptedExperts.some((p) => safeOid(p.expert?._id) === userId);

      const myParticipation =
        issueParticipations.find((p) => safeOid(p.expert?._id) === userId) || null;

      // alternativas
      const altNames = (alternativesMap[issueIdStr] || [])
        .map((a) => a.name)
        .sort((a, b) => a.localeCompare(b));

      // criteria tree + final weights
      const issueCriteria = criteria
        .filter((c) => safeOid(c.issue) === issueIdStr)
        .map((c) => ({
          id: safeOid(c._id),
          name: c.name,
          type: c.type,
          isLeaf: Boolean(c.isLeaf),
          parentId: safeOid(c.parentCriterion),
          children: [],
        }));

      const byId = new Map(issueCriteria.map((n) => [n.id, n]));
      const criteriaTree = [];
      for (const n of issueCriteria) {
        if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
        else criteriaTree.push(n);
      }

      const leafNames = [];
      const dfsLeaf = (node) => {
        if (!node) return;
        if (!node.children || node.children.length === 0) {
          leafNames.push(node.name);
          return;
        }
        for (const ch of node.children) dfsLeaf(ch);
      };
      for (const r of criteriaTree) dfsLeaf(r);

      const weightsArray = issue.modelParameters?.weights || [];
      const finalWeightsMap = leafNames.reduce((acc, name, index) => {
        acc[name] = weightsArray[index] ?? null;
        return acc;
      }, {});

      const decorate = (node, depth = 0) => {
        const isLeaf = !node.children || node.children.length === 0;
        node.depth = depth;
        node.display = {
          showType: depth === 0,
          showWeight: isLeaf,
          weight: isLeaf ? (finalWeightsMap?.[node.name] ?? null) : null,
        };
        if (node.children?.length) node.children.forEach((ch) => decorate(ch, depth + 1));
      };
      criteriaTree.forEach((r) => decorate(r, 0));

      // consenso fase actual
      const savedPhasesCount = consensusPhaseCountMap[issueIdStr] || 0;
      const consensusCurrentPhase = savedPhasesCount + 1;

      // deadline meta
      const closureDateStr = issue.closureDate;
      let deadline = { hasDeadline: false, daysLeft: null, overdue: false, iso: null };
      if (closureDateStr) {
        const d = dayjs(closureDateStr, "DD-MM-YYYY", true);
        if (d.isValid()) {
          const daysLeft = d.startOf("day").diff(dayjs().startOf("day"), "day");
          deadline = { hasDeadline: true, daysLeft, overdue: daysLeft < 0, iso: d.toISOString() };
        }
      }

      // statusFlags + acciones
      const stage = issue.currentStage;

      const allWeightsDone = realParticipants.length > 0 && realWeightsDone === realParticipants.length;
      const allEvalsDone = realParticipants.length > 0 && realEvalsDone === realParticipants.length;

      const waitingAdmin =
        !isAdminUser &&
        !hasPending &&
        ((stage === "weightsFinished" && allWeightsDone) ||
          (stage === "alternativeEvaluation" && allEvalsDone));

      const canComputeWeights =
        stage === "weightsFinished" &&
        isAdminUser &&
        !hasPending &&
        realParticipants.length > 0 &&
        allWeightsDone;

      const canResolveIssue =
        stage === "alternativeEvaluation" &&
        isAdminUser &&
        !hasPending &&
        realParticipants.length > 0 &&
        allEvalsDone;

      const canEvaluateWeights =
        stage === "criteriaWeighting" &&
        isExpertAccepted &&
        realParticipants.some((p) => safeOid(p.expert?._id) === userId && !p.weightsCompleted);

      const canEvaluateAlternatives =
        stage === "alternativeEvaluation" &&
        isExpertAccepted &&
        realParticipants.some((p) => safeOid(p.expert?._id) === userId && !p.evaluationCompleted);

      // ✅ waitingExperts (incluye pendientes y “sin acción”)
      const waitingExperts =
        (hasPending && stage !== "finished") ||
        (!waitingAdmin && !canResolveIssue && !canComputeWeights && !canEvaluateWeights && !canEvaluateAlternatives && stage !== "finished");

      const statusFlags = {
        canEvaluateWeights,
        canComputeWeights,
        canEvaluateAlternatives,
        canResolveIssue,
        waitingAdmin,
        waitingExperts,
      };

      // acciones (orden inteligente)
      const actions = [];
      if (canResolveIssue) actions.push(ACTION_META.resolveIssue);
      if (canComputeWeights) actions.push(ACTION_META.computeWeights);
      if (canEvaluateWeights) actions.push(ACTION_META.evaluateWeights);
      if (canEvaluateAlternatives) actions.push(ACTION_META.evaluateAlternatives);
      if (waitingAdmin) actions.push(ACTION_META.waitingAdmin);

      actions.sort((a, b) => a.sortPriority - b.sortPriority);
      const nextAction = actions[0] ?? null;

      // status humano + statusKey (✅ sin pendingInvitations)
      let statusLabel = STAGE_META[stage]?.label ?? stage;
      let statusKey = stage;

      if (stage === "finished") {
        statusLabel = "Finished";
        statusKey = "finished";
      } else if (waitingAdmin) {
        statusLabel = "Waiting for admin";
        statusKey = "waitingAdmin";
      } else if (nextAction) {
        statusLabel = nextAction.label;
        statusKey = nextAction.key;
      } else {
        statusLabel = "Waiting experts";
        statusKey = "waitingExperts";
      }

      const sortPriority = nextAction ? nextAction.sortPriority : 80;

      // tasks globales
      for (const a of actions) {
        tasksByType[a.key].push({
          issueId: issueIdStr,
          issueName: issue.name,
          stage,
          role: a.role,
          severity: a.severity,
          actionKey: a.key,
          actionLabel: a.label,
          sortPriority: a.sortPriority,
          deadline,
        });
      }

      // listas “como antes”
      const participatedExperts =
        stage === "criteriaWeighting" || stage === "weightsFinished"
          ? acceptedExperts.filter((p) => p.weightsCompleted === true)
          : acceptedExperts.filter((p) => p.evaluationCompleted === true);

      const acceptedButNotEvaluated =
        stage === "criteriaWeighting" || stage === "weightsFinished"
          ? acceptedExperts.filter((p) => !p.weightsCompleted)
          : acceptedExperts.filter((p) => !p.evaluationCompleted);

      const evaluated = participatedExperts.map((p) => safeOid(p.expert?._id)).includes(userId);

      const role =
        isAdminUser && isExpertAccepted
          ? "both"
          : isAdminUser
          ? "admin"
          : isExpertAccepted
          ? "expert"
          : "viewer";

      // ✅ modelParameters (sin weights)
      const modelParameters = cleanModelParameters(issue.modelParameters);

      // ✅ workflow estable
      const hasDirectWeights = detectHasDirectWeights(issue);
      const hasAlternativeConsensus = detectHasAlternativeConsensusEnabled(issue);
      const workflowSteps = buildWorkflowStepsStable({ hasDirectWeights, hasAlternativeConsensus });

      return {
        id: issueIdStr,
        name: issue.name,
        creator: issue.admin?.email,
        description: issue.description,
        model: issue.model,
        isPairwise: Boolean(issue.model?.isPairwise),
        isConsensus: Boolean(issue.isConsensus),
        currentStage: stage,
        weightingMode: issue.weightingMode,

        ...(issue.model?.isConsensus && {
          consensusMaxPhases: issue.consensusMaxPhases || "Unlimited",
          consensusThreshold: issue.consensusThreshold,
          consensusCurrentPhase,
        }),

        creationDate: issue.creationDate || null,
        closureDate: issue.closureDate || null,

        isAdmin: isAdminUser,
        isExpert: isExpertAccepted,
        role,

        alternatives: altNames,
        criteria: criteriaTree,

        evaluated,

        totalExperts:
          participatedExperts.length +
          pendingExperts.length +
          declinedExperts.length +
          acceptedButNotEvaluated.length,

        participatedExperts: participatedExperts.map((p) => p.expert.email).sort(),
        pendingExperts: pendingExperts.map((p) => p.expert.email).sort(),
        notAcceptedExperts: declinedExperts.map((p) => p.expert.email).sort(),
        acceptedButNotEvaluatedExperts: acceptedButNotEvaluated.map((p) => p.expert.email).sort(),

        statusFlags,
        progress: { weightsDone, evalsDone, totalAccepted },
        finalWeights: finalWeightsMap,

        // ✅ modelParameters listo para el drawer (sin weights)
        modelParameters,

        myParticipation: myParticipation
          ? {
              invitationStatus: myParticipation.invitationStatus,
              weightsCompleted: Boolean(myParticipation.weightsCompleted),
              evaluationCompleted: Boolean(myParticipation.evaluationCompleted),
              joinedAt: myParticipation.joinedAt || null,
            }
          : null,

        actions,
        nextAction,

        ui: {
          stage,
          stageLabel: STAGE_META[stage]?.label ?? stage,
          stageColorKey: STAGE_META[stage]?.colorKey ?? "default",
          statusKey,
          statusLabel,
          sortPriority,
          deadline,

          // ✅ workflow estable para el FE
          hasDirectWeights,
          hasAlternativeConsensus,
          workflowSteps,

          permissions: {
            evaluateWeights: canEvaluateWeights,
            evaluateAlternatives: canEvaluateAlternatives,
            computeWeights: canComputeWeights,
            resolveIssue: canResolveIssue,
            waitingAdmin: waitingAdmin,
            waitingExperts: statusKey === "waitingExperts",
          },

          // ✅ duplicado útil
          modelParameters,
        },
      };
    });

    // -----------------------------
    // 6) Orden inteligente + tasks sorting
    // -----------------------------
    formattedIssues.sort((a, b) => {
      const ap = a.ui?.sortPriority ?? 90;
      const bp = b.ui?.sortPriority ?? 90;
      if (ap !== bp) return ap - bp;

      const ad = a.ui?.deadline?.hasDeadline ? a.ui.deadline.daysLeft : 999999;
      const bd = b.ui?.deadline?.hasDeadline ? b.ui.deadline.daysLeft : 999999;
      if (ad !== bd) return ad - bd;

      return String(a.name).localeCompare(String(b.name));
    });

    for (const k of Object.keys(tasksByType)) {
      tasksByType[k].sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        const ad = a.deadline?.hasDeadline ? a.deadline.daysLeft : 999999;
        const bd = b.deadline?.hasDeadline ? b.deadline.daysLeft : 999999;
        if (ad !== bd) return ad - bd;
        return String(a.issueName).localeCompare(String(b.issueName));
      });
    }

    const totalTasks = Object.values(tasksByType).reduce((acc, arr) => acc + arr.length, 0);

    // -----------------------------
    // 7) ✅ TaskCenter “listo para pintar”
    // -----------------------------
    const taskCenterSections = Object.values(ACTION_META)
      .sort((a, b) => a.sortPriority - b.sortPriority)
      .map((meta) => {
        const items = tasksByType[meta.key] || [];
        return {
          key: meta.key,
          title: meta.label,
          role: meta.role,
          severity: meta.severity,
          sortPriority: meta.sortPriority,
          count: items.length,
          items,
        };
      })
      .filter((s) => s.count > 0);

    const taskCenter = {
      total: totalTasks,
      sections: taskCenterSections,
    };

    // -----------------------------
    // 8) ✅ filtersMeta
    // -----------------------------
    const roleCounts = {};
    const stageCounts = {};
    const actionCounts = {};

    for (const it of formattedIssues) {
      inc(roleCounts, it.role || "viewer");
      inc(stageCounts, it.ui?.stage || it.currentStage || "unknown");

      const actionKey = it.ui?.statusKey || (it.nextAction?.key || "none");
      inc(actionCounts, actionKey);
    }

    const filtersMeta = {
      defaults: { role: "all", stage: "all", action: "all", q: "" },

      roleOptions: [
        { value: "all", label: "All roles" },
        { value: "admin", label: "Admin" },
        { value: "expert", label: "Expert" },
        { value: "both", label: "Admin & Expert" },
        { value: "viewer", label: "Viewer" },
      ],

      stageOptions: [
        { value: "all", label: "All stages" },
        ...Object.values(STAGE_META).map((s) => ({ value: s.key, label: s.label })),
      ],

      actionOptions: [
        { value: "all", label: "All actions" },
        { value: "waitingExperts", label: "Waiting experts" },
        ...Object.values(ACTION_META)
          .sort((a, b) => a.sortPriority - b.sortPriority)
          .map((a) => ({ value: a.key, label: a.label })),
        { value: "none", label: "No pending action" },
      ],

      sortOptions: [
        { value: "nameAsc", label: "Name (A→Z)" },
        { value: "nameDesc", label: "Name (Z→A)" },
        { value: "deadlineSoon", label: "Deadline (soonest)" },
      ],

      counts: {
        roles: roleCounts,
        stages: stageCounts,
        actions: actionCounts,
      },
    };

    // -----------------------------
    // 9) Respuesta
    // -----------------------------
    return res.json({
      success: true,
      issues: formattedIssues,
      tasks: { total: totalTasks, byType: tasksByType },
      taskCenter,
      filtersMeta,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Error fetching active issues" });
  }
};

export const removeIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const issue = await Issue.findById(id).session(session);

    if (!issue) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (issue.admin.toString() !== userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, msg: "You are not the admin of this issue" });
    }

    if (!issue.active) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, msg: "Issue is not active and cannot be deleted" });
    }

    await Evaluation.deleteMany({ issue: issue._id }).session(session);
    await Alternative.deleteMany({ issue: issue._id }).session(session);
    await Criterion.deleteMany({ issue: issue._id }).session(session);
    await Participation.deleteMany({ issue: issue._id }).session(session);
    await Consensus.deleteMany({ issue: issue._id }).session(session);
    await Notification.deleteMany({ issue: issue._id }).session(session);

    // ✅ NUEVO: borrar snapshots del issue
    await IssueExpressionDomain.deleteMany({ issue: issue._id }).session(session);

    await Issue.deleteOne({ _id: issue._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, msg: `Issue ${issue.name} removed` });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while deleting the issue",
      error: err.message,
    });
  }
};

export const removeExpressionDomain = async (req, res) => {
  const { id } = req.body;

  try {
    const domain = await ExpressionDomain.findById(id);

    if (!domain) {
      return res.status(404).json({ success: false, msg: "Domain not found" });
    }

    // ✅ Globales NO se borran
    if (domain.isGlobal || domain.user === null) {
      return res.status(403).json({
        success: false,
        msg: "Global domains are predefined and cannot be deleted.",
      });
    }

    // ✅ Solo dueño
    if (String(domain.user) !== req.uid) {
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

    // ✅ Globales NO se editan
    if (domain.isGlobal || domain.user === null) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        msg: "Global domains are predefined and cannot be edited.",
      });
    }

    // ✅ Solo dueño
    if (String(domain.user) !== userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    // ✅ Permite actualizar campos (igual que antes)
    if (updatedDomain.name) domain.name = String(updatedDomain.name).trim();
    if (updatedDomain.type) domain.type = String(updatedDomain.type).trim();
    if (updatedDomain.numericRange) domain.numericRange = updatedDomain.numericRange;
    if (updatedDomain.linguisticLabels) domain.linguisticLabels = updatedDomain.linguisticLabels;

    await domain.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      msg: "Domain updated successfully",
      data: domain,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating the domain",
      error: err.message,
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
      id: issue._id.toString(),
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
        issueId: notification.issue ? notification.issue._id : null,
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
  const { id, action } = req.body;

  const session = await mongoose.startSession();

  try {
    // Iniciar la transacción
    session.startTransaction();

    // Buscar el problema por su nombre
    const issue = await Issue.findById(id).session(session);

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
    const message = action === "accepted"
      ? `Invitation to issue ${issue.name} accepted`
      : `Invitation to issue ${issue.name} declined`;

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
    const { id, evaluations } = req.body;

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      return res
        ? res.status(404).json({ success: false, msg: "Issue not found" })
        : { success: false, msg: "Issue not found" };
    }

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
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
    const usedSnapshotIds = new Set();

    for (const [criterionName, evaluationsByExpert] of Object.entries(evaluations || {})) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue;

      for (const evaluationData of evaluationsByExpert || []) {
        const { id: alternativeName, ...rest } = evaluationData || {};
        const alternativeId = alternativeMap.get(alternativeName);
        if (!alternativeId) continue;

        // Compatibilidad:
        // - a veces llega evaluationData.expressionDomain
        // - a veces llega evaluationData.domain
        const snapshotId =
          rest?.expressionDomain?.id ||
          rest?.domain?.id ||
          null;

        if (snapshotId) usedSnapshotIds.add(String(snapshotId));

        // quitar posibles campos que no son comparaciones
        const comparisons = { ...rest };
        delete comparisons.expressionDomain;
        delete comparisons.domain;

        for (const [comparedAlternativeName, valueOrObj] of Object.entries(comparisons)) {
          if (comparedAlternativeName === alternativeName) continue;

          const comparedAlternativeId = alternativeMap.get(comparedAlternativeName);
          if (!comparedAlternativeId) continue;

          // tu UI a veces guarda {value, domain} en cada celda:
          const value = (valueOrObj && typeof valueOrObj === "object" && "value" in valueOrObj)
            ? valueOrObj.value
            : valueOrObj;

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
                  expressionDomain: snapshotId, // ✅ snapshot
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

    // ✅ validar snapshots
    if (usedSnapshotIds.size > 0) {
      const ids = Array.from(usedSnapshotIds);
      const count = await IssueExpressionDomain.countDocuments({
        _id: { $in: ids },
        issue: issue._id,
      });

      if (count !== ids.length) {
        return res
          ? res.status(400).json({ success: false, msg: "Invalid expressionDomain snapshot for this issue" })
          : { success: false, msg: "Invalid expressionDomain snapshot for this issue" };
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
    const { id } = req.body;

    const issue = await Issue.findById(id);
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
    const { id, evaluations } = req.body;

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

    // Obtener el id a partir del nombre del issue (se asume que el nombre es único)
    const issue = await Issue.findById(id).lean();
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
    const { id, forceFinalize = false } = req.body;

    // Buscar el problema por nombre
    const issue = await Issue.findById(id);

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

    const { success, msg, results: { alternatives_rankings, cm, collective_evaluations, plots_graphic, collective_scores } } = response.data;

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

    const altNames = alternatives.map(a => a.name);

    const rankedWithScores = alternatives_rankings.map((idx) => ({
      name: altNames[idx],
      score: collective_scores?.[idx] ?? null,
    }));


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
        rankedAlternatives: rankedWithScores, 
        matrices,
        // opcional:
        collective_scores: Object.fromEntries(altNames.map((n, i) => [n, collective_scores?.[i] ?? null])),
        collective_ranking: rankedWithScores.map(r => r.name),
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

    if (issue.isConsensus && forceFinalize) {
      // Si es de consenso y se está cerrando por fecha, se finaliza directamente
      issue.active = false;
      await issue.save();
      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved as final round due to closure date.`,
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
        msg: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives: rankedWithScores
      });

    }

    // Verificar si se alcanzó el umbral de consenso
    if (cm >= issue.consensusThreshold) {

      issue.active = false;
      issue.currentStage = "finished";
      await issue.save();

      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives: rankedWithScores
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
      msg: `Issue '${issue.name}' conensus threshold not reached. Another round is needed.`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "An error occurred while resolving the issue" });
  }
};

export const removeFinishedIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (issue.active) {
      return res.status(400).json({ success: false, msg: "Issue is still active" });
    }

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

    const participants = await Participation.find({ issue: issue._id });
    const exits = await ExitUserIssue.find({ issue: issue._id, hidden: true });

    const allUsersHaveHidden = participants.every((p) =>
      exits.some((e) => e.user.toString() === p.expert.toString())
    );

    if (allUsersHaveHidden) {
      await Evaluation.deleteMany({ issue: issue._id });
      await Alternative.deleteMany({ issue: issue._id });
      await Criterion.deleteMany({ issue: issue._id });
      await Participation.deleteMany({ issue: issue._id });
      await Consensus.deleteMany({ issue: issue._id });
      await Notification.deleteMany({ issue: issue._id });
      await ExitUserIssue.deleteMany({ issue: issue._id });

      // ✅ NUEVO
      await IssueExpressionDomain.deleteMany({ issue: issue._id });

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
  const { id, expertsToAdd, expertsToRemove } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findById(id).populate("model");

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (!issue.admin.equals(userId)) {
      return res.status(403).json({ success: false, msg: "Not authorized to edit this issue's experts." });
    }

    const [alternatives, criteria, latestConsensus, snapshots] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }),
      Criterion.find({ issue: issue._id }),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }),
      IssueExpressionDomain.find({ issue: issue._id }).sort({ createdAt: 1 }).lean(),
    ]);

    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    // ✅ elegimos un dominio por defecto para crear evaluaciones nuevas
    // prioridad: uno numérico si existe, si no el primero que haya
    const defaultSnapshot =
      snapshots.find((d) => d.type === "numeric") ||
      snapshots[0] ||
      null;

    if (!defaultSnapshot) {
      return res.status(400).json({
        success: false,
        msg: "This issue has no IssueExpressionDomain snapshots. Cannot add experts until domains are snapshotted.",
      });
    }

    const leafCriteria = criteria.filter((c) => c.isLeaf);
    const isPairwise = Boolean(issue.model?.isPairwise);

    // --- AÑADIR EXPERTOS ---
    for (const emailRaw of expertsToAdd || []) {
      const email = String(emailRaw || "").trim();
      if (!email) continue;

      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      const existingParticipation = await Participation.findOne({ issue: issue._id, expert: expertUser._id });

      if (!existingParticipation) {
        const isAdmin = expertUser._id.equals(userId);

        await Participation.create({
          issue: issue._id,
          expert: expertUser._id,
          invitationStatus: isAdmin ? "accepted" : "pending",
          evaluationCompleted: false,
          entryPhase: currentPhase,
        });

        if (!isAdmin) {
          const admin = await User.findById(userId);

          await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "You have been invited to an issue",
            html: `
              <html>
                <body>
                  <h2>You have been invited to the issue "${issue.name}"</h2>
                  <p>${admin.email} has invited you as an expert for the issue ${issue.name}. The issue description is:</p>
                  <p>${issue.description}</p>
                  <p>Accept the invitation to participate.</p>
                </body>
              </html>
            `,
          });

          await Notification.create({
            expert: expertUser._id,
            issue: issue._id,
            type: "invitation",
            message: `You have been invited by ${admin.name} to participate in ${issue.name}.`,
            read: false,
            requiresAction: true,
          });
        }

        // ✅ crear evaluaciones vacías para el experto nuevo usando snapshots
        const evalExists = await Evaluation.exists({ issue: issue._id, expert: expertUser._id });
        if (!evalExists) {
          const evalDocs = [];

          for (const alt of alternatives) {
            for (const crit of leafCriteria) {
              if (isPairwise) {
                for (const comparedAlt of alternatives) {
                  if (String(comparedAlt._id) === String(alt._id)) continue;

                  evalDocs.push({
                    issue: issue._id,
                    expert: expertUser._id,
                    alternative: alt._id,
                    comparedAlternative: comparedAlt._id,
                    criterion: crit._id,
                    expressionDomain: defaultSnapshot._id, // ✅ snapshot
                    value: null,
                    timestamp: null,
                    history: [],
                    consensusPhase: currentPhase,
                  });
                }
              } else {
                evalDocs.push({
                  issue: issue._id,
                  expert: expertUser._id,
                  alternative: alt._id,
                  comparedAlternative: null,
                  criterion: crit._id,
                  expressionDomain: defaultSnapshot._id, // ✅ snapshot
                  value: null,
                  timestamp: null,
                  history: [],
                  consensusPhase: currentPhase,
                });
              }
            }
          }

          if (evalDocs.length > 0) {
            await Evaluation.insertMany(evalDocs);
          }
        }
      }
    }

    // --- ELIMINAR/EXPULSAR EXPERTOS (tu lógica, igual) ---
    for (const emailRaw of expertsToRemove || []) {
      const email = String(emailRaw || "").trim();
      if (!email) continue;

      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      const participation = await Participation.findOne({ issue: issue._id, expert: expertUser._id });

      if (participation) {
        await Participation.deleteOne({ _id: participation._id });

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
            history: [
              {
                timestamp: new Date(),
                phase: currentPhase,
                reason,
              },
            ],
          });
        } else {
          exit.history.push({
            timestamp: new Date(),
            phase: currentPhase,
            reason,
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
      error: err.message,
    });
  }
};

export const leaveIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;           // ID del usuario que quiere salir

  try {
    // Buscar el issue
    const issue = await Issue.findById(id);
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

// Función para guardar evaluaciones de tipo AxC (Alternativa x Criterio)
export const saveEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      return res
        ? res.status(404).json({ success: false, msg: "Issue not found" })
        : { success: false, msg: "Issue not found" };
    }

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
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
    const usedSnapshotIds = new Set();

    for (const [alternativeName, criterionEvaluations] of Object.entries(evaluations || {})) {
      const alternativeId = alternativeMap.get(alternativeName);
      if (!alternativeId) continue;

      for (const [criterionName, evalData] of Object.entries(criterionEvaluations || {})) {
        const criterionId = criterionMap.get(criterionName);
        if (!criterionId) continue;

        const { value, domain } = evalData || {};
        const snapshotId = domain?.id || null;

        if (snapshotId) usedSnapshotIds.add(String(snapshotId));

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
                expressionDomain: snapshotId, // ✅ snapshot
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

    // ✅ Validar que los snapshots usados pertenecen a ESTE issue
    if (usedSnapshotIds.size > 0) {
      const ids = Array.from(usedSnapshotIds);
      const count = await IssueExpressionDomain.countDocuments({
        _id: { $in: ids },
        issue: issue._id,
      });

      if (count !== ids.length) {
        return res
          ? res.status(400).json({ success: false, msg: "Invalid expressionDomain snapshot for this issue" })
          : { success: false, msg: "Invalid expressionDomain snapshot for this issue" };
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
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    const [alternatives, criteria, evalDocs] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issue._id, isLeaf: true }).sort({ name: 1 }).lean(),
      Evaluation.find({
        issue: issue._id,
        expert: userId,
        comparedAlternative: null,
      })
        .populate("alternative")
        .populate("criterion")
        .populate("expressionDomain"),
    ]);

    const evalMap = new Map();
    for (const e of evalDocs) {
      const aId = e.alternative?._id?.toString();
      const cId = e.criterion?._id?.toString();
      if (!aId || !cId) continue;
      evalMap.set(`${aId}_${cId}`, e);
    }

    const evaluationsByAlternative = {};

    for (const alt of alternatives) {
      evaluationsByAlternative[alt.name] = {};

      for (const crit of criteria) {
        const key = `${alt._id.toString()}_${crit._id.toString()}`;
        const evalDoc = evalMap.get(key);

        const domain = evalDoc?.expressionDomain || null;

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
    const { id, evaluations } = req.body;

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

    // Obtener id
    const issue = await Issue.findById(id).lean();
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
    const { id, forceFinalize = false } = req.body;

    // Buscar el problema por nombre
    const issue = await Issue.findById(id);

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

    //  NEW: ranking con score incluido
    const rankedWithScores = results.collective_ranking.map((idx) => ({
      name: altNames[idx],
      score: results.collective_scores[idx]
    }));

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
        collectiveEvaluations[altName][critName] = { value: val };
      });
    });

    // ---- plots_graphic (opcional) ----
    let plotsGraphicWithEmails = null;

    const plots_graphic = results?.plots_graphic;

    // Solo si el modelo lo devuelve y viene con expert_points
    if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
      const expertPointsMap = {};

      participations.forEach((participation, index) => {
        const email = participation.expert.email;
        expertPointsMap[email] = plots_graphic.expert_points[index] ?? null;
      });

      plotsGraphicWithEmails = {
        expert_points: expertPointsMap,
        collective_point: plots_graphic.collective_point ?? null,
      };
    }

    // Guardar en Consensus
    const consensus = new Consensus({
      issue: issue._id,
      phase: currentPhase,
      level: issue.isConsensus ? (results.cm ?? 0) : null,
      timestamp: new Date(),
      details: {
        rankedAlternatives: rankedWithScores,
        matrices,
        collective_scores: collectiveScoresByName,
        collective_ranking: rankedAlternatives,
        ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
      },
      collectiveEvaluations,
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
          msg: `Issue '${issue.name}' resolved as final round due to closure date.`,
          rankedAlternatives,
        });
      }

      if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
        issue.active = false;
        await issue.save();
        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
          rankedAlternatives,
        });
      }

      if (results.cm && results.cm >= issue.consensusThreshold) {
        issue.active = false;
        await issue.save();
        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
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
        msg: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
      });
    }

    issue.active = false;
    issue.currentStage = "finished";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Issue '${issue.name}' resolved.`,
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
    const { id } = req.body;

    // 1. Buscar el problema por nombre
    const issue = await Issue.findById(id).populate('model');

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    const summary = await createSummarySection(issue._id);

    const alternativesRankings = await createAlternativesRankingsSection(issue._id)

    const expertsRatings = issue.model.isPairwise ? await createExpertsPairwiseRatingsSection(issue._id) : await createExpertsRatingsSection(issue._id)

    const analyticalGraphs = await createAnalyticalGraphsSection(issue._id, issue.isConsensus);

    const issueInfo = {
      summary,
      alternativesRankings,
      expertsRatings,
      analyticalGraphs,
    };

    return res.json({ success: true, msg: "Issue info sent", issueInfo });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, msg: "Error fetching full issue info" });
  }
};

export const saveBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, bwmData, send = false } = req.body;

    // 1️⃣ Buscar el issue
    const issue = await Issue.findById(id);
    if (!issue) {
      return res
        ? res.status(404).json({ success: false, msg: "Issue not found" })
        : { success: false, msg: "Issue not found" };
    }

    // 2️⃣ Verificar participación del experto
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation) {
      return res
        ? res.status(403).json({
          success: false,
          msg: "You are no longer a participant in this issue",
        })
        : { success: false, msg: "You are no longer a participant in this issue" };
    }

    // 3️⃣ Validar datos mínimos
    if (!bwmData.bestCriterion || !bwmData.worstCriterion) {
      return res
        ? res.status(400).json({
          success: false,
          msg: "Missing best or worst criterion",
        })
        : { success: false, msg: "Missing best or worst criterion" };
    }

    // 4️⃣ Crear payload (guardamos números directamente)
    const toIntMap = (obj) =>
      Object.fromEntries(
        Object.entries(obj || {}).map(([key, val]) => [
          key,
          val === "" || val == null ? null : parseInt(val, 10),
        ])
      );

    const payload = {
      issue: issue._id,
      expert: userId,
      bestCriterion: bwmData.bestCriterion,
      worstCriterion: bwmData.worstCriterion,
      bestToOthers: toIntMap(bwmData.bestToOthers),
      othersToWorst: toIntMap(bwmData.othersToWorst),
      completed: send, // si es envío final, lo marcamos como completado
      consensusPhase: 1,
    };

    // 5️⃣ Insertar o actualizar según exista
    const existing = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    });

    if (existing) {
      await CriteriaWeightEvaluation.updateOne(
        { _id: existing._id },
        { $set: payload }
      );
    } else {
      await CriteriaWeightEvaluation.create(payload);
    }

    // 6️⃣ Responder al cliente
    return res
      ? res.status(200).json({
        success: true,
        msg: send
          ? "Weights submitted successfully"
          : "Weights saved successfully",
      })
      : {
        success: true,
        msg: send
          ? "Weights submitted successfully"
          : "Weights saved successfully",
      };
  } catch (err) {
    console.error(err);
    return res
      ? res.status(500).json({
        success: false,
        msg: "An error occurred while saving weights",
      })
      : { success: false, msg: "An error occurred while saving weights" };
  }
};

export const getBwmWeights = async (req, res) => {
  const userId = req.uid;
  try {
    const { id } = req.body;

    // 🟢 Buscar el issue
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // 🟢 Verificar participación del usuario
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation) {
      return res
        .status(403)
        .json({ success: false, msg: "You are no longer a participant in this issue" });
    }

    // 🟢 Obtener criterios del problema
    const criteria = await Criterion.find({ issue: issue._id }).lean();

    // 🟢 Buscar si ya hay una evaluación BWM guardada
    const existingEvaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    // 🟢 Inicializar estructura vacía por defecto
    const leafCriteria = criteria.filter((c) => c.isLeaf).map((c) => c.name);

    const defaultBwmData = {
      bestCriterion: "",
      worstCriterion: "",
      bestToOthers: Object.fromEntries(leafCriteria.map((name) => [name, ""])),
      othersToWorst: Object.fromEntries(leafCriteria.map((name) => [name, ""])),
      completed: false,
    };

    // 🟢 Si hay evaluación guardada, rellenar con esos valores
    const bwmData = existingEvaluation
      ? {
        bestCriterion: existingEvaluation.bestCriterion || "",
        worstCriterion: existingEvaluation.worstCriterion || "",
        bestToOthers: { ...defaultBwmData.bestToOthers, ...existingEvaluation.bestToOthers },
        othersToWorst: { ...defaultBwmData.othersToWorst, ...existingEvaluation.othersToWorst },
        completed: existingEvaluation.completed || false,
      }
      : defaultBwmData;

    return res.status(200).json({
      success: true,
      bwmData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching weights",
    });
  }
};

export const sendBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, bwmData } = req.body;

    // 🧠 1️⃣ Validar que los datos BWM están completos
    const validation = validateFinalWeights(bwmData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        msg: validation.msg,
        field: validation.field,
      });
    }

    // 🔧 2️⃣ Normalizar autocomparaciones (best→best = 1, worst→worst = 1)
    if (bwmData.bestCriterion) {
      bwmData.bestToOthers = {
        ...bwmData.bestToOthers,
        [bwmData.bestCriterion]: 1,
      };
    }
    if (bwmData.worstCriterion) {
      bwmData.othersToWorst = {
        ...bwmData.othersToWorst,
        [bwmData.worstCriterion]: 1,
      };
    }

    // 🧩 3️⃣ Guardar los datos finales (reutilizamos saveWeights)
    const saveResult = await saveBwmWeights(req);
    if (!saveResult.success) {
      return res
        .status(500)
        .json({ success: false, msg: saveResult.msg || "Error saving weights" });
    }

    // 🧾 4️⃣ Buscar el issue
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // ✅ 5️⃣ Marcar la evaluación BWM como completada
    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      { $set: { completed: true } }
    );

    // 🧍‍♂️ 6️⃣ Marcar la participación del experto
    await Participation.updateOne(
      { issue: issue._id, expert: userId },
      { $set: { weightsCompleted: true } }
    );

    // ✅ 7️⃣ Comprobar si TODOS los expertos (excepto rechazados) han completado los pesos
    const [totalParticipants, totalWeightsDone] = await Promise.all([
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: { $in: ["accepted", "pending"] }, // participan
      }),
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: { $in: ["accepted", "pending"] },
        weightsCompleted: true,
      }),
    ]);

    // 🧩 Si todos los expertos participantes (no rechazados) han completado los pesos
    if (
      totalParticipants > 0 &&
      totalWeightsDone === totalParticipants &&
      issue.currentStage !== "weightsFinished"
    ) {
      issue.currentStage = "weightsFinished";
      await issue.save();
    }

    return res.status(200).json({
      success: true,
      msg: "Weights submitted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while sending weights",
    });
  }
};

export const computeWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    // 1️⃣ Buscar el issue
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // 2️⃣ Validar que el usuario sea el admin
    if (issue.admin.toString() !== userId) {
      return res.status(403).json({ success: false, msg: "Unauthorized: only admin can compute weights" });
    }

    // 3️⃣ Comprobar que todos los expertos participantes (no rechazados) completaron los pesos
    const pendingWeights = await Participation.find({
      issue: issue._id,
      invitationStatus: { $in: ["accepted", "pending"] },
      weightsCompleted: false,
    });

    if (pendingWeights.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their criteria weight evaluations",
      });
    }

    // 4️⃣ Obtener los criterios hoja ordenados alfabéticamente
    const criteria = await Criterion.find({ issue: issue._id, isLeaf: true }).sort({ name: 1 });
    const criterionNames = criteria.map(c => c.name);

    // 5️⃣ Obtener todas las evaluaciones de pesos (BWM)
    const weightEvaluations = await CriteriaWeightEvaluation.find({ issue: issue._id }).populate("expert", "email");

    if (weightEvaluations.length === 0) {
      return res.status(400).json({ success: false, msg: "No BWM evaluations found for this issue" });
    }

    // 6️⃣ Construir objeto con los datos por experto
    const expertsData = {};

    for (const evalDoc of weightEvaluations) {
      const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = evalDoc;

      if (!bestCriterion || !worstCriterion) continue;

      const mic = criterionNames.map(c => Number(bestToOthers?.[c]) || 1);
      const lic = criterionNames.map(c => Number(othersToWorst?.[c]) || 1);

      const email = evalDoc.expert?.email || `expert_${evalDoc.expert?._id}`;
      expertsData[email] = { mic, lic };
    }

    if (Object.keys(expertsData).length === 0) {
      return res.status(400).json({ success: false, msg: "Incomplete BWM data from experts" });
    }

    // 7️⃣ Llamar a la API de Python
    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    const response = await axios.post(`${apimodelsUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });

    const { success, msg, results } = response.data;

    if (!success) {
      return res.status(400).json({ success: false, msg });
    }

    const weights = results.weights;

    // 8️⃣ Guardar los pesos en el issue (asociados al criterio)
    issue.modelParameters.weights = [];
    criterionNames.forEach((name, i) => {
      issue.modelParameters.weights[i] = weights[i];
    });

    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Criteria weights for '${issue.name}' successfully computed.`,
      weights: issue.modelParameters.weights,
    });

  } catch (err) {
    console.error("Error in computeWeights:", err);
    return res.status(500).json({ success: false, msg: "An error occurred while computing weights" });
  }
};

export const saveManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, weigths } = req.body;

    const raw = weigths?.manualWeights || {};

    // Convertir a números
    const manualWeights = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => {
        if (v === "" || v === null) return [k, null]; // guardar vacío correctamente
        return [k, Number(v)];
      })
    );

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation)
      return res.status(403).json({ success: false, msg: "You are no longer a participant" });

    // Guardar
    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      {
        $set: {
          issue: issue._id,
          expert: userId,
          manualWeights,
          completed: false,
          consensusPhase: 1,
        },
      },
      { upsert: true }
    );

    return res.status(200).json({ success: true, msg: "Manual weights saved successfully" });

  } catch (err) {
    console.error("saveManualWeights error:", err);
    return res.status(500).json({ success: false, msg: "An error occurred while saving" });
  }
};

export const getManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation)
      return res.status(403).json({ success: false, msg: "You are no longer a participant" });

    const evaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    });

    // construir vacío si no hay datos guardados
    const criteria = await Criterion.find({ issue: issue._id, isLeaf: true });
    const empty = Object.fromEntries(criteria.map(c => [c.name, ""]));

    // Si hay evaluación, formateamos los valores null → ""
    let formatted = empty;

    if (evaluation?.manualWeights) {
      formatted = Object.fromEntries(
        Object.entries(evaluation.manualWeights).map(([k, v]) => [
          k,
          v === null ? "" : v
        ])
      );
    }

    return res.status(200).json({
      success: true,
      manualWeights: formatted,
    });

  } catch (err) {
    console.error("getManualWeights error:", err);
    return res.status(500).json({ success: false, msg: "Error fetching manual weights" });
  }
};

export const sendManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, weigths } = req.body;

    const raw = weigths?.manualWeights || {};
    const manualWeights = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Number(v)])
    );

    const issue = await Issue.findById(id);
    if (!issue)
      return res.status(404).json({ success: false, msg: "Issue not found" });

    // validar suma 1
    const sum = Object.values(manualWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.001)
      return res.status(400).json({
        success: false,
        msg: "Manual weights must sum to 1",
      });

    // guardar pesos manuales
    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      { $set: { manualWeights, completed: true } },
      { upsert: true }
    );

    // marcar participación
    await Participation.updateOne(
      { issue: issue._id, expert: userId },
      { $set: { weightsCompleted: true } }
    );

    // 🟩 NUEVO: marcar cambio de etapa cuando todos han evaluado
    const [totalParticipants, totalWeightsDone] = await Promise.all([
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: { $in: ["accepted", "pending"] }
      }),
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: { $in: ["accepted", "pending"] },
        weightsCompleted: true
      })
    ]);

    if (
      totalParticipants > 0 &&
      totalWeightsDone === totalParticipants &&
      issue.currentStage !== "weightsFinished"
    ) {
      issue.currentStage = "weightsFinished";
      await issue.save();
    }

    return res.status(200).json({
      success: true,
      msg: "Manual weights submitted successfully",
    });

  } catch (err) {
    console.error("sendManualWeights error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error submitting manual weights",
    });
  }
};

export const computeManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    // 1️⃣ Buscar issue
    const issue = await Issue.findById(id);
    if (!issue)
      return res.status(404).json({ success: false, msg: "Issue not found" });

    // 2️⃣ Solo admin
    if (issue.admin.toString() !== userId)
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: only admin can compute weights",
      });

    // 3️⃣ Validar modo
    if (issue.weightingMode !== "consensus") {
      return res.status(400).json({
        success: false,
        msg: "This issue is not using manual consensus weighting mode",
      });
    }

    // 4️⃣ Validar que todos los expertos aceptados han enviado sus pesos
    const participations = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    });

    const weightsPending = participations.filter(p => !p.weightsCompleted);

    if (weightsPending.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their criteria weight evaluations",
      });
    }

    // 5️⃣ Obtener criterios hoja (ordenados)
    const criteria = await Criterion.find({
      issue: issue._id,
      isLeaf: true,
    }).sort({ name: 1 });

    const criterionNames = criteria.map((c) => c.name);

    // 6️⃣ Obtener TODAS las evaluaciones manuales de pesos
    const evaluations = await CriteriaWeightEvaluation.find({
      issue: issue._id,
      completed: true,
    });

    if (evaluations.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No manual weight evaluations found for this issue",
      });
    }

    // 7️⃣ Calcular media aritmética por criterio
    const collectiveWeights = [];

    for (const critName of criterionNames) {
      const vals = [];

      for (const evalDoc of evaluations) {
        const v = evalDoc.manualWeights?.[critName];
        if (v !== undefined && v !== null && v !== "") {
          vals.push(Number(v));
        }
      }

      if (vals.length === 0) {
        collectiveWeights.push(0);
      } else {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        collectiveWeights.push(avg);
      }
    }

    // 8️⃣ Normalizar pesos
    let total = collectiveWeights.reduce((a, b) => a + b, 0);

    if (total <= 0) {
      const w = 1 / collectiveWeights.length;
      issue.modelParameters.weights = collectiveWeights.map(() => w);
    } else {
      issue.modelParameters.weights = collectiveWeights.map((w) => w / total);
    }

    // 9️⃣ Pasar a evaluación de alternativas
    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: "Criteria weights computed",
      weights: issue.modelParameters.weights,
      criteria: criterionNames,
    });
  } catch (err) {
    console.error("Error computing weights:");
    return res.status(500).json({
      success: false,
      msg: "Error computing manual weights",
    });
  }
};


