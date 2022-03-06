import express from 'express'
import workspaceService from '../services/workspaceService.js'

const workspace = express.Router()

workspace.post('/', workspaceService.createWorkspace)

workspace.get('/', workspaceService.getWorkspaces)

workspace.get('/:workspaceid', workspaceService.getWorkspaces)

workspace.delete('/:workspaceid', workspaceService.deleteWorkspace)

export default workspace
