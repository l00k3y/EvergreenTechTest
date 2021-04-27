import React, { Component } from 'react';
import './App.css';


class App extends Component {
  constructor() {
    super();
    this.state = {
      houseData: [],
      pumpData: [],
      weatherData: [],
      isLoading: true,
    }
  }

  componentDidMount() {
    this.getHouseData()
      .then(() => this.getPumpData())
      .then(() => this.getWeatherData(this.state.houseData[1].designRegion))
      .then(() => console.log("Finished"));
  }

  async getHouseData() {
    try {
      let response = await fetch('./houses.json', {
        headers : { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
         }})
      let responseJson = await response.json();
      const houses = responseJson.map(item => {return item;})
      this.setState({ houseData: houses });
    } catch (error) {
      console.error(error);
    }
  }

  async getPumpData() {
    try {
      let response = await fetch('./heat-pumps.json', {
        headers : { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
         }})
      let responseJson = await response.json();
      const pumps = responseJson.map(item => {return item;})
      this.setState({ pumpData: pumps });
    } catch (error) {
      console.error(error);
    }
  }

  async getWeatherData(location) {
    // using https://cors-anywhere.herokuapp.com/ to bypass CORS restrictions
    const apiURL = "https://cors-anywhere.herokuapp.com/https://063qqrtqth.execute-api.eu-west-2.amazonaws.com/v1/weather?location="
    const apiKey = "f661f74e-20a7-4e9f-acfc-041cfb846505"
    
    try {
      let response = await fetch(apiURL + location, {
        headers : { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key' : apiKey,
         }})
        if (response.status === 200) {
          let responseJson = await response.json();
          console.log(responseJson);
          this.setState({ isLoading: false });
        } else if (response.status === 404) {
          //skip current house
          console.log("Location not found");
        } else if (response.status === 418) {
          this.setState({ isTeapot: true });
          console.log("I am also a teapot");
        } else {
          console.log("Failed");
        }
    } catch (error) {
      console.error(error);
    }
    
  }

  render() {
    if (this.state.isTeapot) {
      return (<div className="App"><img src="./teapot.jpg" alt="I am also a teapot"/></div>)
    }
    if (this.state.isLoading) {
      return (<div className="App">Loading...</div>);
    }

    return (<div className="App">Hello world</div>);
  }
}

export default App;
