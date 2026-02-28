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
import { createIssueDomainSnapshots } from '../models/createIssueDomainSnapshots.js';
// Utils
import { getUserFinishedIssueIds } from '../utils/getUserFinishedIssueIds.js';
import { validateFinalEvaluations, validateFinalPairwiseEvaluations } from '../utils/validateFinalEvaluations.js';
import { createAlternativesRankingsSection, createAnalyticalGraphsSection, createExpertsPairwiseRatingsSection, createExpertsRatingsSection, createSummarySection } from '../utils/finishedIssueInfoUtils.js';
import { sendExpertInvitationEmail } from '../utils/sendEmails.js';
import { normalizeParams } from '../utils/normalizeParams.js';
import { validateFinalWeights } from '../utils/validateFinalWeights.js';
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";
import { cleanupExpertDraftsOnExit } from '../utils/cleanupExpertDraftsOnExit.js';
import { compareNameId, orderDocsByIdList, ensureIssueOrdersDb, getOrderedAlternativesDb, getOrderedLeafCriteriaDb } from "../utils/issueOrdering.js";
import { IssueScenario } from "../models/IssueScenarios.js";
import { getModelEndpointKey, detectIssueDomainTypeOrThrow } from "../utils/ScenarioUtils.js";
// Librerias externas
import { Resend } from 'resend'
import axios from "axios"
import mongoose from 'mongoose';
import dayjs from 'dayjs';

