const { PermissionFlagsBits } = require('discord.js');

/**
 * Verifica se um membro possui permissão de moderador/organizador do MIX.
 * Permitido para:
 * - Membros com o cargo com nome "mix" (insensível a maiúsculas/minúsculas)
 * - Administradores do servidor
 * - Membros com permissão de Gerenciar Servidor
 */
function hasMixPermission(member) {
  if (!member) return false;
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return true;
  }
  return member.roles.cache.some(r => r.name.toLowerCase() === 'mix');
}

module.exports = {
  hasMixPermission
};
