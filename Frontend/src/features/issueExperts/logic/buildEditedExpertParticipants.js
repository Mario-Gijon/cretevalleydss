export const buildEditedExpertParticipants = ({
  currentParticipants,
  availableExperts,
  expertsToAdd,
  expertsToRemove,
}) => {
  const currentByEmail = new Map(
    currentParticipants.map((participant) => [participant.email, participant])
  );
  const finalParticipants = Array.from(currentByEmail.values()).filter(
    (participant) => !expertsToRemove.includes(participant.email)
  );

  expertsToAdd.forEach((email) => {
    if (currentByEmail.has(email)) return;

    const expert = availableExperts.find((item) => item.email === email);
    finalParticipants.push({
      email,
      name: expert?.name || "",
      weight: 0,
      isNew: true,
    });
  });

  return finalParticipants.sort((left, right) =>
    left.email.localeCompare(right.email)
  );
};

export const buildExpertWeightsByEmail = (participants) =>
  participants.reduce((weights, participant) => {
    weights[participant.email] = participant.weight;
    return weights;
  }, {});