const resend = new Resend(process.env.APIKEY_RESEND)

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

      // ✅ Guardar orden canónico (estable) en el Issue
      issue.alternativeOrder = createdAlternatives
        .slice()
        .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
        .map((a) => a._id);

      issue.leafCriteriaOrder = leafCriteria
        .slice()
        .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
        .map((c) => c._id);

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
      const orderedLeafCriteria = leafCriteria
        .slice()
        .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id));

      const criteriaNames = orderedLeafCriteria.map((c) => c.name);

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
    const STAGE_META = {
      criteriaWeighting: { key: "criteriaWeighting", label: "Criteria weighting", short: "Weighting", colorKey: "info" },
      weightsFinished: { key: "weightsFinished", label: "Weights finished", short: "Weights done", colorKey: "warning" },
      alternativeEvaluation: { key: "alternativeEvaluation", label: "Alternative evaluation", short: "Evaluation", colorKey: "info" },
      alternativeConsensus: { key: "alternativeConsensus", label: "Alternative consensus", short: "Consensus", colorKey: "success" },
      finished: { key: "finished", label: "Finished", short: "Finished", colorKey: "success" },
    };

    const ACTION_META = {
      resolveIssue: { key: "resolveIssue", label: "Resolve issue", role: "admin", severity: "warning", sortPriority: 0 },
      computeWeights: { key: "computeWeights", label: "Compute weights", role: "admin", severity: "warning", sortPriority: 10 },
      evaluateWeights: { key: "evaluateWeights", label: "Evaluate weights", role: "expert", severity: "info", sortPriority: 30 },
      evaluateAlternatives: { key: "evaluateAlternatives", label: "Evaluate alternatives", role: "expert", severity: "info", sortPriority: 40 },
      waitingAdmin: { key: "waitingAdmin", label: "Waiting admin", role: "expert", severity: "success", sortPriority: 60 },
    };

    const TASK_ACTION_KEYS = ["resolveIssue", "computeWeights", "evaluateWeights", "evaluateAlternatives"];

    const safeOid = (v) => (v ? String(v) : "");
    const uniq = (arr) => Array.from(new Set(arr));
    const inc = (obj, key) => {
      obj[key] = (obj[key] || 0) + 1;
      return obj;
    };

    const cleanModelParameters = (mp) => {
      const obj = mp && typeof mp === "object" ? { ...mp } : {};
      if ("weights" in obj) delete obj.weights;
      return obj;
    };

    const detectHasDirectWeights = (issue) => {
      const wm = String(issue?.weightingMode || "").toLowerCase();
      if (["manual", "direct", "predefined", "fixed"].includes(wm)) return true;

      const w = issue?.modelParameters?.weights;
      if (Array.isArray(w) && w.length > 0 && w.some((x) => x !== null && x !== undefined)) return true;

      return false;
    };

    const detectHasAlternativeConsensusEnabled = (issue) => Boolean(issue?.isConsensus);

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

    const [adminIssues, acceptedParticipations] = await Promise.all([
      Issue.find({ admin: userId, active: true }).select("_id").lean(),
      Participation.find({ expert: userId, invitationStatus: "accepted" })
        .populate({ path: "issue", match: { active: true }, select: "_id" })
        .lean(),
    ]);

    const adminIssueIds = adminIssues.map((i) => safeOid(i._id));
    const adminIssueIdSet = new Set(adminIssueIds);

    const expertIssueIds = acceptedParticipations
      .filter((p) => p.issue)
      .map((p) => safeOid(p.issue._id));

    const issueIds = uniq([...adminIssueIds, ...expertIssueIds]);

    const emptyTasksByType = {
      resolveIssue: [],
      computeWeights: [],
      evaluateWeights: [],
      evaluateAlternatives: [],
      waitingAdmin: [],
    };

    if (issueIds.length === 0) {
      return res.json({
        success: true,
        issues: [],
        tasks: { total: 0, byType: emptyTasksByType },
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

    const [issues, allParticipations, alternatives, criteria, consensusPhases] = await Promise.all([
      Issue.find({ _id: { $in: issueIds } }).populate("model").populate("admin", "email name").lean(),
      Participation.find({ issue: { $in: issueIds } }).populate("expert", "email").lean(),
      Alternative.find({ issue: { $in: issueIds } }).lean(),
      Criterion.find({ issue: { $in: issueIds } }).lean(),
      Consensus.find({ issue: { $in: issueIds } }, "issue phase").lean(),
    ]);

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

    const tasksByType = {
      resolveIssue: [],
      computeWeights: [],
      evaluateWeights: [],
      evaluateAlternatives: [],
      waitingAdmin: [],
    };

    const formattedIssues = issues.map((issue) => {
      const issueIdStr = safeOid(issue._id);
      const issueParticipations = participationMap[issueIdStr] || [];

      const isValidUserId = Boolean(userId) && userId !== "undefined" && userId !== "null" && userId !== "[object Object]";
      const adminId = (() => {
        const a = issue?.admin;
        if (!a) return "";
        if (typeof a === "string") return a;
        if (typeof a === "object" && a._id) return safeOid(a._id);
        return "";
      })();

      const isAdminUser = isValidUserId && ((adminId && adminId === userId) || adminIssueIdSet.has(issueIdStr));

      const acceptedExperts = issueParticipations.filter((p) => p.invitationStatus === "accepted");
      const pendingExperts = issueParticipations.filter((p) => p.invitationStatus === "pending");
      const declinedExperts = issueParticipations.filter((p) => p.invitationStatus === "declined");

      const hasPending = pendingExperts.length > 0;
      const realParticipants = acceptedExperts;

      const totalAccepted = acceptedExperts.length;
      const weightsDone = acceptedExperts.filter((p) => p.weightsCompleted).length;
      const evalsDone = acceptedExperts.filter((p) => p.evaluationCompleted).length;

      const realWeightsDone = realParticipants.filter((p) => p.weightsCompleted).length;
      const realEvalsDone = realParticipants.filter((p) => p.evaluationCompleted).length;

      const isExpertAccepted = acceptedExperts.some((p) => safeOid(p.expert?._id) === userId);

      const myParticipation = issueParticipations.find((p) => safeOid(p.expert?._id) === userId) || null;

      const issueAltDocs = alternativesMap[issueIdStr] || [];
      const orderedAltDocs = orderDocsByIdList(issueAltDocs, issue.alternativeOrder);
      const altNames = orderedAltDocs.map((a) => a.name);

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

      // ✅ Orden estable de hojas para mapear weights[] correctamente
      const leafNodes = issueCriteria.filter((n) => n.isLeaf);

      const orderedLeafNodes = orderDocsByIdList(leafNodes, issue.leafCriteriaOrder, {
        getId: (n) => n.id,      // ojo: aquí tu id ya es string
        getName: (n) => n.name,
      });

      const weightsArray = issue.modelParameters?.weights || [];

      // map por ID (evita líos si un día hay nombres repetidos)
      const finalWeightsById = orderedLeafNodes.reduce((acc, node, idx) => {
        acc[node.id] = weightsArray[idx] ?? null;
        return acc;
      }, {});

      // compat (tu respuesta actual usa finalWeights por nombre)
      const finalWeightsMap = orderedLeafNodes.reduce((acc, node, idx) => {
        acc[node.name] = weightsArray[idx] ?? null;
        return acc;
      }, {});

      const decorate = (node, depth = 0) => {
        const isLeaf = Boolean(node.isLeaf) || !(node.children?.length);

        node.depth = depth;
        node.display = {
          showType: depth === 0,
          showWeight: isLeaf,
          weight: isLeaf ? (finalWeightsById?.[node.id] ?? null) : null,
        };

        if (node.children?.length) node.children.forEach((ch) => decorate(ch, depth + 1));
      };
      criteriaTree.forEach((r) => decorate(r, 0));

      const savedPhasesCount = consensusPhaseCountMap[issueIdStr] || 0;
      const consensusCurrentPhase = savedPhasesCount + 1;

      const closureDateStr = issue.closureDate;
      let deadline = { hasDeadline: false, daysLeft: null, overdue: false, iso: null };
      if (closureDateStr) {
        const d = dayjs(closureDateStr, "DD-MM-YYYY", true);
        if (d.isValid()) {
          const daysLeft = d.startOf("day").diff(dayjs().startOf("day"), "day");
          deadline = { hasDeadline: true, daysLeft, overdue: daysLeft < 0, iso: d.toISOString() };
        }
      }

      const stage = issue.currentStage;

      const allWeightsDone = realParticipants.length > 0 && realWeightsDone === realParticipants.length;
      const allEvalsDone = realParticipants.length > 0 && realEvalsDone === realParticipants.length;

      const waitingAdmin =
        !isAdminUser &&
        !hasPending &&
        ((stage === "weightsFinished" && allWeightsDone) || (stage === "alternativeEvaluation" && allEvalsDone));

      const canComputeWeights =
        stage === "weightsFinished" && isAdminUser && !hasPending && realParticipants.length > 0 && allWeightsDone;

      const canResolveIssue =
        stage === "alternativeEvaluation" && isAdminUser && !hasPending && realParticipants.length > 0 && allEvalsDone;

      const canEvaluateWeights =
        stage === "criteriaWeighting" &&
        isExpertAccepted &&
        realParticipants.some((p) => safeOid(p.expert?._id) === userId && !p.weightsCompleted);

      const canEvaluateAlternatives =
        stage === "alternativeEvaluation" &&
        isExpertAccepted &&
        realParticipants.some((p) => safeOid(p.expert?._id) === userId && !p.evaluationCompleted);

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

      const actions = [];
      if (canResolveIssue) actions.push(ACTION_META.resolveIssue);
      if (canComputeWeights) actions.push(ACTION_META.computeWeights);
      if (canEvaluateWeights) actions.push(ACTION_META.evaluateWeights);
      if (canEvaluateAlternatives) actions.push(ACTION_META.evaluateAlternatives);

      actions.sort((a, b) => a.sortPriority - b.sortPriority);
      const nextAction = actions[0] ?? null;

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

      const sortPriority = waitingAdmin ? (ACTION_META.waitingAdmin?.sortPriority ?? 60) : nextAction ? nextAction.sortPriority : 80;

      for (const a of actions) {
        if (!TASK_ACTION_KEYS.includes(a.key)) continue;
        if (a.role === "admin" && !isAdminUser) continue;
        if (a.role === "expert" && !isExpertAccepted) continue;

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
        isAdminUser && isExpertAccepted ? "both" : isAdminUser ? "admin" : isExpertAccepted ? "expert" : "viewer";

      const modelParameters = cleanModelParameters(issue.modelParameters);

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
          participatedExperts.length + pendingExperts.length + declinedExperts.length + acceptedButNotEvaluated.length,
        participatedExperts: participatedExperts.map((p) => p.expert.email).sort(),
        pendingExperts: pendingExperts.map((p) => p.expert.email).sort(),
        notAcceptedExperts: declinedExperts.map((p) => p.expert.email).sort(),
        acceptedButNotEvaluatedExperts: acceptedButNotEvaluated.map((p) => p.expert.email).sort(),
        statusFlags,
        progress: { weightsDone, evalsDone, totalAccepted },
        finalWeights: finalWeightsMap,
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
          hasDirectWeights,
          hasAlternativeConsensus,
          workflowSteps,
          permissions: {
            evaluateWeights: canEvaluateWeights,
            evaluateAlternatives: canEvaluateAlternatives,
            computeWeights: canComputeWeights,
            resolveIssue: canResolveIssue,
            waitingAdmin,
            waitingExperts: statusKey === "waitingExperts",
          },
          modelParameters,
        },
      };
    });

    formattedIssues.sort((a, b) => {
      const ap = a.ui?.sortPriority ?? 90;
      const bp = b.ui?.sortPriority ?? 90;
      if (ap !== bp) return ap - bp;

      const ad = a.ui?.deadline?.hasDeadline ? a.ui.deadline.daysLeft : 999999;
      const bd = b.ui?.deadline?.hasDeadline ? b.ui.deadline.daysLeft : 999999;
      if (ad !== bd) return ad - bd;

      return String(a.name).localeCompare(String(b.name));
    });

    for (const k of TASK_ACTION_KEYS) {
      (tasksByType[k] || []).sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        const ad = a.deadline?.hasDeadline ? a.deadline.daysLeft : 999999;
        const bd = b.deadline?.hasDeadline ? b.deadline.daysLeft : 999999;
        if (ad !== bd) return ad - bd;
        return String(a.issueName).localeCompare(String(b.issueName));
      });
    }

    const totalTasks = TASK_ACTION_KEYS.reduce((acc, k) => acc + (tasksByType[k]?.length || 0), 0);

    const taskCenterSections = Object.values(ACTION_META)
      .filter((m) => TASK_ACTION_KEYS.includes(m.key))
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

    const taskCenter = { total: totalTasks, sections: taskCenterSections };

    const roleCounts = {};
    const stageCounts = {};
    const actionCounts = {};

    for (const it of formattedIssues) {
      inc(roleCounts, it.role || "viewer");
      inc(stageCounts, it.ui?.stage || it.currentStage || "unknown");
      const actionKey = it.ui?.statusKey || it.nextAction?.key || "none";
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
      stageOptions: [{ value: "all", label: "All stages" }, ...Object.values(STAGE_META).map((s) => ({ value: s.key, label: s.label }))],
      actionOptions: [
        { value: "all", label: "All actions" },
        { value: "waitingExperts", label: "Waiting experts" },
        ...Object.values(ACTION_META).sort((a, b) => a.sortPriority - b.sortPriority).map((a) => ({ value: a.key, label: a.label })),
        { value: "none", label: "No pending action" },
      ],
      sortOptions: [
        { value: "nameAsc", label: "Name (A→Z)" },
        { value: "nameDesc", label: "Name (Z→A)" },
        { value: "deadlineSoon", label: "Deadline (soonest)" },
      ],
      counts: { roles: roleCounts, stages: stageCounts, actions: actionCounts },
    };

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

    const defaultSnapshot =
      (await IssueExpressionDomain.findOne({ issue: issue._id, type: "numeric" }).sort({ createdAt: 1 }).lean())
      || (await IssueExpressionDomain.findOne({ issue: issue._id }).sort({ createdAt: 1 }).lean());

    if (!defaultSnapshot) {
      return res.status(400).json({ success: false, msg: "This issue has no IssueExpressionDomain snapshots." });
    }

    const defaultSnapshotId = String(defaultSnapshot._id);

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
          defaultSnapshotId; // ✅ fallback SIEMPRE

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

    await ensureIssueOrdersDb({ issueId: issue._id });

    const alternatives = await getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });
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

  const mapStage = (stage) => {
    if (stage === "criteriaWeighting" || stage === "weightsFinished") return "criteriaWeighting";
    if (stage === "alternativeEvaluation") return "alternativeEvaluation";
    return null;
  };

  try {
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (issue.active) {
      return res.status(400).json({ success: false, msg: "Issue is still active" });
    }

    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : null;

    const now = new Date();
    const stageForLog = mapStage(issue.currentStage);

    const entry = {
      timestamp: now,
      phase: currentPhase,
      stage: stageForLog,
      action: "exited",
      reason: "Issue finished and removed for user",
    };

    await ExitUserIssue.findOneAndUpdate(
      { issue: issue._id, user: userId },
      {
        $setOnInsert: { issue: issue._id, user: userId },
        $set: {
          hidden: true,
          timestamp: now,
          phase: currentPhase,
          stage: stageForLog,
          reason: "Issue finished and removed for user",
        },
        $push: { history: entry },
      },
      { upsert: true, new: true }
    );

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

export const editExperts = async (req, res) => {
  const { id, expertsToAdd, expertsToRemove } = req.body;
  const userId = req.uid;

  // ✅ Mapea el currentStage real del Issue a lo que permite ExitUserIssue/Participation
  const mapStage = (stage) => {
    if (stage === "criteriaWeighting" || stage === "weightsFinished") return "criteriaWeighting";
    if (stage === "alternativeEvaluation") return "alternativeEvaluation";
    return null; // finished u otros -> null (porque tu enum no los permite)
  };

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
    const stageForLog = mapStage(issue.currentStage);

    // ✅ elegimos un dominio por defecto para crear evaluaciones nuevas
    const defaultSnapshot = snapshots.find((d) => d.type === "numeric") || snapshots[0] || null;

    if (!defaultSnapshot) {
      return res.status(400).json({
        success: false,
        msg: "This issue has no IssueExpressionDomain snapshots. Cannot add experts until domains are snapshotted.",
      });
    }

    const leafCriteria = criteria.filter((c) => c.isLeaf);
    const isPairwise = Boolean(issue.model?.isPairwise);

    // =========================
    // --- AÑADIR EXPERTOS ---
    // =========================
    for (const emailRaw of expertsToAdd || []) {
      const email = String(emailRaw || "").trim();
      if (!email) continue;

      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      const existingParticipation = await Participation.findOne({
        issue: issue._id,
        expert: expertUser._id,
      });

      if (existingParticipation) continue;

      const isAdminExpert = expertUser._id.equals(userId);

      // ✅ weightsCompleted para el nuevo experto:
      // - si estamos en criteriaWeighting/weightsFinished -> false (debe hacer pesos)
      // - si estamos en alternativeEvaluation -> true (pesos ya están)
      const weightsCompleted = stageForLog !== "criteriaWeighting";

      await Participation.create({
        issue: issue._id,
        expert: expertUser._id,
        invitationStatus: isAdminExpert ? "accepted" : "pending",
        evaluationCompleted: false,
        weightsCompleted,
        entryPhase: currentPhase,
        entryStage: stageForLog,
        joinedAt: new Date(),
      });

      // Email + notificación (solo si no es el admin)
      if (!isAdminExpert) {
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

      // ✅ crear evaluaciones vacías (si no existen)
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
                  expressionDomain: defaultSnapshot._id,
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
                expressionDomain: defaultSnapshot._id,
                value: null,
                timestamp: null,
                history: [],
                consensusPhase: currentPhase,
              });
            }
          }
        }

        if (evalDocs.length > 0) await Evaluation.insertMany(evalDocs);
      }
    }

    // ==================================
    // --- ELIMINAR / EXPULSAR EXPERTOS ---
    // ==================================
    for (const emailRaw of expertsToRemove || []) {
      const email = String(emailRaw || "").trim();
      if (!email) continue;

      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      // ❌ no permitir expulsar al admin
      if (expertUser._id.equals(issue.admin)) continue;

      const participation = await Participation.findOne({
        issue: issue._id,
        expert: expertUser._id,
      });

      if (!participation) continue;

      await cleanupExpertDraftsOnExit({ issueId: issue._id, expertId: expertUser._id });

      await Participation.deleteOne({ _id: participation._id });

      // ✅ EXIT LOG con enum correcto
      const now = new Date();
      const exitEntry = {
        timestamp: now,
        phase: currentPhase,
        stage: stageForLog,
        action: "exited", // ✅ SOLO "entered" o "exited"
        reason: "Expelled by admin",
      };

      await ExitUserIssue.findOneAndUpdate(
        { issue: issue._id, user: expertUser._id },
        {
          $setOnInsert: { issue: issue._id, user: expertUser._id },
          $set: {
            hidden: true,
            timestamp: now,
            phase: currentPhase,
            stage: stageForLog,
            reason: "Expelled by admin",
          },
          $push: { history: exitEntry },
        },
        { upsert: true, new: true }
      );
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
  const userId = req.uid;

  const mapStage = (stage) => {
    if (stage === "criteriaWeighting" || stage === "weightsFinished") return "criteriaWeighting";
    if (stage === "alternativeEvaluation") return "alternativeEvaluation";
    return null;
  };

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    if (issue.admin.equals(userId)) {
      return res.status(403).json({ success: false, msg: "An admin can not leave an issue" });
    }

    const participation = await Participation.findOne({ issue: issue._id, expert: userId });
    if (!participation) {
      return res.status(400).json({ success: false, msg: "You are not a participant of this issue" });
    }

    await cleanupExpertDraftsOnExit({ issueId: issue._id, expertId: userId });

    await Participation.deleteOne({ _id: participation._id });

    const latestConsensus = await Consensus.findOne({ issue: issue._id }).sort({ phase: -1 });
    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

    const now = new Date();
    const stageForLog = mapStage(issue.currentStage);

    const exitEntry = {
      timestamp: now,
      phase: currentPhase,
      stage: stageForLog,
      action: "exited",
      reason: "Left by user",
    };

    await ExitUserIssue.findOneAndUpdate(
      { issue: issue._id, user: userId },
      {
        $setOnInsert: { issue: issue._id, user: userId },
        $set: {
          hidden: true,
          timestamp: now,
          phase: currentPhase,
          stage: stageForLog,
          reason: "Left by user",
        },
        $push: { history: exitEntry },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, msg: "You have left the issue successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while leaving issue",
      error: err.message,
    });
  }
};

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
    await ensureIssueOrdersDb({ issueId: issue._id });

    const alternatives = await getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    });

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

    console.log(rankedWithScores)

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

