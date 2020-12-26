import { useState } from 'react'
import { w3cwebsocket as W3CWebSocket } from "websocket"
import { ethers } from 'ethers'
import eventEmitterAbi from './contract/eventEmitter.json'

const client = new W3CWebSocket(location.origin.replace(/^http/, 'ws'))
const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()
const eventEmitterAddress = '0x3FB2c639fA4559D4EE8B0b74e16D278BdE480E25'
const contract = new ethers.Contract(eventEmitterAddress, eventEmitterAbi, signer)

window.ethereum.autoRefreshOnNetworkChange = false

export default function App() {
    const [events, setEvents] = useState([])
    const [currentAccount, setCurrentAccount] = useState()
    const [transactionStatus, setTransactionStatus] = useState('')

    window.ethereum
        .on("accountsChanged", handleAccountsChanged)
        .on("disconnect", handleAccountsChanged)
        .request({ method: "eth_accounts"} )
        .then(handleAccountsChanged)
        .catch(err => console.error(err))

    function handleAccountsChanged(accounts) {
        if (accounts.length === 0 && currentAccount !== undefined) {
            console.log('Please connect to MetaMask')
            setCurrentAccount(undefined)
        } else if (currentAccount !== accounts[0]) {
            setCurrentAccount(accounts[0])
        }
    }

    async function emitEvent() {
        setTransactionStatus('signing')
        try {
            const transactionRequest = await contract.emitEvent()
            setTransactionStatus('pending')
            await transactionRequest.wait()
            setTransactionStatus('done')
        } catch (error) {
            if (error.code === 4001) return setTransactionStatus('rejected')
            setTransactionStatus('failed')
        }

    }

    function connect() {
        window.ethereum
            .request( {method: "eth_requestAccounts"} )
            .then(handleAccountsChanged)
            .catch(err => {
                if (err.code === 4001) {
                    console.log("Please connect to Metamask")
                } else {
                    console.error(err)
                }
        })
    }

    function showTransactionStatus() {
        switch (transactionStatus) {
            case 'signing': return 'please sign the transaction'
            case 'pending': return 'pending ...'
            case 'done': return 'done!'
            case 'rejected': return 'transaction rejected by user'
            case 'failed': return 'transaction failed for unknown reason'
            default: return ''
        }
    }

    client.onopen = () => console.log('WebSocket client connected.')
    client.onmessage = (message) => {
        const {timestamp, caller} = JSON.parse(message.data)
        const time = (new Date(timestamp*1000)).toLocaleString()
        const callerFormatted = caller.slice(0, 8) + '...' + caller.slice(-6)
        setEvents([...events, {time, callerFormatted}])
    }

    return (
        <div>
            <h1>Events</h1>
            {currentAccount ? <div><p>connected with {currentAccount} on chainId {window.ethereum.chainId}</p><button onClick={emitEvent}>Emit Event</button></div> : <button onClick={connect}>Connect to Metamask</button>}
            {transactionStatus ? <p>{showTransactionStatus()}</p> : null}
            <ul>
                {events.map( ({time, callerFormatted}) => <li>Event emitted by {callerFormatted} at {time}.</li>)}
            </ul>
        </div>
    )
}