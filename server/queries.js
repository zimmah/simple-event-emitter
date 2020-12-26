const { Client } = require('pg')
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

const sqlConnect = () => client.connect()

const sqlDisconnect = () => client.end()

const setEvent = (address, timestamp, blockNumber) => {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO events (caller, timestamp, blocknumber) VALUES ($1, $2, $3)', [address, timestamp, blockNumber], (error, result) => {
            if (error) return reject(error)
            resolve(`Event added with ID: ${result.insertId}`)
        })
    })
}

const getEvents = () => {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM events ORDER BY blocknumber ASC', (error, result) => {
            if (error) return reject(error)
            resolve(result.rows)
        })
    })
}

const getLastSavedBlock = () => {
    return new Promise((resolve, reject) => {
        client.query('SELECT blocknumber FROM events ORDER BY blocknumber DESC FETCH FIRST 1 ROWS ONLY', (error, result) => {
            if (error) return reject(error)
            resolve(result.rows)
        })
    })
}

module.exports = {
    setEvent,
    getEvents,
    getLastSavedBlock,
    sqlConnect,
    sqlDisconnect,
}
