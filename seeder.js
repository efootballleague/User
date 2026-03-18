// ============================================================
// SEEDER.JS — Test Data Generator
// HOW TO USE:
// 1. Open your app and log in as admin
// 2. Open browser console (on Android: use Eruda or Chrome DevTools)
// 3. Type: seedAll()
// 4. Wait for "Seeding complete!" message
// 5. Refresh the app
// DELETE THIS FILE after testing — do not ship to production
// ============================================================

var SEED_PLAYERS = {
  epl: [
    { username:'ThunderKing',   country:'Nigeria',        club:'Liverpool'         },
    { username:'ArsenalFan01',  country:'Ghana',          club:'Arsenal'           },
    { username:'CitizenBlue',   country:'United Kingdom', club:'Manchester City'   },
    { username:'ChelseaCFC',    country:'United States',  club:'Chelsea'           },
    { username:'ToonArmy',      country:'Kenya',          club:'Newcastle United'  },
    { username:'SpursForever',  country:'Nigeria',        club:'Tottenham Hotspur' },
    { username:'VillaLion',     country:'Ghana',          club:'Aston Villa'       },
    { username:'RedDevil99',    country:'South Africa',   club:'Manchester United' },
    { username:'ForestGreen',   country:'Nigeria',        club:'Nottingham Forest' },
    // 1 slot reserved for you — Brighton is free
  ],
  laliga: [
    { username:'BarçaMessi',    country:'Spain',          club:'Barcelona'         },
    { username:'HalaMadrid',    country:'Portugal',       club:'Real Madrid'       },
    { username:'CholoBoss',     country:'Brazil',         club:'Atletico Madrid'   },
    { username:'BasqueWarrior', country:'Spain',          club:'Athletic Bilbao'   },
    { username:'YellowSub',     country:'Nigeria',        club:'Villarreal'        },
    { username:'TxuriUrdin',    country:'Ghana',          club:'Real Sociedad'     },
    { username:'BetisVerde',    country:'Nigeria',        club:'Real Betis'        },
    { username:'SevFC',         country:'United Kingdom', club:'Sevilla'           },
    { username:'OsasunaRed',    country:'Nigeria',        club:'Osasuna'           },
    // 1 slot reserved for you — Valencia is free
  ],
  seriea: [
    { username:'NapoliCampioni',country:'Italy',          club:'Napoli'            },
    { username:'InterNerazzurri',country:'Nigeria',       club:'Inter Milan'       },
    { username:'ACMilanista',   country:'Ghana',          club:'AC Milan'          },
    { username:'JuveUntil I Die',country:'Italy',         club:'Juventus'          },
    { username:'AtalaGoddess',  country:'Nigeria',        club:'Atalanta'          },
    { username:'AsRomaLupo',    country:'Italy',          club:'Roma'              },
    { username:'LazioEagle',    country:'Nigeria',        club:'Lazio'             },
    { username:'ViolaFirenze',  country:'Italy',          club:'Fiorentina'        },
    { username:'BolognaRed',    country:'Nigeria',        club:'Bologna'           },
    // 1 slot reserved for you — Torino is free
  ],
  ligue1: [
    { username:'PsgIci',        country:'France',         club:'PSG'               },
    { username:'OMPhoceen',     country:'France',         club:'Marseille'         },
    { username:'MonacoRocher',  country:'Nigeria',        club:'Monaco'            },
    { username:'NiceAzur',      country:'France',         club:'Nice'              },
    { username:'LilleLOSC',     country:'Nigeria',        club:'Lille'             },
    { username:'LyonOL',        country:'France',         club:'Lyon'              },
    { username:'LensRCL',       country:'Nigeria',        club:'Lens'              },
    { username:'RennesBreton',  country:'France',         club:'Rennes'            },
    { username:'StrasBourg',    country:'Nigeria',        club:'Strasbourg'        },
    // 1 slot reserved for you — Brest is free
  ]
};

