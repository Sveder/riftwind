/**
 * Helper functions for displaying League of Legends items
 * Uses Data Dragon CDN for item names and images
 */

// Get item image URL from Data Dragon
function getItemImage(itemId) {
    // Use latest patch - update this periodically
    const patch = '14.24.1';
    return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${itemId}.png`;
}

// Get item name from ID (simplified mapping for common items)
// This is a fallback - ideally would fetch from Data Dragon API
const COMMON_ITEMS = {
    // Mythic/Legendary items
    3006: "Berserker's Greaves",
    3020: "Sorcerer's Shoes",
    3047: "Plated Steelcaps",
    3111: "Mercury's Treads",
    3158: "Ionian Boots of Lucidity",

    // Common Legendaries
    3031: "Infinity Edge",
    3036: "Lord Dominik's Regards",
    3046: "Phantom Dancer",
    3072: "Bloodthirster",
    3078: "Trinity Force",
    3087: "Statikk Shiv",
    3094: "Rapid Firecannon",
    3100: "Lich Bane",
    3115: "Nashor's Tooth",
    3124: "Guinsoo's Rageblade",
    3135: "Void Staff",
    3139: "Mercurial Scimitar",
    3142: "Youmuu's Ghostblade",
    3153: "Blade of the Ruined King",
    3157: "Zhonya's Hourglass",
    3161: "Spear of Shojin",
    3165: "Morellonomicon",
    3181: "Hullbreaker",
    3742: "Dead Man's Plate",
    3748: "Titanic Hydra",
    3814: "Edge of Night",

    // Starter items
    1054: "Doran's Shield",
    1055: "Doran's Blade",
    1056: "Doran's Ring",
    1082: "Dark Seal",

    // Support items
    3850: "Spellthief's Edge",
    3851: "Frostfang",
    3853: "Shard of True Ice",
    3854: "Steel Shoulderguards",
    3855: "Runesteel Spaulders",
    3857: "Pauldrons of Whiterock",
    3858: "Relic Shield",
    3859: "Targon's Buckler",
    3860: "Bulwark of the Mountain",
    3862: "Spectral Sickle",
    3863: "Harrowing Crescent",
    3864: "Black Mist Scythe",

    // Jungle items
    1039: "Hunter's Hatchet",
    1040: "Obsidian Edge",
    1041: "Scorchclaw Pup",
    1042: "Gustwalker Hatchling",
    1043: "Mosstomper Seedling",

    // Components
    1018: "Cloak of Agility",
    1026: "Blasting Wand",
    1027: "Sapphire Crystal",
    1028: "Ruby Crystal",
    1029: "Cloth Armor",
    1031: "Chain Vest",
    1033: "Null-Magic Mantle",
    1037: "Pickaxe",
    1038: "B.F. Sword",
    1043: "Recurve Bow",
    1052: "Amplifying Tome",
    1053: "Vampiric Scepter",
    1058: "Needlessly Large Rod",
    3066: "Winged Moonplate",
    3067: "Kindlegem",
    3076: "Bramble Vest",
    3082: "Warden's Mail",
    3133: "Caulfield's Warhammer",
    3134: "Serrated Dirk",
    3152: "Hextech Alternator",
    3155: "Hexdrinker",
    3801: "Crystalline Bracer",
};

function getItemName(itemId) {
    return COMMON_ITEMS[itemId] || `Item ${itemId}`;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getItemImage, getItemName };
}
