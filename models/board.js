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

    scopes: {
        /**
         * Scope to retrieve boards owned by a specific user
         * @param userId Of the user to retrieve the boards for
         * @returns {Object}
         */
        owned: function(userId) {
            return {
                where: { OwnerId: userId }
            }
        },

        /**
         * Scope to retrieve boards the user is participating in (Not inlcuding owned boards)
         * @param userId Of the user to receive the boardslist for
         * @returns {Object}
         */
        participating: function(userId) {
            return {
                include: [
                    { model: sequelize.models.User, as: 'Participants', where: { id: userId }}
                ]
            }
        }
    },

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
                        return board.setOwner(user);
                    })
                    .then(function() { resolve(board); })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * Get a list of boards the user owns
         * @param user to retrieve the owned boards for
         * @returns {Promise}
         */
        getOwned: function(user) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                Board.scope({ method: ['owned', user.id] }).findAll()
                    .then(function(boards) { resolve(boards); })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * Get a list of boards the user is a member of (e.g. participating) but he does
         * not own. Note that unlike the isParticipating function this one does NOT include
         * boards owned by the user to make such separation in retrieval a bit simpler.
         * @param user for which to retrieve boards he is participating in
         * @returns {Promise}
         */
        getParticipating: function(user) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                Board.scope({ method: ['participating', user.id] }).findAll()
                    .then(function(boards) { resolve(boards); })
                    .catch(function(err) { reject(err); });
            });
        },

        findEager: function(boardId) {
            return Board.findOne({ where: { id: boardId },
                include: [
                    { model: sequelize.models.User, as: 'Owner' },
                    { model: sequelize.models.User, as: 'Participants' },
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
         * Check if the provided user is the owner of this board. Note that the
         * resulting promise-chain will be called with .then(function(isOwner) {...})
         * @param user which is checked for ownership
         * @returns {Promise}
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
         * @returns {Promise}
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
         * @returns {Promise}
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