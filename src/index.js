const { response } = require("express");
const express = require("express");
const { param } = require("express/lib/request");
const {v4: uuidv4} = require("uuid");
const app = express();

app.use(express.json());

const customers = [];

// Middleware
function verifyIfExistsAccountCPF (request, response, next) {
  const {cpf} = request.headers;
  const customer = customers.find((customers) => customers.cpf === cpf)
  
  if (!customer) {
    return response.status(400).json({ error: "Costumer not found!"});
  }

  request.customer = customer;
  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === 'credit'){
      return acc + operation.amount;
    }else {
      return acc - operation.amount;
    }
  }, 0)

  return balance;
}

app.post("/account", (request, response) => {
  const {cpf, name} = request.body;
  const costumerAlreadyExists = customers.some((customers) => customers.cpf === cpf);
  
  if (costumerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists!" })
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  });
  
  console.log(customers);
  return response.status(201).send();
});
// app.use(verifyIfExistsAccountCPF);
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
  const {customer} = request;

  if(customer.statement == 0) {
    return response.status(400).json({ error: "Don't exists founds!"})
  }

  return response.json(customer.statement);
})

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const {description, amount} = request.body;
  const {customer} = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation);
  return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if(balance < amount) {
    return response.status(400).json({ error: " Insufficient founds!"})
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit"
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");
  
  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString());
  
  return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer);
})

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
})

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
})

app.listen(3333);
