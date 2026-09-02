import * as adminRolesRepository from "./admin-roles.repository";

export function listRoles() {
  return adminRolesRepository.listRoles();
}

export function listPermissions() {
  return adminRolesRepository.listPermissions();
}

export function listAdminUsers() {
  return adminRolesRepository.listAdminUsers();
}
