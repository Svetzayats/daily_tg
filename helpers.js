/**
 * Извлекает сообщение пользователя, начинается после первого пробела
 * @param {String} text
 * @returns
 */
const getUserMessage = (text) => {
    try {
        const res = /[\s](.*)/.exec(text);
        if (res && res[1]) {
            return res[1];
        }
        return null;
    } catch (error) {
        console.log(error);
    }
};

/**
 * Извлекает команду из строки и возвращает в нижнем регистре
 * @param {String} text
 * @returns
 */
const getCommand = (text) => {
    try {
        const commandRes = /^(\S+)[\s]/.exec(text);
        if (commandRes && commandRes[1]) {
            return commandRes[1].trim().replace(':', '').toLowerCase();
        }
        return null;
    } catch (error) {
        console.log(error);
    }
};

module.exports = {
    getCommand,
    getUserMessage
};
