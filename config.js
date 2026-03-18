// ============================================================
// CONFIG.JS — All app-wide configuration & static data
// ============================================================

// ── FIREBASE ─────────────────────────────────────────────────
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDbhuP9fhjI_0cxiUSTYi6dw4xqM0QI8wg",
  authDomain:        "videocall-ada87.firebaseapp.com",
  databaseURL:       "https://videocall-ada87-default-rtdb.firebaseio.com",
  projectId:         "videocall-ada87",
  storageBucket:     "videocall-ada87.firebasestorage.app",
  messagingSenderId: "1048410446932",
  appId:             "1:1048410446932:web:0f3e3d8538e466202061c1"
};

// ── APP KEYS (single source of truth — never redeclare these) ─
var ADMIN_EMAIL       = 'admin@efootballuniverse.com';
var PAYSTACK_PK       = 'pk_live_46d79b8be095322027cec63e4b69a5e48e32a3a4';
var CLOUDINARY_CLOUD  = 'dbgxllxdb';
var CLOUDINARY_PRESET = 'efootball_screenshots';

// ── FIREBASE DB PATHS ─────────────────────────────────────────
// Centralised so a rename only needs changing here
var DB = {
  players:    'ef_players',
  matches:    'ef_matches',
  penalties:  'ef_penalties',
  polls:      'ef_polls',
  reports:    'ef_reports',
  chat:       'ef_chat',
  typing:     'ef_typing',
  dm:         'ef_dm',
  dmMeta:     'ef_dm_meta',
  dmUnread:   'ef_dm_unread',
  online:     'ef_online',
  matchRooms: 'ef_match_rooms',
  matchChat:  'ef_match_chat',
  swaps:      'ef_swaps',
  uclSet:     'ef_ucl_settings',
  uclPay:     'ef_ucl_payments',
  news:       'ef_news',
  notifs:     'ef_notifs',
  fcmTokens:  'ef_fcm_tokens',
  season:     'ef_season'
};

// ── LEAGUE DATA ───────────────────────────────────────────────
var LGS = {
  epl: {
    n:'Premier League', short:'EPL', f:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    c:'#00ff85', accent:'#00ff85',
    bg:'rgba(0,255,133,0.08)',
    logo:'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg'
  },
  laliga: {
    n:'La Liga', short:'LaLiga', f:'🇪🇸',
    c:'#ff4b00', accent:'#ff4b00',
    bg:'rgba(255,75,0,0.10)',
    logo:'https://upload.wikimedia.org/wikipedia/en/7/75/LaLiga_Santander.svg'
  },
  seriea: {
    n:'Serie A', short:'Serie A', f:'🇮🇹',
    c:'#1a56db', accent:'#1a56db',
    bg:'rgba(26,86,219,0.10)',
    logo:'https://upload.wikimedia.org/wikipedia/en/e/e1/Serie_A_logo_%282019%29.svg'
  },
  ligue1: {
    n:'Ligue 1', short:'Ligue 1', f:'🇫🇷',
    c:'#daa520', accent:'#daa520',
    bg:'rgba(218,165,32,0.10)',
    logo:'https://upload.wikimedia.org/wikipedia/en/c/cd/Ligue_1_Uber_Eats_logo.svg'
  }
};

