// Role-based access to moderation commands, with Discord-style hierarchy rules:
// a user can never grant access to, or act on, a role/member equal to or above their own top role.
const { PermissionFlagsBits } = require('discord.js');
const { load, save } = require('./store');

function getAccessRoleIds(guildId) {
  const cfg = load('mod-access')[guildId];
  return cfg && Array.isArray(cfg.roleIds) ? cfg.roleIds : [];
}

function addAccessRole(guildId, roleId) {
  const cfg = load('mod-access');
  const entry = cfg[guildId] || { roleIds: [] };
  if (!entry.roleIds.includes(roleId)) entry.roleIds.push(roleId);
  cfg[guildId] = entry;
  save('mod-access', cfg);
  return entry.roleIds;
}

function removeAccessRole(guildId, roleId) {
  const cfg = load('mod-access');
  const entry = cfg[guildId] || { roleIds: [] };
  entry.roleIds = entry.roleIds.filter((id) => id !== roleId);
  cfg[guildId] = entry;
  save('mod-access', cfg);
  return entry.roleIds;
}

const isOwner = (interaction) =>
  interaction.guild && interaction.guild.ownerId === interaction.user.id;

function topPosition(member) {
  return member && member.roles && member.roles.highest ? member.roles.highest.position : 0;
}

// Can this member use moderation commands? (Discord permission OR an access role)
function hasAccess(member, guildId, permission) {
  if (!member) return false;
  if (member.permissions && member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (permission && member.permissions && member.permissions.has(permission)) return true;
  const ids = getAccessRoleIds(guildId);
  if (!ids.length || !member.roles || !member.roles.cache) return false;
  return ids.some((id) => member.roles.cache.has(id));
}

// Hierarchy guard: true when the actor outranks the target member
function canActOn(interaction, target) {
  if (!target) return true;
  if (isOwner(interaction)) return true;
  if (interaction.member.permissions && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return topPosition(interaction.member) > topPosition(target);
}

// Hierarchy guard for granting access: actor must outrank the role being given
function canGrantRole(interaction, role) {
  if (!role) return false;
  if (isOwner(interaction)) return true;
  if (interaction.member.permissions && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return topPosition(interaction.member) > role.position;
}

const NO_ACCESS = 'You do not have permission to use moderation commands.';
const HIERARCHY = 'You cannot use moderation commands on a member whose role is equal to or above yours.';

// Standard guard for every moderation command. Returns an error message or null.
function guard(interaction, permission) {
  if (!hasAccess(interaction.member, interaction.guildId, permission)) return NO_ACCESS;
  return null;
}

module.exports = {
  getAccessRoleIds,
  addAccessRole,
  removeAccessRole,
  hasAccess,
  canActOn,
  canGrantRole,
  guard,
  NO_ACCESS,
  HIERARCHY,
};
