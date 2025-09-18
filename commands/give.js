const PlayerData = require('../models/PlayerData');

module.exports = {
    name: 'give',
    description: 'Transfer coins to another player',
    usage: '<@user> <amount>',
    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('Usage: !give <@user> <amount>');
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1], 10);

        if (!target) {
            return message.reply('You must mention a user to give coins to.');
        }
        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please specify a valid amount of coins to give.');
        }
        if (target.id === message.author.id) {
            return message.reply('You cannot give coins to yourself.');
        }

        const senderId = message.author.id;
        const receiverId = target.id;

        // Fetch both users
        const [sender, receiver] = await Promise.all([
            PlayerData.findOne({ userId: senderId }),
            PlayerData.findOne({ userId: receiverId })
        ]);

        if (!sender || sender.coins < amount) {
            return message.reply('You do not have enough coins.');
        }

        // Create receiver if not exists
        if (!receiver) {
            await PlayerData.create({ userId: receiverId, coins: amount });
        } else {
            receiver.coins += amount;
            await receiver.save();
        }

        sender.coins -= amount;
        await sender.save();

        message.reply(`You have given ${amount} coins to <@${receiverId}>!`);
    }
};
