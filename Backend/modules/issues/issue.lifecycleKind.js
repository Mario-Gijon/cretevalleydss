export const LIFECYCLE_KINDS = Object.freeze({
  SINGLE_PASS: "singlePass",
  THRESHOLD_CONSENSUS: "thresholdConsensus",
});

const SUPPORTED_LIFECYCLE_KINDS = new Set(Object.values(LIFECYCLE_KINDS));

export const isSupportedLifecycleKind = (lifecycleKind) =>
  SUPPORTED_LIFECYCLE_KINDS.has(lifecycleKind);

export const getSupportedLifecycleKinds = () => [
  ...SUPPORTED_LIFECYCLE_KINDS,
];
