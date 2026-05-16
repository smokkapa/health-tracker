// Magic email used to claim historical pre-multi-user metric_entries rows
// (those with NULL user_id). When this account first signs in or signs up,
// any orphan rows get assigned to it.
export const LEGACY_OWNER_EMAIL = 'sridharcoolandfire@gmail.com';