// Generate realistic match results
function seedMatches(playerUIDs, league) {
  var updates = {};
  var players  = Object.values(playerUIDs);
  var matchCount = 0;

  // Round-robin: each player plays each other once (skip null slots)
  for (var i = 0; i < players.length; i++) {
    if (!players[i]) continue;
    for (var j = i + 1; j < players.length; j++) {
      if (!players[j]) continue;
      // Only seed 60% of matches as played, rest as fixtures
      var isPlayed = Math.random() < 0.6;
      var hg = isPlayed ? Math.floor(Math.random() * 5) : 0;
      var ag = isPlayed ? Math.floor(Math.random() * 5) : 0;
      var mid = 'seed_' + league + '_' + i + '_' + j;
      var matchTime = Date.now() - Math.floor(Math.random() * 30) * 86400000;

      // Pick a referee from same league (not home or away)
      var others = players.filter(function(p, idx) { return idx !== i && idx !== j; });
      var ref    = others[Math.floor(Math.random() * others.length)];

      updates['ef_matches/' + mid] = {
        id:          mid,
        league:      league,
        homeId:      players[i].uid,
        awayId:      players[j].uid,
        hg:          isPlayed ? hg : 0,
        ag:          isPlayed ? ag : 0,
        played:      isPlayed,
        playedAt:    isPlayed ? matchTime : null,
        createdAt:   matchTime - 86400000,
        matchTime:   isPlayed ? null : Date.now() + Math.floor(Math.random() * 7) * 86400000,
        refereeUID:  ref ? ref.uid : '',
        refereeName: ref ? ref.username : 'TBD',
        pendingResult: false
      };
      matchCount++;
    }
  }
  return { updates: updates, count: matchCount };
}

async function seedAll() {
  if (!db || !auth) {
    console.error('❌ Not connected to Firebase. Make sure you are logged in.');
    return;
  }
  if (!confirm('This will add 40 test players and ~180 fixtures to your Firebase database.\n\nContinue?')) return;

  console.log('🌱 Starting seed...');
  var allUpdates = {};
  var allPlayerUIDs = {};

  // Step 1 — Create player profiles
  for (var league in SEED_PLAYERS) {
    var leaguePlayers = SEED_PLAYERS[league];
    allPlayerUIDs[league] = [];

    for (var i = 0; i < leaguePlayers.length; i++) {
      var p   = leaguePlayers[i];
      var uid = 'seed_' + league + '_player_' + i;

      allPlayerUIDs[league].push({ uid: uid, username: p.username });

      allUpdates['ef_players/' + uid] = {
        uid:      uid,
        username: p.username,
        email:    p.username.toLowerCase().replace(/[^a-z0-9]/g,'') + '@test.com',
        country:  p.country,
        league:   league,
        club:     p.club,
        avatar:   '',
        bio:      'Test player — seeded data',
        joinedAt: Date.now() - Math.floor(Math.random() * 60) * 86400000,
        lastSeen: Date.now() - Math.floor(Math.random() * 300) * 60000,
        banned:   false,
        isSeeded: true,        // flag so app knows this is a test account
        autoAccept: true       // auto-accepts swaps, postpones etc for testing
      };
    }

    // Step 2 — Create matches for this league
    var matchData = seedMatches(allPlayerUIDs[league], league);
    Object.assign(allUpdates, matchData.updates);
    console.log('✅ ' + league.toUpperCase() + ': ' + leaguePlayers.length + ' players, ' + matchData.count + ' fixtures');
  }

  // Step 3 — Write everything to Firebase
  try {
    await db.ref().update(allUpdates);
    console.log('🎉 Seeding complete! Refresh your app to see the data.');
    toast('Test data seeded! Refresh the app.');
  } catch(e) {
    console.error('❌ Seeding failed:', e);
    toast('Seeding failed. Check console.', 'error');
  }
}

async function clearSeedData() {
  if (!confirm('Remove ALL seeded test data? Real players will not be affected.')) return;
  var updates = {};

  // Remove seeded players
  for (var league in SEED_PLAYERS) {
    for (var i = 0; i < SEED_PLAYERS[league].length; i++) {
      updates['ef_players/seed_' + league + '_player_' + i] = null;
      // Remove their matches
      for (var j = 0; j < SEED_PLAYERS[league].length; j++) {
        if (i !== j) {
          var mid1 = 'seed_' + league + '_' + Math.min(i,j) + '_' + Math.max(i,j);
          updates['ef_matches/' + mid1] = null;
        }
      }
    }
  }

  try {
    await db.ref().update(updates);
    console.log('🧹 Seed data cleared!');
    toast('Test data removed!');
  } catch(e) {
    console.error('❌ Clear failed:', e);
  }
}

console.log('🌱 Seeder loaded! Type seedAll() to populate test data, clearSeedData() to remove it.');