const ensureLen = (arr, len, filler = null) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  if (a.length < len) return [...a, ...Array(len - a.length).fill(filler)];
  if (a.length > len) return a.slice(0, len);
  return a;
};

const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const out = {};

  for (const p of modelDoc?.parameters || []) {
    const name = p.name;
    const type = p.type;
    const def = p.default;

    if (type === "number") {
      out[name] = def ?? null;
      continue;
    }

    if (type === "array") {
      const len =
        p?.restrictions?.length === "matchCriteria"
          ? leafCount
          : (typeof p?.restrictions?.length === "number" ? p.restrictions.length : null) ??
          (Array.isArray(def) ? def.length : 2);

      const base = Array.isArray(def) ? def : [];
      out[name] = ensureLen(base, len, null);
      continue;
    }

    if (type === "fuzzyArray") {
      const len =
        p?.restrictions?.length === "matchCriteria"
          ? leafCount
          : (typeof p?.restrictions?.length === "number" ? p.restrictions.length : null) ??
          (Array.isArray(def) ? def.length : 1);

      // cada item es [l,m,u]
      const base = Array.isArray(def) ? def : [];
      const filled = ensureLen(base, len, [null, null, null]).map((t) =>
        Array.isArray(t) && t.length === 3 ? t : [null, null, null]
      );
      out[name] = filled;
      continue;
    }

    // fallback
    out[name] = def ?? null;
  }

  return out;
};

