const { SlashCommandBuilder } = require('discord.js');
const Developer = require('../models/Developer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adddev')
        .setDescription('Add a developer')
        .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)),

    async execute(interaction) {
        const authorId = interaction.user.id;

        const isDev = await Developer.exists({ userId: authorId });
        if (!isDev) return interaction.reply({ content: 'You are not authorized to do this.', ephemeral: true });

        const user = interaction.options.getUser('user');
        await Developer.updateOne(
            { userId: user.id },
            { $setOnInsert: { userId: user.id } },
            { upsert: true }
        );

        await interaction.reply({ content: `${user.tag} is now a developer.`, ephemeral: true });
    }
};
