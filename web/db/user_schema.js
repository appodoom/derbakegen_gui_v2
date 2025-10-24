const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('derbakegen', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    logging: false
});

// Define the model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        unique: false,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    freezeTableName: true,
    timestamps: true,
    paranoid: true
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection established successfully.');
        await User.sync({ alter: false });
        console.log('User table synced successfully.');
    } catch (err) {
        console.error('Error connecting or syncing:', err);
    }
})();


module.exports = { User, sequelize };