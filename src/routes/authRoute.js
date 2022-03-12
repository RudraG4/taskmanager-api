import express from 'express'
import authService from '../services/authService.js'

const router = express.Router()

router.post('/signup', authService.signup)

router.post('/signin', authService.signin)

export default router
