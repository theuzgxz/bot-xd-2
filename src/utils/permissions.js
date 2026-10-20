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
  // Dono do servidor
  if (member.guild && member.guild.ownerId === member.id) {
    return true;
  }
  // Permissões administrativas
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  ) {
    return true;
  }
  // Cargos que contenham 'mix' (ex: "mix", "MIX", "Mix Host", "Organizador Mix")
  if (member.roles && member.roles.cache) {
    return member.roles.cache.some(r => {
      const name = r.name.toLowerCase();
      return name === 'mix' || name.includes('mix') || name === 'organizador';
    });
  }
  return false;
}

module.exports = {
  hasMixPermission
};
