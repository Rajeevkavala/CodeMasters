const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const Task = require('../models/Task');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/projects
// @desc    Get all projects for authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.userId })
      .populate('tasks', 'title status priority')
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      projects
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching projects'
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('tasks')
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner or collaborator
    const isOwner = project.owner._id.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      collab => collab.user._id.toString() === req.user.userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to view this project.'
      });
    }

    res.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching project'
    });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', [
  body('title').notEmpty().trim().withMessage('Project title is required'),
  body('description').notEmpty().trim().withMessage('Project description is required'),
  body('status').optional().isIn(['planning', 'in-progress', 'completed', 'on-hold']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, status, priority, dueDate } = req.body;

    const project = new Project({
      title,
      description,
      owner: req.user.userId,
      status: status || 'planning',
      priority: priority || 'medium',
      dueDate: dueDate || null
    });

    await project.save();

    // Populate owner info before sending response
    await project.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating project'
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', [
  body('title').optional().notEmpty().trim().withMessage('Project title cannot be empty'),
  body('description').optional().notEmpty().trim().withMessage('Project description cannot be empty'),
  body('status').optional().isIn(['planning', 'in-progress', 'completed', 'on-hold']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only project owner can update this project.'
      });
    }

    const updateFields = {};
    ['title', 'description', 'status', 'priority', 'dueDate'].forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('owner', 'name email').populate('tasks', 'title status priority');

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating project'
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only project owner can delete this project.'
      });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ projectId: req.params.id });

    // Delete the project
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project and associated tasks deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting project'
    });
  }
});

module.exports = router;