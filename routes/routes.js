import authRoute from './authRoute.js'
import userRoute from './userRoute.js'
import tasksRoute from './tasksRoute.js'
import indexRoute from './indexRoute.js'
import { basic, authenticate } from '../middlewares/middlewares.js'

const routes = []

function Routers () {
  this.init = () => {
    basic.map((middleware) => routes.push(['*', middleware]))
    routes.push(['/', indexRoute])
    routes.push(['/api/v1/auth', authRoute])
    routes.push(['/api/v1/user', authenticate, userRoute])
    routes.push(['/api/v1/tasks', authenticate, tasksRoute])
  }

  this.register = (route, handler) => {
    this.routes.push({ route, handler })
  }

  this.getRoutes = () => { return routes }

  this.init()
}

export default new Routers()
