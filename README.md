# 🤖 Bot Nối Từ - Vietnamese/English Word Chain Discord Bot
#### Made by Gúp Bu Ngô with ❤️

A feature-rich Discord bot that brings Vietnamese and English word-chain games to your server, complete with gambling features, statistics tracking, and multilingual support.

## 🎮 Features Overview

### 🔗 Word Chain Game (Nối Từ)
- **Vietnamese Mode**: Connect two-word phrases (last word → first word)
- **English Mode**: Connect single words (last letter → first letter)
- **Auto-validation**: Dictionary-powered word verification
- **Win conditions**: Win by ending the chain or reaching 50 correct words (English)
- **Coin rewards**: Earn coins for playing and winning

### 🎲 Sic Bo (Tài Xỉu) Gambling Game
- **All bet types**: Big/Small, Odd/Even, Specific totals, Singles, Doubles, Triples
- **Visual dice animation**: Live countdown with animated dice rolling
- **Comprehensive results**: Detailed player payouts and game outcomes
- **Configurable payouts**: Admin-customizable multipliers
- **Session management**: One game per server with automatic cleanup

### 📊 Statistics & Progress
- **Player profiles**: Individual stats, coin balance, win/loss ratios
- **Server rankings**: Leaderboards for each channel/language
- **Global statistics**: Bot usage across all servers
- **Multilingual support**: Vietnamese and English interfaces

### 🛠️ Administrative Features
- **Channel configuration**: Set different channels for different languages
- **Word suggestions**: Community-driven dictionary expansion
- **Game toggles**: Enable/disable specific features for testing
- **Permission controls**: Admin-only configuration commands

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Discord bot token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ductridev/bot-noi-tu.git
   cd bot-noi-tu
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Set up environment variables**
   ```env
   BOT_TOKEN=your_discord_bot_token
   MONGO_URI=your_mongodb_connection_string
   REPORT_CHANNEL=channel_id_for_word_suggestions
   
   # Game toggles (optional)
   ENABLE_WORD_CHAIN=true
   ENABLE_SICBO=true
   ENABLE_WORD_SUGGESTIONS=true
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## 🎯 Command Reference

### 🔧 Setup Commands
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/set-channel` | Configure game channel and language | Manage Guild |
| `/sicbo-config` | Configure Sic Bo payout multipliers | Manage Guild |

### 🎮 Game Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `!start` | Start word chain game | Any user |
| `!stop` | End current game | Manage Channels |
| `!reset` | Restart game | Manage Channels |
| `/sicbo` | Start Sic Bo betting game | Any user |

### 📊 Info Commands
| Command | Description | Output |
|---------|-------------|--------|
| `/me` | Your personal stats | Coins, wins, accuracy |
| `/balance` | Check coin balance | Total coins across servers |
| `/rank` | Server leaderboard | Top 10 players |
| `/stats` | Bot statistics | Global usage stats |
| `/ping` | Check bot latency | Response time |
| `/help` | Command guide | Full help documentation |

### 🛠️ Utility Commands
| Command | Description | Purpose |
|---------|-------------|---------|
| `/them-tu` | Suggest new words | Community dictionary |
| `/report` | Report incorrect words | Quality control |
| `/server` | Server information | Premium status |

## 🎲 Sic Bo Game Guide

### How to Play
1. Use `/sicbo` in any channel
2. Click betting buttons during 45-second countdown
3. Enter bet amounts in popup modals
4. Watch animated dice roll and see results
5. Receive automatic coin payouts for wins

### Bet Types & Payouts
| Bet Type | Description | Default Payout |
|----------|-------------|----------------|
| **Big/Small** | Total 11-17 / 4-10 | 2:1 |
| **Odd/Even** | Odd or even total | 2:1 |
| **Specific Total** | Exact sum (4-17) | 6:1 to 60:1 |
| **Single Number** | Number appears 1/2/3 times | 2:1 to 4:1 |
| **Double** | Specific pair | 11:1 |
| **Triple** | Specific triple | 180:1 |
| **Any Triple** | Any three of a kind | 31:1 |
| **Two-Dice Combo** | Specific combination | 6:1 |

### Admin Configuration
```bash
/sicbo-config view                    # View current multipliers
/sicbo-config set big 3              # Set Big/Small payout to 3:1
/sicbo-config set triple_1 200       # Set Triple 1s to 200:1
```

## 🔗 Word Chain Game Rules

### Vietnamese Mode
- **Input format**: Two words separated by space
- **Connection rule**: Last word of previous → first word of current
- **Example**: "con mèo" → "mèo rừng" → "rừng già"
- **Dictionary**: Vietnamese two-word phrases

### English Mode
- **Input format**: Single word
- **Connection rule**: Last letter of previous → first letter of current  
- **Example**: "cat" → "tiger" → "rabbit"
- **Win condition**: First to 50 correct words
- **Dictionary**: English single words

### Gameplay Mechanics
- **Turn-based**: Can't play consecutive turns
- **Dictionary validation**: All words checked against database
- **No repeats**: Can't reuse words in same game
- **Coin rewards**: 10 coins per correct word, 100 for winning

## 🔧 Development & Testing

### Game Toggle System
Control which features are active for testing:

```env
# Test only Sic Bo
ENABLE_WORD_CHAIN=false
ENABLE_SICBO=true
ENABLE_WORD_SUGGESTIONS=false

# Test only Word Chain
ENABLE_WORD_CHAIN=true
ENABLE_SICBO=false
ENABLE_WORD_SUGGESTIONS=false
```

