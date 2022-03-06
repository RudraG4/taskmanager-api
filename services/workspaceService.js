import { Failure, Success } from '../dto/dto.js'
import Project from '../models/Project.js'
import Workspace from '../models/Workspace.js'

const createWorkspace = async (request, response) => {
  try {
    const { user } = request
    const workspaceData = request.body
    if (workspaceData.workspacename) {
      const existWS = await Workspace.findOne(workspaceData).lean()
      if (existWS) {
        return Failure(response, 400, 'workspace validation failed: workspacename: workspace with same name already exists')
      }
    }
    workspaceData.createdby = user.username
    const { workspaceid } = await Workspace.create(workspaceData)
    return Success(response, 200, { workspaceid })
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const getWorkspaces = async (request, response) => {
  try {
    const { workspaceid } = request.params
    if (workspaceid) {
      const result = await Workspace.findById(workspaceid, '-_id -__v').lean()
      if (result) {
        const projects = await Project.find({ workspaceid })
          .select('-_id projectname projectid').lean()
        result.projects = projects
      }
      return Success(response, 200, result)
    }
    const results = await Workspace.find()
      .select('-_id -__v -projects')
      .exec()
    return Success(response, 200, results)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const deleteWorkspace = async (request, response) => {
  try {
    const { workspaceid } = request.params
    const workspace = await Workspace.findById(workspaceid, '-_id -__v').lean()
    if (!workspace) {
      return Failure(response, 404, 'workspace validation failed: workspaceid: No matching workspace found')
    }
    await Workspace.findByIdAndDelete(workspaceid)
    return Success(response, 200, workspace)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const createProject = async (request, response) => {
  try {
    const { workspaceid } = request.params
    const { user } = request
    const workspace = await Workspace.findById(workspaceid, '-_id -__v').lean()
    if (!workspace) {
      return Failure(response, 404, 'workspace validation failed: workspaceid: No matching workspace found')
    }
    const projectData = request.body
    if (projectData.projectname) {
      const existProject = await Project.findOne(projectData).lean()
      if (existProject) {
        return Failure(response, 400, 'project validation failed: projectname: project with same name already exists')
      }
    }
    projectData.workspaceid = workspaceid
    projectData.createdby = user.username
    const { projectid } = await Project.create(projectData)
    return Success(response, 200, { projectid })
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const getProjects = async (request, response) => {
  try {
    const { workspaceid, projectid } = request.params
    const workspace = await Workspace.findById(workspaceid, '-_id -__v').lean()
    if (!workspace) {
      return Failure(response, 404, 'workspace validation failed: workspaceid: No matching workspace found')
    }
    if (projectid) {
      const result = await Project.findById(projectid, '-_id -__v').lean()
      return Success(response, 200, result)
    }
    const results = await Project.find()
      .select('-_id -__v').lean()
    return Success(response, 200, results)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

const deleteProject = async (request, response) => {
  try {
    const { workspaceid, projectid } = request.params
    const workspace = await Workspace.findById(workspaceid, '-_id -__v').lean()
    if (!workspace) {
      return Failure(response, 404, 'workspace validation failed: workspaceid: No matching workspace found')
    }
    const project = await Project.findById(projectid, '-_id -__v').lean()
    if (!project) {
      return Failure(response, 404, 'project validation failed: projectid: No matching project found')
    }
    await Project.findByIdAndDelete(projectid)
    return Success(response, 200, project)
  } catch (error) {
    return Failure(response, 500, error)
  }
}

export default {
  createWorkspace,
  getWorkspaces,
  deleteWorkspace,
  createProject,
  getProjects,
  deleteProject
}
