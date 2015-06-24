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
         * @param user which is added as the owner of this board
         * @param boardData holding further board-information
         * @returns {*|Bluebird.Promise}
         */
        make: function(user, boardData) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                // Workaround for not null parts
                boardData.name = boardData.name || '';

                var board = Board.build(boardData);
                return user.addBoard(board)
                    .then(function(board) { resolve(board); })
                    .catch(function(err) { reject(err); });
            });
        }
    },

    instanceMethods: {
        /**
         * Check if the provided user is the owner of this board. Note that the
         * resulting promise-chain will be called with .then(function(isOwner) {...})
         * @param user which is checked for ownership
         * @returns {*|Bluebird.Promise}
         */
        isOwner: function(user) {
            var that = this;

            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                that.getOwner()
                    .then(function(owner) {
                        if (owner === null) { return resolve(false); }
                        resolve(owner.id === user.id);
                    })
                    .catch(function(err) {
                        reject(err);
                    });
            });
        },

        /**
         * Checks if a user participates in this board. Unlike the automatically created
         * hasParticipant(...) method of sequelize, this instance-method will also take the
         * owner into account, which is normally not part of the participant-list
         * @param user
         * @returns {*|Bluebird.Promise}
         */
        isParticipating: function(user) {
            var that = this;

            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                that.hasParticipant(user)
                    .then(function(participating) {
                        if (!participating) {
                            // Not a default user, do owner check now...
                            that.isOwner(user)
                                .then(function(isOwner) { resolve(isOwner); })
                                .catch(function(err) { reject(err); });
                        } else {
                            // Seems to be a participating user
                            resolve(true);
                        }
                    })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * This helper-function will attempt to remove the relation of card <-> user assignments from all
         * cards present in this board. This function will typically be called before removing a participant
         * from a board, to clean up her presence.
         * @param user for whom the cards shall be removed
         * @returns {bluebird|exports|module.exports}
         */
        removeParticipantFromAllCards: function(user) {
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
        }
    }
});

module.exports = Board;

var User   = require(__dirname + '/user');
var Column = require(__dirname + '/column');
var Label  = require(__dirname + '/label');

// Relations
// A board will have one owner and many participants
Board.belongsTo(User, { as: 'Owner', foreignKey: 'OwnerId' });
Board.belongsToMany(User, { as: 'Participants', through: 'BoardParticipants' });

// A board will have many columns
Board.hasMany(Column, { as: 'Columns' });

// A board can hold many labels
Board.hasMany(Label, { as: 'Labels' });