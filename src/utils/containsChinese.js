const containsChinese = (str) => {
  var reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
  return reg.test(str);
};
module.exports = containsChinese;
