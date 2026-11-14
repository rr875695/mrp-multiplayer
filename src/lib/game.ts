export type Role =
  | "detective"
  | "thief"
  | "witness"
  | "investigator"
  | "insider"
  | "security"
  | "journalist"
  | "guard";

export type GamePhase =
  | "intro"
  | "role_reveal"
  | "decision"
  | "result"
  | "discussion"
  | "vote"
  | "reveal"
  | "finished";

export type Choice = {
  id: string;
  title: string;
  description: string;
};

export type RoleInfo = {
  role: Role;
  title: string;
  icon: string;
  description: string;
  objective: string;
};

export const ROLE_INFO: Record<Role, RoleInfo> = {
  detective: {
    role: "detective",
    title: "Detective",
    icon: "🕵️",
    description:
      "You are investigating the disappearance of the Royal Diamond.",
    objective:
      "Identify the thief and uncover the truth behind Project Ruby.",
  },

  thief: {
    role: "thief",
    title: "Thief",
    icon: "🗝️",
    description:
      "You stole the Royal Diamond during the blackout.",
    objective:
      "Avoid being identified and keep the diamond from being recovered.",
  },

  witness: {
    role: "witness",
    title: "Witness",
    icon: "👁️",
    description:
      "You saw something important during the blackout.",
    objective:
      "Use your information carefully and help uncover the truth.",
  },

  investigator: {
    role: "investigator",
    title: "Investigator",
    icon: "🔎",
    description:
      "You have access to palace security and investigation records.",
    objective:
      "Discover important evidence and connect the clues.",
  },

  insider: {
    role: "insider",
    title: "Insider",
    icon: "🕴️",
    description:
      "You know things about the palace that outsiders do not.",
    objective:
      "Use your inside information to influence the investigation.",
  },

  security: {
    role: "security",
    title: "Security Officer",
    icon: "🔐",
    description:
      "You are responsible for the palace security systems.",
    objective:
      "Find out who accessed and manipulated the security system.",
  },

  journalist: {
    role: "journalist",
    title: "Journalist",
    icon: "📰",
    description:
      "You are investigating the story behind the mysterious theft.",
    objective:
      "Discover hidden information and expose Project Ruby.",
  },

  guard: {
    role: "guard",
    title: "Palace Guard",
    icon: "🛡️",
    description:
      "You were monitoring the palace during the incident.",
    objective:
      "Track movements around the palace and find the diamond.",
  },
};

export const ROLE_ORDER: Role[] = [
  "detective",
  "thief",
  "witness",
  "investigator",
  "insider",
  "security",
  "journalist",
  "guard",
];

