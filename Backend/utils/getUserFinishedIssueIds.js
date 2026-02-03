import { ExitUserIssue } from "../models/ExitUserIssue.js";
import { Issue } from "../models/Issues.js";
import { Participation } from "../models/Participations.js"; // Ajusta la importación según tu estructura


// Obtener los IDs de los problemas finalizados en los que participa un usuario
export const getUserFinishedIssueIds = async (userId, { excludeHidden = true, session = null } = {}) => {
  const adminIssues = await Issue.find({ admin: userId, active: false }).session(session).lean();
  const adminIssueIds = adminIssues.map((issue) => issue._id.toString());

  const participations = await Participation.find({
    expert: userId,
    invitationStatus: "accepted"
  })
    .populate({
      path: "issue",
      match: { active: false }
    })
    .session(session)
    .lean();

  const expertIssueIds = participations
    .filter((part) => part.issue)
    .map((part) => part.issue._id.toString());

  const allIssueIds = [...new Set([...adminIssueIds, ...expertIssueIds])];

  if (excludeHidden) {
    const hiddenIssueIds = await ExitUserIssue.find({
      user: userId,
      issue: { $in: allIssueIds },
      hidden: true
    }).session(session).distinct("issue");

    const hiddenIdsAsString = hiddenIssueIds.map(id => id.toString());

    return allIssueIds.filter((id) => !hiddenIdsAsString.includes(id));
  }

  return allIssueIds;
};
