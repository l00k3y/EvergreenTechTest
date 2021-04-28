import React, { Component } from 'react';
import './App.css';


class App extends Component {
  constructor() {
    super();
    this.state = {
      houseData: [],
      pumpData: [],
      degreeDays: "",
      isLoading: true,
    }
  }

  // iterate house data
  // set up table
  // output submission id
  // 


  componentDidMount() {

    this.getHouseData()
      .then(() => this.getPumpData())
      .then(() => this.startProcess());
  }

  async getHouseData() {
    try {
      let response = await fetch('./houses.json', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      let responseJson = await response.json();
      const houses = responseJson.map(item => { return item; })
      this.setState({ houseData: houses });
    } catch (error) {
      console.error(error);
    }
  }

  calculateHeatLoss(houseData) {
    // heatLoss = floorArea (m^2) * heatingFactor * insulationFactor = heat loss (kWh)
    let heatLoss = houseData.floorArea * houseData.heatingFactor * houseData.insulationFactor
    return heatLoss
  }

  calculatePowerHeatLoss(heatLoss, degreeDays) {
    // heat loss (kWh) / heating degree days = Power heat loss (kW)
    let powerHeatLoss = heatLoss / degreeDays
    return powerHeatLoss
  }

  async getPumpData() {
    try {
      let response = await fetch('./heat-pumps.json', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      let responseJson = await response.json();
      const pumps = responseJson.map(item => { return item; })
      this.setState({ pumpData: pumps });
    } catch (error) {
      console.error(error);
    }
  }

  async getWeatherData(location) {
    // using https://cors-anywhere.herokuapp.com/ to bypass CORS restrictions
    // must request access from https://cors-anywhere.herokuapp.com/corsdemo
    const apiURL = "https://cors-anywhere.herokuapp.com/https://063qqrtqth.execute-api.eu-west-2.amazonaws.com/v1/weather?location="
    const apiKey = "f661f74e-20a7-4e9f-acfc-041cfb846505"

    let response = await fetch(apiURL + location, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey,
      }
    })
    if (response.status === 200) {
      let responseJson = await response.json();
      this.setState({ degreeDays: responseJson.location.degreeDays, isLoading: false });
      return "Location found";
    } else if (response.status === 403) {
      document.body.innerHTML = '<div class="App">Please request temp access to cors-anywhere <a href="https://cors-anywhere.herokuapp.com/corsdemo">here</a> and refresh</div>'
    } else if (response.status === 404) {
      //skip current house
      console.log("Location not found");
      return "Location not found";
    } else if (response.status === 418) {
      document.body.innerHTML = "<div class='App'>I am also a teapot</div>"
      return "Failed";
    } else if (response.status === 429) {
      document.body.innerHTML = "<div class='App'>Please wait one minute before refreshing</div>"
      return "Failed";
    } else {
      document.body.innerHTML = "<div class='App'>Something terribly wrong has happened, please refresh the page</div>"
      return "Failed";
    }

  }

  setupAndOutputDataTable(submissionId, estHeatLoss, designRegion, powerHeatLoss, pumpObject) {

    let buildHtmlString = "<div class='App'><br><br>--------------------------------------<br>"
    buildHtmlString += submissionId;
    buildHtmlString += "<br>--------------------------------------";
    buildHtmlString += "<br>  Estimated Heat Loss = " + estHeatLoss;

    if (designRegion === "notFound") {
      buildHtmlString += "<br>  Warning: Could not find design region"
    } else {
      buildHtmlString += "<br>  Design Region = " + designRegion;
      buildHtmlString += "<br>  Power Heat Loss = " + powerHeatLoss;
      buildHtmlString += "<br>  Recommended Heat Pump = " + pumpObject.label;
      buildHtmlString += "<br>  Cost Breakdown";
      // map through pump data
      let totalCost = 0;
      buildHtmlString += pumpObject.costs.map(pump => {
        totalCost += pump.cost;
        return ('<br>' + pump.label + ", " + pump.cost);
      });
      // total cost + vat
      totalCost = totalCost * 1.05
      buildHtmlString += "<br>  Total Cost, including VAT = " + totalCost;
    }

    buildHtmlString += "</div>"

    document.body.innerHTML += buildHtmlString
  }

  async startProcess() {
    // iterate each house data object, check if location works & output calculations conditionally
    const houseData = this.state.houseData;
    for (let i = 0; i < houseData.length; i++) {
      let estHeatLoss = this.calculateHeatLoss(houseData[i]);
      
      // check location
      let response = await this.getWeatherData(houseData[i].designRegion);
      if (response === "Location found") {
        let powerHeatLoss = this.calculatePowerHeatLoss(estHeatLoss, this.state.degreeDays);
        // recommend pump & submit correct mapping data
        let recommendedPumpObj = this.recommendHeatingPump(powerHeatLoss);
        // let totalPrice = this.calculateTotalPrice();
        this.setupAndOutputDataTable(houseData[i].submissionId, estHeatLoss, houseData[i].designRegion, powerHeatLoss, recommendedPumpObj);
      } else if (response === "Location not found") {
        this.setupAndOutputDataTable(houseData[i].submissionId, estHeatLoss, "notFound", "", "");
      }
      // this.setState({isLoading: false});

    }

  }

  recommendHeatingPump(powerHeatLoss) {
    // if powerHeatLoss has decimal places then round to upward integer - preventing undersizing
    let requiredPower = 0;
    if (powerHeatLoss % 1 !== 0) {
      requiredPower = Math.ceil(powerHeatLoss);
    }

    // filter pump data such that valid pumps are higher than required power
    const statePumpData = this.state.pumpData;
    const validHeatPumps = statePumpData.filter(pumpData => pumpData.outputCapacity > requiredPower);

    // find nearest power output
    if (validHeatPumps.length === 1) {
      return validHeatPumps[0];
    } else {
      for (let i = 0; i < validHeatPumps.length; i++) {
        let closestPower = Infinity;
        let currentDifference = Math.abs(validHeatPumps[i].outputCapacity - requiredPower);
        if (currentDifference < closestPower) {
          closestPower = currentDifference;
          return validHeatPumps[i];
        }

      }
    }
  }

  render() {
    if (this.state.isLoading) {
      return (<div className="App">Loading...</div>);
    }
    return (<div className="App">Evergreen Energy</div>);
  }
}

export default App;
