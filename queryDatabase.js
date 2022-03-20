const { collection, getDocs, query, Timestamp, where, limitToLast, limit, orderBy } = require("firebase/firestore");

// Получаем предыдущую запись
const getPreviousRec = async (db, path) => {
    const currentTimestamp = Timestamp.fromDate(new Date());
    let result;
    const userRef = collection(db, path);
    const queryPrevisouRec = query(userRef, where('date', '<', currentTimestamp), orderBy('date'), limit(1));
    const queryDocs = await getDocs(queryPrevisouRec);

    queryDocs.forEach(doc => {
        result = {
            key: doc.id,
            data: doc.data()
        };
    });

    return result;
}

module.exports = {
    getPreviousRec
};