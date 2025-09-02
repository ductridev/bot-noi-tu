const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

const helpEmbed = () => new EmbedBuilder()
    .setColor(13250094)
    .setDescription(':crystal_ball: Hướng dẫn sử dụng BOT')
    .addFields(
        {
            name: 'Cài đặt kênh chơi nối từ',
            value: 'Dùng lệnh slash `/set-channel <channel>`.',
            inline: true
        },
        {
            name: 'Bắt đầu lượt chơi',
            value: 'Dùng lệnh `!start` trong kênh chơi nối từ',
            inline: true
        },
        {
            name: 'Dừng lượt chơi',
            value: 'Dùng lệnh `!stop` trong kênh chơi nối từ, lượt mới sẽ tự động bắt đầu!',
            inline: true
        },
        {
            name: 'Xem thống kê của BOT',
            value: 'Dùng lệnh slash `/stats`',
            inline: true
        },
        {
            name: 'Xem bảng xếp hạng server',
            value: 'Dùng lệnh slash `/rank`',
            inline: true
        },
        {
            name: 'Xem thống kê cá nhân',
            value: 'Dùng lệnh slash `/me`',
            inline: true
        },
        {
            name: 'Report từ sai trong từ điển',
            value: 'Dùng lệnh slash `/report <từ> [lý do]`',
            inline: true
        },
        {
            name: 'Xem thông tin server, check Premium',
            value: 'Dùng lệnh slash `/server`',
            inline: true
        },
        {
            name: 'Ai có thể dùng lệnh set-channel?',
            value: 'Người dùng có quyền **MANAGE_GUILD**',
            inline: true
        },
        {
            name: 'Ai có thể dùng lệnh !start',
            value: 'Người dùng có quyền xem và gửi tin nhắn vào kênh nối từ',
            inline: true
        },
        {
            name: 'Ai có thể dùng lệnh !stop',
            value: 'Người dùng có quyền **MANAGE_CHANNEL** trong kênh nối từ',
            inline: true
        },
        {
            name: 'Khi nào trò chơi kết thúc?',
            value: 'Khi không còn từ nào trong từ điển có thể nối tiếp từ hiện tại hoặc dùng lệnh !stop',
            inline: true
        },
        {
            name: '🎲 Chơi Tài Xỉu (Sic Bo)',
            value: 'Dùng lệnh `/sicbo` hoặc `/taixiu` để chơi game xúc xắc',
            inline: true
        },
        {
            name: '⚙️ Cấu hình Tài Xỉu',
            value: 'Dùng lệnh `/sicbo-config` để xem/thay đổi tỷ lệ thắng',
            inline: true
        },
        {
            name: ':robot: Invite',
            value: '[Invite bot](https://discord.com/oauth2/authorize?client_id=1397278127759298690)',
            inline: true
        },
        {
            name: ':pencil: Hỗ trợ',
            value: '[dsc.gg/bostreamlimit](https://dsc.gg/bostreamlimit)',
            inline: true
        },
        {
            name: ':information_source: Mã nguồn trò chơi',
            value: '[github.com/ductridev/bungo-biet-noi-tu](https://github.com/ductridev/bungo-biet-noi-tu)',
            inline: true
        },

    )

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem hướng dẫn sử dụng BOT'),
    async execute(interaction) {
        await interaction.reply({
            embeds: [helpEmbed()],
            flags: 4096
        })
    }
}
