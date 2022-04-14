const firebase = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const TeleBot = require('telebot');
require('dotenv').config();

const { getPreviousRec, getTodayRec } = require('./queryDatabase');
const { setTodayRec, updateRecByKey } = require('./modifyDatabase');

const { getCommand, getUserMessage } = require('./helpers');

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
    try {
        const path = `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`;
        const { key } = await getPreviousRec(db, path);
        if (key) {
            const res = await updateRecByKey(db, path, key, {
                done: taskIndexies
            });
        } else {
            bot.sendMessage(
                msg.from.id,
                'Не найдено запланированных задач за прошлые дни 🤷‍♀️'
            );
        }
    } catch (error) {
        console.log(error);
    }
};

// добавляем сегодняшнюю запись и кладем туда задачи
const addTodayTasks = async (tasksMsg, chat, user) => {
    try {
        const tasks = tasksMsg.split(';').map((task) => task.trim());
        const res = await updateTodayRec(chat, user, { tasks });
        return res;
    } catch (error) {
        console.log(error);
    }
};

// сохраняем данные в сегодняшнюю запись
const updateTodayRec = async (chat, user, data) => {
    try {
        const res = await setTodayRec(db, `${chat}/${user}/messages`, data);
        return res;
    } catch (error) {
        console.log(error);
    }
};

// формируем имя участника
const getName = (msg) => {
    return `${msg.from.first_name ? msg.from.first_name : ''} ${
        msg.from.last_name ? msg.from.last_name : ''
    }`;
};

// получаем текст с результатами за вчера
const getYesterdayMsg = async (msg) => {
    try {
        const { data } = await getPreviousRec(
            db,
            `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`
        );
        if (data && data.done && data.tasks) {
            let message = `<b>${getName(
                msg
            )} - результаты за прошлый рабочий день</b> \n\n`;

            data.tasks.forEach((task, index) => {
                message += `${
                    data.done.includes(index) ? '✅' : '❌'
                } ${task}\n`;
            });
            return `${message}`;
        }
        return `<b>${getName(msg)}</b`;
    } catch (error) {
        console.log(error);
    }
};

// получаем текст с планами на сегодня и комментарием
const getTodayMsg = async (msg) => {
    try {
        const { data } = await getTodayRec(
            db,
            `${process.env.PIVO_DAILY_CHAT_NAME}/${msg.from.username}/messages`
        );
        if (data && data.tasks) {
            const comment = data.comment
                ? `<b>Комментарий</b>: ${data.comment}\n\n`
                : '';
            let message = `<b>План на ${new Date().toLocaleDateString(
                'ru'
            )} </b>\n`;
            data.tasks.forEach((task) => {
                message += `${'📝'} ${task}\n`;
            });

            return comment + message;
        }
    } catch (error) {
        console.log(error);
    }
};

// показываем общее сообщение с результатами и планами
const showResults = async (msg, isPreview) => {
    try {
        const yesterdayMsg = await getYesterdayMsg(msg);
        const todayMsg = await getTodayMsg(msg);
        const message = yesterdayMsg + '\n' + todayMsg;

        bot.sendMessage(
            isPreview ? msg.from.id : process.env.PIVO_DAILY_CHAT_ID,
            message,
            {
                parseMode: 'HTML'
            }
        );
    } catch (error) {
        bot.sendMessage(
            msg.from.id,
            `Ошибка при формировании итогового сообщения: ${error}`
        );
    }
};

bot.on('text', async (msg) => {
    try {
        // вычленяем первое слово - считаем его командой
        const command = getCommand(msg.text);
        if (!command) {
            return;
        }

        // пробуем извлечь пользовательское сообщение после команды
        const userMessage = getUserMessage(msg.text);

        switch (command) {
            // получили сообщение с результатами участника за вчера
            case 'результаты':
                await saveYesterdayResults(
                    userMessage.split(' ').map((res) => Number(res.trim())),
                    msg
                );
                bot.sendMessage(msg.from.id, 'Результаты записали 🤘');
                break;
            case 'сегодня':
                // получили сообщение с планами на сегодня
                await addTodayTasks(
                    userMessage,
                    process.env.PIVO_DAILY_CHAT_NAME,
                    msg.from.username
                );
                bot.sendMessage(msg.from.id, 'Принято-понято 🐗');
                break;
            case 'коммент':
                await updateTodayRec(
                    process.env.PIVO_DAILY_CHAT_NAME,
                    msg.from.username,
                    {
                        comment: userMessage
                    }
                );
                bot.sendMessage(msg.from.id, 'Комментарий получен');
                break;
            default:
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
        'Сообщения с итогами будут выведены в общем чате или вам придет сообщение о проблеме (а может и нет, тогда пишите мне ;))\n';
    return bot.sendMessage(msg.chat.id, message);
});

// по команде /yesterday показываем список задач, которые планировались в предыдущий день
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

// по команде даем инструктируем, как оставить коммент
bot.on('/comment', (msg) => {
    bot.sendMessage(
        msg.from.id,
        'Если хочешь написать коммент ко вчера или сегодня, чтобы он вывелся в итоговом сообщении' +
            '- начни сообщение со слова коммент. Пример:\n коммент вчера отвлекли ошибками и совещаниями дурацкими, всё пошло не по плану'
    );
});

// по команде напоминаем, в каком формате ждем задачи
bot.on('/today_hint', (msg) => {
    bot.sendMessage(
        msg.from.id,
        'Напиши, что планируешь сделать сегодня - одним сообщением, начинающимся с сегодня. Разделяй задачи через ;\n\nПример: сегодня тесты; ошибки'
    );
});

// по команде показываем пользователю, каким будет его результат
bot.on('/today', (msg) => {
    showResults(msg, true);
});

// по команде отправляем сообщение в общий чат
bot.on('/sent', (msg) => {
    showResults(msg, false);
});

bot.start();
