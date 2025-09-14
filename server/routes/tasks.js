const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Project = require('../models/Project');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/tasks
// @desc    Get all tasks for authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;

    // Build query filter
    let filter = {};

    // If projectId is provided, filter by that project
    if (projectId) {
      // Verify user has access to this project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const isOwner = project.owner.toString() === req.user.userId;
      const isCollaborator = project.collaborators.some(
        collab => collab.user._id.toString() === req.user.userId
      );

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project'
        });
      }

      filter.projectId = projectId;
    } else {
      // Get all projects where user is owner or collaborator
      const userProjects = await Project.find({
        $or: [
          { owner: req.user.userId },
          { 'collaborators.user': req.user.userId }
        ]
      }).select('_id');

      filter.projectId = { $in: userProjects.map(p => p._id) };
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('projectId', 'title')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks'
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('projectId', 'title owner collaborators')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access to this task's project
    const project = task.projectId;
    const isOwner = project.owner.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      collab => collab.user._id.toString() === req.user.userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this task'
      });
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching task'
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').notEmpty().trim().withMessage('Task title is required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in-progress', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('estimatedHours').optional().isNumeric().withMessage('Estimated hours must be a number')
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

    const { projectId, title, description, status, priority, dueDate, estimatedHours, tags } = req.body;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const isOwner = project.owner.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      collab => collab.user._id.toString() === req.user.userId && 
      ['editor', 'admin'].includes(collab.role)
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You need editor permissions to create tasks.'
      });
    }

    const task = new Task({
      projectId,
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      tags: tags || []
    });

    await task.save();

    // Add task to project's tasks array
    await Project.findByIdAndUpdate(projectId, {
      $push: { tasks: task._id }
    });

    // Populate task before sending response
    await task.populate('projectId', 'title');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating task'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', [
  body('title').optional().notEmpty().trim().withMessage('Task title cannot be empty'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in-progress', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('estimatedHours').optional().isNumeric().withMessage('Estimated hours must be a number'),
  body('actualHours').optional().isNumeric().withMessage('Actual hours must be a number')
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

    const task = await Task.findById(req.params.id).populate('projectId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access to this task's project
    const project = task.projectId;
    const isOwner = project.owner.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      collab => collab.user._id.toString() === req.user.userId && 
      ['editor', 'admin'].includes(collab.role)
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You need editor permissions to update tasks.'
      });
    }

    const updateFields = {};
    ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'actualHours', 'tags', 'assignedTo'].forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('projectId', 'title').populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('projectId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access to delete this task
    const project = task.projectId;
    const isOwner = project.owner.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      collab => collab.user._id.toString() === req.user.userId && 
      ['admin'].includes(collab.role)
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only project owner or admin collaborators can delete tasks.'
      });
    }

    // Remove task from project's tasks array
    await Project.findByIdAndUpdate(task.projectId._id, {
      $pull: { tasks: task._id }
    });

    // Delete the task
    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting task'
    });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add a comment to a task
// @access  Private
router.post('/:id/comments', [
  body('text').notEmpty().trim().withMessage('Comment text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const task = await Task.findById(req.params.id).populate('projectId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has access to this task's project
    const project = task.projectId;
    const isOwner = project.owner.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      collab => collab.user._id.toString() === req.user.userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this task'
      });
    }

    const comment = {
      user: req.user.userId,
      text: req.body.text,
      createdAt: new Date()
    };

    task.comments.push(comment);
    await task.save();

    // Populate the new comment
    await task.populate('comments.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: task.comments[task.comments.length - 1]
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding comment'
    });
  }
});

module.exports = router;