/**
 * User.js - User Model (MongoDB Schema)
 * 
 * LEARNING OBJECTIVES:
 * 1. What is a Mongoose Schema
 * 2. How to define fields with validation
 * 3. Pre-save hooks (run code before saving)
 * 4. Instance methods (custom functions on user objects)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * CONCEPT: Mongoose Schema
 * 
 * A Schema defines the STRUCTURE of documents in a MongoDB collection.
 * Think of it like a Python class or a database table structure.
 * 
 * Schema → Model → Document
 * - Schema: Blueprint (defines fields, types, validation)
 * - Model: Constructor (creates documents)
 * - Document: Actual data saved in MongoDB
 */
const UserSchema = new mongoose.Schema(
  {
    // ================================================
    // FIELD DEFINITIONS
    // ================================================
    
    /**
     * name field
     * - type: String (MongoDB data type)
     * - required: true (must provide when creating user)
     * - trim: true (remove whitespace from start/end)
     */
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    /**
     * email field
     * - unique: true (no two users can have same email)
     * - match: Email validation regex
     * - lowercase: true (convert to lowercase before saving)
     */
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true, // MongoDB creates index for this field
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },

    /**
     * password field
     * - Will be HASHED before saving (see pre-save hook below)
     * - select: false means password won't be returned by default
     *   (security: don't send password in API responses)
     */
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't return password in queries by default
    },

    /**
     * role field (for future: admin vs regular user)
     * - enum: Only these values allowed
     * - default: New users are 'user' role
     */
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  {
    // ================================================
    // SCHEMA OPTIONS
    // ================================================
    
    /**
     * timestamps: true
     * Automatically adds two fields:
     * - createdAt: Date when document was created
     * - updatedAt: Date when document was last modified
     */
    timestamps: true
  }
);

// ================================================
// PRE-SAVE HOOK (Middleware that runs BEFORE saving)
// ================================================

/**
 * CONCEPT: Mongoose Middleware (Hooks)
 * 
 * pre('save') runs BEFORE document is saved to MongoDB.
 * Use cases:
 * - Hash passwords before saving
 * - Validate data
 * - Set default values
 * - Update timestamps
 * 
 * How it works:
 * 1. User calls: await user.save()
 * 2. This hook runs FIRST
 * 3. Then MongoDB saves the document
 */
UserSchema.pre('save', async function (next) {
  /**
   * this.isModified('password') checks:
   * - Is password field being changed?
   * - If user just updates name, don't re-hash password
   */
  if (!this.isModified('password')) {
    return next(); // Skip to next middleware
  }

  /**
   * Hash the password using bcrypt
   * 
   * Why hash passwords?
   * - Security: If database is hacked, passwords are encrypted
   * - bcrypt is one-way: Can't reverse hash to get original password
   * 
   * bcrypt.genSalt(10):
   * - 10 = salt rounds (higher = more secure but slower)
   * - Salt = random string added to password before hashing
   * - Same password = different hash each time (because of salt)
   * 
   * Example:
   * Password: "mypassword123"
   * Hash: "$2a$10$N9qo8uLOickgx2ZMRZoMye..." (60 characters)
   * 
   * NOTE: NO next() - Mongoose 6+ uses async/await, not callbacks!
   */
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ================================================
// INSTANCE METHODS (Custom functions on User objects)
// ================================================

/**
 * CONCEPT: Instance Methods
 * 
 * These are custom functions you can call on user objects.
 * 
 * Example usage:
 * const user = await User.findOne({ email: 'test@test.com' });
 * const isMatch = await user.comparePassword('mypassword123');
 */

/**
 * Compare entered password with hashed password in database
 * 
 * Used during login:
 * 1. User enters password: "mypassword123"
 * 2. We fetch user from DB (has hashed password)
 * 3. bcrypt.compare() checks if they match
 * 
 * Returns: true if match, false if not
 */
UserSchema.methods.comparePassword = async function (enteredPassword) {
  /**
   * bcrypt.compare(plaintext, hash)
   * - Takes entered password (plaintext)
   * - Hashes it the same way
   * - Compares with stored hash
   * - Returns true/false
   * 
   * Why not just compare strings?
   * - Hashes are different each time (due to salt)
   * - Must use bcrypt's compare function
   */
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Get public user data (without password)
 * 
 * Used when returning user in API responses
 * Example: After login, return { id, name, email } but NOT password
 */
UserSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt
  };
};

// ================================================
// CREATE AND EXPORT MODEL
// ================================================

/**
 * mongoose.model('User', UserSchema)
 * - Creates a Model from Schema
 * - 'User' → MongoDB creates 'users' collection (lowercase + plural)
 * - Returns constructor function for creating User documents
 * 
 * Usage:
 * const User = require('./models/User');
 * const newUser = new User({ name: 'John', email: 'john@test.com' });
 * await newUser.save();
 */
module.exports = mongoose.model('User', UserSchema);
