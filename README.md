Телеграм-бот для проведения текстовых дейли в команде разработки 

# Требования к боту
1) регистрация пользователей по нику + имя + группа разработки 
2) хранение данных пользователей
3) в определенное время присылает всем пользователям группы вопросы по дейли: 
  3.1) вопрос с напоминанием, что планировали сделать вчера и что из этого сделано 
  3.2) вопрос, где возникли проблемы, почему 
  3.3) вопрос, что планируется на сегодня 
  3.4) субъективная оценка эффективности дня (? хочется в будущем графики строить)
4) сохраняет полученные от пользователя ответы в таблицу 
Будущие фичи: можно фильтровать по пользователю / группе за промежуток времени данные (в идеале, в графики конвертить).

# Таблицы 
User 
@id (ник в тг)
Name 
Group 

Group 
@id 
Name

Messages
@message
Date
UserId
GroupId
YesterdayResult
TodayPlan
Problems
SelfEfficiency

