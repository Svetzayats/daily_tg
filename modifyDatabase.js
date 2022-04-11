const { Timestamp, doc, setDoc } = require('firebase/firestore');

// Создаем/обновляем запись за сегодня и добавляем туда данные
const setTodayRec = async (db, path, data) => {
    const key = new Date().toLocaleDateString('ru');
    const date = Timestamp.fromDate(new Date());
    const newDoc = doc(db, path, key);

    await setDoc(
        newDoc,
        {
            date,
            ...data
        },
        { merge: true }
    );
};

// обновляем запись с определенным ключом
const updateRecByKey = async (db, path, key, updateObject) => {
    const updatedDoc = doc(db, path, key);
    await setDoc(updatedDoc, updateObject, { merge: true });
};

module.exports = {
    setTodayRec,
    updateRecByKey
};
