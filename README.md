# Simple Task Management System -Backend

## ReadMe under construction

## Tech Stack
**Server:** Node, Express

**Database:** Mongoose, MongoDB


### API Endpoints:

#### Create a new Task
```http
POST    /api/v1/tasks              
```
| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `api_key` | `string` | **Required**. Your API key |


#### Query all Tasks
```http
GET     /api/v1/tasks              
```

#### Query a specific task
```http
GET     /api/v1/tasks/:taskid      
```

#### Delete a specific task
```http
DEL     /api/v1/tasks/:taskid      
```

#### Update a specific task
```http
PATCH   /api/v1/tasks/:taskid      
```

#### Task Report(Completed, InProgress, Todo etc.)
```http
GET     /api/v1/tasks/report       
```

#### Authenticate
```http
POST    /api/v1/auth
```

## Run Locally

Clone the project

```bash
  git clone https://github.com/RudraG4/taskmanager-api
```

Go to the project directory

```bash
  cd taskmanager-api
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm start
```