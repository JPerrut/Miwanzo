const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const calculateExpiry = () => {
  const days = parseInt(process.env.JWT_EXPIRES_IN);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

module.exports = {
  generateToken,
  verifyPassword,
  calculateExpiry,
};