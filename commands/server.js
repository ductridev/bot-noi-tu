const {
    SlashCommandBuilder,
    EmbedBuilder,
    Client,
    InteractionCollector,
} = require('discord.js');

const serverEmbed = async (interaction, client) => {
    const guild = interaction.member.guild;
    const owner = await guild.fetchOwner();

    return new EmbedBuilder()
        .setColor(13250094)
        .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL({ dynamic: true }),
        })
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            {
                name: ':id: ID Server',
                value: interaction.guildId,
                inline: true,
            },
            {
                name: ':calendar: Thành lập',
                value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`,
                inline: true,
            },
            {
                name: ':crown: Owner',
                value: `<@${guild.ownerId}>`,
                inline: true,
            },
            {
                name: ':robot: Ngày thêm Bot',
                value: `<t:${Math.floor(guild.joinedAt.getTime() / 1000)}:R>`,
                inline: true,
            },
        );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Xem thông tin máy chủ'),

    async execute(interaction, client) {
        await interaction.reply({
            embeds: [await serverEmbed(interaction, client)],
        });
    },
};
