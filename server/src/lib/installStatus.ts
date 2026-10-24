// SQL assignment for an install device's status that also records when it was completed (cleared
// if it moves back out of complete). The new status must be query parameter $1.
export const SET_INSTALL_STATUS = "status = $1, completed_at = CASE WHEN $1 = 'complete' THEN COALESCE(completed_at, NOW()) ELSE NULL END";

export const INSTALL_STATUSES = ["pending", "in-progress", "complete", "failed"] as const;
