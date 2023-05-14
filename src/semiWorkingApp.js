import React, { useState, useEffect } from "react";
import Web3 from "web3";
import HelpDesk from "./ITHelpdesk.json";
import "./App.css";

function App() {
  const [title, setTitle] = useState("");
  const [issue, setIssue] = useState("");
  const [offChainTicketCount, setOffChainTicketCount] = useState(0);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("low");
  const [deviceType, setDeviceType] = useState("phone");
  const [TicketDetails, setTicketDetails] = useState(null);
  const [ticketId, setTicketId] = useState("");
  const [offChainTicketArray, setOffChainTicketArray] = useState([]);

  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);

  const createTicket = async () => {
    const value = web3.utils.toWei("0.01", "ether"); // adjust the ticket value as needed
    let diff = 0;
    let dev = 0;

    if (difficulty === "Easy") {
      diff = 0;
    } else if (difficulty === "Medium") {
      diff = 1;
    } else if (difficulty === "Hard") {
      diff = 2;
    }

    if (deviceType === "Laptop") {
      diff = 0;
    } else if (deviceType === "Desktop") {
      diff = 1;
    } else if (deviceType === "Mobile") {
      diff = 2;
    }

    try {
      const tx = await contract.methods
        .createTicket(title, issue, description, diff, dev)
        .send({
          value,
          from: account,
          gas: 5000000,
        });
      const { transactionHash } = tx;
      window.alert(`Transaction sent: ${transactionHash}`);
      const { events } = tx;
      const { TicketCreated } = events;
      const { returnValues } = TicketCreated;
      const ticketId = returnValues.ticketId; // define ticketId here
      window.alert(`Ticket created with ID: ${ticketId}`);
      setTitle("");
      setIssue("");
      setDescription("");
      setDifficulty("Easy");
      setDeviceType("phone");
      setOffChainTicketCount(offChainTicketCount + 1);
      await contract.methods.fetchTicket(ticketId);
    } catch (err) {
      console.error(err);
      window.alert("Failed to create ticket");
    }
  };

  const getDataArray = async () => {
    const onChainTicketCount = await contract.methods.ticketCount().call();
    console.log("renderTable: on chain ticket count is " + onChainTicketCount);

    for (let i = 0; i < onChainTicketCount; i++) {
      contract.methods.fetchTicket(i).then(function (ticket) {
        const prepArray = offChainTicketArray;
        prepArray.push(ticket);
        setOffChainTicketArray(prepArray);
      });
    }
    //console.log(offChainTicketArray);

    //have a refresh function with a button that refreshes table
    //refresh upon ticket creation
  };

  const resolveTicket = async (ticketId) => {
    try {
      const tx = await contract.methods.resolveTicket(ticketId).send({
        from: account,
      });
      const ticket = await contract.methods.fetchTicket(ticketId).call();
      if (ticket.resolved) {
        const updatedResolvedTickets = [...resolvedTickets, ticket];
        setResolvedTickets(updatedResolvedTickets);
      }
    } catch (err) {
      console.error(err);
      window.alert("Failed to resolve ticket");
    }
  };

  const ticketDetails = async (ticketId) => {
    try {
      const ticket = await contract.methods.fetchTicket(ticketId).call();
      console.log("Ticket Details", ticket);
      alert(
        `Title: ${ticket.title}\nIssue: ${ticket.issue}\nDescription: ${ticket.description}\nDifficulty: ${ticket.difficulty}\nDevice Type: ${ticket.deviceType}\nCreated By: ${ticket.createdBy}\nResolved: ${ticket.resolved}\nResolved By: ${ticket.resolvedBy}`
      );
    } catch (error) {
      console.error(error);
    }
  };

  const TicketNotes = async () => {
    await contract.methods.ticketNotes().send({ from: account });
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const web3 = new Web3(window.ethereum);
        const networkId = await web3.eth.net.getId();
        const contractAddress = HelpDesk.networks[networkId].address;
        const contract = new web3.eth.Contract(HelpDesk.abi, contractAddress);
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        setWeb3(web3);
        setContract(contract);
        setAccount(account);
        const onChainTicketCount = await contract.methods.ticketCount().call();
        console.log("on chain ticket count is " + onChainTicketCount);
        setOffChainTicketCount(parseInt(onChainTicketCount));

        await getDataArray();
        const resolvedTickets = [];
        for (let i = 0; i < offChainTicketCount; i++) {
          const ticket = await contract.methods.fetchTicket(i).call();
          if (ticket.resolved) {
            resolvedTickets.push(ticket);
          }
        }
        setResolvedTickets(resolvedTickets);
      } else {
        window.alert("Please install MetaMask to use this application");
      }
    } catch (err) {
      console.error(err);
      window.alert("Failed to connect wallet");
    }
  };

  return (
    <div className="App">
      <h1>Help Desk</h1>
      <button onClick={TicketNotes}>Add Note</button>
      <button onClick={ticketDetails}>View Details</button>
      {ticketDetails && ( // render ticket details if ticketDetails is not null
        <div>
          <p>Title: {ticketDetails.title}</p>
          <p>Issue: {ticketDetails.issue}</p>
          <p>Description: {ticketDetails.description}</p>
          <p>Difficulty: {ticketDetails.difficulty}</p>
          <p>Device Type: {ticketDetails.deviceType}</p>
        </div>
      )}
      {
        /*{account == null ? (*/
        <button onClick={connectWallet}>Connect Wallet</button> /*
      ) : (*/
      }
      <>
        <p>Your account: {account}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTicket(title, issue, description, difficulty, deviceType);
          }}
        >
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <br />
          <label>
            Issue:
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              required
            ></textarea>
          </label>
          <br />
          <label>
            Description:
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </label>
          <br />
          <label>
            Difficulty:
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              required
            >
              <option value="">Select a difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
          <br />
          <label>
            Device Type:
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              required
            >
              <option value="">Select a device type</option>
              <option value="Desktop">Desktop</option>
              <option value="Laptop">Laptop</option>
              <option value="Mobile">Mobile</option>
            </select>
          </label>
          <br />
          <button type="submit">Create Ticket</button>
        </form>
        <h2>Ticket Count: {offChainTicketCount}</h2>
        <h2>Resolved Tickets</h2>
        <ul>
          {resolvedTickets.map((ticket, index) => (
            <li key={index}>
              <p>{ticket.title}</p>
              <p>{ticket.issue}</p>
              <p>{ticket.resolvedBy}</p>
            </li>
          ))}
        </ul>
        <h2>Open Tickets</h2>
        <table bgcolor="black">
          <tbody>
            <tr bgcolor="grey" width="150px">
              <th>Title</th>
              <th>Issue</th>
              <th>Description</th>
              <th>Difficulty</th>
              <th>Device type</th>
              <th>Change status</th>
            </tr>

            {Array.from({ length: offChainTicketCount }, (_, i) => i).map(
              (i) => {
                const ticket = contract.methods
                  .fetchTicket(i)
                  .call()
                  .then(function (data) {
                    console.log(i);
                    console.log(data);
                  });
                //console.log(ticket);

                if (!ticket.resolved) {
                  return (
                    <tr key={i} bgcolor="lightgrey">
                      <td>{ticket.title}</td>
                      <td>{ticket.issue}</td>
                      <td>{ticket.description}</td>
                      <td>{ticket.difficulty}</td>
                      <td>{ticket.deviceType}</td>
                      <td>
                        <button onClick={() => resolveTicket(i)}>
                          Resolve Ticket
                        </button>
                      </td>
                    </tr>
                  );
                }
                return null;
              }
            )}
          </tbody>
        </table>
      </>
    </div>
  );
}

export default App;
