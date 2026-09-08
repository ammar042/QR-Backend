// import { body, validationResult } from 'express-validator';

// // Validation rules for donor registration
// export const validateDonor = [
//   body('firstName')
//     .trim()
//     .notEmpty().withMessage('First name is required')
//     .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
//     .matches(/^[A-Za-z\s]+$/).withMessage('First name can only contain letters'),

//   body('lastName')
//     .trim()
//     .notEmpty().withMessage('Last name is required')
//     .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
//     .matches(/^[A-Za-z\s]+$/).withMessage('Last name can only contain letters'),

//   body('phone')
//     .trim()
//     .notEmpty().withMessage('Phone number is required')
//     .matches(/^[0-9]{10,15}$/).withMessage('Please enter a valid phone number (10-15 digits)'),

//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please enter a valid email')
//     .normalizeEmail(),

//   body('address')
//     .trim()
//     .notEmpty().withMessage('Address is required')
//     .isLength({ min: 5, max: 200 }).withMessage('Address must be between 5 and 200 characters'),

//   body('age')
//     .notEmpty().withMessage('Age is required')
//     .isInt({ min: 18, max: 65 }).withMessage('Age must be between 18 and 65'),

//   body('bloodGroup')
//     .notEmpty().withMessage('Blood group is required')
//     .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),

//   body('district')
//     .trim()
//     .notEmpty().withMessage('District is required'),

//   body('state')
//     .trim()
//     .notEmpty().withMessage('State is required'),

//   body('pincode')
//     .trim()
//     .notEmpty().withMessage('Pincode is required')
//     .matches(/^[0-9]{5,6}$/).withMessage('Please enter a valid pincode (5-6 digits)'),

//   body('month')
//     .optional()
//     .isIn(['January', 'February', 'March', 'April', 'May', 'June', 
//            'July', 'August', 'September', 'October', 'November', 'December', ''])
//     .withMessage('Invalid month'),

//   body('year')
//     .optional()
//     .matches(/^[0-9]{4}$/).withMessage('Please enter a valid year'),

//   body('agreedToTerms')
//     .notEmpty().withMessage('You must agree to the terms')
//     .isBoolean().withMessage('Invalid value')
//     .custom(value => value === true).withMessage('You must agree to the terms'),

//   // Handle validation results
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array()
//       });
//     }
//     next();
//   }
// ];

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack
  });
};