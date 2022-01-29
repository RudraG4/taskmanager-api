# Simple Task Management System -Backend

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

#### Query  a specific task
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



## Installation

Install my-project with npm

```bash
  npm install my-project
  cd my-project
```
    

## Run Locally

Clone the project

```bash
  git clone https://link-to-project
```

Go to the project directory

```bash
  cd my-project
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run start
```