export function getRolesForPlayerCount(count: number): Role[] {
  const safeCount = Math.max(2, Math.min(8, count));

  return ROLE_ORDER.slice(0, safeCount);
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function assignRoles(playerCount: number): Role[] {
  return shuffle(getRolesForPlayerCount(playerCount));
}

/* --------------------------------------------------
   CASE 01 — THE MISSING DIAMOND
-------------------------------------------------- */

export const CASE_TITLE = "THE MISSING DIAMOND";

export const CASE_LOCATION = "Royal Palace";

export const CASE_INTRO = [
  "11:47 PM.",
  "The Royal Palace is hosting a charity gala.",
  "A ₹2.5 crore diamond is displayed inside the Exhibition Room.",
  "Suddenly, the lights go out.",
  "For exactly 20 seconds, the palace is completely dark.",
  "When the lights return, the diamond is gone.",
  "The Exhibition Room is locked.",
  "Nobody has left the palace.",
  "The thief is still inside.",
];

export const ROUNDS = [
  {
    number: 1,
    title: "LIGHTS OUT",
    subtitle: "The diamond disappears.",
  },
  {
    number: 2,
    title: "THE SILVER KEY",
    subtitle: "A mysterious key becomes the centre of the investigation.",
  },
  {
    number: 3,
    title: "BROKEN CCTV",
    subtitle: "Someone has deleted the security footage.",
  },
  {
    number: 4,
    title: "THE HIDDEN MESSAGE",
    subtitle: "Project Ruby changes everything.",
  },
  {
    number: 5,
    title: "FINAL ACCUSATION",
    subtitle: "Find the thief. Find the planner. Find the diamond.",
  },
];

export const ROUND_TIME = {
  decision: 20,
  discussion: 30,
  interrogation: 15,
};

export const ROUND_1_CHOICES: Record<Role, Choice[]> = {
  detective: [
    {
      id: "inspect_room",
      title: "Inspect Exhibition Room",
      description: "Look for signs of forced entry.",
    },
    {
      id: "security_log",
      title: "Check Security Log",
      description: "Investigate what happened during the blackout.",
    },
    {
      id: "question_player",
      title: "Question a Player",
      description: "Ask another player what they saw.",
    },
  ],

  thief: [
    {
      id: "hide_key",
      title: "Hide the Silver Key",
      description: "Make sure nobody discovers your key.",
    },
    {
      id: "blame_player",
      title: "Blame Another Player",
      description: "Create suspicion around someone else.",
    },
    {
      id: "stay_silent",
      title: "Say Nothing",
      description: "Avoid drawing attention to yourself.",
    },
  ],

  witness: [
    {
      id: "reveal_key",
      title: "Reveal the Silver Key",
      description: "Tell everyone what you saw.",
    },
    {
      id: "hide_clue",
      title: "Keep the Clue Secret",
      description: "Save the information for later.",
    },
    {
      id: "tell_detective",
      title: "Tell Detective Privately",
      description: "Share the clue only with the Detective.",
    },
  ],

  investigator: [
    {
      id: "check_access",
      title: "Check Key Access Log",
      description: "Find who could access the Exhibition Room.",
    },
    {
      id: "inspect_room",
      title: "Inspect Exhibition Room",
      description: "Look for evidence around the diamond case.",
    },
    {
      id: "question_staff",
      title: "Question Palace Staff",
      description: "Ask about the security key.",
    },
  ],

  insider: [
    {
      id: "reveal_second_key",
      title: "Reveal Second Key",
      description: "Tell everyone about the second silver key.",
    },
    {
      id: "tell_detective",
      title: "Tell Detective",
      description: "Privately share your inside information.",
    },
    {
      id: "hide_information",
      title: "Hide Information",
      description: "Keep your knowledge secret.",
    },
  ],

  security: [
    {
      id: "check_security",
      title: "Check Security System",
      description: "Investigate the blackout.",
    },
    {
      id: "check_key_registry",
      title: "Check Key Registry",
      description: "Find who was issued a security key.",
    },
    {
      id: "check_cameras",
      title: "Check Cameras",
      description: "Look for anything unusual in the footage.",
    },
  ],

  journalist: [
    {
      id: "observe_players",
      title: "Observe Players",
      description: "Look for suspicious behaviour.",
    },
    {
      id: "investigate_story",
      title: "Investigate the Story",
      description: "Look for information about the diamond.",
    },
    {
      id: "stay_silent",
      title: "Stay Silent",
      description: "Watch everyone before revealing anything.",
    },
  ],

  guard: [
    {
      id: "check_exit",
      title: "Check Palace Exit",
      description: "Make sure nobody escaped.",
    },
    {
      id: "check_corridor",
      title: "Check Service Corridor",
      description: "Investigate movement near the Exhibition Room.",
    },
    {
      id: "watch_players",
      title: "Watch Players",
      description: "Observe suspicious behaviour.",
    },
  ],
};

/* --------------------------------------------------
   ROUND 2
-------------------------------------------------- */

export const ROUND_2_CHOICES: Record<Role, Choice[]> = {
  detective: [
    {
      id: "investigate_key",
      title: "Investigate Key Access",
      description: "Find who could access the Exhibition Room.",
    },
    {
      id: "question_witness",
      title: "Question Witness",
      description: "Ask the Witness what they remember.",
    },
    {
      id: "follow_suspect",
      title: "Follow a Suspect",
      description: "Secretly investigate another player.",
    },
  ],

  thief: [
    {
      id: "plant_evidence",
      title: "Plant False Evidence",
      description: "Create suspicion around another player.",
    },
    {
      id: "destroy_evidence",
      title: "Destroy Evidence",
      description: "Try to remove evidence against you.",
    },
    {
      id: "stay_quiet",
      title: "Stay Quiet",
      description: "Let everyone investigate each other.",
    },
  ],

  witness: [
    {
      id: "reveal_jacket",
      title: "Reveal Dark Jacket Clue",
      description: "Reveal what you remember about the suspect.",
    },
    {
      id: "tell_detective",
      title: "Tell Detective",
      description: "Share the clue privately.",
    },
    {
      id: "keep_secret",
      title: "Keep It Secret",
      description: "Save the information for later.",
    },
  ],

  investigator: [
    {
      id: "compare_records",
      title: "Compare Records",
      description: "Compare CCTV and access records.",
    },
    {
      id: "search_security",
      title: "Search Security Office",
      description: "Look for another important clue.",
    },
    {
      id: "check_registry",
      title: "Check Key Registry",
      description: "Find who the silver key belongs to.",
    },
  ],

  insider: [
    {
      id: "reveal_second_key",
      title: "Reveal Second Key",
      description: "Tell everyone about the second key.",
    },
    {
      id: "tell_detective",
      title: "Tell Detective",
      description: "Privately share the information.",
    },
    {
      id: "hide_information",
      title: "Hide Information",
      description: "Keep your knowledge secret.",
    },
  ],

  security: [
    {
      id: "report_mismatch",
      title: "Report Key Mismatch",
      description: "Reveal the security discrepancy.",
    },
    {
      id: "recheck_office",
      title: "Recheck Security Office",
      description: "Search for the missing key.",
    },
    {
      id: "hide_information",
      title: "Hide Information",
      description: "Keep the discrepancy secret.",
    },
  ],

  journalist: [
    {
      id: "reveal_observation",
      title: "Reveal Observation",
      description: "Tell everyone what you noticed.",
    },
    {
      id: "investigate_player",
      title: "Investigate Player",
      description: "Secretly investigate suspicious behaviour.",
    },
    {
      id: "keep_private",
      title: "Keep It Private",
      description: "Save the information for later.",
    },
  ],

  guard: [
    {
      id: "reveal_corridor",
      title: "Reveal Corridor",
      description: "Tell everyone about the service corridor.",
    },
    {
      id: "investigate_corridor",
      title: "Investigate Corridor",
      description: "Search the service corridor.",
    },
    {
      id: "stay_silent",
      title: "Stay Silent",
      description: "Keep the information secret.",
    },
  ],
};

/* --------------------------------------------------
   CLUES
-------------------------------------------------- */

export const CLUES = {
  securityFailure: {
    id: "security_failure",
    title: "Security Failure",
    text: "The security system went offline for exactly 23 seconds.",
  },

  silverKey: {
    id: "silver_key",
    title: "Silver Key",
    text: "Someone was seen carrying a silver key near the Exhibition Room.",
  },

  authorizedAccess: {
    id: "authorized_access",
    title: "Authorized Access",
    text: "The Exhibition Room was opened using an authorized key.",
  },

  noForcedEntry: {
    id: "no_forced_entry",
    title: "No Forced Entry",
    text: "There are no signs that the Exhibition Room was forced open.",
  },

  cctvDeleted: {
    id: "cctv_deleted",
    title: "Deleted CCTV",
    text: "The CCTV footage was manually deleted at 12:18 AM.",
  },

  projectRuby: {
    id: "project_ruby",
    title: "Project Ruby",
    text: "A hidden file reveals that the incident was planned before the theft.",
  },
};

/* --------------------------------------------------
   SCORE VALUES
-------------------------------------------------- */

export const SCORE = {
  clue: 50,
  correctThief: 200,
  correctPlanner: 150,
  correctLocation: 100,

  thiefAvoidedCapture: 200,
  thiefFalseLead: 100,
  thiefDiamondNotRecovered: 200,
  thiefEscape: 300,
};

/* --------------------------------------------------
   HELPER FUNCTIONS
-------------------------------------------------- */

export function getRoleInfo(role: Role) {
  return ROLE_INFO[role];
}

export function getRound(number: number) {
  return ROUNDS.find((round) => round.number === number);
}

export function getChoicesForRole(
  round: number,
  role: Role
): Choice[] {
  if (round === 1) {
    return ROUND_1_CHOICES[role] ?? [];
  }

  if (round === 2) {
    return ROUND_2_CHOICES[role] ?? [];
  }

  return [];
}

/* ==================================================
   BHOOL BHULAIYAA — MAZE GAME
   ================================================== */

// export type Gate = "A" | "B" | "C";

// export type MazeRoom = {
//   id: number;
//   title: string;
//   clue: string;

//   gates: {
//     A: string;
//     B: string;
//     C: string;
//   };

//   correctGate: Gate;

//   nextRoom: {
//     A: number;
//     B: number;
//     C: number;
//   };

//   isTreasureRoom?: boolean;
// };

// /*
//    GAME RULE

//    Every room has 3 gates.

//    Player reads the clue and chooses
//    A / B / C.

//    Correct gate -> deeper into maze.

//    Wrong gate -> another path / dead-end.

//    Eventually players reach the treasure room.
// */

// export const MAZE_ROOMS: MazeRoom[] = [
//   {
//     id: 1,
//     title: "ROOM 01",
//     clue: "The middle gate leads where the light disappears.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "B",

//     nextRoom: {
//       A: 2,
//       B: 3,
//       C: 4,
//     },
//   },

//   {
//     id: 2,
//     title: "ROOM 02",
//     clue: "The silent path hides beneath the moon.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "A",

//     nextRoom: {
//       A: 5,
//       B: 1,
//       C: 6,
//     },
//   },

//   {
//     id: 3,
//     title: "ROOM 03",
//     clue: "The light touches the gate on the right.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "C",

//     nextRoom: {
//       A: 2,
//       B: 6,
//       C: 7,
//     },
//   },

//   {
//     id: 4,
//     title: "ROOM 04",
//     clue: "The darkest shadow lies behind the left gate.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "A",

//     nextRoom: {
//       A: 6,
//       B: 2,
//       C: 8,
//     },
//   },

//   {
//     id: 5,
//     title: "ROOM 05",
//     clue: "The echo comes from the middle.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "B",

//     nextRoom: {
//       A: 3,
//       B: 8,
//       C: 4,
//     },
//   },

//   {
//     id: 6,
//     title: "ROOM 06",
//     clue: "Follow the cold wind. It comes from the right.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "C",

//     nextRoom: {
//       A: 5,
//       B: 3,
//       C: 9,
//     },
//   },

//   {
//     id: 7,
//     title: "ROOM 07",
//     clue: "A faint golden glow appears on the left.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "A",

//     nextRoom: {
//       A: 10,
//       B: 4,
//       C: 6,
//     },
//   },

//   {
//     id: 8,
//     title: "ROOM 08",
//     clue: "Three shadows stand still. Only the middle one has no echo.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "B",

//     nextRoom: {
//       A: 7,
//       B: 10,
//       C: 5,
//     },
//   },

//   {
//     id: 9,
//     title: "ROOM 09",
//     clue: "The sound of metal comes from the left.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "A",

//     nextRoom: {
//       A: 10,
//       B: 6,
//       C: 8,
//     },
//   },

//   {
//     id: 10,
//     title: "ROOM 10",
//     clue: "The treasure is near, but the silent gate knows the way.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "C",

//     nextRoom: {
//       A: 7,
//       B: 9,
//       C: 11,
//     },
//   },

//   {
//     id: 11,
//     title: "TREASURE CHAMBER",
//     clue: "You feel a strange warmth behind the ancient gates.",

//     gates: {
//       A: "LEFT",
//       B: "MIDDLE",
//       C: "RIGHT",
//     },

//     correctGate: "B",

//     nextRoom: {
//       A: 10,
//       B: 11,
//       C: 10,
//     },

//     isTreasureRoom: true,
//   },
// ];

// /* ==================================================
//    MAZE HELPERS
//    ================================================== */

// export function getMazeRoom(roomId: number): MazeRoom {
//   return (
//     MAZE_ROOMS.find((room) => room.id === roomId) ??
//     MAZE_ROOMS[0]
//   );
// }

// export function getNextMazeRoom(
//   roomId: number,
//   gate: Gate
// ): number {
//   const room = getMazeRoom(roomId);

//   return room.nextRoom[gate];
// }

// export function isCorrectGate(
//   roomId: number,
//   gate: Gate
// ): boolean {
//   const room = getMazeRoom(roomId);

//   return room.correctGate === gate;
// }

// export function isTreasureRoom(
//   roomId: number
// ): boolean {
//   return getMazeRoom(roomId).isTreasureRoom === true;
// }

/* ==================================================
   BHOOL BHULAIYAA MAZE
   ================================================== */

export type Gate = "A" | "B" | "C";

export type MazeGate = {
  name: string;
};

export type MazeRoom = {
  id: number;
  title: string;
  clue: string;

  gates: {
    A: MazeGate;
    B: MazeGate;
    C: MazeGate;
  };

  correctGate: Gate;

  nextRoom: {
    A: number;
    B: number;
    C: number;
  };

  hasInnerWalls: boolean;
  isTreasureRoom?: boolean;
};

export const MAZE_ROOMS: MazeRoom[] = [
  {
    id: 1,
    title: "ROOM 01",
    clue: "The silent arch has no reflection.",

    gates: {
      A: { name: "MIRROR GATE" },
      B: { name: "SILENT ARCH" },
      C: { name: "LANTERN GATE" },
    },

    correctGate: "B",

    nextRoom: {
      A: 1,
      B: 2,
      C: 1,
    },

    hasInnerWalls: true,
  },

  {
    id: 2,
    title: "ROOM 02",
    clue: "A cold breeze comes from the forgotten door.",

    gates: {
      A: { name: "COLD BREEZE" },
      B: { name: "IRON DOOR" },
      C: { name: "RED DOOR" },
    },

    correctGate: "A",

    nextRoom: {
      A: 3,
      B: 2,
      C: 2,
    },

    hasInnerWalls: false,
  },

  {
    id: 3,
    title: "ROOM 03",
    clue: "Follow the gate where a faint golden glow rests.",

    gates: {
      A: { name: "BLACK STONE" },
      B: { name: "DARK PASSAGE" },
      C: { name: "GOLDEN GLOW" },
    },

    correctGate: "C",

    nextRoom: {
      A: 3,
      B: 3,
      C: 4,
    },

    hasInnerWalls: false,
  },

  {
    id: 4,
    title: "ROOM 04",
    clue: "The echo dies behind the gate made of stone.",

    gates: {
      A: { name: "STONE GATE" },
      B: { name: "ECHO GATE" },
      C: { name: "WOODEN DOOR" },
    },

    correctGate: "A",

    nextRoom: {
      A: 5,
      B: 4,
      C: 4,
    },

    hasInnerWalls: false,
  },

  {
    id: 5,
    title: "ROOM 05",
    clue: "Only the gate carrying the sound of bells knows the way.",

    gates: {
      A: { name: "EMPTY HALL" },
      B: { name: "BELL GATE" },
      C: { name: "BROKEN GATE" },
    },

    correctGate: "B",

    nextRoom: {
      A: 5,
      B: 6,
      C: 5,
    },

    hasInnerWalls: false,
  },

  {
    id: 6,
    title: "ROOM 06",
    clue: "A freezing wind whispers behind the moonlit gate.",

    gates: {
      A: { name: "FIRE GATE" },
      B: { name: "STONE DOOR" },
      C: { name: "MOONLIT GATE" },
    },

    correctGate: "C",

    nextRoom: {
      A: 6,
      B: 6,
      C: 7,
    },

    hasInnerWalls: false,
  },

  {
    id: 7,
    title: "ROOM 07",
    clue: "The golden mark shines above the forgotten entrance.",

    gates: {
      A: { name: "GOLDEN MARK" },
      B: { name: "OLD WOOD" },
      C: { name: "BLACK IRON" },
    },

    correctGate: "A",

    nextRoom: {
      A: 8,
      B: 7,
      C: 7,
    },

    hasInnerWalls: false,
  },

  {
    id: 8,
    title: "ROOM 08",
    clue: "There is no echo behind the gate that stands in silence.",

    gates: {
      A: { name: "ECHO HALL" },
      B: { name: "SILENT GATE" },
      C: { name: "CRACKED DOOR" },
    },

    correctGate: "B",

    nextRoom: {
      A: 8,
      B: 9,
      C: 8,
    },

    hasInnerWalls: false,
  },

  {
    id: 9,
    title: "ROOM 09",
    clue: "The sound of metal comes from the old iron gate.",

    gates: {
      A: { name: "IRON GATE" },
      B: { name: "STONE ARCH" },
      C: { name: "WOODEN GATE" },
    },

    correctGate: "A",

    nextRoom: {
      A: 10,
      B: 9,
      C: 9,
    },

    hasInnerWalls: false,
  },

  {
    id: 10,
    title: "ROOM 10",
    clue: "A golden key is carved into the gate that faces the light.",

    gates: {
      A: { name: "DARK GATE" },
      B: { name: "SHADOW DOOR" },
      C: { name: "GOLDEN KEY" },
    },

    correctGate: "C",

    nextRoom: {
      A: 10,
      B: 10,
      C: 11,
    },

    hasInnerWalls: false,
  },

  {
    id: 11,
    title: "TREASURE CHAMBER",
    clue: "The ancient lock opens only for the gate marked with the crown.",

    gates: {
      A: { name: "BROKEN CROWN" },
      B: { name: "CROWN GATE" },
      C: { name: "EMPTY VAULT" },
    },

    correctGate: "B",

    nextRoom: {
      A: 11,
      B: 11,
      C: 11,
    },

    hasInnerWalls: false,
    isTreasureRoom: true,
  },
];

export function getMazeRoom(roomId: number): MazeRoom {
  return (
    MAZE_ROOMS.find((room) => room.id === roomId) ??
    MAZE_ROOMS[0]
  );
}

export function getNextMazeRoom(
  roomId: number,
  gate: Gate
): number {
  const room = getMazeRoom(roomId);

  return room.nextRoom[gate];
}

export function isCorrectGate(
  roomId: number,
  gate: Gate
): boolean {
  const room = getMazeRoom(roomId);

  return room.correctGate === gate;
}