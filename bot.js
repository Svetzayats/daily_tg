const firebase = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const TeleBot = require('telebot');
require('dotenv').config();

const { getPreviousRec, getTodayRec } = require('./queryDatabase');
const { setTodayRec, updateRecByKey } = require('./modifyDatabase');

const bot = new TeleBot(process.env.BOT_ID);

const firebaseConfig = {
    apiKey: process.env.FIREBASE_APIKEY,
    authDomain: process.env.FIREBASE_AUTHDOMAIN,
    projectId: process.env.FIREBASE_PROJECTID,
    storageBucket: process.env.FIREBASE_STORAGEBUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
    appId: process.env.FIREBASE_APPID,
    measurementId: process.env.FIREBASE_MEASUREMENTID
};
const app = firebase.initializeApp(firebaseConfig);
const db = getFirestore(app);

const commandsForTeam = `
/yesterday - напомнить о вчерашних планах
/today - сказать про сегодня
`;

// добавляем во "вчерашнюю" запись информацию о сделанных задачах
const saveYesterdayResults = async (taskIndexies, msg) => {
    const path = `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`;
    const { key } = await getPreviousRec(db, path);
    if (key) {
        const res = await updateRecByKey(db, path, key, { done: taskIndexies });
    } else {
        bot.sendMessage(
            msg.from.id,
            'Не найдено запланированных задач за прошлые дни 🤷‍♀️'
        );
    }
    // TODO: добавить обработку ошибки
};

// показываем результаты вчера
const showYesterdayResults = async (msg) => {
    const { data } = await getPreviousRec(
        db,
        `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`
    );
    if (data && data.done) {
        let message = `${msg.from.first_name ? msg.from.first_name : ''} ${
            msg.from.last_name ? msg.from.last_name : ''
        } - результаты за вчера \n\n`;
        data.tasks.forEach((task, index) => {
            message += `${data.done.includes(index) ? '✅' : '❌'} ${task}\n`;
        });
        bot.sendMessage(process.env.PIVO_DAILY_CHAT_ID, message);
    } else {
        bot.sendMessage(
            msg.from.id,
            'Не смогли получить индексы выполненных задач. Надо написать разработчику ;)'
        );
    }
};

// добавляем сегодняшнюю запись и кладем туда задачи
const addTodayTasks = async (tasksMsg, chat, user) => {
    const tasks = tasksMsg.split(';').map((task) => task.trim());
    const res = await setTodayRec(db, `${chat}/${user}/messages`, tasks);
    return res;
};

const showPlannedTasks = async (msg) => {
    const { data } = await getTodayRec(
        db,
        `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`
    );
    if (data && data.tasks) {
        let message = `${msg.from.first_name} ${
            msg.from.last_name
        } - план на ${new Date().toLocaleDateString('ru')} \n\n`;
        data.tasks.forEach((task, index) => {
            message += `${'📝'} ${task}\n`;
        });

        bot.sendMessage(process.env.PIVO_DAILY_CHAT_ID, message);
    }
};

bot.on('text', async (msg) => {
    try {
        // получили сообщение с результатами участника за вчера
        if (msg.text.toLowerCase().startsWith('результаты')) {
            const answers = msg.text.toLowerCase().replace('результаты', '');
            // первый элемент массива - само слово результаты, с ним не работаем
            await saveYesterdayResults(
                answers.split(' ').map((res) => Number(res)),
                msg
            );
            bot.sendMessage(msg.from.id, 'Результаты записали 🤘');
            showYesterdayResults(msg);
            return;
        }

        // получили сообщение с планами на сегодня
        if (msg.text.toLowerCase().startsWith('сегодня')) {
            await addTodayTasks(
                msg.text.toLowerCase().replace('сегодня', ''),
                process.env.PIVO_DAILY_CHAT_NAME,
                msg.from.username
            );
            bot.sendMessage(msg.from.id, 'Принято-понято 🐗');

            showPlannedTasks(msg);
            // TODO: добавить обработку ошибок и вывод сообщения
            return;
        }
    } catch (error) {
        bot.sendMessage(
            msg.from.id,
            '⚠ Произошла ошибка! Перешлите это сообщение разработчику. ' + error
        );
    }
});

// команда отправляет сообщение с набором комманд для дейли
bot.on('/start_daily', (msg) => {
    const message =
        'Сегодня текстовое дейли ✉️\n\n' +
        '❗ Просьба пока строго придерживаться такой последовательности действий: \n' +
        '1️⃣ Перейти в бот daily (добавить из группы + нажать команду start)\n' +
        '2️⃣ Запустить команду /yesterday - выведет список задач за вчера с номерами\n' +
        '3️⃣ В ответе написать результаты и номера выполненных задач:\n результаты 0 1\n' +
        '4️⃣ Запланировать задачи на сегодня в формате\n сегодня тесты; ошибки\n\n' +
        'Сообщения с итогами будут выведены в общем чате или вам придет сообщение о проблеме (а может и нет, тогда пишите мне ;))\n' +
        commandsForTeam;
    return bot.sendMessage(msg.chat.id, message);
});

// По команде /yesterday показываем список задач, которые планировались в предыдущий день
bot.on('/yesterday', async (msg) => {
    try {
        const { data } = await getPreviousRec(
            db,
            `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`
        );

        if (data && data.tasks) {
            let message = 'На вчера было запланировано: \n';
            data.tasks.forEach((task, index) => {
                message += `⬜ ${index} ${task}\n`;
            });
            message +=
                '\n Напиши ответным сообщением номера задач, в формате: Результаты 0 1';
            bot.sendMessage(msg.from.id, message);
        } else {
            bot.sendMessage(
                msg.from.id,
                'Не найдено запланированных задач за прошлые дни 🤷‍♀️'
            );
        }
    } catch (error) {
        bot.sendMessage(
            msg.from.id,
            '⚠ Произошла ошибка! Перешлите это сообщение разработчику. ' + error
        );
    }
});

// по команде /today напоминаем, в каком формате ждем задачи
bot.on('/today', (msg) => {
    bot.sendMessage(
        msg.from.id,
        'Напиши, что планируешь сделать сегодня - одним сообщением, начинающимся с сегодня. Разделяй задачи через ;\n\nПример: сегодня тесты; ошибки'
    );
});

bot.start();
