const SettingWebsiteInfo = require("../../models/setting-website-info.model");

module.exports.websiteInfo = async (req, res, next) => {
  const settingWebsiteInfo = await SettingWebsiteInfo.findOne({});

  // Nếu chưa có dữ liệu thì dùng object rỗng để view không bị lỗi
  res.locals.settingWebsiteInfo = settingWebsiteInfo || {};

  next();
}
