module.exports = {
    User:       require(__dirname + '/user'),
    Board:      require(__dirname + '/board'),
    BoardUsers: require(__dirname + '/board_users'),
    Label:      require(__dirname + '/label'),
    Column:     require(__dirname + '/column'),
    Card:       require(__dirname + '/card'),
    Task:       require(__dirname + '/task'),
    sequelize:  require(__dirname + '/sequelize')
};