### File Structure
```
├── bot.js                 # Main bot file
├── commands/              # Slash commands
│   ├── sicbo.js          # Sic Bo game
│   ├── sicbo-config.js   # Sic Bo admin
│   ├── them-tu.js        # Word suggestions
│   ├── set-channel.js    # Channel setup
│   ├── me.js             # User stats
│   ├── rank.js           # Leaderboards
│   ├── balance.js        # Coin balance
│   ├── stats.js          # Bot statistics
│   ├── ping.js           # Latency check
│   └── help.js           # Help documentation
├── models/               # MongoDB schemas
│   ├── SicBoConfig.js    # Sic Bo settings
│   ├── SicBoSession.js   # Active games
│   ├── GameSession.js    # Word chain sessions
│   ├── PlayerData.js     # User data
│   ├── GuildConfig.js    # Server settings
│   └── Ranking.js        # Leaderboards
├── utils/                # Utility modules
│   ├── sicbo.js          # Sic Bo game logic
│   ├── sicbo-handlers.js # Sic Bo interactions
│   ├── dice-animation.js # Dice animation system
│   ├── player.js         # Player data management
│   ├── dictionary.js     # Word validation
│   └── stats.js          # Statistics tracking
└── events/               # Discord events
    └── ready.js          # Bot startup
```

## 📊 Database Schema

### Core Models
- **PlayerData**: User coins, game statistics
- **GuildConfig**: Server channel configurations
- **GameSession**: Active word chain games
- **Ranking**: Server leaderboards by language
- **SicBoSession**: Active Sic Bo games
- **SicBoConfig**: Payout multiplier settings

### Data Flow
1. **User joins**: PlayerData created automatically
2. **Channel setup**: GuildConfig stores language preferences
3. **Game start**: Session documents track game state
4. **Game end**: Rankings updated, coins distributed
5. **Statistics**: Global counters for analytics

## 🌐 Multilingual Support

### Supported Languages
- **Vietnamese (vi)**: Default language for most servers
- **English (en)**: International support

### Language Configuration
- **Per-channel**: Each channel can have different language
- **Automatic detection**: Commands adapt to channel language
- **Fallback**: Defaults to Vietnamese if not configured

### Localization Features
- Command descriptions
- Game instructions
- Error messages
- Embed titles and fields
- Button labels

## 🏆 Coin System

### Earning Coins
- **Word chain**: 10 coins per correct word
- **Winning games**: 100 bonus coins
- **Sic Bo**: Win based on bet payouts

### Spending Coins
- **Sic Bo betting**: Place bets with your coins
- **Cross-server**: Coins work across all servers

### Balance Management
- **Global balance**: Total coins across all servers
- **Automatic updates**: Real-time balance changes
- **Transaction safety**: Database-level consistency

## 🛡️ Security & Moderation

### Anti-Cheat Measures
- **Turn validation**: Prevents consecutive plays
- **Dictionary verification**: Stops invalid words
- **Session isolation**: One game per server
- **Rate limiting**: Prevents spam

### Admin Controls
- **Permission checks**: Admin-only configuration
- **Channel restrictions**: Game-specific channels
- **Word reporting**: Community moderation
- **Game toggles**: Emergency disable features

## 📈 Analytics & Monitoring

### Tracked Metrics
- **Global statistics**: Players, games, words played
- **Server rankings**: Win rates, accuracy percentages  
- **Usage patterns**: Commands, languages, features
- **Performance**: Response times, error rates

### Console Logging
- **Command loading**: Shows enabled/disabled features
- **Game events**: Start/end notifications
- **Error tracking**: Detailed error information
- **Performance metrics**: Database query times

## 🔧 Configuration Examples

### Basic Server Setup
```bash
# 1. Set Vietnamese channel
/set-channel channel:#vietnamese-games language:vi

# 2. Set English channel  
/set-channel channel:#english-games language:en

# 3. Configure Sic Bo payouts
/sicbo-config set big 2.5
/sicbo-config set small 2.5
```

### Testing Configuration
```env
# Test only word chain
ENABLE_WORD_CHAIN=true
ENABLE_SICBO=false
ENABLE_WORD_SUGGESTIONS=false
```

### Production Environment
```env
BOT_TOKEN=your_production_token
MONGO_URI=mongodb://production_cluster
REPORT_CHANNEL=123456789
ENABLE_WORD_CHAIN=true
ENABLE_SICBO=true
ENABLE_WORD_SUGGESTIONS=true
```

## 🚨 Troubleshooting

### Common Issues

**Bot not responding to commands**
- Check bot permissions in channel
- Verify channel is configured with `/set-channel`
- Ensure bot has required Discord permissions

**Word chain not working**
- Confirm channel language is set
- Check if ENABLE_WORD_CHAIN=true
- Verify dictionary is loaded

**Sic Bo commands missing**
- Check ENABLE_SICBO environment variable
- Restart bot after environment changes
- Verify MongoDB connection

**Coin balance issues**
- Check PlayerData collection in database
- Verify user has played games to earn coins
- Ensure MongoDB transactions are working

### Getting Help
- Check console logs for error messages
- Verify environment variables are set correctly
- Test with `/ping` command for basic connectivity
- Review Discord bot permissions

## 📜 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our support server
- **Documentation**: Check the docs/ folder for detailed guides

## ☕ Donate

Do you like this project? Support it by donating!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/ductridev) <a href="https://www.paypal.com/paypalme/trihd2104" title="ductridev">
  <img src="https://img.shields.io/badge/PayPal-282C34?logo=paypal&logoColor=7952B3" alt="Paypal logo" title="Paypal" height="25" />
</a>

## 👥 Contributors

Thanks go to these wonderful people:
<a href="https://github.com/ductridev/bot-noi-tu/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ductridev/bot-noi-tu" />
</a>

---

**🎮 Ready to bring word games and gambling to your Discord server!**

*Bot Nối Từ - Making Vietnamese and English word games accessible to everyone on Discord - Made by Gúp Bu Ngô with ❤️.*
