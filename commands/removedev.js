const { SlashCommandBuilder } = require('discord.js');
const Developer = require('../models/Developer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removedev')
        .setDescription('Remove a developer')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)),

    async execute(interaction) {
        const authorId = interaction.user.id;

        const isDev = await Developer.exists({ userId: authorId });
        if (!isDev) return interaction.reply({ content: 'You are not authorized to do this.', ephemeral: true });

        const user = interaction.options.getUser('user');
        await Developer.deleteOne({ userId: user.id });

        await interaction.reply({ content: `${user.tag} is no longer a developer.`, ephemeral: true });
    }
};
