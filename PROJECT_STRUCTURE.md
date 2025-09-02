# 📁 Project Structure

```
bot-noi-tu/
├── 📄 README.md                    # Main documentation (start here!)
├── 📄 QUICKSTART.md               # Fast setup guide  
├── 📄 package.json                # Dependencies and scripts
├── 📄 .env.example                # Environment template
├── 📄 .env                        # Your configuration (private)
│
├── 🤖 bot.js                      # Main bot application
│
├── 📁 commands/                   # Discord slash commands
│   ├── sicbo.js                  # 🎲 Sic Bo dice game
│   ├── sicbo-config.js           # ⚙️ Sic Bo admin settings
│   ├── them-tu.js                # 📝 Word suggestions
│   ├── set-channel.js            # 🔧 Channel configuration
│   ├── balance.js                # 💰 Check coin balance
│   ├── me.js                     # 👤 Personal statistics
│   ├── rank.js                   # 🏆 Server leaderboard
│   ├── stats.js                  # 📊 Global bot statistics
│   ├── ping.js                   # 🏓 Latency check
│   ├── help.js                   # ❓ Help documentation
│   └── ...
│
├── 📁 models/                     # MongoDB data schemas
│   ├── SicBoConfig.js            # 🎲 Sic Bo payout settings
│   ├── SicBoSession.js           # 🎯 Active Sic Bo games
│   ├── GameSession.js            # 🔗 Word chain game sessions
│   ├── PlayerData.js             # 👤 User data and coins
│   ├── GuildConfig.js            # 🏠 Server configurations
│   ├── Ranking.js                # 🏆 Leaderboard data
│   └── ...
│
├── 📁 utils/                      # Helper modules
│   ├── sicbo.js                  # 🎲 Sic Bo game logic
│   ├── sicbo-handlers.js         # 🎮 Sic Bo interaction handlers
│   ├── dice-animation.js         # 🎬 Dice animation system
│   ├── player.js                 # 👤 Player data management
│   ├── dictionary.js             # 📚 Word validation
│   ├── stats.js                  # 📈 Statistics tracking
│   └── ...
│
├── 📁 events/                     # Discord event handlers
│   └── ready.js                  # 🚀 Bot startup event
│
├── 📁 scripts/                    # Utility scripts
│   └── load-wordlists.js         # 📚 Dictionary loader
│
└── 📁 docs/ (optional)            # Additional documentation
    ├── SICBO_DOCUMENTATION.md     # 🎲 Detailed Sic Bo guide
    ├── DICE_ANIMATION_GUIDE.md    # 🎬 Animation customization
    ├── GAME_TOGGLE_GUIDE.md       # 🔧 Testing configuration
    └── ...
```

## 🗂️ Key Files Explained

### 📄 Core Documentation
- **`README.md`** - Complete project documentation, start here
- **`QUICKSTART.md`** - Fast 5-minute setup guide
- **`package.json`** - Dependencies, scripts, and project metadata

### 🤖 Application Files
- **`bot.js`** - Main Discord bot application and word chain game logic
- **`.env`** - Private configuration (tokens, database URI, feature toggles)

### 📁 Commands Directory
Contains all Discord slash commands. Each file exports a command object with:
- `data`: Command definition (name, description, options)
- `execute()`: Command logic and response

### 📁 Models Directory  
MongoDB schemas using Mongoose. Defines data structure for:
- User profiles and coins
- Game sessions and configurations
- Statistics and leaderboards

### 📁 Utils Directory
Helper functions and game logic:
- **Sic Bo**: Game mechanics, animations, interaction handling
- **Player**: Coin management, statistics tracking  
- **Dictionary**: Word validation and database queries

## 🎯 Where to Start

1. **New to the project?** → Read `README.md`
2. **Want to set up quickly?** → Follow `QUICKSTART.md`
3. **Need to configure games?** → Check `GAME_TOGGLE_GUIDE.md`
4. **Want to understand Sic Bo?** → See `SICBO_DOCUMENTATION.md`
5. **Customizing dice animation?** → Read `DICE_ANIMATION_GUIDE.md`

## 🔧 Development Workflow

```bash
# 1. Setup
cp .env.example .env    # Configure environment
npm install             # Install dependencies

# 2. Development
npm start              # Run the bot
# Edit files in commands/, models/, utils/

# 3. Testing
# Set ENABLE_* variables in .env to test specific features
# Restart bot to apply changes
```

## 📊 Data Flow

```
Discord User Input
       ↓
Commands/ (slash commands)
       ↓
Utils/ (game logic)
       ↓
Models/ (database)
       ↓
Response to Discord
```

---

**📚 Full documentation is in README.md - this is just the directory overview!**
