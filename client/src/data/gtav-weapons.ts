// GTA V Weapons Data - список ванильного оружия из игры

export interface GTAVWeapon {
  name: string
  displayName: string
  category: string
  hash: number
  ammoType: string
  damage: number
  range: number
  accuracy: number
  fireRate: number
}

export const GTAV_WEAPONS: GTAVWeapon[] = [
  // Melee Weapons
  { name: 'weapon_knife', displayName: 'Knife', category: 'Melee', hash: 0x99B507EA, ammoType: 'AMMO_MELEE', damage: 100, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_nightstick', displayName: 'Nightstick', category: 'Melee', hash: 0x678B81B1, ammoType: 'AMMO_MELEE', damage: 85, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_hammer', displayName: 'Hammer', category: 'Melee', hash: 0x6D544C99, ammoType: 'AMMO_MELEE', damage: 120, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_bat', displayName: 'Baseball Bat', category: 'Melee', hash: 0x958A4A8F, ammoType: 'AMMO_MELEE', damage: 95, range: 3, accuracy: 100, fireRate: 0 },
  { name: 'weapon_crowbar', displayName: 'Crowbar', category: 'Melee', hash: 0x84BD7BFD, ammoType: 'AMMO_MELEE', damage: 110, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_golfclub', displayName: 'Golf Club', category: 'Melee', hash: 0x440E4788, ammoType: 'AMMO_MELEE', damage: 90, range: 3, accuracy: 100, fireRate: 0 },
  { name: 'weapon_bottle', displayName: 'Broken Bottle', category: 'Melee', hash: 0xF9E6AA4B, ammoType: 'AMMO_MELEE', damage: 80, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_dagger', displayName: 'Antique Cavalry Dagger', category: 'Melee', hash: 0x92A27487, ammoType: 'AMMO_MELEE', damage: 105, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_hatchet', displayName: 'Hatchet', category: 'Melee', hash: 0xF9DCBF2D, ammoType: 'AMMO_MELEE', damage: 130, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_knuckle', displayName: 'Knuckle Duster', category: 'Melee', hash: 0xD8DF3C3C, ammoType: 'AMMO_MELEE', damage: 75, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_machete', displayName: 'Machete', category: 'Melee', hash: 0xDD5DF8D9, ammoType: 'AMMO_MELEE', damage: 125, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_flashlight', displayName: 'Flashlight', category: 'Melee', hash: 0x8BB05FD7, ammoType: 'AMMO_MELEE', damage: 70, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_switchblade', displayName: 'Switchblade', category: 'Melee', hash: 0xDFE37640, ammoType: 'AMMO_MELEE', damage: 95, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_poolcue', displayName: 'Pool Cue', category: 'Melee', hash: 0x94117305, ammoType: 'AMMO_MELEE', damage: 85, range: 3, accuracy: 100, fireRate: 0 },
  { name: 'weapon_wrench', displayName: 'Wrench', category: 'Melee', hash: 0x19044EE0, ammoType: 'AMMO_MELEE', damage: 100, range: 2, accuracy: 100, fireRate: 0 },
  { name: 'weapon_battleaxe', displayName: 'Battle Axe', category: 'Melee', hash: 0xCD274149, ammoType: 'AMMO_MELEE', damage: 140, range: 2, accuracy: 100, fireRate: 0 },

  // Handguns
  { name: 'weapon_pistol', displayName: 'Pistol', category: 'Handguns', hash: 0x1B06D571, ammoType: 'AMMO_PISTOL', damage: 25, range: 35, accuracy: 75, fireRate: 600 },
  { name: 'weapon_pistol_mk2', displayName: 'Pistol Mk II', category: 'Handguns', hash: 0xBFE256D4, ammoType: 'AMMO_PISTOL', damage: 30, range: 40, accuracy: 80, fireRate: 650 },
  { name: 'weapon_combatpistol', displayName: 'Combat Pistol', category: 'Handguns', hash: 0x5EF9FEC4, ammoType: 'AMMO_PISTOL', damage: 28, range: 35, accuracy: 78, fireRate: 620 },
  { name: 'weapon_appistol', displayName: 'AP Pistol', category: 'Handguns', hash: 0x22D8FE39, ammoType: 'AMMO_PISTOL', damage: 26, range: 30, accuracy: 70, fireRate: 800 },
  { name: 'weapon_pistol50', displayName: 'Pistol .50', category: 'Handguns', hash: 0x99AEEB3B, ammoType: 'AMMO_PISTOL', damage: 45, range: 50, accuracy: 85, fireRate: 400 },
  { name: 'weapon_heavypistol', displayName: 'Heavy Pistol', category: 'Handguns', hash: 0xD205520E, ammoType: 'AMMO_PISTOL', damage: 35, range: 45, accuracy: 82, fireRate: 450 },
  { name: 'weapon_snspistol', displayName: 'SNS Pistol', category: 'Handguns', hash: 0xBFD21232, ammoType: 'AMMO_PISTOL', damage: 22, range: 25, accuracy: 65, fireRate: 700 },
  { name: 'weapon_snspistol_mk2', displayName: 'SNS Pistol Mk II', category: 'Handguns', hash: 0x88374054, ammoType: 'AMMO_PISTOL', damage: 25, range: 30, accuracy: 70, fireRate: 750 },
  { name: 'weapon_heavypistol', displayName: 'Heavy Pistol', category: 'Handguns', hash: 0xD205520E, ammoType: 'AMMO_PISTOL', damage: 35, range: 45, accuracy: 82, fireRate: 450 },
  { name: 'weapon_vintagepistol', displayName: 'Vintage Pistol', category: 'Handguns', hash: 0x83839C4, ammoType: 'AMMO_PISTOL', damage: 30, range: 40, accuracy: 80, fireRate: 500 },
  { name: 'weapon_flaregun', displayName: 'Flare Gun', category: 'Handguns', hash: 0x47757124, ammoType: 'AMMO_FLARE', damage: 50, range: 100, accuracy: 95, fireRate: 100 },
  { name: 'weapon_marksmanpistol', displayName: 'Marksman Pistol', category: 'Handguns', hash: 0xDC4DB296, ammoType: 'AMMO_PISTOL', damage: 40, range: 60, accuracy: 90, fireRate: 300 },
  { name: 'weapon_revolver', displayName: 'Revolver', category: 'Handguns', hash: 0xC1B3C3D1, ammoType: 'AMMO_PISTOL', damage: 55, range: 65, accuracy: 88, fireRate: 200 },
  { name: 'weapon_revolver_mk2', displayName: 'Revolver Mk II', category: 'Handguns', hash: 0xCB96392F, ammoType: 'AMMO_PISTOL', damage: 60, range: 70, accuracy: 90, fireRate: 180 },
  { name: 'weapon_doubleaction', displayName: 'Double Action Revolver', category: 'Handguns', hash: 0x97EA20B8, ammoType: 'AMMO_PISTOL', damage: 50, range: 60, accuracy: 85, fireRate: 250 },
  { name: 'weapon_ceramicpistol', displayName: 'Ceramic Pistol', category: 'Handguns', hash: 0x2B5EF5EC, ammoType: 'AMMO_PISTOL', damage: 26, range: 32, accuracy: 72, fireRate: 650 },
  { name: 'weapon_navyrevolver', displayName: 'Navy Revolver', category: 'Handguns', hash: 0x917F6C8C, ammoType: 'AMMO_PISTOL', damage: 58, range: 68, accuracy: 92, fireRate: 190 },
  { name: 'weapon_gadgetpistol', displayName: 'Perico Pistol', category: 'Handguns', hash: 0x57A4368C, ammoType: 'AMMO_PISTOL', damage: 32, range: 45, accuracy: 85, fireRate: 580 },

  // SMGs
  { name: 'weapon_microsmg', displayName: 'Micro SMG', category: 'SMGs', hash: 0x13532244, ammoType: 'AMMO_SMG', damage: 20, range: 25, accuracy: 60, fireRate: 1200 },
  { name: 'weapon_smg', displayName: 'SMG', category: 'SMGs', hash: 0x2BE6766B, ammoType: 'AMMO_SMG', damage: 22, range: 30, accuracy: 65, fireRate: 1000 },
  { name: 'weapon_smg_mk2', displayName: 'SMG Mk II', category: 'SMGs', hash: 0x78A97CD0, ammoType: 'AMMO_SMG', damage: 25, range: 35, accuracy: 70, fireRate: 1100 },
  { name: 'weapon_assaultsmg', displayName: 'Assault SMG', category: 'SMGs', hash: 0xEFE7E2DF, ammoType: 'AMMO_SMG', damage: 24, range: 35, accuracy: 68, fireRate: 1050 },
  { name: 'weapon_combatpdw', displayName: 'Combat PDW', category: 'SMGs', hash: 0x0A3D4D34, ammoType: 'AMMO_SMG', damage: 26, range: 40, accuracy: 72, fireRate: 950 },
  { name: 'weapon_machinepistol', displayName: 'Machine Pistol', category: 'SMGs', hash: 0xDB1AA450, ammoType: 'AMMO_PISTOL', damage: 20, range: 25, accuracy: 55, fireRate: 1300 },
  { name: 'weapon_minismg', displayName: 'Mini SMG', category: 'SMGs', hash: 0xBD248B55, ammoType: 'AMMO_SMG', damage: 18, range: 20, accuracy: 50, fireRate: 1400 },
  { name: 'weapon_raycarbine', displayName: 'Unholy Hellbringer', category: 'SMGs', hash: 0x476BF155, ammoType: 'AMMO_SMG', damage: 30, range: 50, accuracy: 80, fireRate: 800 },

  // Assault Rifles
  { name: 'weapon_assaultrifle', displayName: 'Assault Rifle', category: 'Assault Rifles', hash: 0xBFEFFF6D, ammoType: 'AMMO_RIFLE', damage: 30, range: 60, accuracy: 75, fireRate: 750 },
  { name: 'weapon_assaultrifle_mk2', displayName: 'Assault Rifle Mk II', category: 'Assault Rifles', hash: 0x394F415C, ammoType: 'AMMO_RIFLE', damage: 35, range: 65, accuracy: 80, fireRate: 800 },
  { name: 'weapon_carbinerifle', displayName: 'Carbine Rifle', category: 'Assault Rifles', hash: 0x83BF0278, ammoType: 'AMMO_RIFLE', damage: 32, range: 65, accuracy: 78, fireRate: 700 },
  { name: 'weapon_carbinerifle_mk2', displayName: 'Carbine Rifle Mk II', category: 'Assault Rifles', hash: 0xFAD1F1C9, ammoType: 'AMMO_RIFLE', damage: 37, range: 70, accuracy: 82, fireRate: 750 },
  { name: 'weapon_advancedrifle', displayName: 'Advanced Rifle', category: 'Assault Rifles', hash: 0xAF113F99, ammoType: 'AMMO_RIFLE', damage: 28, range: 55, accuracy: 72, fireRate: 850 },
  { name: 'weapon_specialcarbine', displayName: 'Special Carbine', category: 'Assault Rifles', hash: 0xC0A3098D, ammoType: 'AMMO_RIFLE', damage: 34, range: 68, accuracy: 80, fireRate: 680 },
  { name: 'weapon_specialcarbine_mk2', displayName: 'Special Carbine Mk II', category: 'Assault Rifles', hash: 0x969C3D67, ammoType: 'AMMO_RIFLE', damage: 39, range: 73, accuracy: 85, fireRate: 720 },
  { name: 'weapon_bullpuprifle', displayName: 'Bullpup Rifle', category: 'Assault Rifles', hash: 0x7F229F94, ammoType: 'AMMO_RIFLE', damage: 31, range: 62, accuracy: 76, fireRate: 780 },
  { name: 'weapon_bullpuprifle_mk2', displayName: 'Bullpup Rifle Mk II', category: 'Assault Rifles', hash: 0x84D6FAFD, ammoType: 'AMMO_RIFLE', damage: 36, range: 67, accuracy: 81, fireRate: 820 },
  { name: 'weapon_compactrifle', displayName: 'Compact Rifle', category: 'Assault Rifles', hash: 0x624FE830, ammoType: 'AMMO_RIFLE', damage: 29, range: 58, accuracy: 74, fireRate: 800 },
  { name: 'weapon_militaryrifle', displayName: 'Military Rifle', category: 'Assault Rifles', hash: 0x9D1F17E6, ammoType: 'AMMO_RIFLE', damage: 38, range: 75, accuracy: 88, fireRate: 650 },
  { name: 'weapon_heavyrifle', displayName: 'Heavy Rifle', category: 'Assault Rifles', hash: 0xC78D71B4, ammoType: 'AMMO_RIFLE', damage: 42, range: 80, accuracy: 90, fireRate: 600 },

  // Shotguns
  { name: 'weapon_pumpshotgun', displayName: 'Pump Shotgun', category: 'Shotguns', hash: 0x1D073A89, ammoType: 'AMMO_SHOTGUN', damage: 85, range: 15, accuracy: 60, fireRate: 150 },
  { name: 'weapon_pumpshotgun_mk2', displayName: 'Pump Shotgun Mk II', category: 'Shotguns', hash: 0x555AF99A, ammoType: 'AMMO_SHOTGUN', damage: 95, range: 18, accuracy: 65, fireRate: 160 },
  { name: 'weapon_sawnoffshotgun', displayName: 'Sawed-Off Shotgun', category: 'Shotguns', hash: 0x7846A318, ammoType: 'AMMO_SHOTGUN', damage: 75, range: 12, accuracy: 50, fireRate: 140 },
  { name: 'weapon_assaultshotgun', displayName: 'Assault Shotgun', category: 'Shotguns', hash: 0xE284C527, ammoType: 'AMMO_SHOTGUN', damage: 80, range: 16, accuracy: 65, fireRate: 300 },
  { name: 'weapon_bullpupshotgun', displayName: 'Bullpup Shotgun', category: 'Shotguns', hash: 0x9D61E50F, ammoType: 'AMMO_SHOTGUN', damage: 85, range: 17, accuracy: 70, fireRate: 280 },
  { name: 'weapon_musket', displayName: 'Musket', category: 'Shotguns', hash: 0xA89CB99E, ammoType: 'AMMO_SHOTGUN', damage: 120, range: 25, accuracy: 85, fireRate: 100 },
  { name: 'weapon_heavyshotgun', displayName: 'Heavy Shotgun', category: 'Shotguns', hash: 0x3AABBBAA, ammoType: 'AMMO_SHOTGUN', damage: 90, range: 20, accuracy: 75, fireRate: 250 },
  { name: 'weapon_dbshotgun', displayName: 'Double Barrel Shotgun', category: 'Shotguns', hash: 0xEF951FBB, ammoType: 'AMMO_SHOTGUN', damage: 100, range: 18, accuracy: 80, fireRate: 120 },
  { name: 'weapon_autoshotgun', displayName: 'Sweeper Shotgun', category: 'Shotguns', hash: 0x12E82D3D, ammoType: 'AMMO_SHOTGUN', damage: 75, range: 14, accuracy: 55, fireRate: 400 },
  { name: 'weapon_combatshotgun', displayName: 'Combat Shotgun', category: 'Shotguns', hash: 0x5A96BA4, ammoType: 'AMMO_SHOTGUN', damage: 88, range: 19, accuracy: 72, fireRate: 220 },

  // Sniper Rifles
  { name: 'weapon_sniperrifle', displayName: 'Sniper Rifle', category: 'Sniper Rifles', hash: 0x5FC3C11, ammoType: 'AMMO_SNIPER', damage: 100, range: 200, accuracy: 95, fireRate: 60 },
  { name: 'weapon_heavysniper', displayName: 'Heavy Sniper', category: 'Sniper Rifles', hash: 0x0C472FE2, ammoType: 'AMMO_SNIPER', damage: 150, range: 250, accuracy: 98, fireRate: 40 },
  { name: 'weapon_heavysniper_mk2', displayName: 'Heavy Sniper Mk II', category: 'Sniper Rifles', hash: 0xA914799, ammoType: 'AMMO_SNIPER', damage: 160, range: 260, accuracy: 99, fireRate: 35 },
  { name: 'weapon_marksmanrifle', displayName: 'Marksman Rifle', category: 'Sniper Rifles', hash: 0xC734385A, ammoType: 'AMMO_SNIPER', damage: 80, range: 150, accuracy: 90, fireRate: 120 },
  { name: 'weapon_marksmanrifle_mk2', displayName: 'Marksman Rifle Mk II', category: 'Sniper Rifles', hash: 0x394F415C, ammoType: 'AMMO_SNIPER', damage: 85, range: 160, accuracy: 92, fireRate: 110 },

  // Heavy Weapons
  { name: 'weapon_rpg', displayName: 'RPG', category: 'Heavy Weapons', hash: 0xB1CA77B1, ammoType: 'AMMO_RPG', damage: 200, range: 100, accuracy: 70, fireRate: 30 },
  { name: 'weapon_grenadelauncher', displayName: 'Grenade Launcher', category: 'Heavy Weapons', hash: 0xA284510B, ammoType: 'AMMO_GRENADELAUNCHER', damage: 150, range: 80, accuracy: 75, fireRate: 40 },
  { name: 'weapon_grenadelauncher_smoke', displayName: 'Smoke Grenade Launcher', category: 'Heavy Weapons', hash: 0x4DD2DC56, ammoType: 'AMMO_GRENADELAUNCHER', damage: 0, range: 60, accuracy: 80, fireRate: 50 },
  { name: 'weapon_minigun', displayName: 'Minigun', category: 'Heavy Weapons', hash: 0x42BF8A85, ammoType: 'AMMO_MINIGUN', damage: 45, range: 100, accuracy: 60, fireRate: 2000 },
  { name: 'weapon_firework', displayName: 'Firework Launcher', category: 'Heavy Weapons', hash: 0x7F7497E5, ammoType: 'AMMO_FIREWORK', damage: 100, range: 50, accuracy: 85, fireRate: 20 },
  { name: 'weapon_railgun', displayName: 'Railgun', category: 'Heavy Weapons', hash: 0x6D544C99, ammoType: 'AMMO_RAILGUN', damage: 300, range: 300, accuracy: 100, fireRate: 10 },
  { name: 'weapon_hominglauncher', displayName: 'Homing Launcher', category: 'Heavy Weapons', hash: 0x63AB0442, ammoType: 'AMMO_HOMINGLAUNCHER', damage: 250, range: 150, accuracy: 95, fireRate: 15 },
  { name: 'weapon_compactlauncher', displayName: 'Compact Launcher', category: 'Heavy Weapons', hash: 0x781FE4A, ammoType: 'AMMO_COMPACTLAUNCHER', damage: 180, range: 70, accuracy: 80, fireRate: 25 },
  { name: 'weapon_rayminigun', displayName: 'Widowmaker', category: 'Heavy Weapons', hash: 0xB62D1F67, ammoType: 'AMMO_MINIGUN', damage: 50, range: 120, accuracy: 70, fireRate: 1800 },

  // Throwables
  { name: 'weapon_grenade', displayName: 'Grenade', category: 'Throwables', hash: 0x93E220BD, ammoType: 'AMMO_GRENADE', damage: 150, range: 30, accuracy: 70, fireRate: 0 },
  { name: 'weapon_bzgas', displayName: 'BZ Gas', category: 'Throwables', hash: 0xA0973D5E, ammoType: 'AMMO_BZGAS', damage: 0, range: 25, accuracy: 75, fireRate: 0 },
  { name: 'weapon_molotov', displayName: 'Molotov Cocktail', category: 'Throwables', hash: 0x24B17070, ammoType: 'AMMO_MOLOTOV', damage: 100, range: 25, accuracy: 60, fireRate: 0 },
  { name: 'weapon_stickybomb', displayName: 'Sticky Bomb', category: 'Throwables', hash: 0x2C3731D9, ammoType: 'AMMO_STICKYBOMB', damage: 200, range: 20, accuracy: 80, fireRate: 0 },
  { name: 'weapon_proxmine', displayName: 'Proximity Mine', category: 'Throwables', hash: 0xAB564B93, ammoType: 'AMMO_PROXMINE', damage: 180, range: 15, accuracy: 90, fireRate: 0 },
  { name: 'weapon_snowball', displayName: 'Snowball', category: 'Throwables', hash: 0x787F0BB, ammoType: 'AMMO_SNOWBALL', damage: 5, range: 15, accuracy: 50, fireRate: 0 },
  { name: 'weapon_pipebomb', displayName: 'Pipe Bomb', category: 'Throwables', hash: 0xBA45E8B8, ammoType: 'AMMO_PIPEBOMB', damage: 170, range: 22, accuracy: 75, fireRate: 0 },
  { name: 'weapon_ball', displayName: 'Baseball', category: 'Throwables', hash: 0x23C9F95C, ammoType: 'AMMO_BALL', damage: 10, range: 20, accuracy: 60, fireRate: 0 },
  { name: 'weapon_smokegrenade', displayName: 'Smoke Grenade', category: 'Throwables', hash: 0xFDBC8A50, ammoType: 'AMMO_SMOKEGRENADE', damage: 0, range: 35, accuracy: 80, fireRate: 0 },
  { name: 'weapon_flare', displayName: 'Flare', category: 'Throwables', hash: 0x497FACC3, ammoType: 'AMMO_FLARE', damage: 20, range: 40, accuracy: 85, fireRate: 0 }
]

export function getGTAVWeapons(): GTAVWeapon[] {
  return GTAV_WEAPONS
}

export function getGTAVWeaponCategories(): string[] {
  const categories = new Set(GTAV_WEAPONS.map(weapon => weapon.category))
  return Array.from(categories).sort()
}

export function getGTAVWeaponsByCategory(category: string): GTAVWeapon[] {
  if (category === 'All') {
    return GTAV_WEAPONS
  }
  return GTAV_WEAPONS.filter(weapon => weapon.category === category)
}



