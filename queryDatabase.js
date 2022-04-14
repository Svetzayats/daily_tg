const {
    collection,
    getDocs,
    query,
    Timestamp,
    where,
    limitToLast,
    orderBy,
    doc,
    getDoc
} = require('firebase/firestore');

// Получаем предыдущую запись
const getPreviousRec = async (db, path) => {
    try {
        // создаем дату с нулевым временем за сегодня, чтобы правильно
        // фильтровать созданные записи
        const currentTimestamp = Timestamp.fromDate(
            new Date(new Date().toLocaleDateString('en'))
        );
        let result = {};
        const userRef = collection(db, path);
        const queryPrevisouRec = query(
            userRef,
            where('date', '<', currentTimestamp),
            orderBy('date'),
            limitToLast(1)
        );
        const queryDocs = await getDocs(queryPrevisouRec);
        queryDocs.forEach((doc) => {
            result.key = doc.id;
            result.data = doc.data();
        });

        return result;
    } catch (error) {
        console.log(error);
    }
};

// запрашиваем сегодняшнюю запись по ключу
const getTodayRec = async (db, path) => {
    try {
        const key = new Date().toLocaleDateString('ru');
        let result = {};
        const todayRecQuery = doc(db, path, key);
        const todayRec = await getDoc(todayRecQuery);
        if (todayRec.exists()) {
            result.key = key;
            result.data = todayRec.data();
        }

        return result;
    } catch (error) {
        console.log(error);
    }
};

module.exports = {
    getPreviousRec,
    getTodayRec
};
