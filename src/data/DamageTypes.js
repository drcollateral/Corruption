// Central definitions for damage types and DoT helpers
// Extend DOT_STATUS_KINDS as new statuses are added (e.g., poison, bleed, rot)
export const DOT_STATUS_KINDS = [ 'burn' ];

export function isDotKind(kind){
  if (!kind) return false;
  return DOT_STATUS_KINDS.includes(String(kind).toLowerCase());
}

export function registerDotKind(kind){
  const k = String(kind).toLowerCase();
  if (!DOT_STATUS_KINDS.includes(k)) DOT_STATUS_KINDS.push(k);
}
