export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  USER: "user",
};

export const PERMISSIONS = {
  VIEW_MODULE: "view_module",
  PRACTICE: "practice",
  MANAGE_MATERIAL: "manage_material",
  MANAGE_USERS: "manage_users",
  VIEW_STUDENTS: "view_students",
};

export const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.VIEW_MODULE,
    PERMISSIONS.PRACTICE,
    PERMISSIONS.MANAGE_MATERIAL,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_STUDENTS,
  ],
  teacher: [
    PERMISSIONS.VIEW_MODULE,
    PERMISSIONS.PRACTICE,
    PERMISSIONS.MANAGE_MATERIAL,
    PERMISSIONS.VIEW_STUDENTS,
  ],
  user: [
    PERMISSIONS.VIEW_MODULE,
    PERMISSIONS.PRACTICE,
  ],
};