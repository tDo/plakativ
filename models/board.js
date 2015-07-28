var Promise   = require('bluebird');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');

var Board = sequelize.define('Board', {
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Board name may not be empty'},
            len: { args: [4, 100], msg: 'Board name must at least have 4 characters' }
        }
    },
    private: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    closed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
}, {

    classMethods: {
        /**
         * Helper function checks if the provided object is a Board model instance
         * and has been persisted to the database yet.
         * @param obj which shall be checked
         * @returns {boolean}
         */
        isBoard: function(obj) {
            if (!helpers.isModelOfType(obj, Board)) { return false; }
            return !obj.isNewRecord;
        },

        /**
         * Create a new board-instance, which is bound to a specific owner.
         * @param user which is added as the first admin of this board
         * @param boardData holding further board-information
         * @returns {Promise}
         */
        make: function(user, boardData) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                // Workaround for not null parts
                boardData.name = boardData.name || '';

                var board;
                Board.create(boardData)
                    .then(function(b) {
                        board = b;
                        return board.addUser(user, { admin: true });
                    })
                    .then(function() { resolve(board); })
                    .catch(function(err) { reject(err); });
            });
        },


        findEager: function(boardId) {
            return Board.findOne({ where: { id: boardId },
                include: [
                    { model: sequelize.models.User },
                    { model: sequelize.models.Label, as: 'Labels' },
                    { model: sequelize.models.Column, as: 'Columns', include: [
                        { model: sequelize.models.Card, as: 'Cards', include: [
                            { model: sequelize.models.User, as: 'Assignees'},
                            { model: sequelize.models.Label, as: 'Labels' },
                            { model: sequelize.models.Task, as: 'Tasks'}
                        ]}
                    ]}
                ]
            });
        }
    },

    instanceMethods: {

        /**
         * This helper function verifies if the passed in user is a board-admin and passes
         * in the result as the first parameter of the resolve-handler. The returned promise
         * will only be rejected on real errors.
         * @param user to verify for this board
         * @returns {bluebird|exports|module.exports}
         */
        isAdmin: function(user) {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                that.getUsers({ where: { id: user.id }})
                    .then(function(users) {
                        if (!Array.isArray(users) || users.length < 1) {
                            return resolve(false);
                        }

                        var user = users[0];
                        resolve(user.BoardUsers.admin === true);
                    })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * This helper-function will attempt to remove the relation of card <-> user assignments from all
         * cards present in this board. This function will typically be called before removing a participant
         * from a board, to clean up her presence.
         * @param user for whom the cards shall be removed
         * @returns {Promise}
         */
        removeUserFromAllCards: function(user) {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                // So, we are doing it raw since this seems the most viable way to execute this query...
                var query = 'DELETE FROM CardAssignees ' +
                            'WHERE CardAssignees.CardId IN (' +
                            '  SELECT Cards.id FROM Cards ' +
                            '  JOIN Columns ON (Cards.ColumnId = Columns.id) ' +
                            '  WHERE Columns.BoardId = ? ' +
                            ') ' +
                            'AND CardAssignees.UserId = ?';

                sequelize.query(query, {
                    replacements: [ that.id, user.id ],
                    type: sequelize.QueryTypes.BULKDELETE
                })
                    .then(function() { resolve(); })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * This helper function will attempt to remove a label from all cards it has been assigned to in this
         * board. This function will typically be called before removing a label to clean up presence.
         * @param label which shall be removed from all cards
         * @returns {bluebird|exports|module.exports}
         */
        removeLabelFromAllCards: function(label) {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.Label.isLabel(label)) { return reject(new Error('Invalid label')); }
                // So, we are doing it raw since this seems the most viable way to execute this query...
                var query = 'DELETE FROM CardLabels ' +
                            'WHERE CardLabels.CardId IN (' +
                            '  SELECT Cards.id FROM Cards ' +
                            '  JOIN Columns ON (Cards.ColumnId = Columns.id) ' +
                            '  WHERE Columns.BoardId = ? ' +
                            ') ' +
                            'AND CardLabels.LabelId = ?';

                sequelize.query(query, {
                    replacements: [ that.id, label.id ],
                    type: sequelize.QueryTypes.BULKDELETE
                })
                    .then(function() { resolve(); })
                    .catch(function(err) { reject(err); });
            });
        }
    }
});

module.exports = Board;

var User       = require(__dirname + '/user');
var BoardUsers = require(__dirname + '/board_users');
var Column     = require(__dirname + '/column');
var Label      = require(__dirname + '/label');

// Relations
// A board has many admins and default users
Board.belongsToMany(User, { through: BoardUsers });

// A board will have many columns
Board.hasMany(Column, { as: 'Columns' });

// A board can hold many labels
Board.hasMany(Label, { as: 'Labels' });