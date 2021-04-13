const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const date = require("date-fns");
const isMatch = require("date-fns/isMatch");
const format = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const convertDbObjToResponseObj = (dbObj) => {
  return {
    id: dbObj.id,
    todo: dbObj.todo,
    priority: dbObj.priority,
    category: dbObj.category,
    status: dbObj.status,
    dueDate: dbObj.due_date,
  };
};

const hasPriority = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasStatus = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasCategory = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasPriorityAndStatus = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasPriorityAndCategory = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
const hasStatusAndCategory = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
function authenticateToken(request, response, next) {
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
    dueDate,
  } = request.query;
  let validateTime = true;
  const priorityCheck = ["HIGH", "MEDIUM", "LOW", ""];
  const statusCheck = ["TO DO", "IN PROGRESS", "DONE", ""];
  const categoryCheck = ["WORK", "HOME", "LEARNING", ""];
  const priorityCheckResult = priorityCheck.includes(priority);
  const statusCheckResult = statusCheck.includes(status);
  const categoryCheckResult = categoryCheck.includes(category);
  if (dueDate !== undefined) {
    validateTime = isMatch(dueDate, "yyyy/MM/dd");
  }
  if (priorityCheckResult === false) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (statusCheckResult === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (categoryCheckResult === false) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (validateTime === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
}

function authenticateTokenOnPost(request, response, next) {
  const {
    search_q = "",
    priority = "",
    status = "",
    category = "",
    dueDate,
  } = request.body;
  let validateTime = true;
  const priorityCheck = ["HIGH", "MEDIUM", "LOW", ""];
  const statusCheck = ["TO DO", "IN PROGRESS", "DONE", ""];
  const categoryCheck = ["WORK", "HOME", "LEARNING", ""];
  const priorityCheckResult = priorityCheck.includes(priority);
  const statusCheckResult = statusCheck.includes(status);
  const categoryCheckResult = categoryCheck.includes(category);
  if (dueDate !== undefined) {
    validateTime = isMatch(dueDate, "yyyy/MM/dd");
  }
  if (priorityCheckResult === false) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (statusCheckResult === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (categoryCheckResult === false) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (validateTime === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
}

app.get("/todos/", authenticateToken, async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;
  switch (true) {
    case hasPriorityAndStatus(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasPriorityAndCategory(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      break;
    case hasStatusAndCategory(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasPriority(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatus(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategory(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await database.all(getTodosQuery);
  response.send(data.map((eachObj) => convertDbObjToResponseObj(eachObj)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoWithId = `
    SELECT * FROM todo WHERE id=${todoId};
    `;
  const todoObj = await database.get(todoWithId);
  response.send(convertDbObjToResponseObj(todoObj));
});

app.get("/agenda/", authenticateToken, async (request, response) => {
  const { date } = request.query;

  const getTodoWithDate = `
    SELECT * FROM todo WHERE WHERE strftime('%Y-%m-%d',due_date) =${date};
    `;
  const todoDateObj = await database.get(getTodoWithDate);
  response.send(
    todoDateObj.map((eachObj) => convertDbObjToResponseObj(eachObj))
  );
});

app.post("/todos/", authenticateTokenOnPost, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let formattedDate = formateTheDate(dueDate);
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}', '${category}',${dueDate});`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put(
  "/todos/:todoId/",
  authenticateTokenOnPost,
  async (request, response) => {
    const { todoId } = request.params;
    let updateColumn = "";
    const requestBody = request.body;
    switch (true) {
      case requestBody.status !== undefined:
        updateColumn = "Status";
        break;
      case requestBody.priority !== undefined:
        updateColumn = "Priority";
        break;
      case requestBody.todo !== undefined:
        updateColumn = "Todo";
        break;
      case requestBody.category !== undefined:
        updateColumn = "Category";
        break;
      case requestBody.dueDate !== undefined:
        updateColumn = "Due Date";
    }
    const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
    const previousTodo = await database.get(previousTodoQuery);

    const {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;

    const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date=${dueDate}
    WHERE
      id = ${todoId};`;

    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
);

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
