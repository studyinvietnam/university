const User = require('../models/User');
const OTP = require('../models/OTP');
const otpService = require('../services/otpService');
const mailService = require('../services/mailService');
const jwt = require('jsonwebtoken');

exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Tạo OTP
    const otp = otpService.generateOTP();
    const hashedOTP = otpService.hashOTP(otp);

    // Lưu OTP vào DB
    await OTP.findOneAndUpdate(
      { email },
      { otpHash: hashedOTP, expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0 },
      { upsert: true, new: true }
    );

    // Gửi email
    const mailResult = await mailService.sendMail({
      to: email,
      subject: 'Mã OTP đăng nhập',
      text: `Mã OTP của bạn là: ${otp}`,
    });

    if (!mailResult.success) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    res.json({ message: 'OTP sent', provider: mailResult.provider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  try {
    const record = await OTP.findOne({ email });
    if (!record) return res.status(400).json({ error: 'OTP not found' });

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({ error: 'OTP expired' });
    }

    const isValid = await otpService.verifyOTP(otp, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Tìm hoặc tạo user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, emailVerified: true });
      await user.save();
    } else {
      user.emailVerified = true;
      await user.save();
    }

    // Xóa OTP sau khi verify thành công
    await OTP.deleteOne({ email });

    // Tạo JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logout = (req, res) => {
  // JWT stateless, chỉ cần client xóa token
  res.json({ message: 'Logged out' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.userId).select('-__v');
  res.json(user);
};