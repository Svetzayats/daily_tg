const firebase = require('firebase/app');
const { getFirestore } = require('firebase/firestore'); 
const TeleBot = require('telebot');
require('dotenv').config();

const { getPreviousRec } = require('./queryDatabase');
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
    const path = `${msg.chat.title}/${msg.from.username}/messages`;
    const {key} = await getPreviousRec(db, path);
    if (key) {
        const res = await updateRecByKey(db, path, key, {done: taskIndexies});
    } else {
        bot.sendMessage(msg.chat.id, 'Не найдено запланированных задач за прошлые дни 🤷‍♀️');
    }
    // TODO: добавить обработку ошибки     
}

// показываем результаты вчера
const showYesterdayResults = async (msg) => {
    const {data} = await getPreviousRec(db, `${msg.chat.title}/${msg.from.username}/messages`);
    if (data && data.done) {
        let message = 'Результаты за вчера \n\n';
        data.tasks.forEach((task, index) => {
            message += `${data.done.includes(index) ? '✅' : '❌'} ${task}\n`;
        });
    
        bot.sendMessage(msg.chat.id, message);
    }
}

// добавляем сегодняшнюю запись и кладем туда задачи
const addTodayTasks = async (tasksMsg, chat, user) => {
    const tasks = tasksMsg.split(';').map(task => task.trim());
    const res = await setTodayRec(db, `${chat}/${user}/messages`, tasks);
    return res;
}

bot.on('text', async (msg) => {
    // получили сообщение с результатами участника за вчера
    if (msg.text.toLowerCase().startsWith('результаты')) {
        const answers = msg.text.toLowerCase().replace('результаты ', '');
        // первый элемент массива - само слово результаты, с ним не работаем 
        await saveYesterdayResults(answers.split(' ').map(res => Number(res)), msg);
        showYesterdayResults(msg);
        return;
        
    }

    // получили сообщение с планами на сегодня 
    if (msg.text.toLowerCase().startsWith('сегодня')) {
        addTodayTasks(msg.text.toLowerCase().replace('сегодня ', ''), msg.chat.title, msg.from.username);
        // TODO: добавить обработку ошибок и вывод сообщения
        return;
    }

    return;
});

// команда отправляет сообщение с набором комманд для дейли
bot.on('/start_daily', (msg) => {
    const message = 'Сегодня текстовое дейли ✉️\n' + commandsForTeam
    return bot.sendMessage(msg.chat.id, message);
});

// По команде /yesterday показываем список задач, которые планировались в предыдущий день
bot.on('/yesterday', async (msg) => {
    const {data} = await getPreviousRec(db, `${msg.chat.title}/${msg.from.username}/messages`);
    if (data && data.tasks) {
        let message = 'Вчера ты планировал: \n';
        data.tasks.forEach((task, index) => {
            message += `⬜ ${index} ${task}\n`;
        });
        message += '\n Напиши ответным сообщением номера задач, которыми ты занимался  в формате: Результаты 0 1';
        bot.sendMessage(msg.chat.id, message);
    } else {
        bot.sendMessage(msg.chat.id, 'Не найдено запланированных задач за прошлые дни 🤷‍♀️');
    }
});


// по команде /today напоминаем, в каком формате ждем задачи
bot.on('/today', (msg) => {
    bot.sendMessage(msg.chat.id, 'Напиши, что планируешь сделать сегодня - одним сообщением, начинающимся с сегодня. Разделяй задачи через ;');
});

bot.start();

