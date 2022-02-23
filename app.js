import express from 'express'
import router from './routes/routes.js'
import server from './server.js'
import { Failure } from './dto/dto.js'

const app = express()

const routes = router.getRoutes()
for (const route of routes) {
  app.use(...route)
}

app.use((request, response) => {
  return Failure(response, 400, 'Not Found')
})

server.init(app)

export default app