// ── CLUB DATA ─────────────────────────────────────────────────
// 10 clubs per league — one per registered player
var ALL_CLUBS = {
  epl: [
    { name:'Liverpool',         color:'#C8102E', logo:'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
    { name:'Arsenal',           color:'#EF0107', logo:'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg' },
    { name:'Manchester City',   color:'#6CABDD', logo:'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg' },
    { name:'Chelsea',           color:'#034694', logo:'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg' },
    { name:'Newcastle United',  color:'#241F20', logo:'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg' },
    { name:'Tottenham Hotspur', color:'#132257', logo:'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg' },
    { name:'Aston Villa',       color:'#95BFE5', logo:'https://upload.wikimedia.org/wikipedia/en/9/9f/Aston_Villa_logo.svg' },
    { name:'Manchester United', color:'#DA291C', logo:'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg' },
    { name:'Nottingham Forest', color:'#DD0000', logo:'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg' },
    { name:'Brighton',          color:'#0057B8', logo:'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg' }
  ],
  laliga: [
    { name:'Barcelona',         color:'#A50044', logo:'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg' },
    { name:'Real Madrid',       color:'#FEBE10', logo:'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg' },
    { name:'Atletico Madrid',   color:'#CB3524', logo:'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg' },
    { name:'Athletic Bilbao',   color:'#EE2523', logo:'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg' },
    { name:'Villarreal',        color:'#FFD700', logo:'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg' },
    { name:'Real Sociedad',     color:'#0067B1', logo:'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg' },
    { name:'Real Betis',        color:'#00954C', logo:'https://upload.wikimedia.org/wikipedia/en/5/5c/Real_Betis_logo.svg' },
    { name:'Sevilla',           color:'#C41E3A', logo:'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg' },
    { name:'Osasuna',           color:'#D2001F', logo:'https://upload.wikimedia.org/wikipedia/en/d/d8/CA_Osasuna_logo.svg' },
    { name:'Valencia',          color:'#FF7F00', logo:'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg' }
  ],
  seriea: [
    { name:'Napoli',            color:'#087CC4', logo:'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli.svg' },
    { name:'Inter Milan',       color:'#0068A8', logo:'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg' },
    { name:'AC Milan',          color:'#FB090B', logo:'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg' },
    { name:'Juventus',          color:'#333333', logo:'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg' },
    { name:'Atalanta',          color:'#1E73BE', logo:'https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg' },
    { name:'Roma',              color:'#8B0000', logo:'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg' },
    { name:'Lazio',             color:'#87CEEB', logo:'https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg' },
    { name:'Fiorentina',        color:'#6A0DAD', logo:'https://upload.wikimedia.org/wikipedia/en/4/4b/ACF_Fiorentina_logo.svg' },
    { name:'Bologna',           color:'#D40000', logo:'https://upload.wikimedia.org/wikipedia/en/5/5a/Bologna_FC_1909_logo.svg' },
    { name:'Torino',            color:'#8B0000', logo:'https://upload.wikimedia.org/wikipedia/en/2/2e/Torino_FC_Logo.svg' }
  ],
  ligue1: [
    { name:'PSG',               color:'#004170', logo:'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg' },
    { name:'Marseille',         color:'#009EDD', logo:'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg' },
    { name:'Monaco',            color:'#D4021D', logo:'https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg' },
    { name:'Nice',              color:'#C8102E', logo:'https://upload.wikimedia.org/wikipedia/en/7/7a/OGC_Nice_logo.svg' },
    { name:'Lille',             color:'#C41E3A', logo:'https://upload.wikimedia.org/wikipedia/en/3/3f/LOSC_Lille_logo.svg' },
    { name:'Lyon',              color:'#003DA5', logo:'https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg' },
    { name:'Lens',              color:'#FFD700', logo:'https://upload.wikimedia.org/wikipedia/en/c/c5/Racing_Club_de_Lens_logo.svg' },
    { name:'Rennes',            color:'#D40000', logo:'https://upload.wikimedia.org/wikipedia/en/9/9e/Stade_Rennais_FC.svg' },
    { name:'Strasbourg',        color:'#1E3F8B', logo:'https://upload.wikimedia.org/wikipedia/en/8/8c/Racing_Club_de_Strasbourg_Alsace_logo.svg' },
    { name:'Brest',             color:'#E30613', logo:'https://upload.wikimedia.org/wikipedia/en/0/05/Stade_Brestois_29_logo.svg' }
  ]
};

// ── UCL LEAGUE IDs ────────────────────────────────────────────
// FIX: original code used wrong IDs ('esl','ebl','esc') — now correct
var UCL_LEAGUES = ['epl', 'laliga', 'seriea', 'ligue1'];

// ── ACHIEVEMENT BADGE DEFINITIONS ────────────────────────────
var BADGES = {
  league_winner: { icon:'🏆', label:'League Winner',   color:'#FFE600', desc:'Finished 1st in their league',        rarity:'legendary' },
  comeback:      { icon:'💪', label:'Comeback King',    color:'#bf00ff', desc:'Was bottom half, finished top 4',     rarity:'epic'      },
  unbeaten:      { icon:'🛡', label:'Unbeaten Run',     color:'#00FF85', desc:'5+ games without a loss',             rarity:'rare'      },
  top_form:      { icon:'🔥', label:'On Fire',          color:'#ff6b00', desc:'Won last 3 matches in a row',         rarity:'rare'      },
  clean_sheet:   { icon:'🧤', label:'Clean Sheet King', color:'#00D4FF', desc:'3+ clean sheets in last 10 games',    rarity:'rare'      },
  giant_killer:  { icon:'⚡', label:'Giant Killer',     color:'#FF2882', desc:'Beat a top-3 ranked player',          rarity:'epic'      },
  veteran:       { icon:'⭐', label:'Veteran',          color:'#aaa',    desc:'Played 10+ matches',                  rarity:'common'    },
  consistent:    { icon:'📈', label:'Mr Consistent',    color:'#FFE600', desc:'Unbeaten in last 5 matches',          rarity:'rare'      },
  oracle:        { icon:'🔮', label:'The Oracle',       color:'#a855f7', desc:'10+ exact score predictions correct', rarity:'legendary' },
  sharp:         { icon:'🎯', label:'Sharp Shooter',    color:'#00D4FF', desc:'5+ exact score predictions correct',  rarity:'epic'      },
  predictor:     { icon:'🧠', label:'Predictor',        color:'#00FF85', desc:'10+ correct outcome predictions',     rarity:'rare'      },
  prophet:       { icon:'👁', label:'The Prophet',      color:'#FFE600', desc:'3 exact scores in a row',             rarity:'epic'      },
  analyst:       { icon:'📊', label:'Analyst',          color:'#00D4FF', desc:'Predicted 20+ matches total',         rarity:'rare'      }
};

var RARITY_GLOW = {
  legendary: 'rgba(255,230,0,0.6)',
  epic:      'rgba(168,85,247,0.5)',
  rare:      'rgba(0,212,255,0.5)',
  common:    'rgba(255,255,255,0.2)'
};

// ── COUNTRIES LIST ────────────────────────────────────────────
var COUNTRIES = [
  'Nigeria','Ghana','Kenya','South Africa',
  'United Kingdom','United States','Germany',
  'France','Spain','Italy','Brazil','Portugal','Other'
];

// ── PUSH NOTIFICATION VAPID KEY ───────────────────────────────
// Get this from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
var FCM_VAPID_KEY = '';
