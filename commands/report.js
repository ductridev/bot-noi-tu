const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
} = require('discord.js');
require('dotenv').config();

const REPORT_CHANNEL = process.env.REPORT_CHANNEL || '';
const WordList = require('../models/WordList');
const GuildConfig = require('../models/GuildConfig');
const dictionary = require('../utils/dictionary');

const t = {
    vi: {
        commandDesc: 'Báo cáo từ ngữ không phù hợp trong từ điển',
        wordOption: 'Từ muốn báo cáo',
        reasonOption: 'Lý do (không bắt buộc)',
        noPermission: 'Bạn cần có quyền admin để báo cáo từ.',
        invalidPhrase: 'Cụm từ không hợp lệ',
        notInDict: 'Cụm từ này không có trong từ điển của Bot',
        alreadyReported: 'Cụm từ này đã có trong danh sách đen của Bot',
        reported: (word) => `Đã báo cáo từ **${word}**`,
        status: ['Đang chờ', 'Đã đồng ý', 'Đã từ chối'],
        buttons: { accept: 'Đồng ý', decline: 'Từ chối' },
        dm: (word, status, mod) => `Từ \`${word}\` của bạn đã ${status === 1 ? 'được đồng ý gỡ bỏ' : 'bị từ chối gỡ bỏ'} bởi mod \`${mod}\``,
        notAllowed: 'Bạn không có quyền này',
        notEnabled: 'Tính năng báo cáo hiện không hoạt động!',
    },
    en: {
        commandDesc: 'Report inappropriate word in dictionary',
        wordOption: 'Word to report',
        reasonOption: 'Reason (optional)',
        noPermission: 'You need admin permission to report a word.',
        invalidPhrase: 'Invalid phrase (must be two words)',
        notInDict: 'This phrase is not in the Bot dictionary',
        alreadyReported: 'This phrase is already blacklisted',
        reported: (word) => `Reported word **${word}**`,
        status: ['Pending', 'Accepted', 'Declined'],
        buttons: { accept: 'Accept', decline: 'Decline' },
        dm: (word, status, mod) => `Your word \`${word}\` was ${status === 1 ? 'accepted for removal' : 'declined'} by mod \`${mod}\``,
        notAllowed: 'You are not allowed to perform this action',
        notEnabled: 'Reporting is currently disabled.',
    },
};

const messageEmbed = (msg) =>
    new EmbedBuilder().setColor(13250094).setDescription(msg).setTimestamp();

const reportEmbed = (wordData, status = 0, lang = 'vi') =>
    new EmbedBuilder()
        .setColor(13250094)
        .setThumbnail(wordData.guildIcon)
        .addFields(
            { name: ':regional_indicator_p: Từ báo cáo / Reported word', value: `**${wordData.word}**`, inline: true },
            { name: ':bulb: Lý do / Reason', value: wordData.reason, inline: true },
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

async function isInReportList(word) {
    const reportDoc = await WordList.findOne({ name: 'report' });
    return reportDoc?.words.includes(word);
}

async function addToReportList(word) {
    let reportDoc = await WordList.findOne({ name: 'report' });
    if (!reportDoc) {
        reportDoc = new WordList({ name: 'report', words: [] });
    }
    if (!reportDoc.words.includes(word)) {
        reportDoc.words.push(word);
        await reportDoc.save();
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Báo cáo từ ngữ / Report a word')
        .addStringOption((option) =>
            option.setName('word').setDescription('Từ muốn báo cáo / Word to report').setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('Lý do (optional) / Reason')
        ),

    async execute(interaction, client) {
        const config = await GuildConfig.findOne({ guildId: interaction.guildId });
        const lang = config?.language === 'en' ? 'en' : 'vi';

        if (!REPORT_CHANNEL) {
            return interaction.reply({
                content: t[lang].notEnabled,
                ephemeral: true,
            });
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: t[lang].noPermission,
                ephemeral: true,
            });
        }

        let word = interaction.options.getString('word');
        let reason = interaction.options.getString('reason') ?? 'No reason provided.';
        let wordParts = word.trim().toLowerCase().split(/\s+/).filter(Boolean);
        word = wordParts.join(' ');

        if (wordParts.length !== 2) {
            return interaction.reply({
                content: t[lang].invalidPhrase,
                ephemeral: true,
            });
        }

        if (!dictionary.checkWordIfInDictionary(word)) {
            return interaction.reply({
                content: t[lang].notInDict,
                ephemeral: true,
            });
        }

        if (await isInReportList(word)) {
            return interaction.reply({
                content: t[lang].alreadyReported,
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: t[lang].reported(word),
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
            embeds: [reportEmbed(wordData, 0, lang)],
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
                await addToReportList(word);
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
                embeds: [reportEmbed(wordData, status, lang)],
                components: [],
            });
        });
    },
};
