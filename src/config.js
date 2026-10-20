module.exports = {
  // Cores do tema Valorant
  COLORS: {
    PRIMARY: 0xFF4655, // Vermelho oficial Valorant
    SECONDARY: 0x0F1923, // Preto escuro Valorant
    SUCCESS: 0x00FFA3, // Verde neon
    WARNING: 0xFFD700, // Dourado
    BLUE: 0x1E90FF,   // Azul para Time A
    ORANGE: 0xFF8C00  // Laranja para Time B
  },

  // Mapas do Valorant com imagens oficiais em alta definição
  MAPS: [
    {
      id: 'ascent',
      name: 'Ascent',
      image: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png'
    },
    {
      id: 'bind',
      name: 'Bind',
      image: 'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png'
    },
    {
      id: 'haven',
      name: 'Haven',
      image: 'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png'
    },
    {
      id: 'split',
      name: 'Split',
      image: 'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png'
    },
    {
      id: 'icebox',
      name: 'Icebox',
      image: 'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png'
    },
    {
      id: 'breeze',
      name: 'Breeze',
      image: 'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png'
    },
    {
      id: 'fracture',
      name: 'Fracture',
      image: 'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png'
    },
    {
      id: 'pearl',
      name: 'Pearl (Pérola)',
      image: 'https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/splash.png'
    },
    {
      id: 'lotus',
      name: 'Lotus',
      image: 'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png'
    },
    {
      id: 'sunset',
      name: 'Sunset',
      image: 'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png'
    },
    {
      id: 'abyss',
      name: 'Abyss',
      image: 'https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/splash.png'
    }
  ],

  // Sistema de ranks do Valorant e conversão numérica de MMR
  RANKS: {
    'Unranked': { name: 'Sem Ranque', mmr: 1000, tier: 0, badge: '⚪' },
    'Iron 1': { name: 'Ferro 1', mmr: 100, tier: 1, badge: '🟤' },
    'Iron 2': { name: 'Ferro 2', mmr: 200, tier: 2, badge: '🟤' },
    'Iron 3': { name: 'Ferro 3', mmr: 300, tier: 3, badge: '🟤' },
    'Bronze 1': { name: 'Bronze 1', mmr: 400, tier: 4, badge: '🥉' },
    'Bronze 2': { name: 'Bronze 2', mmr: 500, tier: 5, badge: '🥉' },
    'Bronze 3': { name: 'Bronze 3', mmr: 600, tier: 6, badge: '🥉' },
    'Silver 1': { name: 'Prata 1', mmr: 700, tier: 7, badge: '🥈' },
    'Silver 2': { name: 'Prata 2', mmr: 800, tier: 8, badge: '🥈' },
    'Silver 3': { name: 'Prata 3', mmr: 900, tier: 9, badge: '🥈' },
    'Gold 1': { name: 'Ouro 1', mmr: 1000, tier: 10, badge: '🥇' },
    'Gold 2': { name: 'Ouro 2', mmr: 1100, tier: 11, badge: '🥇' },
    'Gold 3': { name: 'Ouro 3', mmr: 1200, tier: 12, badge: '🥇' },
    'Platinum 1': { name: 'Platina 1', mmr: 1300, tier: 13, badge: '💠' },
    'Platinum 2': { name: 'Platina 2', mmr: 1400, tier: 14, badge: '💠' },
    'Platinum 3': { name: 'Platina 3', mmr: 1500, tier: 15, badge: '💠' },
    'Diamond 1': { name: 'Diamante 1', mmr: 1600, tier: 16, badge: '💎' },
    'Diamond 2': { name: 'Diamante 2', mmr: 1700, tier: 17, badge: '💎' },
    'Diamond 3': { name: 'Diamante 3', mmr: 1800, tier: 18, badge: '💎' },
    'Ascendant 1': { name: 'Ascendente 1', mmr: 1900, tier: 19, badge: '🟢' },
    'Ascendant 2': { name: 'Ascendente 2', mmr: 2000, tier: 20, badge: '🟢' },
    'Ascendant 3': { name: 'Ascendente 3', mmr: 2100, tier: 21, badge: '🟢' },
    'Immortal 1': { name: 'Imortal 1', mmr: 2200, tier: 22, badge: '🔴' },
    'Immortal 2': { name: 'Imortal 2', mmr: 2300, tier: 23, badge: '🔴' },
    'Immortal 3': { name: 'Imortal 3', mmr: 2400, tier: 24, badge: '🔴' },
    'Radiant': { name: 'Radiante', mmr: 2600, tier: 25, badge: '🔥' }
  },

  DEFAULT_RANK: 'Gold 1',
  DEFAULT_MMR: 1000,

  // Tempo de votação de mapas em segundos
  MAP_VOTE_DURATION: 45
};