const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  // merge simple: saved tiene prioridad
  const out = { ...(defaultsResolved || {}) };

  for (const [k, v] of Object.entries(savedParams || {})) {
    out[k] = v;
  }

  return out;
};

export const getFinishedIssueInfo = async (req, res) => {
  try {
    const { id } = req.body;

    // ✅ usa doc (no lean) porque ensureIssueOrdersDb puede backfillear órdenes
    const issue = await Issue.findById(id).populate("model");
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    // --- tus secciones actuales ---
    const summary = await createSummarySection(issue._id);
    const alternativesRankings = await createAlternativesRankingsSection(issue._id);
    const expertsRatings = issue.model.isPairwise
      ? await createExpertsPairwiseRatingsSection(issue._id)
      : await createExpertsRatingsSection(issue._id);
    const analyticalGraphs = await createAnalyticalGraphsSection(issue._id, issue.isConsensus);

    // ============================
    // ✅ NUEVO: modelParams section
    // ============================
    const orderedIssue = await ensureIssueOrdersDb({ issueId: issue._id });

    const leafDocs = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: orderedIssue,
      select: "_id name type",
      lean: true,
    });

    const leafCount = leafDocs.length;
    const leafCriteria = leafDocs.map((c) => ({ id: String(c._id), name: c.name, type: c.type }));

    // domainType del issue (numeric/linguistic). Si falla, lo dejamos null.
    const parts = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    }).select("expert").lean();

    const expertIds = parts.map((p) => p.expert);
    let domainType = null;
    try {
      const detected = await detectIssueDomainTypeOrThrow({ issueId: issue._id, expertIds });
      domainType = detected.domainType;
    } catch (e) {
      domainType = null;
    }

    // modelos disponibles
    const allModels = await IssueModel.find()
      .select("name isConsensus isPairwise isMultiCriteria smallDescription extendDescription moreInfoUrl parameters supportedDomains")
      .lean();

    const isPairwiseIssue = Boolean(issue.model?.isPairwise);

    const availableModels = allModels.map((m) => {
      const defaultsResolved = buildDefaultsResolved({ modelDoc: m, leafCount });

      const compat = {
        pairwise: Boolean(m.isPairwise) === isPairwiseIssue,
        domain: domainType ? Boolean(m.supportedDomains?.[domainType]?.enabled) : true,
      };

      return {
        id: String(m._id),
        name: m.name,
        isConsensus: Boolean(m.isConsensus),
        isPairwise: Boolean(m.isPairwise),
        isMultiCriteria: Boolean(m.isMultiCriteria),
        smallDescription: m.smallDescription,
        moreInfoUrl: m.moreInfoUrl,
        parameters: m.parameters || [],
        defaultsResolved,
        compatibility: compat,
      };
    });

    // base model (con el que se resolvió)
    const baseModel = issue.model; // viene populado
    const baseDefaultsResolved = buildDefaultsResolved({
      modelDoc: baseModel?.toObject ? baseModel.toObject() : baseModel,
      leafCount,
    });

    const baseParamsSaved = issue.modelParameters || {};
    const baseParamsResolved = mergeParamsResolved({
      defaultsResolved: baseDefaultsResolved,
      savedParams: baseParamsSaved,
    });

    // ============================
    // ✅ NUEVO: escenarios ya creados para el issue
    // ============================
    const [scenarioDocs, latestConsensus] = await Promise.all([
      IssueScenario.find({ issue: issue._id })
        .sort({ createdAt: -1 })
        .select("_id name targetModel targetModelName domainType isPairwise status createdAt createdBy")
        .populate("createdBy", "email name")
        .lean(),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }).lean(),
    ]);

    const scenarios = (scenarioDocs || []).map((s) => ({
      id: String(s._id),
      name: s.name || "",
      targetModelId: s.targetModel ? String(s.targetModel) : null,
      targetModelName: s.targetModelName || "",
      domainType: s.domainType ?? null,
      isPairwise: Boolean(s.isPairwise),
      status: s.status || "done",
      createdAt: s.createdAt || null,
      createdBy: s.createdBy
        ? { email: s.createdBy.email, name: s.createdBy.name }
        : null,
    }));

    // “Base scenario” virtual (para que nunca aparezca vacío)
    const baseScenario = {
      id: null,
      name: `Base (${baseModel?.name || "Model"})`,
      targetModelId: String(baseModel?._id),
      targetModelName: baseModel?.name || "",
      domainType,
      isPairwise: Boolean(isPairwiseIssue),
      status: "done",
      createdAt: latestConsensus?.timestamp || null,
      createdBy: null,
      // opcional: si tu UI quiere pintar ranking rápido sin pedir scenarioById
      preview: latestConsensus?.details?.rankedAlternatives || null,
    };

    const scenariosWithBase = [baseScenario, ...scenarios];

    const issueInfo = {
      summary,
      alternativesRankings,
      expertsRatings,
      analyticalGraphs,
      scenarios: scenariosWithBase,
      modelParams: {
        leafCriteria,       // para matchCriteria en UI
        domainType,         // útil para filtrar/avisar
        base: {
          modelId: String(baseModel?._id),
          modelName: baseModel?.name,
          parameters: baseModel?.parameters || [],
          paramsSaved: baseParamsSaved,       // lo que realmente se usó/guardó
          paramsResolved: baseParamsResolved, // con defaults rellenados
        },
        availableModels,
      },
    };

    return res.json({ success: true, msg: "Issue info sent", issueInfo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Error fetching full issue info" });
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

    // 1) Issue
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    // 2) Participación
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

    // ✅ 3) Asegurar órdenes del issue (por si es antiguo)
    const orderedIssue = await ensureIssueOrdersDb({ issueId: issue._id });

    // ✅ 4) Criterios hoja en orden canónico
    const leafDocs = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: orderedIssue,
      select: "_id name",
      lean: true,
    });

    const leafNames = leafDocs.map((c) => c.name);

    // 5) Evaluación BWM existente (si existe)
    const existingEvaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    // ✅ 6) Defaults en orden estable
    const bestToOthers = {};
    const othersToWorst = {};

    for (const name of leafNames) {
      const v1 = existingEvaluation?.bestToOthers?.[name];
      const v2 = existingEvaluation?.othersToWorst?.[name];

      bestToOthers[name] = v1 === null || v1 === undefined ? "" : v1;
      othersToWorst[name] = v2 === null || v2 === undefined ? "" : v2;
    }

    const bwmData = {
      bestCriterion: existingEvaluation?.bestCriterion || "",
      worstCriterion: existingEvaluation?.worstCriterion || "",
      bestToOthers,
      othersToWorst,
      completed: existingEvaluation?.completed || false,
    };

    return res.status(200).json({
      success: true,
      bwmData,
    });
  } catch (err) {
    console.error("getBwmWeights error:", err);
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

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({ success: false, msg: "Unauthorized: only admin can compute weights" });
    }

    // ✅ Backfill orders si el issue es antiguo
    await ensureIssueOrdersDb({ issueId: issue._id });

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

    // ✅ criterios hoja en orden canónico
    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criterionNames = criteria.map((c) => c.name);

    const weightEvaluations = await CriteriaWeightEvaluation.find({ issue: issue._id }).populate("expert", "email");

    if (weightEvaluations.length === 0) {
      return res.status(400).json({ success: false, msg: "No BWM evaluations found for this issue" });
    }

    const expertsData = {};

    for (const evalDoc of weightEvaluations) {
      const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = evalDoc;
      if (!bestCriterion || !worstCriterion) continue;

      const mic = criterionNames.map((c) => Number(bestToOthers?.[c]) || 1);
      const lic = criterionNames.map((c) => Number(othersToWorst?.[c]) || 1);

      const email = evalDoc.expert?.email || `expert_${evalDoc.expert?._id}`;
      expertsData[email] = { mic, lic };
    }

    if (Object.keys(expertsData).length === 0) {
      return res.status(400).json({ success: false, msg: "Incomplete BWM data from experts" });
    }

    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    const response = await axios.post(`${apimodelsUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });

    const { success, msg, results } = response.data;
    if (!success) return res.status(400).json({ success: false, msg });

    const weights = results?.weights || [];

    issue.modelParameters = { ...(issue.modelParameters || {}), weights: weights.slice(0, criterionNames.length) };
    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Criteria weights for '${issue.name}' successfully computed.`,
      weights: issue.modelParameters.weights,
      criteriaOrder: criterionNames, // útil para debug
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

    // 1) Issue
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    // 2) Participación
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation) {
      return res.status(403).json({ success: false, msg: "You are no longer a participant" });
    }

    // ✅ 3) Asegurar que el issue tiene orden canónico guardado (para issues antiguos)
    const orderedIssue = await ensureIssueOrdersDb({ issueId: issue._id });

    // ✅ 4) Criterios hoja en orden estable/canónico
    const leafDocs = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: orderedIssue, // importante para usar leafCriteriaOrder
      select: "_id name",
      lean: true,
    });

    const leafNames = leafDocs.map((c) => c.name);

    // 5) Evaluación guardada (si existe)
    const evaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    // ✅ 6) Construir objeto SIEMPRE con el mismo orden (leafNames)
    const manualWeights = {};
    for (const name of leafNames) {
      const v = evaluation?.manualWeights?.[name];
      manualWeights[name] = v === null || v === undefined ? "" : v;
    }

    return res.status(200).json({
      success: true,
      manualWeights,
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

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({ success: false, msg: "Unauthorized: only admin can compute weights" });
    }

    if (issue.weightingMode !== "consensus") {
      return res.status(400).json({ success: false, msg: "This issue is not using manual consensus weighting mode" });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const participations = await Participation.find({ issue: issue._id, invitationStatus: "accepted" });
    const weightsPending = participations.filter((p) => !p.weightsCompleted);

    if (weightsPending.length > 0) {
      return res.status(400).json({ success: false, msg: "Not all experts have completed their criteria weight evaluations" });
    }

    // ✅ criterios hoja en orden canónico
    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criterionNames = criteria.map((c) => c.name);

    const evaluations = await CriteriaWeightEvaluation.find({ issue: issue._id, completed: true });
    if (evaluations.length === 0) {
      return res.status(400).json({ success: false, msg: "No manual weight evaluations found for this issue" });
    }

    const collectiveWeights = [];

    for (const critName of criterionNames) {
      const vals = [];
      for (const evalDoc of evaluations) {
        const v = evalDoc.manualWeights?.[critName];
        if (v !== undefined && v !== null && v !== "") vals.push(Number(v));
      }
      collectiveWeights.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    }

    const total = collectiveWeights.reduce((a, b) => a + b, 0);

    issue.modelParameters = { ...(issue.modelParameters || {}) };

    if (total <= 0) {
      const w = 1 / collectiveWeights.length;
      issue.modelParameters.weights = collectiveWeights.map(() => w);
    } else {
      issue.modelParameters.weights = collectiveWeights.map((w) => w / total);
    }

    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: "Criteria weights computed",
      weights: issue.modelParameters.weights,
      criteriaOrder: criterionNames,
    });
  } catch (err) {
    console.error("Error computing manual weights:", err);
    return res.status(500).json({ success: false, msg: "Error computing manual weights" });
  }
};

