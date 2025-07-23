require('dotenv').config();
const mongoose = require('mongoose');
const ContributedWord = require('../models/ContributedWord');
const DictionaryEntry = require('../models/DictionaryEntry');

async function loadVietnamese() {
    // Load contributed words (VI)
    const res1 = await fetch('https://raw.githubusercontent.com/lvdat/phobo-contribute-words/main/accepted-words.txt');
    const text1 = await res1.text();
    const lines1 = text1.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    console.log(`➡️  [VI] Upserting ${lines1.length} contributed words...`);
    const bulk1 = lines1.map(word => ({
        updateOne: {
            filter: { text: word, language: 'vi' },
            update: { $setOnInsert: { text: word, language: 'vi' } },
            upsert: true
        }
    }));
    await ContributedWord.bulkWrite(bulk1);
    console.log('✅ [VI] Contributed words loaded.');

    // Load dictionary (VI)
    const res2 = await fetch('https://raw.githubusercontent.com/undertheseanlp/dictionary/master/dictionary/words.txt');
    const text2 = await res2.text();
    const lines2 = text2.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    console.log(`➡️  [VI] Upserting ${lines2.length} dictionary entries...`);
    const bulk2 = lines2.map(line => {
        const { text, source } = JSON.parse(line);
        return {
            updateOne: {
                filter: { text, language: 'vi' },
                update: { $set: { source, language: 'vi' } },
                upsert: true
            }
        };
    });
    await DictionaryEntry.bulkWrite(bulk2);
    console.log('✅ [VI] Dictionary entries loaded.');
}

async function loadEnglish() {
    // You can replace this with another dictionary source
    const res = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');
    const text = await res.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    console.log(`➡️  [EN] Upserting ${lines.length} dictionary entries...`);
    const bulk = lines.map(word => ({
        updateOne: {
            filter: { text: word, language: 'en' },
            update: { $setOnInsert: { text: word, language: 'en', source: ['dwyl/english-words'] } },
            upsert: true
        }
    }));
    await DictionaryEntry.bulkWrite(bulk);
    console.log('✅ [EN] Dictionary entries loaded.');
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('🗄️  Connected to MongoDB');

    await loadVietnamese();
    await loadEnglish();

    await mongoose.disconnect();
    console.log('👋 Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
