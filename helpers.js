/**
 * Извлекает сообщение пользователя, начинается после первого пробела
 * @param {String} text
 * @returns
 */
const getUserMessage = (text) => {
    const res = /[\s](.*)/.exec(text);
    if (res && res[1]) {
        return res[1];
    }
    return null;
};

/**
 * Извлекает команду из строки и возвращает в нижнем регистре
 * @param {String} text
 * @returns
 */
const getCommand = (text) => {
    const commandRes = /^(\S+)[\s]/.exec(text);
    if (commandRes && commandRes[1]) {
        return commandRes[1].trim().replace(':', '').toLowerCase();
    }
    return null;
};

// хелпер для каррирования
const curry = (f) => {
    return function (a) {
        return function (b) {
            return f(a, b);
        };
    };
};

module.exports = {
    getCommand,
    getUserMessage,
    curry
};
