import Donor from '../models/Donor.js';
import OTP from '../models/OTP.js';
import { generateOTP, sendOTP } from '../utils/sendOTP.js';
import generateToken from '../utils/generateToken.js';


// @desc    Send OTP for registration
// @route   POST /api/auth/send-registration-otp
// @access  Public
export const sendRegistrationOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;
    
    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either phone or email is required'
      });
    }
    
    // Check if user already exists
    const existingUser = await Donor.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone: phone }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP to database
    await OTP.create({
      phone,
      email: email?.toLowerCase(),
      otp,
      purpose: 'registration'
    });
    
    // Send OTP
    const sendResults = await sendOTP(phone, email, otp);
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: phone ? { sent: sendResults.sms.sent } : undefined,
        email: email ? { sent: sendResults.email.sent } : undefined
      }
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// @desc    Verify OTP and register donor
// @route   POST /api/auth/verify-registration-otp
// @access  Public
export const verifyRegistrationOTP = async (req, res) => {
  try {
    console.log('📥 Received verification request:', req.body);
    
    const { phone, email, otp, donorData } = req.body;
    
    // Validate required fields
    if ((!phone && !email) || !otp || !donorData) {
      console.log('❌ Missing required fields:', { phone, email, otp, donorData: !!donorData });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    console.log('🔍 Looking for OTP record with:', { phone, email, otp });
    
    // Find OTP record
    const otpRecord = await OTP.findOne({
      $or: [
        { phone },
        { email: email?.toLowerCase() }
      ],
      otp,
      purpose: 'registration',
      isVerified: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
      console.log('❌ OTP not found or expired');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    console.log('✅ OTP found, marking as verified');
    
    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();
    
    // Check if donor already exists
    console.log('🔍 Checking for existing donor:', { phone, email });
    
    const existingDonor = await Donor.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone: phone }
      ]
    });
    
    if (existingDonor) {
      console.log('❌ Donor already exists');
      return res.status(400).json({
        success: false,
        message: 'Donor already exists with this email or phone'
      });
    }
    
    // Prepare donor data
    console.log('📝 Creating new donor with data:', {
      firstName: donorData.firstName,
      lastName: donorData.lastName,
      phone,
      email: email?.toLowerCase(),
      bloodGroup: donorData.bloodGroup,
      district: donorData.district
    });
    

    // Create donor with password from donorData
    const donor = new Donor({
      firstName: donorData.firstName,
      lastName: donorData.lastName,
      phone: phone,
      email: email?.toLowerCase(),
      password: donorData.password,
      address: donorData.address,
      age: donorData.age,
      bloodGroup: donorData.bloodGroup,
      district: donorData.district,
      province: donorData.province,
      pincode: donorData.pincode,
      lastDonation: {
        month: donorData.month || '',
        year: donorData.year || ''
      },
      agreedToTerms: donorData.agreedToTerms, // Make sure this is included
      isVerified: true,
      isActive: true,
      location: {
        type: "Point",
        coordinates: [donorData.longitude, donorData.latitude], // [lng, lat] order!
      },
    });
    
    console.log('💾 Saving donor to database...');
    await donor.save(); // This triggers the pre-save hook
    console.log('✅ Donor saved successfully with ID:', donor._id);
    
    // Generate token
    const token = generateToken(donor._id, donor.role);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        id: donor._id,
        name: `${donor.firstName} ${donor.lastName}`,
        email: donor.email,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        role: donor.role,
        token
      }
    });
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    console.error('Error stack:', error.stack);
    
    // Check for specific MongoDB validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Check for duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed: ' + error.message
    });
  }
};

// @desc    Login with email/phone and password
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password'
      });
    }
    
    // Find donor by email or phone
    const donor = await Donor.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ],
      isActive: true
    });
    
    if (!donor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if verified
    if (!donor.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email/phone first'
      });
    }
    
    // Verify password
    const isMatch = await donor.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = generateToken(donor._id, donor.role);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: donor._id,
        name: `${donor.firstName} ${donor.lastName}`,
        email: donor.email,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        role: donor.role,
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// @desc    Send OTP for login (optional - for passwordless login)
// @route   POST /api/auth/send-login-otp
// @access  Public
export const sendLoginOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;
    
    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either phone or email is required'
      });
    }
    
    // Check if user exists
    const donor = await Donor.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone }
      ],
      isActive: true,
      isVerified: true
    });
    
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email/phone'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Save OTP to database
    await OTP.create({
      phone,
      email: email?.toLowerCase(),
      otp,
      purpose: 'login'
    });
    
    // Send OTP
    const sendResults = await sendOTP(phone, email, otp);
    
    res.json({
      success: true,
      message: 'Login OTP sent successfully',
      data: {
        userId: donor._id,
        phone: phone ? { sent: sendResults.sms.sent } : undefined,
        email: email ? { sent: sendResults.email.sent } : undefined
      }
    });
    
  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// @desc    Verify login OTP (passwordless login)
// @route   POST /api/auth/verify-login-otp
// @access  Public
export const verifyLoginOTP = async (req, res) => {
  try {
    const { phone, email, otp } = req.body;
    
    if ((!phone && !email) || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Find OTP record
    const otpRecord = await OTP.findOne({
      $or: [
        { phone },
        { email: email?.toLowerCase() }
      ],
      otp,
      purpose: 'login',
      isVerified: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();
    
    // Find donor
    const donor = await Donor.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone }
      ],
      isActive: true
    });
    
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate token
    const token = generateToken(donor._id, donor.role);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: donor._id,
        name: `${donor.firstName} ${donor.lastName}`,
        email: donor.email,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        role: donor.role,
        token
      }
    });
    
  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const donor = await Donor.findById(req.user.id).select('-password');
    
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: donor
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};
