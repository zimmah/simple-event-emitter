const PORT = process.env.PORT || 5000
const express = require('express')
const webSocketServer = require('websocket').server
const EventEmitter = require('events')
const path = require('path')
const { ethers, Contract } = require('ethers')
const eventEmitterAbi = require('../client/src/contract/eventEmitter.json')
const { getEvents, setEvent, getLastSavedBlock } = require('./queries')

const provider = ethers.getDefaultProvider('ropsten', 
    {
        alchemy: 'API-KEY',
    }
)
const eventEmitterAddress = '0x64F408fCdAFA93C8301Be04d0a15a282f19616fF'
const contract = new Contract(eventEmitterAddress, eventEmitterAbi, provider)

let initialized = false
const initEmitter = new EventEmitter()
let eventArray = []

async function initialize() {
    const getEventFilter = (filter) => contract.filters[filter]().topics[0]
    const lastSavedBlock = (await getLastSavedBlock())[0]?.blocknumber || 9332974
    const pastEvents = await contract.queryFilter(getEventFilter('genericEvent'), lastSavedBlock + 1, "latest")
    
    // await Promise.all is neccesary to make sure all the events get added to the database before getEvents get called, otherwise it only gets the first 2~4
    await Promise.all(pastEvents.map( async ({blockNumber, args}) => {
        const {timestamp, caller} = args   
        return await setEvent(caller, Number(timestamp), blockNumber)
    }))

    eventArray = await getEvents()
    eventArray.sort( (a, b) => a.timestamp - b.timestamp)
    initialized = true
    initEmitter.emit('ready')
}
initialize()

const server = express()
    .use(express.static('../client/build'))
    .use((req, res, next) => res.sendFile(path.join(__dirname, '../client/build/index.html')))
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

const wss = new webSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
})

function originIsAllowed(origin) {
    return origin === 'https://immutable-websocket.herokuapp.com'
}

function sendEvents(client) {
    eventArray.forEach(({timestamp, caller}) => {
        client.send(JSON.stringify({timestamp, caller}))
    })
}

wss.on('request', (request) => {
    if (!originIsAllowed(request.origin)) {
        request.reject()
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
        return
    }
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.')
    request.accept(null, request.origin)
})

wss.on('connect', (client) => {
    client.on('close', () => console.log('Client disconnected'))
    if (!initialized) return initEmitter.once('ready', () => sendEvents(client))
    sendEvents(client)
})

contract.on('genericEvent', (timestampHex, caller, {blockNumber}) => {
    const timestamp = Number(timestampHex)
    setEvent(caller, timestamp, blockNumber)
    wss.connections.forEach( (connection) => {
        connection.send(JSON.stringify({timestamp, caller}))
    })
})
