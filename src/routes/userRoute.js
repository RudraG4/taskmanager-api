import userService from '../services/userService.js'
import express from 'express'

const router = express.Router()

router.get('/:username', userService.findUser)

router.patch('/:username/update', userService.updateUser)

export default router
