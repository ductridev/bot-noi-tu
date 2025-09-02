const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');
const ContributedWord = require('../models/ContributedWord');
const DictionaryEntry = require('../models/DictionaryEntry');
const WordList = require('../models/WordList');
const GuildConfig = require('../models/GuildConfig');

const REPORT_CHANNEL = process.env.REPORT_CHANNEL || '';

const t = {
    vi: {
        commandDesc: 'Đề xuất thêm từ vào từ điển',
        wordOption: 'Từ muốn đề xuất',
        reasonOption: 'Lý do (không bắt buộc)',
        noPermission: 'Bạn cần có quyền admin để đề xuất từ.',
        invalidPhrase: 'Cụm từ không hợp lệ (phải có 2 từ)',
        alreadyExists: 'Từ này đã có trong từ điển hoặc đã được đề xuất',
        suggested: (word) => `Đã gửi đề xuất cho từ **${word}**`,
        status: ['Đang chờ', 'Đã đồng ý', 'Đã từ chối'],
        buttons: { accept: 'Chấp nhận', decline: 'Từ chối' },
        dm: (word, status, mod) => `Từ \`${word}\` của bạn đã ${status === 1 ? 'được chấp nhận' : 'bị từ chối'} bởi mod \`${mod}\``,
        notAllowed: 'Bạn không có quyền này',
        notEnabled: 'Tính năng đề xuất hiện không hoạt động!',
    },
    en: {
        commandDesc: 'Suggest a new word to the dictionary',
        wordOption: 'Word to suggest',
        reasonOption: 'Reason (optional)',
        noPermission: 'You need admin permission to suggest a word.',
        invalidPhrase: 'Invalid phrase (must be two words)',
        alreadyExists: 'This phrase is already in the dictionary or has been suggested',
        suggested: (word) => `Suggested word **${word}**`,
        status: ['Pending', 'Accepted', 'Declined'],
        buttons: { accept: 'Accept', decline: 'Decline' },
        dm: (word, status, mod) => `Your word \`${word}\` was ${status === 1 ? 'accepted' : 'declined'} by mod \`${mod}\``,
        notAllowed: 'You are not allowed to perform this action',
        notEnabled: 'Suggestion feature is currently disabled.',
    },
};

const messageEmbed = (msg) =>
    new EmbedBuilder().setColor(13250094).setDescription(msg).setTimestamp();

const suggestEmbed = (wordData, status = 0, lang = 'vi') =>
    new EmbedBuilder()
        .setColor(13250094)
        .setThumbnail(wordData.guildIcon)
        .addFields(
            { name: ':bulb: Từ đề xuất / Suggested word', value: `**${wordData.word}**`, inline: true },
            { name: ':pencil: Lý do / Reason', value: wordData.reason, inline: true },
            { name: ':bust_in_silhouette: Người gửi / User', value: wordData.user, inline: true },
            { name: ':shield: Máy chủ / Guild', value: wordData.guildName, inline: true },
            { name: ':id: ID server', value: wordData.guildId, inline: true },
            {
                name: 'Trạng thái / Status',
                value: t[lang].status[status] ?? t[lang].status[0],
                inline: true,
            }
        )
        .setTimestamp();

async function alreadyExists(word, lang) {
    const inDict = await DictionaryEntry.exists({ text: word, language: lang });
    const inContrib = await ContributedWord.exists({ text: word, language: lang });
    return inDict || inContrib;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('them-tu')
        .setDescription('Đề xuất từ mới / Suggest a new word')
        .addStringOption((option) =>
            option.setName('word').setDescription('Từ muốn đề xuất / Word to suggest').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('Lý do (optional) / Reason')
        ),

    async execute(interaction, client) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const config = await GuildConfig.findOne({ guildId });
        const channelConfig = config?.channels?.find(c => c.channelId === channelId);
        const lang = channelConfig?.language === 'en' ? 'en' : 'vi';

        if (!REPORT_CHANNEL) {
            return interaction.reply({
                content: t[lang].notEnabled,
                ephemeral: true,
            });
        }

        // if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        //     return interaction.reply({
        //         content: t[lang].noPermission,
        //         ephemeral: true,
        //     });
        // }

        let word = interaction.options.getString('word');
        let reason = interaction.options.getString('reason') ?? 'No reason provided.';
        let wordParts = word.trim().toLowerCase().split(/\s+/).filter(Boolean);
        word = wordParts.join(' ');

        if (lang === 'vi') {
            if (wordParts.length !== 2) {
                return interaction.reply({
                    content: t[lang].invalidPhrase,
                    ephemeral: true,
                });
            }
        } else if (lang === 'en') {
            if (wordParts.length !== 1) {
                return interaction.reply({
                    content: t[lang].invalidPhrase,
                    ephemeral: true,
                });
            }
        }

        if (await alreadyExists(word, lang)) {
            return interaction.reply({
                content: t[lang].alreadyExists,
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: t[lang].suggested(word),
            ephemeral: true,
        });

        const acceptButton = new ButtonBuilder()
            .setCustomId('accept')
            .setLabel(t[lang].buttons.accept)
            .setStyle(ButtonStyle.Success);
        const declineButton = new ButtonBuilder()
            .setCustomId('decline')
            .setLabel(t[lang].buttons.decline)
            .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

        const wordData = {
            word,
            reason,
            user: interaction.user.username,
            guildName: interaction.guild.name,
            guildId: interaction.guildId,
            guildIcon: interaction.guild.iconURL({ dynamic: true }),
        };

        const msg = await client.channels.cache.get(REPORT_CHANNEL).send({
            embeds: [suggestEmbed(wordData, 0, lang)],
            components: [row],
        });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.customId === 'accept' || i.customId === 'decline',
        });

        collector.on('collect', async (i) => {
            if (!i.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return i.reply({ content: t[lang].notAllowed, ephemeral: true });
            }

            let status;
            if (i.customId === 'accept') {
                status = 1;
                await ContributedWord.create({ text: word, language: lang });
            } else {
                status = 2;
            }

            await client.users.send(interaction.user.id, {
                embeds: [
                    messageEmbed(
                        t[lang].dm(word, status, i.member.displayName)
                    ),
                ],
            });

            await msg.edit({
                embeds: [suggestEmbed(wordData, status, lang)],
                components: [],
            });
        });
    },
};
