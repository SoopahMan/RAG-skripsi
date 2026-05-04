// services/useRBAC.js

import { getUser } from "./auth";
import { ROLE_PERMISSIONS } from "./rbac";

export const useRBAC = () => {
  const user = getUser();

  const hasPermission = (permission) => {
    if (!user || user.expired) return false;

    return ROLE_PERMISSIONS[user.role]?.includes(permission);
  };

  return { user, hasPermission };
};