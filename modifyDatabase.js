const { Timestamp, doc, setDoc } = require("firebase/firestore");

// Создаем запись за сегодня и добавляем туда задачи 
const setTodayRec = async (db, path, tasks) => {
    try {
        const key = new Date().toLocaleDateString('ru');
        const date = Timestamp.fromDate(new Date());
        const newDoc = doc(db, path, key);

        await setDoc(newDoc, {
            date, 
            tasks
        }, {merge: true});
        
        return null;
    } catch(eror) {
        return `Ошибка при добавлении записи в БД: ${error}`;
    }
}

// обновляем запись с определенным ключом 
const updateRecByKey = async (db, path, key, updateObject) => {
    try {
        const updatedDoc = doc(db, path, key);
        await setDoc(updatedDoc, updateObject, {merge: true});
        return null;
    } catch (error) {
        console.log('ddd' + error);
        return `Ошибка при обновлении сделанных задач в предыдущей записи в БД: ${error}`
    }
}

module.exports = {
    setTodayRec, 
    updateRecByKey
};