export const createIssueScenario = async (req, res) => {
  const userId = req.uid;

  const httpError = (status, message) => {
    const e = new Error(message);
    e.status = status;
    throw e;
  };

  const asOidStr = (v) => (v ? String(v) : "");

  // Para evitar líos: aceptar weights como array o como mapa por nombre/id
  const resolveWeightsArray = ({ paramsUsed, criteria }) => {
    const w = paramsUsed?.weights;

    // array directo
    if (Array.isArray(w)) return w;

    // mapa por nombre
    if (w && typeof w === "object") {
      const byName = w;
      return criteria.map((c) => (byName[c.name] != null ? byName[c.name] : null));
    }

    return null;
  };

  try {
    const {
      issueId,
      targetModelName,
      targetModelId,
      scenarioName = "",
      paramOverrides = {},
    } = req.body || {};

    if (!userId) return res.status(401).json({ success: false, msg: "Unauthorized" });
    if (!issueId) return res.status(400).json({ success: false, msg: "issueId is required" });

    console.log(req.body)

    // 1) Issue + modelo actual
    const issue = await Issue.findById(issueId).populate("model");
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    // ✅ permisos: admin del issue (si quieres permitir expertos, lo cambiamos)
    if (String(issue.admin) !== String(userId)) {
      return res.status(403).json({ success: false, msg: "Not authorized: only admin can create scenarios" });
    }

    // 2) checks “no tocar evaluaciones”
    const [consensusCount, pendingInv, participations] = await Promise.all([
      Consensus.countDocuments({ issue: issue._id }),
      Participation.countDocuments({ issue: issue._id, invitationStatus: "pending" }),
      Participation.find({ issue: issue._id, invitationStatus: "accepted" }).populate("expert", "email"),
    ]);

    // Si es consenso y hay >1 fase guardada, tú ya lo bloqueabas (bien)
    if (issue.isConsensus && consensusCount > 1) {
      return res.status(400).json({
        success: false,
        msg: "Simulation disabled: consensus issues with more than 1 saved phase are not supported yet.",
      });
    }

    if (pendingInv > 0) {
      return res.status(400).json({ success: false, msg: "Simulation requires no pending invitations." });
    }

    if (!participations.length) {
      return res.status(400).json({ success: false, msg: "No accepted experts found" });
    }

    // 3) Target model
    let targetModel = null;
    if (targetModelId) targetModel = await IssueModel.findById(targetModelId);
    if (!targetModel && targetModelName) targetModel = await IssueModel.findOne({ name: targetModelName });

    if (!targetModel) {
      return res.status(404).json({ success: false, msg: "Target model not found" });
    }

    // 4) Compat AxA/AxC
    const isPairwiseIssue = Boolean(issue.model?.isPairwise);
    if (Boolean(targetModel.isPairwise) !== isPairwiseIssue) {
      return res.status(400).json({
        success: false,
        msg: "Incompatible models: pairwise (AxA) does not match this issue input type.",
      });
    }

    // 5) Orden canónico + inputs base (alt/crit)
    await ensureIssueOrdersDb({ issueId: issue._id });

    const [alternatives, criteria] = await Promise.all([
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name type",
        lean: true,
      }),
    ]);

    if (!alternatives.length || !criteria.length) {
      httpError(400, "Issue has no alternatives/leaf criteria");
    }

    const criterionTypes = criteria.map((c) => (c.type === "benefit" ? "max" : "min"));
    const expertIds = participations.map((p) => p.expert?._id).filter(Boolean);

    // 6) Detect domain type (no mezclar)
    // (si falla, no rompemos, pero la compat de modelos podría ser menos estricta)
    let domainType = null;
    try {
      const detected = await detectIssueDomainTypeOrThrow({ issueId: issue._id, expertIds });
      domainType = detected.domainType;
    } catch (e) {
      domainType = null;
    }

    // Si tienes supportedDomains en modelos, puedes mantener esta validación:
    if (domainType && targetModel?.supportedDomains) {
      const supportsDomain = Boolean(targetModel.supportedDomains?.[domainType]?.enabled);
      if (!supportsDomain) {
        return res.status(400).json({
          success: false,
          msg: `Target model does not support '${domainType}' domains. Pick a compatible model.`,
        });
      }
    }

    // 7) Params usados = params del issue + overrides
    const paramsUsed = {
      ...(issue.modelParameters || {}),
      ...(paramOverrides || {}),
    };

    // ✅ Si weights vienen como mapa (por nombre), convertirlos a array en orden canónico
    const weightsArr = resolveWeightsArray({ paramsUsed, criteria });
    if (weightsArr) {
      paramsUsed.weights = weightsArr;
    }

    // Normalizar params igual que resolveIssue
    const normalizedParams = normalizeParams(paramsUsed);

    // ✅ HV-CRP: ignoramos cualquier threshold del issue/overrides
    const consensusThresholdUsed = 1;

    // ✅ ahora YA puedes loguearlo sin petar
    console.log("SCENARIO PARAMS DEBUG", {
      targetModel: targetModel.name,
      paramOverrides,
      paramsUsed,
      normalizedParams,
      consensusThresholdUsed,
    });

    // 8) Construir matrices (1 query, NO por celda)
    let matricesUsed = {};
    let expertsOrder = participations.map((p) => p.expert.email); // orden estable UI
    let snapshotIdsUsed = [];

    const apimodelsUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    if (!isPairwiseIssue) {
      // ===== AxC =====
      const evalDocs = await Evaluation.find({
        issue: issue._id,
        expert: { $in: expertIds },
        comparedAlternative: null,
      })
        .select("expert alternative criterion value expressionDomain")
        .populate("expressionDomain", "type linguisticLabels numericRange name")
        .lean();

      const evalMap = new Map();
      const snapshotSet = new Set();

      for (const e of evalDocs) {
        const k = `${asOidStr(e.expert)}_${asOidStr(e.alternative)}_${asOidStr(e.criterion)}`;
        evalMap.set(k, e);
        if (e.expressionDomain?._id) snapshotSet.add(asOidStr(e.expressionDomain._id));
      }

      snapshotIdsUsed = Array.from(snapshotSet);

      // montar matrices por experto (como resolveIssue)
      for (const p of participations) {
        const email = p.expert.email;
        const expertId = asOidStr(p.expert._id);

        const matrixForExpert = [];

        for (const alt of alternatives) {
          const row = [];

          for (const crit of criteria) {
            const key = `${expertId}_${asOidStr(alt._id)}_${asOidStr(crit._id)}`;
            const ev = evalMap.get(key);

            let val = ev?.value ?? null;

            // convertir numérico string -> number
            if (val != null && ev?.expressionDomain?.type === "numeric" && typeof val === "string") {
              const n = Number(val);
              val = Number.isFinite(n) ? n : val;
            }

            // lingüístico: label -> [l,m,u]
            if (val != null && ev?.expressionDomain?.type === "linguistic") {
              const labelDef = ev.expressionDomain.linguisticLabels?.find((lbl) => lbl.label === val);
              val = labelDef ? labelDef.values : null;
            }

            row.push(val);
          }

          matrixForExpert.push(row);
        }

        matricesUsed[email] = matrixForExpert;
      }

      // asegurar que no hay nulls (si los hay, escenario no se puede simular)
      const nullCount = Object.values(matricesUsed).reduce((acc, m) => {
        for (const row of m) for (const v of row) if (v == null) acc++;
        return acc;
      }, 0);

      if (nullCount > 0) {
        httpError(400, "Simulation requires complete evaluations (some values are still null).");
      }
    } else {
      // ===== Pairwise AxA =====
      const evalDocs = await Evaluation.find({
        issue: issue._id,
        expert: { $in: expertIds },
        comparedAlternative: { $ne: null },
      })
        .select("expert alternative comparedAlternative criterion value expressionDomain")
        .populate("expressionDomain", "type")
        .lean();

      const snapshotSet = new Set();
      for (const e of evalDocs) {
        if (e.expressionDomain?._id) snapshotSet.add(asOidStr(e.expressionDomain._id));
      }
      snapshotIdsUsed = Array.from(snapshotSet);

      const altIndex = new Map(alternatives.map((a, i) => [asOidStr(a._id), i]));
      const critNameById = new Map(criteria.map((c) => [asOidStr(c._id), c.name]));

      // init
      for (const p of participations) {
        matricesUsed[p.expert.email] = {};
        for (const c of criteria) {
          const n = alternatives.length;
          const mat = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => (i === j ? 0.5 : null))
          );
          matricesUsed[p.expert.email][c.name] = mat;
        }
      }

      // fill
      for (const e of evalDocs) {
        const email = participations.find((p) => asOidStr(p.expert._id) === asOidStr(e.expert))?.expert.email;
        if (!email) continue;

        const critName = critNameById.get(asOidStr(e.criterion));
        if (!critName) continue;

        const i = altIndex.get(asOidStr(e.alternative));
        const j = altIndex.get(asOidStr(e.comparedAlternative));
        if (i == null || j == null) continue;

        let v = e.value ?? null;
        if (v != null && typeof v === "string") {
          const n = Number(v);
          v = Number.isFinite(n) ? n : v;
        }

        matricesUsed[email][critName][i][j] = v;
      }

      // null check (fuera diagonal)
      let nullCount = 0;
      for (const email of Object.keys(matricesUsed)) {
        for (const critName of Object.keys(matricesUsed[email])) {
          const mat = matricesUsed[email][critName];
          for (let i = 0; i < mat.length; i++) {
            for (let j = 0; j < mat.length; j++) {
              if (i === j) continue;
              if (mat[i][j] == null) nullCount++;
            }
          }
        }
      }
      if (nullCount > 0) {
        httpError(400, "Simulation requires complete pairwise evaluations (some values are still null).");
      }
    }

    // 9) Endpoint (usa tu mapper actual)
    const modelKey = getModelEndpointKey(targetModel.name);
    if (!modelKey) {
      return res.status(400).json({
        success: false,
        msg: `No API endpoint defined for target model ${targetModel.name}`,
      });
    }

    // 10) Call API models (✅ compat keys criterionTypes/criterion_type/criterion_types)
    /* const consensusThresholdUsed =
      issue.consensusThreshold ?? normalizedParams.consensusThreshold ?? paramsUsed.consensusThreshold; */

    console.log("Parametros", normalizedParams)

    let response;
    if (modelKey === "herrera_viedma_crp") {
      response = await axios.post(
        `${apimodelsUrl}/${modelKey}`,
        {
          matrices: matricesUsed,
          consensusThreshold: consensusThresholdUsed,
          modelParameters: normalizedParams,
        },
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      response = await axios.post(
        `${apimodelsUrl}/${modelKey}`,
        {
          matrices: matricesUsed,
          modelParameters: normalizedParams,
          // ✅ manda los 3 por compat con APIs viejas/nuevas
          criterionTypes,
          criterion_type: criterionTypes,
          criterion_types: criterionTypes,
        },
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { success, msg, results } = response.data || {};
    if (!success) httpError(400, msg || "Model execution failed");

    // 11) Normalizar salida “como resolveIssue/resolvePairwiseIssue”
    const altNames = alternatives.map((a) => a.name);

    let details = {};
    let collectiveEvaluations = null;

    if (modelKey === "herrera_viedma_crp") {
      const {
        alternatives_rankings,
        cm,
        collective_evaluations,
        plots_graphic,
        collective_scores,
      } = results || {};

      const rankedWithScores = (alternatives_rankings || []).map((idx) => ({
        name: altNames[idx],
        score: collective_scores?.[idx] ?? null,
      }));

      // plotsGraphic emails
      let plotsGraphicWithEmails = null;
      if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
        const expertPointsMap = {};
        participations.forEach((p, index) => {
          expertPointsMap[p.expert.email] = plots_graphic.expert_points[index] ?? null;
        });
        plotsGraphicWithEmails = {
          expert_points: expertPointsMap,
          collective_point: plots_graphic.collective_point ?? null,
        };
      }

      // collective_evaluations -> readable
      const transformed = {};
      for (const crit of criteria) {
        const mat = collective_evaluations?.[crit.name];
        if (!mat) continue;
        transformed[crit.name] = mat.map((row, rIdx) => {
          const obj = { id: alternatives[rIdx].name };
          row.forEach((v, cIdx) => (obj[alternatives[cIdx].name] = v));
          return obj;
        });
      }

      collectiveEvaluations = transformed;

      details = {
        rankedAlternatives: rankedWithScores,
        matrices: matricesUsed,
        level: cm ?? null,
        collective_scores: Object.fromEntries(altNames.map((n, i) => [n, collective_scores?.[i] ?? null])),
        collective_ranking: rankedWithScores.map((r) => r.name),
        ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
      };
    } else {
      // esquema común TOPSIS/BORDA/ARAS/FUZZY TOPSIS
      const rankingIdx = results?.collective_ranking || [];
      const scores = results?.collective_scores || [];
      const matrix = results?.collective_matrix || [];

      const rankedAlternatives = rankingIdx.map((idx) => altNames[idx]);
      const rankedWithScores = rankingIdx.map((idx) => ({
        name: altNames[idx],
        score: scores?.[idx] ?? null,
      }));

      const collectiveScoresByName = {};
      altNames.forEach((n, i) => (collectiveScoresByName[n] = scores?.[i] ?? null));

      // collectiveEvaluations: { altName: { critName: {value} } }
      const ce = {};
      matrix.forEach((row, altIdx) => {
        const aName = altNames[altIdx];
        ce[aName] = {};
        row.forEach((v, critIdx) => {
          const cName = criteria[critIdx]?.name;
          if (cName) ce[aName][cName] = { value: v };
        });
      });
      collectiveEvaluations = ce;

      // plots_graphic (si existe)
      let plotsGraphicWithEmails = null;
      const plots_graphic = results?.plots_graphic;
      if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
        const expertPointsMap = {};
        participations.forEach((p, index) => {
          expertPointsMap[p.expert.email] = plots_graphic.expert_points[index] ?? null;
        });
        plotsGraphicWithEmails = {
          expert_points: expertPointsMap,
          collective_point: plots_graphic.collective_point ?? null,
        };
      }

      details = {
        rankedAlternatives: rankedWithScores,
        matrices: matricesUsed,
        collective_scores: collectiveScoresByName,
        collective_ranking: rankedAlternatives,
        ...(plotsGraphicWithEmails ? { plotsGraphic: plotsGraphicWithEmails } : {}),
      };
    }

    // 12) Guardar Scenario
    const scenario = await IssueScenario.create({
      issue: issue._id,
      createdBy: userId,
      name: String(scenarioName || "").trim(),
      targetModel: targetModel._id,
      targetModelName: targetModel.name,
      domainType,
      isPairwise: isPairwiseIssue,
      status: "done",
      config: {
        modelParameters: paramsUsed,
        normalizedModelParameters: normalizedParams,
        criterionTypes: isPairwiseIssue ? [] : criterionTypes,
      },
      inputs: {
        consensusPhaseUsed: 1,
        expertsOrder,
        alternatives: alternatives.map((a) => ({ id: a._id, name: a.name })),
        criteria: criteria.map(c => ({
          id: c._id,
          name: c.name,
          criterionType: c.type,
        })),
        weightsUsed: paramsUsed?.weights ?? null,
        matricesUsed,
        snapshotIdsUsed,
      },
      outputs: {
        details,
        collectiveEvaluations,
        rawResults: results,
      },
    });

    return res.status(201).json({
      success: true,
      msg: "Scenario created successfully",
      scenarioId: scenario._id,
    });
  } catch (err) {
    const axiosMsg =
      err?.response?.data?.msg ||
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      null;

    const status = err?.status || err?.response?.status || 500;

    console.error("createIssueScenario error:", {
      status,
      message: err?.message,
      axiosMsg,
      stack: err?.stack,
    });

    return res.status(status).json({
      success: false,
      msg: axiosMsg || err?.message || "Error creating scenario",
    });
  }
};

