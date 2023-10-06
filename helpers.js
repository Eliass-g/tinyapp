const getUserByEmail = function(emailCheck, users) {
  for (const key in users) {
    if (users[key].email === emailCheck) {
      return users[key];
    }
  }
  return false;
};

module.exports = getUserByEmail;