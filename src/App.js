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
  //const [TicketDetails, setTicketDetails] = useState(null);
  const [ticketId, setTicketId] = useState("");
  const [offChainOpenTicketArray, setOffChainOpenTicketArray] = useState([]);
  //const [theSolution, setTheSolution] = useState([]);

  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);

  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [result, setResult] = useState("");

  const [topButtonText, setTopButtonText] = useState("Connect Wallet");

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
      dev = 0;
    } else if (deviceType === "Desktop") {
      dev = 1;
    } else if (deviceType === "Mobile") {
      dev = 2;
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
  //gets data for tickets. if resolvedChoice is false, returns only open tickets. if true, returns resolved tickets
  async function getDataArray(contract, resolvedChoice) {
    const onChainTicketCount = await contract.methods.ticketCount().call();
    //console.log("getDataArray: on chain ticket count is " + onChainTicketCount);

    var workingTicketArray = [];
    //console.log("Resolved =" + resolvedChoice + "-------------------");
    for (let i = 0; i < onChainTicketCount; i++) {
      var ticket = await contract.methods.fetchTicket(i).call();
      console.log(
        "ticket ID: " + ticket.id + "ticket Resolved status" + ticket.resolved
      );
      if (ticket.resolved === resolvedChoice) {
        workingTicketArray.push(ticket);
        //console.log(ticket.id);
      }
    }

    //have a refresh function with a button that refreshes table
    //refresh upon ticket creation
    //console.log("working ticket array is: " + workingTicketArray);

    return workingTicketArray;
  }

  const resolveTicket = async (ticketId) => {
    try {
      console.log("ticketId passed is " + ticketId);
      const offChainTick = await offChainOpenTicketArray[ticketId];
      console.log("off chain id: " + offChainTick);
      const thisTicketsIndex = offChainTick.id;
      console.log("thisTickets index: " + thisTicketsIndex);
      const onChainTick = await contract.methods
        .fetchTicket(thisTicketsIndex)
        .call();
      console.log("on chain id: " + onChainTick);

      const tx = await contract.methods.resolveTicket(thisTicketsIndex).send({
        from: account,
        gas: 500000,
      });

      const { transactionHash } = tx;
      window.alert(`Transaction sent: ${transactionHash}`);
      const { events } = tx;
      const { TicketResolved } = events;
      const { returnValues } = TicketResolved;
      const resolvedTicketId = returnValues.ticketId; // define resolvedTicketId here
      window.alert(`Ticket resolved with ID: ${ticketId}`);
      console.log("got to spot 1");
      const thisTicket = offChainOpenTicketArray.filter(
        (t) => t.ticketId === ticketId
      );
      console.log("the ticket we are resolving is: " + thisTicket);
      //
      //setTicketDetails(null);
      //setTicketId("");
      setResolvedTickets([...resolvedTickets, thisTicket]);
      const filteredArray = (offChainOpenTicketArray) =>
        offChainOpenTicketArray.filter((t) => t.ticketId !== ticketId);
      setOffChainOpenTicketArray(filteredArray);
      console.log("got to spot 3");
    } catch (err) {
      console.error(err);
      window.alert("Failed to resolve ticket");
    }
  };

  /*
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
  */

  const transferTicket = async () => {
    try {
      const accounts = await web3.eth.getAccounts();

      // check if the from account is the owner of the ticket
      const owner = await HelpDesk.methods.ownerOf(tokenId).call();
      if (owner.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error("The from address is not the owner of the ticket");
      }

      // transfer the ticket to the new owner
      await HelpDesk.methods
        .safeTransferFrom(fromAddress, toAddress, tokenId)
        .send({ from: accounts[0] });

      const message = `Ticket ${tokenId} transferred from ${fromAddress} to ${toAddress}`;
      setResult(message);
      console.log(message);
    } catch (error) {
      console.error(error);
      setResult(`Error: ${error.message}`);
    }
  };

  const ConnectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const web3 = new Web3(window.ethereum);
        console.log("web3 " + web3);
        const networkId = await web3.eth.net.getId();
        console.log("netId " + networkId);
        const contractAddress = HelpDesk.networks[networkId].address;
        console.log("address" + contractAddress);
        const contract = new web3.eth.Contract(HelpDesk.abi, contractAddress);
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        console.log("accounts is" + accounts);
        console.log("account is " + account);
        setWeb3(web3);
        setContract(contract);
        console.log("contract in connectWallet" + contract);
        setAccount(account);
        const onChainTicketCount = await contract.methods.ticketCount().call();
        console.log(
          "connectWallet: on chain ticket count is " + onChainTicketCount
        );
        setOffChainTicketCount(parseInt(onChainTicketCount));

        //OPEN TICKET DATA --------
        //console.log("oCTA before set: " + offChainOpenTicketArray);

        const gotOpenTicketData = await getDataArray(contract, false);
        //console.log(typeof gotData[0]);
        //console.log("gotData is " + gotData[0]);

        setOffChainOpenTicketArray(gotOpenTicketData);
        //console.log("oCTA after set: " + offChainOpenTicketArray[0]);

        //console.log("oCTA before set: " + offChainOpenTicketArray);

        //RESOLVED TICKET DATA --------
        const gotResolvedTicketData = await getDataArray(contract, true);
        //console.log(typeof gotData[0]);
        //console.log("gotData is " + gotData[0]);

        setResolvedTickets(gotResolvedTicketData);
        //console.log("oCTA after set: " + offChainOpenTicketArray[0]);
        /*
        const resolvedTickets = [];
        for (let i = 0; i < offChainTicketCount; i++) {
          const ticket = await contract.methods.fetchTicket(i).call();
          if (ticket.resolved) {
            resolvedTickets.push(ticket);
          }
        }
        setResolvedTickets(resolvedTickets);
        */

        //console.log("Open tickets are: " + offChainOpenTicketArray);
        //console.log("---------------------------------------------------");
        //console.log("Resolved tickets are: " + resolvedTickets);
        console.log("got to end of connectWallet");
        setTopButtonText("Refresh data");
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
      <div class="theHeader">
        <h1>IT Help Desk</h1>
        <button onClick={ConnectWallet}>{topButtonText}</button>
      </div>
      <div class="theBody">
        <p>Your account: {account}</p>

        <div class="theTicketForm">
          <h2>New Ticket Form</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTicket(title, issue, description, difficulty, deviceType);
            }}
          >
            <div class="firstColumn">
              <label>
                <h4>Title:</h4>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </label>
              <br />

              <label>
                <h4>Issue:</h4>
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  required
                ></textarea>
              </label>

              <br />

              <label>
                <h4>Description:</h4>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </label>
            </div>

            <div class="secondColumn">
              <label>
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

              <label>
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

              <button type="submit">Create Ticket</button>
            </div>
          </form>
        </div>
        <h2>Ticket Count: {offChainTicketCount}</h2>

        <div class="theTables">
          <h2>Open Tickets</h2>
          <table bgcolor="black" name="ticket-table">
            <thead>
              <tr bgcolor="grey">
                <th>Title</th>
                <th>Issue</th>
                <th>Description</th>
                <th>Difficulty</th>
                <th>Device type</th>
                <th> ticket ID</th>
                <th>Button</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: offChainTicketCount }, (_, i) => i).map(
                (i) => {
                  var ticket;
                  var ticketIsDefined = false;
                  var difficultyText;
                  var deviceTypeText;

                  if (!(offChainOpenTicketArray[i] === undefined)) {
                    ticketIsDefined = true;
                    ticket = offChainOpenTicketArray[i];
                    const tickDiff = ticket.difficulty;
                    if (tickDiff == 0) {
                      difficultyText = "Easy";
                    } else if (tickDiff == 1) {
                      difficultyText = "Medium";
                    } else if (tickDiff == 2) {
                      difficultyText = "Hard";
                    }

                    const tickDev = ticket.deviceType;
                    if (tickDev == 0) {
                      deviceTypeText = "Desktop";
                    } else if (tickDev == 1) {
                      deviceTypeText = "Laptop";
                    } else if (tickDev == 2) {
                      deviceTypeText = "Mobile";
                    }
                  }

                  if (ticketIsDefined) {
                    return (
                      <tr key={i} bgcolor="lightgrey">
                        <td>{ticket.title}</td>
                        <td>{ticket.issue}</td>
                        <td>{ticket.description}</td>
                        <td>{difficultyText}</td>
                        <td>{deviceTypeText}</td>
                        <td>ticketId: {ticket.id}</td>
                        <td>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              resolveTicket(i);
                            }}
                          >
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

          <h2>Resolved Tickets</h2>
          <table bgcolor="black" name="ticket-table">
            <tbody>
              <tr bgcolor="grey">
                <th>Title</th>
                <th>Issue</th>
                <th>Description</th>
                <th>Difficulty</th>
                <th>Device type</th>
                <th>Ticket ID</th>
              </tr>

              {Array.from({ length: offChainTicketCount }, (_, i) => i).map(
                (i) => {
                  var ticket;
                  var ticketIsDefined = false;
                  var difficultyText;
                  var deviceTypeText;

                  if (!(resolvedTickets[i] === undefined)) {
                    ticketIsDefined = true;
                    ticket = resolvedTickets[i];
                    const tickDiff = ticket.difficulty;
                    if (tickDiff == 0) {
                      difficultyText = "Easy";
                    } else if (tickDiff == 1) {
                      difficultyText = "Medium";
                    } else if (tickDiff == 2) {
                      difficultyText = "Hard";
                    }

                    const tickDev = ticket.deviceType;
                    if (tickDev == 0) {
                      deviceTypeText = "Desktop";
                    } else if (tickDev == 1) {
                      deviceTypeText = "Laptop";
                    } else if (tickDev == 2) {
                      deviceTypeText = "Mobile";
                    }
                  }

                  if (ticketIsDefined) {
                    return (
                      <tr key={i} bgcolor="lightgrey">
                        <td>{ticket.title}</td>
                        <td>{ticket.issue}</td>
                        <td>{ticket.description}</td>
                        <td>{difficultyText}</td>
                        <td>{deviceTypeText}</td>
                        <td>{ticket.id}</td>
                      </tr>
                    );
                  }
                  return null;
                }
              )}
            </tbody>
          </table>
        </div>
        <div class="theTransfer">
          <h2>Transfer Ticket</h2>
          <div>
            <label htmlFor="from">From address:</label>
            <input
              type="text"
              id="from"
              value={fromAddress}
              onChange={(event) => setFromAddress(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="to">To address:</label>
            <input
              type="text"
              id="to"
              value={toAddress}
              onChange={(event) => setToAddress(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="token">Ticket ID:</label>
            <input
              type="text"
              id="token"
              value={tokenId}
              onChange={(event) => setTokenId(event.target.value)}
            />
          </div>
          <button onClick={transferTicket}>Transfer Ticket</button>
          <div>{result}</div>
        </div>
      </div>
      <div className="Footer">
        <br />
        by Naglis Paunksnis and Joshua Wajnryb for CSE426, Spring 2023
      </div>
    </div>
  );
}

export default App;