export const getIssueScenarios = async (req, res) => {
  try {
    const { issueId } = req.body;
    if (!issueId) return res.status(400).json({ success: false, msg: "issueId is required" });

    const scenarios = await IssueScenario.find({ issue: issueId })
      .sort({ createdAt: -1 })
      .select("_id name targetModelName domainType isPairwise status createdAt createdBy")
      .populate("createdBy", "email name")
      .lean();

    return res.json({ success: true, scenarios });
  } catch (err) {
    console.error("getIssueScenarios error:", err);
    return res.status(500).json({ success: false, msg: "Error listing scenarios" });
  }
};

export const getScenarioById = async (req, res) => {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) return res.status(400).json({ success: false, msg: "scenarioId is required" });

    const scenario = await IssueScenario.findById(scenarioId)
      .populate("createdBy", "email name")
      .lean();

    if (!scenario) return res.status(404).json({ success: false, msg: "Scenario not found" });

    return res.json({ success: true, scenario });
  } catch (err) {
    console.error("getScenarioById error:", err);
    return res.status(500).json({ success: false, msg: "Error fetching scenario" });
  }
};

export const removeScenario = async (req, res) => {
  const userId = req.uid;

  try {
    const { scenarioId } = req.body;
    if (!scenarioId) return res.status(400).json({ success: false, msg: "scenarioId is required" });

    const scenario = await IssueScenario.findById(scenarioId);
    if (!scenario) return res.status(404).json({ success: false, msg: "Scenario not found" });

    const issue = await Issue.findById(scenario.issue).select("admin").lean();
    if (!issue) return res.status(404).json({ success: false, msg: "Issue not found" });

    const isCreator = String(scenario.createdBy) === String(userId);
    const isAdmin = String(issue.admin) === String(userId);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, msg: "Not authorized to delete this scenario" });
    }

    await IssueScenario.deleteOne({ _id: scenario._id });

    return res.json({ success: true, msg: "Scenario deleted" });
  } catch (err) {
    console.error("removeScenario error:", err);
    return res.status(500).json({ success: false, msg: "Error deleting scenario" });
  }
};